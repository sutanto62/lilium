import { hasRole } from '$src/auth';
import type { Mass } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { ServiceError } from '$core/errors/ServiceError';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	const { session } = await handlePageLoad(event, 'posisi');
	if (!session) {
		logger.warn('admin_posisi.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_posisi.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_posisi.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	const churchService = new ChurchService(churchId);

	let masses: Mass[] = [];
	try {
		masses = await churchService.retrieveAllMasses();
	} catch (err) {
		logger.error('admin_posisi.load: Error fetching masses', { err, churchId });

		const errorMetadata = {
			error_type: err instanceof Error ? err.name : 'unknown',
			error_message: err instanceof Error ? err.message : String(err),
			church_id: churchId
		};

		await Promise.all([
			statsigService.logEvent('admin_posisi_error', 'data_fetch_failed', session || undefined, errorMetadata),
			trackServerEvent('admin_posisi_error', { event_type: 'data_fetch_failed', ...errorMetadata }, session || undefined)
		]);

		throw error(500, 'Failed to fetch mass schedules');
	}

	const metadata = {
		total_masses: masses.length,
		active_masses: masses.filter(m => m.active === 1).length,
		inactive_masses: masses.filter(m => m.active === 0).length,
		load_time_ms: Date.now() - startTime,
		has_masses: masses.length > 0
	};

	await Promise.all([
		statsigService.logEvent('admin_posisi_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_posisi_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { masses };
};

export const actions = {
	delete: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const massId = formData.get('massId') as string;
		if (!massId) return fail(400, { error: 'ID jadwal misa tidak ditemukan' });

		try {
			const churchService = new ChurchService(churchId);
			const success = await churchService.deactivateMass(massId);
			if (!success) return fail(404, { error: 'Jadwal misa tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_posisi_delete', 'delete', session, { mass_id: massId }),
				trackServerEvent('admin_posisi_delete', { event_type: 'mass_deleted', mass_id: massId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_posisi.delete: Error deactivating mass', { error: err, massId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus jadwal misa. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
