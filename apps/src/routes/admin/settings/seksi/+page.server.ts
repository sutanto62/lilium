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
		throw redirect(302, '/admin/settings/data-zona-group');
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
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama seksi wajib diisi' });

		try {
			await repo.createSection({ name, code, description, sequence, churchId, active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_section_create', 'create', session, { church_id: churchId }),
				trackServerEvent('admin_section_create', { event_type: 'section_created', church_id: churchId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_section.create: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal membuat seksi. Silakan coba lagi.' });
		}
	},

	update: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const sectionId = formData.get('sectionId') as string;
		if (!sectionId) return fail(400, { error: 'ID seksi tidak ditemukan' });

		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const description = (formData.get('description') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama seksi wajib diisi' });

		try {
			const ok = await repo.updateSection(sectionId, { name, code, description, sequence });
			if (!ok) return fail(404, { error: 'Seksi tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_section_update', 'update', session, { section_id: sectionId }),
				trackServerEvent('admin_section_update', { event_type: 'section_updated', section_id: sectionId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_section.update: Error', { err, sectionId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah seksi. Silakan coba lagi.' });
		}
	},

	delete: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const sectionId = formData.get('sectionId') as string;
		if (!sectionId) return fail(400, { error: 'ID seksi tidak ditemukan' });

		try {
			const ok = await repo.deactivateSection(sectionId);
			if (!ok) return fail(404, { error: 'Seksi tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_section_delete', 'delete', session, { section_id: sectionId }),
				trackServerEvent('admin_section_delete', { event_type: 'section_deleted', section_id: sectionId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_section.delete: Error', { err, sectionId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus seksi. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
