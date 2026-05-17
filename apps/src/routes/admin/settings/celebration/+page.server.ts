import { hasRole } from '$src/auth';
import type { Mass } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';
import { checkServerGate } from '$lib/server/featureFlags';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { ServiceError } from '$core/errors/ServiceError';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	// Gate guard — redirect to legacy page when feature is off
	const isNewUX = await checkServerGate(event.locals, 'new_settings_pages');
	if (!isNewUX) {
		throw redirect(302, '/admin/settings/data-misa');
	}

	const { session } = await handlePageLoad(event, 'celebration');
	if (!session) {
		logger.warn('admin_celebration.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_celebration.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_celebration.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	const churchService = new ChurchService(churchId);

	let masses: Mass[] = [];
	try {
		masses = await churchService.retrieveMasses();
	} catch (err) {
		logger.error('admin_celebration.load: Error fetching masses', { err, churchId });
		throw error(500, 'Failed to fetch masses');
	}

	const metadata = {
		total_masses: masses.length,
		load_time_ms: Date.now() - startTime,
		has_masses: masses.length > 0
	};

	await Promise.all([
		statsigService.logEvent('admin_celebration_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_celebration_view', { event_type: 'page_load', ...metadata }, session || undefined)
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

		if (!name) return fail(400, { error: 'Nama perayaan wajib diisi' });
		if (!day) return fail(400, { error: 'Hari wajib diisi' });

		try {
			const churchService = new ChurchService(churchId);
			await churchService.createMass({ name, code, day, time, briefingTime, sequence, church: churchId, active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_celebration_create', 'create', session, { church_id: churchId }),
				trackServerEvent('admin_celebration_create', { event_type: 'celebration_created', church_id: churchId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_celebration.create: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal membuat perayaan. Silakan coba lagi.' });
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
		if (!massId) return fail(400, { error: 'ID perayaan tidak ditemukan' });

		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const day = formData.get('day') as string;
		const time = (formData.get('time') as string)?.trim() || null;
		const briefingTime = (formData.get('briefingTime') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama perayaan wajib diisi' });

		try {
			const churchService = new ChurchService(churchId);
			await churchService.updateMass(massId, { name, code, day, time, briefingTime, sequence });

			await Promise.all([
				statsigService.logEvent('admin_celebration_update', 'update', session, { mass_id: massId }),
				trackServerEvent('admin_celebration_update', { event_type: 'celebration_updated', mass_id: massId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_celebration.update: Error', { err, massId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah perayaan. Silakan coba lagi.' });
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
		if (!massId) return fail(400, { error: 'ID perayaan tidak ditemukan' });

		try {
			const churchService = new ChurchService(churchId);
			const success = await churchService.deactivateMass(massId);
			if (!success) return fail(404, { error: 'Perayaan tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_celebration_delete', 'delete', session, { mass_id: massId }),
				trackServerEvent('admin_celebration_delete', { event_type: 'celebration_deleted', mass_id: massId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_celebration.delete: Error', { err, massId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus perayaan. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
