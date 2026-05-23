import { hasRole } from '$src/auth';
import type { Section, Zone, Station } from '$core/entities/Facility';
import type { Ministry } from '$core/entities/Ministry';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { ServiceError } from '$core/errors/ServiceError';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAdminSession } from '$lib/server/auth-guards';
import { parseFormFields, parseNumericField, parseJsonField } from '$lib/server/form-helpers';
import { OPERATION_ERRORS, VALIDATION_ERRORS } from '$lib/server/settings-errors';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	const { isNewDomainEligible, featurePreference } = await event.parent();
	if (!isNewDomainEligible || featurePreference !== 'new_domain') {
		throw redirect(302, '/admin/settings');
	}

	const { session } = await handlePageLoad(event, 'struktur');
	if (!session) {
		logger.warn('admin_struktur.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_struktur.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_struktur.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	let sections: Section[] = [];
	let zones: Zone[] = [];
	let stations: Station[] = [];
	let ministries: Ministry[] = [];

	try {
		[sections, zones, ministries] = await Promise.all([
			repo.listSectionsByChurch(churchId),
			repo.listZonesByChurch(churchId),
			repo.listMinistries()
		]);
		// Note: N+1 pattern for stations — load by zone ID
		// TODO: Add listStationsByChurch(churchId) to repo to batch this query
		const stationsByZone = await Promise.all(zones.map((z) => repo.listStationsByZone(z.id)));
		stations = stationsByZone.flat();
	} catch (err) {
		logger.error('admin_struktur.load: Error fetching data', { err, churchId });
		throw error(500, 'Failed to fetch structure data');
	}

	const metadata = {
		total_sections: sections.length,
		total_zones: zones.length,
		total_stations: stations.length,
		load_time_ms: Date.now() - startTime
	};

	await Promise.all([
		statsigService.logEvent('admin_struktur_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_struktur_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { sections, zones, stations, ministries, churchId };
};



// ── Actions ───────────────────────────────────────────────────────────────────

export const actions = {

	// ── Seksi ──────────────────────────────────────────────────────────────────

	createSeksi: async ({ request, locals }) => {
		const { ok, session, churchId, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const { name, code, description } = parseFormFields(fd, ['name', 'code', 'description']);
		const sequence = parseNumericField(fd, 'sequence');

		if (!name) return fail(400, { error: VALIDATION_ERRORS.NAME_REQUIRED });

		try {
			await repo.createSection({ name, code, description, sequence, churchId: churchId!, active: 1 });
			await Promise.all([
				statsigService.logEvent('admin_struktur_seksi_create', 'create', session!, { church_id: churchId }),
				trackServerEvent('admin_struktur_seksi_create', { event_type: 'section_created', church_id: churchId }, session!)
			]);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.createSeksi: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.SECTION_CREATE });
		}
	},

	updateSeksi: async ({ request, locals }) => {
		const { ok, session, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const sectionId = fd.get('sectionId') as string;
		if (!sectionId) return fail(400, { error: VALIDATION_ERRORS.ID_NOT_FOUND });

		const { name, code, description } = parseFormFields(fd, ['name', 'code', 'description']);
		const sequence = parseNumericField(fd, 'sequence');

		if (!name) return fail(400, { error: VALIDATION_ERRORS.NAME_REQUIRED });

		try {
			const result = await repo.updateSection(sectionId, { name, code, description, sequence });
			if (!result) return fail(404, { error: OPERATION_ERRORS.NOT_FOUND });
			await Promise.all([
				statsigService.logEvent('admin_struktur_seksi_update', 'update', session!, { section_id: sectionId }),
				trackServerEvent('admin_struktur_seksi_update', { event_type: 'section_updated', section_id: sectionId }, session!)
			]);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.updateSeksi: Error', { err, sectionId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.SECTION_UPDATE });
		}
	},

	deleteSeksi: async ({ request, locals }) => {
		const { ok, session, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const sectionId = fd.get('sectionId') as string;
		if (!sectionId) return fail(400, { error: VALIDATION_ERRORS.ID_NOT_FOUND });

		try {
			const result = await repo.deactivateSection(sectionId);
			if (!result) return fail(404, { error: OPERATION_ERRORS.NOT_FOUND });
			await Promise.all([
				statsigService.logEvent('admin_struktur_seksi_delete', 'delete', session!, { section_id: sectionId }),
				trackServerEvent('admin_struktur_seksi_delete', { event_type: 'section_deleted', section_id: sectionId }, session!)
			]);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.deleteSeksi: Error', { err, sectionId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.SECTION_DELETE });
		}
	},

	// ── Zona ───────────────────────────────────────────────────────────────────

	createZona: async ({ request, locals }) => {
		const { ok, session, churchId, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const { name, code, description, sectionId } = parseFormFields(fd, ['name', 'code', 'description', 'sectionId']);
		const sequence = parseNumericField(fd, 'sequence');

		if (!name) return fail(400, { error: VALIDATION_ERRORS.NAME_REQUIRED });

		try {
			await repo.createNewZone({ name, code, description, sectionId, sequence, churchId: churchId!, active: 1 });
			await Promise.all([
				statsigService.logEvent('admin_struktur_zona_create', 'create', session!, { church_id: churchId }),
				trackServerEvent('admin_struktur_zona_create', { event_type: 'zone_created', church_id: churchId }, session!)
			]);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.createZona: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.ZONE_CREATE });
		}
	},

	updateZona: async ({ request, locals }) => {
		const { ok, session, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const zoneId = fd.get('zoneId') as string;
		if (!zoneId) return fail(400, { error: VALIDATION_ERRORS.ID_NOT_FOUND });

		const { name, code, description, sectionId } = parseFormFields(fd, ['name', 'code', 'description', 'sectionId']);
		const sequence = parseNumericField(fd, 'sequence');

		if (!name) return fail(400, { error: VALIDATION_ERRORS.NAME_REQUIRED });

		try {
			const result = await repo.updateNewZone(zoneId, { name, code, description, sectionId, sequence });
			if (!result) return fail(404, { error: OPERATION_ERRORS.NOT_FOUND });
			await Promise.all([
				statsigService.logEvent('admin_struktur_zona_update', 'update', session!, { zone_id: zoneId }),
				trackServerEvent('admin_struktur_zona_update', { event_type: 'zone_updated', zone_id: zoneId }, session!)
			]);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.updateZona: Error', { err, zoneId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.ZONE_UPDATE });
		}
	},

	deleteZona: async ({ request, locals }) => {
		const { ok, session, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const zoneId = fd.get('zoneId') as string;
		if (!zoneId) return fail(400, { error: VALIDATION_ERRORS.ID_NOT_FOUND });

		try {
			const result = await repo.deactivateNewZone(zoneId);
			if (!result) return fail(404, { error: OPERATION_ERRORS.NOT_FOUND });
			await Promise.all([
				statsigService.logEvent('admin_struktur_zona_delete', 'delete', session!, { zone_id: zoneId }),
				trackServerEvent('admin_struktur_zona_delete', { event_type: 'zone_deleted', zone_id: zoneId }, session!)
			]);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.deleteZona: Error', { err, zoneId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.ZONE_DELETE });
		}
	},

	// ── Station ────────────────────────────────────────────────────────────────

	createStation: async ({ request, locals }) => {
		const { ok, session, churchId, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const { name, code, description, zoneId, ministryId } = parseFormFields(fd, ['name', 'code', 'description', 'zoneId', 'ministryId']);
		const sequence = parseNumericField(fd, 'sequence');

		if (!name) return fail(400, { error: VALIDATION_ERRORS.NAME_REQUIRED });
		if (!zoneId) return fail(400, { error: VALIDATION_ERRORS.ZONE_REQUIRED });
		if (!ministryId) return fail(400, { error: VALIDATION_ERRORS.MINISTRY_REQUIRED });

		try {
			await repo.createStation({ name, code, description, zoneId, ministryId, defaultRoleId: null, sequence, churchId: churchId!, active: 1 });
			await Promise.all([
				statsigService.logEvent('admin_struktur_station_create', 'create', session!, { church_id: churchId }),
				trackServerEvent('admin_struktur_station_create', { event_type: 'station_created', church_id: churchId }, session!)
			]);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.createStation: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.STATION_CREATE });
		}
	},

	updateStation: async ({ request, locals }) => {
		const { ok, session, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const stationId = fd.get('stationId') as string;
		if (!stationId) return fail(400, { error: VALIDATION_ERRORS.ID_NOT_FOUND });

		const { name, code, description, zoneId, ministryId } = parseFormFields(fd, ['name', 'code', 'description', 'zoneId', 'ministryId']);
		const sequence = parseNumericField(fd, 'sequence');

		if (!name) return fail(400, { error: VALIDATION_ERRORS.NAME_REQUIRED });
		if (!zoneId) return fail(400, { error: VALIDATION_ERRORS.ZONE_REQUIRED });
		if (!ministryId) return fail(400, { error: VALIDATION_ERRORS.MINISTRY_REQUIRED });

		try {
			const result = await repo.updateStation(stationId, { name, code, description, zoneId, ministryId, sequence });
			if (!result) return fail(404, { error: OPERATION_ERRORS.NOT_FOUND });
			await Promise.all([
				statsigService.logEvent('admin_struktur_station_update', 'update', session!, { station_id: stationId }),
				trackServerEvent('admin_struktur_station_update', { event_type: 'station_updated', station_id: stationId }, session!)
			]);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.updateStation: Error', { err, stationId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.STATION_UPDATE });
		}
	},

	deleteStation: async ({ request, locals }) => {
		const { ok, session, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const stationId = fd.get('stationId') as string;
		if (!stationId) return fail(400, { error: VALIDATION_ERRORS.ID_NOT_FOUND });

		try {
			const result = await repo.deactivateStation(stationId);
			if (!result) return fail(404, { error: OPERATION_ERRORS.NOT_FOUND });
			await Promise.all([
				statsigService.logEvent('admin_struktur_station_delete', 'delete', session!, { station_id: stationId }),
				trackServerEvent('admin_struktur_station_delete', { event_type: 'station_deleted', station_id: stationId }, session!)
			]);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.deleteStation: Error', { err, stationId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.STATION_DELETE });
		}
	},

	// ── Reorder (batch sequence update, called via fetch from DnD handler) ─────

	reorder: async ({ request, locals }) => {
		const { ok, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const entity = fd.get('entity') as 'seksi' | 'zona' | 'station';
		const ids = parseJsonField<string[]>(fd, 'ids');
		if (!entity || !ids) return fail(400, { error: 'Data urutan tidak valid' });

		try {
			await Promise.all(
				ids.map((id, index) => {
					if (entity === 'seksi') return repo.updateSection(id, { sequence: index });
					if (entity === 'zona') return repo.updateNewZone(id, { sequence: index });
					return repo.updateStation(id, { sequence: index });
				})
			);
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.reorder: Error', { err, entity });
			return fail(500, { error: OPERATION_ERRORS.REORDER_FAILED });
		}
	},

	// ── Move (re-parent via DnD, called via fetch) ────────────────────────────

	move: async ({ request, locals }) => {
		const { ok, err } = await requireAdminSession(locals);
		if (!ok) return err;

		const fd = await request.formData();
		const entity = fd.get('entity') as 'zona' | 'station';
		const id = fd.get('id') as string;
		const newParentId = (fd.get('newParentId') as string) || null;

		if (!entity || !id) return fail(400, { error: 'Data perpindahan tidak valid' });

		try {
			if (entity === 'zona') {
				const result = await repo.updateNewZone(id, { sectionId: newParentId, sequence: 9999 });
				if (!result) return fail(404, { error: OPERATION_ERRORS.NOT_FOUND });
			} else {
				if (!newParentId) return fail(400, { error: VALIDATION_ERRORS.ZONE_REQUIRED });
				const result = await repo.updateStation(id, { zoneId: newParentId, sequence: 9999 });
				if (!result) return fail(404, { error: OPERATION_ERRORS.NOT_FOUND });
			}
			return { success: true };
		} catch (err) {
			logger.error('admin_struktur.move: Error', { err, entity, id });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: OPERATION_ERRORS.MOVE_FAILED });
		}
	}

} satisfies Actions;
