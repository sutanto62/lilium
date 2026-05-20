import { hasRole } from '$src/auth';
import type { Parish } from '$core/entities/Parish';
import { checkServerGate } from '$lib/server/featureFlags';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { ServiceError, ServiceErrorType } from '$core/errors/ServiceError';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	const isNewUX = await checkServerGate(event.locals, 'new_settings_pages');
	if (!isNewUX) {
		throw redirect(302, '/admin/settings');
	}

	const { session } = await handlePageLoad(event, 'parish');
	if (!session) {
		logger.warn('admin_parish.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_parish.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_parish.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	logger.debug('admin_parish.load: Fetching data', { churchId });

	let parish: Parish | null = null;

	try {
		const parishId = await repo.getParishIdByChurch(churchId);
		logger.debug('admin_parish.load: Resolved parishId', { churchId, parishId });
		parish = await repo.findParishById(parishId);
		logger.debug('admin_parish.load: Data fetched', { parishId });
	} catch (err) {
		if (err instanceof ServiceError && err.type === ServiceErrorType.NOT_FOUND_ERROR) {
			logger.debug('admin_parish.load: No parish linked to church yet', { churchId });
		} else {
			logger.error('admin_parish.load: Error fetching data', { err, churchId });
			throw error(500, 'Failed to fetch parish data');
		}
	}

	const metadata = {
		load_time_ms: Date.now() - startTime
	};

	await Promise.all([
		statsigService.logEvent('admin_parish_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_parish_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { parish, churchId };
};

export const actions = {
	updateParish: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim();

		if (!name) return fail(400, { error: 'Nama paroki wajib diisi' });
		if (!code) return fail(400, { error: 'Kode paroki wajib diisi' });

		logger.debug('admin_parish.updateParish: Updating', { churchId, name, code });

		try {
			const parishId = await repo.getParishIdByChurch(churchId);
			const ok = await repo.updateParish(parishId, { name, code });
			logger.debug('admin_parish.updateParish: Result', { parishId, ok });
			if (!ok) return fail(404, { error: 'Paroki tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_parish_update', 'update', session, { parish_id: parishId }),
				trackServerEvent('admin_parish_update', { event_type: 'parish_updated', parish_id: parishId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_parish.updateParish: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah paroki. Silakan coba lagi.' });
		}
	},

} satisfies Actions;
