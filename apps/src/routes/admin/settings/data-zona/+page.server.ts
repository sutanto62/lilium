import { hasRole } from '$src/auth';
import type { ChurchZone, ChurchZoneGroup } from '$core/entities/Schedule';
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

	const { session } = await handlePageLoad(event, 'zone_zona');
	if (!session) {
		logger.warn('admin_zone_zona.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_zone_zona.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_zone_zona.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	const churchService = new ChurchService(churchId);

	let zones: ChurchZone[] = [];
	let zoneGroups: ChurchZoneGroup[] = [];
	try {
		[zones, zoneGroups] = await Promise.all([
			churchService.retrieveZones(),
			churchService.retrieveAllZoneGroups()
		]);
	} catch (err) {
		logger.error('admin_zone_zona.load: Error fetching zones', { err, churchId });
		throw error(500, 'Failed to fetch zones');
	}

	const metadata = {
		total_zones: zones.length,
		load_time_ms: Date.now() - startTime,
		has_zones: zones.length > 0
	};

	await Promise.all([
		statsigService.logEvent('admin_zone_zona_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_zone_zona_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { zones, zoneGroups };
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
		const group = (formData.get('group') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama zona wajib diisi' });

		try {
			const churchService = new ChurchService(churchId);
			await churchService.createZone({ name, code, description, group, sequence, church: churchId, active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_zone_zona_create', 'create', session, { church_id: churchId }),
				trackServerEvent('admin_zone_zona_create', { event_type: 'zone_created', church_id: churchId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_zona.create: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal membuat zona. Silakan coba lagi.' });
		}
	},

	update: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const zoneId = formData.get('zoneId') as string;
		if (!zoneId) return fail(400, { error: 'ID zona tidak ditemukan' });

		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const description = (formData.get('description') as string)?.trim() || null;
		const group = (formData.get('group') as string)?.trim() || null;
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama zona wajib diisi' });

		try {
			const churchService = new ChurchService(churchId);
			await churchService.updateZone(zoneId, { name, code, description, group, sequence });

			await Promise.all([
				statsigService.logEvent('admin_zone_zona_update', 'update', session, { zone_id: zoneId }),
				trackServerEvent('admin_zone_zona_update', { event_type: 'zone_updated', zone_id: zoneId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_zona.update: Error', { err, zoneId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah zona. Silakan coba lagi.' });
		}
	},

	delete: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const zoneId = formData.get('zoneId') as string;
		if (!zoneId) return fail(400, { error: 'ID zona tidak ditemukan' });

		try {
			const churchService = new ChurchService(churchId);
			const success = await churchService.deactivateZone(zoneId);
			if (!success) return fail(404, { error: 'Zona tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_zone_zona_delete', 'delete', session, { zone_id: zoneId }),
				trackServerEvent('admin_zone_zona_delete', { event_type: 'zone_deleted', zone_id: zoneId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_zona.delete: Error', { err, zoneId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus zona. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
