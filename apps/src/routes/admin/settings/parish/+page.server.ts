import { hasRole } from '$src/auth';
import type { Parish, Wilayah } from '$core/entities/Parish';
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

	let parish: Parish | null = null;
	let wilayahs: Wilayah[] = [];

	try {
		const parishId = await repo.getParishIdByChurch(churchId);
		[parish, wilayahs] = await Promise.all([
			repo.findParishById(parishId),
			repo.listWilayahsByParish(parishId)
		]);
	} catch (err) {
		logger.error('admin_parish.load: Error fetching data', { err, churchId });
		throw error(500, 'Failed to fetch parish data');
	}

	const metadata = {
		total_wilayahs: wilayahs.length,
		load_time_ms: Date.now() - startTime
	};

	await Promise.all([
		statsigService.logEvent('admin_parish_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_parish_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { parish, wilayahs, churchId };
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

		try {
			const parishId = await repo.getParishIdByChurch(churchId);
			const ok = await repo.updateParish(parishId, { name, code });
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

	createWilayah: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama wilayah wajib diisi' });

		try {
			const parishId = await repo.getParishIdByChurch(churchId);
			await repo.createWilayah({ name, code, sequence, parishId, active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_parish_wilayah_create', 'create', session, { church_id: churchId }),
				trackServerEvent('admin_parish_wilayah_create', { event_type: 'wilayah_created', church_id: churchId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_parish.createWilayah: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal membuat wilayah. Silakan coba lagi.' });
		}
	},

	updateWilayah: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const wilayahId = formData.get('wilayahId') as string;
		if (!wilayahId) return fail(400, { error: 'ID wilayah tidak ditemukan' });

		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama wilayah wajib diisi' });

		try {
			const ok = await repo.updateWilayah(wilayahId, {
				name,
				code: code ?? undefined,
				...(sequence !== null ? { sequence } : {})
			});
			if (!ok) return fail(404, { error: 'Wilayah tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_parish_wilayah_update', 'update', session, { wilayah_id: wilayahId }),
				trackServerEvent('admin_parish_wilayah_update', { event_type: 'wilayah_updated', wilayah_id: wilayahId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_parish.updateWilayah: Error', { err, wilayahId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah wilayah. Silakan coba lagi.' });
		}
	},

	deleteWilayah: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const wilayahId = formData.get('wilayahId') as string;
		if (!wilayahId) return fail(400, { error: 'ID wilayah tidak ditemukan' });

		try {
			const ok = await repo.deactivateWilayah(wilayahId);
			if (!ok) return fail(404, { error: 'Wilayah tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_parish_wilayah_delete', 'delete', session, { wilayah_id: wilayahId }),
				trackServerEvent('admin_parish_wilayah_delete', { event_type: 'wilayah_deleted', wilayah_id: wilayahId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_parish.deleteWilayah: Error', { err, wilayahId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus wilayah. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
