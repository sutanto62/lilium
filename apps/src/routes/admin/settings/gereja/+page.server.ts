import { hasRole } from '$src/auth';
import type { Church as FacilityChurch } from '$core/entities/Facility';
import { checkServerGate } from '$lib/server/featureFlags';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { ServiceError } from '$core/errors/ServiceError';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	const isNewUX = await checkServerGate(event.locals, 'new_settings_pages');
	if (!isNewUX) {
		throw redirect(302, '/admin/settings');
	}

	const { session } = await handlePageLoad(event, 'church');
	if (!session) {
		logger.warn('admin_church.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_church.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_church.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	let church: FacilityChurch | null = null;

	try {
		church = await repo.findFacilityChurchById(churchId);
	} catch (err) {
		logger.error('admin_church.load: Error fetching data', { err, churchId });
		throw error(500, 'Failed to fetch church data');
	}

	const metadata = { load_time_ms: Date.now() - startTime };

	await Promise.all([
		statsigService.logEvent('admin_church_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_church_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { church, churchId };
};

export const actions = {
	update: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim();
		const requiresSpecialCollection =
			formData.get('requiresSpecialCollection') === 'true' ? 1 : 0;

		if (!name) return fail(400, { error: 'Nama gereja wajib diisi' });
		if (!code) return fail(400, { error: 'Kode gereja wajib diisi' });

		try {
			const ok = await repo.updateFacilityChurch(churchId, { name, code, requiresSpecialCollection });
			if (!ok) return fail(404, { error: 'Gereja tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_church_update', 'update', session, {
					church_id: churchId,
					requires_special_collection: requiresSpecialCollection
				}),
				trackServerEvent('admin_church_update', {
					event_type: 'church_updated',
					church_id: churchId,
					requires_special_collection: requiresSpecialCollection
				}, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_church.update: Error', { err, churchId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah gereja. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
