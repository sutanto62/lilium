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

	const { session } = await handlePageLoad(event, 'zone_misa');
	if (!session) {
		logger.warn('admin_zone_misa.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_zone_misa.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_zone_misa.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	const churchService = new ChurchService(churchId);

	let masses: Mass[] = [];
	try {
		masses = await churchService.retrieveAllMasses();
	} catch (err) {
		logger.error('admin_zone_misa.load: Error fetching masses', { err, churchId });
		throw error(500, 'Failed to fetch masses');
	}

	const metadata = {
		total_masses: masses.length,
		load_time_ms: Date.now() - startTime,
		has_masses: masses.length > 0
	};

	await Promise.all([
		statsigService.logEvent('admin_zone_misa_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_zone_misa_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { masses };
};

export const actions = {
	create: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const day = formData.get('day') as string;
		const time = (formData.get('time') as string)?.trim() || null;
		const briefingTime = (formData.get('briefingTime') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama misa wajib diisi' });
		if (!day) return fail(400, { error: 'Hari misa wajib diisi' });

		try {
			const churchService = new ChurchService(churchId);
			await churchService.createMass({ name, code, day, time, briefingTime, sequence, church: churchId, active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_zone_misa_create', 'create', session, { church_id: churchId }),
				trackServerEvent('admin_zone_misa_create', { event_type: 'mass_created', church_id: churchId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_misa.create: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal membuat jadwal misa. Silakan coba lagi.' });
		}
	},

	update: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const massId = formData.get('massId') as string;
		if (!massId) return fail(400, { error: 'ID misa tidak ditemukan' });

		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const day = formData.get('day') as string;
		const time = (formData.get('time') as string)?.trim() || null;
		const briefingTime = (formData.get('briefingTime') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama misa wajib diisi' });

		try {
			const churchService = new ChurchService(churchId);
			await churchService.updateMass(massId, { name, code, day, time, briefingTime, sequence });

			await Promise.all([
				statsigService.logEvent('admin_zone_misa_update', 'update', session, { mass_id: massId }),
				trackServerEvent('admin_zone_misa_update', { event_type: 'mass_updated', mass_id: massId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_misa.update: Error', { err, massId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah jadwal misa. Silakan coba lagi.' });
		}
	},

	delete: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const massId = formData.get('massId') as string;
		if (!massId) return fail(400, { error: 'ID misa tidak ditemukan' });

		try {
			const churchService = new ChurchService(churchId);
			const success = await churchService.deactivateMass(massId);
			if (!success) return fail(404, { error: 'Jadwal misa tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_zone_misa_delete', 'delete', session, { mass_id: massId }),
				trackServerEvent('admin_zone_misa_delete', { event_type: 'mass_deleted', mass_id: massId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_misa.delete: Error', { err, massId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus jadwal misa. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
