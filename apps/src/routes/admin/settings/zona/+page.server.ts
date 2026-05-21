import { hasRole } from '$src/auth';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { ServiceError } from '$core/errors/ServiceError';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { isNewDomainEligible, featurePreference } = await event.parent();
	if (!isNewDomainEligible || featurePreference !== 'new_domain') {
		throw redirect(302, '/admin/settings/data-zona');
	}
	throw redirect(302, '/admin/settings/struktur');
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
		const description = (formData.get('description') as string)?.trim() || null;
		const sectionId = (formData.get('sectionId') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama zona wajib diisi' });

		try {
			await repo.createNewZone({ name, code, description, sectionId, sequence, churchId, active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_zone_new_create', 'create', session, { church_id: churchId }),
				trackServerEvent('admin_zone_new_create', { event_type: 'zone_created', church_id: churchId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_new.create: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal membuat zona. Silakan coba lagi.' });
		}
	},

	update: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const zoneId = formData.get('zoneId') as string;
		if (!zoneId) return fail(400, { error: 'ID zona tidak ditemukan' });

		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const description = (formData.get('description') as string)?.trim() || null;
		const sectionId = (formData.get('sectionId') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama zona wajib diisi' });

		try {
			const ok = await repo.updateNewZone(zoneId, { name, code, description, sectionId, sequence });
			if (!ok) return fail(404, { error: 'Zona tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_zone_new_update', 'update', session, { zone_id: zoneId }),
				trackServerEvent('admin_zone_new_update', { event_type: 'zone_updated', zone_id: zoneId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_new.update: Error', { err, zoneId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah zona. Silakan coba lagi.' });
		}
	},

	delete: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const zoneId = formData.get('zoneId') as string;
		if (!zoneId) return fail(400, { error: 'ID zona tidak ditemukan' });

		try {
			const ok = await repo.deactivateNewZone(zoneId);
			if (!ok) return fail(404, { error: 'Zona tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_zone_new_delete', 'delete', session, { zone_id: zoneId }),
				trackServerEvent('admin_zone_new_delete', { event_type: 'zone_deleted', zone_id: zoneId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_new.delete: Error', { err, zoneId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus zona. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
