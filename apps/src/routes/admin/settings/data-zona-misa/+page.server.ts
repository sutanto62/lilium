import { hasRole } from '$src/auth';
import type { ChurchZone, Mass, MassZone } from '$core/entities/Schedule';
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

	const { session } = await handlePageLoad(event, 'zone_misa_zona');
	if (!session) {
		logger.warn('admin_zone_misa_zona.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_zone_misa_zona.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_zone_misa_zona.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	const churchService = new ChurchService(churchId);

	let massZones: MassZone[] = [];
	let masses: Mass[] = [];
	let zones: ChurchZone[] = [];
	try {
		[massZones, masses, zones] = await Promise.all([
			churchService.retrieveMassZones(),
			churchService.retrieveMasses(),
			churchService.retrieveZones()
		]);
	} catch (err) {
		logger.error('admin_zone_misa_zona.load: Error fetching data', { err, churchId });
		throw error(500, 'Failed to fetch data');
	}

	const metadata = {
		total_mass_zones: massZones.length,
		load_time_ms: Date.now() - startTime
	};

	await Promise.all([
		statsigService.logEvent('admin_zone_misa_zona_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_zone_misa_zona_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { massZones, masses, zones };
};

export const actions = {
	create: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const massId = formData.get('massId') as string;
		const zoneId = formData.get('zoneId') as string;

		if (!massId) return fail(400, { error: 'Misa wajib dipilih' });
		if (!zoneId) return fail(400, { error: 'Zona wajib dipilih' });

		try {
			const churchService = new ChurchService(churchId);
			await churchService.createMassZone(massId, zoneId);

			await Promise.all([
				statsigService.logEvent('admin_zone_misa_zona_create', 'create', session, { mass_id: massId, zone_id: zoneId }),
				trackServerEvent('admin_zone_misa_zona_create', { event_type: 'mass_zone_created', mass_id: massId, zone_id: zoneId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_misa_zona.create: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal membuat relasi misa-zona. Silakan coba lagi.' });
		}
	},

	delete: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const massZoneId = formData.get('massZoneId') as string;
		if (!massZoneId) return fail(400, { error: 'ID relasi misa-zona tidak ditemukan' });

		try {
			const churchService = new ChurchService(churchId);
			const success = await churchService.deactivateMassZone(massZoneId);
			if (!success) return fail(404, { error: 'Relasi misa-zona tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_zone_misa_zona_delete', 'delete', session, { mass_zone_id: massZoneId }),
				trackServerEvent('admin_zone_misa_zona_delete', { event_type: 'mass_zone_deleted', mass_zone_id: massZoneId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_zone_misa_zona.delete: Error', { err, massZoneId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus relasi misa-zona. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
