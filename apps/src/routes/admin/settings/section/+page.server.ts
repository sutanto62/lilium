import { hasRole } from '$src/auth';
import type { Section } from '$core/entities/Facility';
import { checkServerGate } from '$lib/server/featureFlags';
import { posthogService } from '$src/lib/application/PostHogService';
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

	// Gate guard
	const isNewUX = await checkServerGate(event.locals, 'new_settings_pages');
	if (!isNewUX) {
		throw redirect(302, '/admin/settings/data-zona-group');
	}

	const { session } = await handlePageLoad(event, 'section');
	if (!session) {
		logger.warn('admin_section.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_section.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_section.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	let sections: Section[] = [];
	try {
		sections = await repo.listSectionsByChurch(churchId);
	} catch (err) {
		logger.error('admin_section.load: Error fetching sections', { err, churchId });
		throw error(500, 'Failed to fetch sections');
	}

	const metadata = {
		total_sections: sections.length,
		load_time_ms: Date.now() - startTime,
		has_sections: sections.length > 0
	};

	await Promise.all([
		statsigService.logEvent('admin_section_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_section_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { sections, churchId };
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
