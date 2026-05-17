import { hasRole } from '$src/auth';
import type { ChurchZoneGroup } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { ServiceError } from '$core/errors/ServiceError';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	const { session } = await handlePageLoad(event, 'zone_zona_group');
	if (!session) {
		logger.warn('admin_zone_zona_group.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_zone_zona_group.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_zone_zona_group.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	const churchService = new ChurchService(churchId);

	let zoneGroups: ChurchZoneGroup[] = [];
	try {
		zoneGroups = await churchService.retrieveZoneGroups();
	} catch (err) {
		logger.error('admin_zone_zona_group.load: Error fetching zone groups', { err, churchId });
		throw error(500, 'Failed to fetch zone groups');
	}

	const metadata = {
		total_zone_groups: zoneGroups.length,
		load_time_ms: Date.now() - startTime,
		has_zone_groups: zoneGroups.length > 0
	};

	await Promise.all([
		statsigService.logEvent('admin_zone_zona_group_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_zone_zona_group_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { zoneGroups };
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

		if (!name) return fail(400, { error: 'Nama grup zona wajib diisi' });

		try {
			const churchService = new ChurchService(churchId);
			await churchService.createZoneGroup({ name, code, description, sequence, church: churchId, active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_zone_zona_group_create', 'create', session, { church_id: churchId }),
				trackServerEvent('admin_zone_zona_group_create', { event_type: 'zone_group_created', church_id: churchId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_zona_group.create: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal membuat grup zona. Silakan coba lagi.' });
		}
	},

	update: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const zoneGroupId = formData.get('zoneGroupId') as string;
		if (!zoneGroupId) return fail(400, { error: 'ID grup zona tidak ditemukan' });

		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const description = (formData.get('description') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama grup zona wajib diisi' });

		try {
			const churchService = new ChurchService(churchId);
			await churchService.updateZoneGroup(zoneGroupId, { name, code, description, sequence });

			await Promise.all([
				statsigService.logEvent('admin_zone_zona_group_update', 'update', session, { zone_group_id: zoneGroupId }),
				trackServerEvent('admin_zone_zona_group_update', { event_type: 'zone_group_updated', zone_group_id: zoneGroupId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_zona_group.update: Error', { err, zoneGroupId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah grup zona. Silakan coba lagi.' });
		}
	},

	delete: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const zoneGroupId = formData.get('zoneGroupId') as string;
		if (!zoneGroupId) return fail(400, { error: 'ID grup zona tidak ditemukan' });

		try {
			const churchService = new ChurchService(churchId);
			const success = await churchService.deactivateZoneGroup(zoneGroupId);
			if (!success) return fail(404, { error: 'Grup zona tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_zone_zona_group_delete', 'delete', session, { zone_group_id: zoneGroupId }),
				trackServerEvent('admin_zone_zona_group_delete', { event_type: 'zone_group_deleted', zone_group_id: zoneGroupId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_zona_group.delete: Error', { err, zoneGroupId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus grup zona. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
