import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { RosterService } from '$core/service/RosterService';
import { ServiceError, ServiceErrorType } from '$core/errors/ServiceError';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import { checkServerGate, getFeaturePreference } from '$lib/server/featureFlags';
import { repo } from '$lib/server/db';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { parseIndonesianDate } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { read, utils } from 'xlsx';

// ── Column name constants (case-insensitive match against XLSX header row) ─────
const COL_COMMUNITY = 'NAMA LINGKUNGAN';
const COL_DATE = 'HARI/TGL';
const COL_TIME = 'JAM';
const COL_LOCATION = 'LOKASI';

interface RosterUploadResult {
	created: number;
	skipped: number;
	errors: string[];
}

/**
 * Normalise a string for lookup: lowercase, collapse whitespace, trim.
 * Used for fuzzy-matching community names and mass times from the XLSX.
 */
function normalise(s: unknown): string {
	return String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export const load: PageServerLoad = async (event) => {
	// Gate AND explicit opt-in must both be true
	const [isRosterGate, featurePreference] = await Promise.all([
		checkServerGate(event.locals, 'new_roster_flow'),
		getFeaturePreference(event.locals)
	]);
	if (!isRosterGate || featurePreference !== 'new_domain') {
		throw redirect(302, '/admin');
	}

	const { session } = await handlePageLoad(event, 'admin_roster');

	if (!session) {
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid ?? '';
	if (!churchId) {
		logger.error('admin_roster.load: no church ID in session');
		throw error(500, 'Invalid session data');
	}

	const eventService = new EventService(churchId);

	// Upcoming events window: today → 60 days ahead (for manual creation dropdown)
	const today = new Date();
	const sixtyDaysLater = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
	const firstDay = today.toISOString().slice(0, 10);
	const lastDay = sixtyDaysLater.toISOString().slice(0, 10);

	const [communities, upcomingEvents] = await Promise.all([
		repo.listCommunitiesForChurch(churchId),
		eventService.listEventsByDateRange(firstDay, lastDay)
	]);

	logger.debug('admin_roster.load: loaded reference data', {
		communityCount: communities.length,
		upcomingEventCount: upcomingEvents.length
	});

	return { communities, upcomingEvents };
};

export const actions: Actions = {
	/**
	 * Manual roster creation: admin picks one event + selects communities.
	 */
	createRoster: async (event) => {
		const session = await event.locals.auth();
		if (!session) throw error(401, 'Sesi tidak valid');

		const churchId = session.user?.cid ?? '';
		if (!churchId) throw error(500, 'Invalid session data');

		const createdByUserId = session.user?.email ?? session.user?.name ?? '';
		if (!createdByUserId) throw error(401, 'Sesi tidak valid');

		const formData = await event.request.formData();
		const eventId = (formData.get('eventId') as string)?.trim();
		const communityIds = formData.getAll('communityIds').map(String).filter(Boolean);

		if (!eventId) return fail(422, { error: 'Pilih jadwal misa terlebih dahulu.' });
		if (!communityIds.length) return fail(422, { error: 'Pilih minimal satu lingkungan.' });

		const rosterService = new RosterService(repo);

		// Prevent duplicate roster for the same event
		const existing = await rosterService.loadRoster(eventId);
		if (existing) {
			return fail(409, { error: 'Roster untuk jadwal ini sudah ada. Buka halaman detail jadwal untuk mengelolanya.' });
		}

		try {
			const roster = await rosterService.createRoster({ eventId, createdByUserId, communityIds });
			logger.info('admin_roster_create: roster created manually', { rosterId: roster.id, eventId, communityCount: communityIds.length });

			await Promise.all([
				statsigService.logEvent('admin_roster_create_manual', 'submit', session || undefined, {
					event_id: eventId, roster_id: roster.id, community_count: communityIds.length
				}),
				trackServerEvent('admin_roster_create_manual', {
					event_type: 'create_roster_manual', event_id: eventId, roster_id: roster.id, community_count: communityIds.length
				}, session || undefined)
			]);

			return { success: true, created: 1, skipped: 0, errors: [], rosterId: roster.id, eventId };
		} catch (err) {
			if (err instanceof ServiceError) {
				if (err.type === ServiceErrorType.VALIDATION_ERROR) return fail(422, { error: err.message });
				if (err.type === ServiceErrorType.NOT_FOUND_ERROR) return fail(404, { error: err.message });
			}
			logger.error('admin_roster_create: Unexpected error', { err });
			return fail(500, { error: 'Terjadi kesalahan internal. Silakan coba lagi.' });
		}
	},

	uploadRoster: async (event) => {
		const startTime = Date.now();
		const session = await event.locals.auth();

		if (!session) {
			throw error(401, 'Sesi tidak valid');
		}

		const churchId = session.user?.cid ?? '';
		if (!churchId) {
			throw error(500, 'Invalid session data');
		}

		const createdByUserId = session.user?.email ?? session.user?.name ?? '';
		if (!createdByUserId) {
			throw error(401, 'Sesi tidak valid');
		}

		// ── 1. Parse multipart form ────────────────────────────────────────────────
		const formData = await event.request.formData();
		const file = formData.get('file') as File | null;
		const yearStr = (formData.get('year') as string)?.trim();
		const monthStr = (formData.get('month') as string)?.trim();

		if (!file || file.size === 0) {
			return fail(422, { error: 'File XLSX wajib diunggah.' });
		}
		if (!yearStr || !monthStr) {
			return fail(422, { error: 'Tahun dan bulan wajib diisi.' });
		}

		const year = parseInt(yearStr, 10);
		const month = parseInt(monthStr, 10);
		if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
			return fail(422, { error: 'Tahun atau bulan tidak valid.' });
		}

		// ── 2. Parse XLSX ──────────────────────────────────────────────────────────
		let rows: Record<string, unknown>[];
		try {
			const buffer = await file.arrayBuffer();
			const workbook = read(buffer, { type: 'array' });
			const sheet = workbook.Sheets[workbook.SheetNames[0]];
			rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
		} catch (err) {
			logger.error('admin_roster_upload: failed to parse XLSX', { err });
			return fail(422, { error: 'File XLSX tidak dapat dibaca. Pastikan format file benar.' });
		}

		if (rows.length === 0) {
			return fail(422, { error: 'File XLSX kosong atau tidak memiliki data.' });
		}

		// Validate required columns exist
		const firstRow = rows[0];
		const headers = Object.keys(firstRow).map((h) => h.toUpperCase().trim());
		const missingCols = [COL_COMMUNITY, COL_DATE, COL_TIME].filter(
			(col) => !headers.some((h) => h.includes(col))
		);
		if (missingCols.length > 0) {
			return fail(422, {
				error: `Kolom tidak ditemukan dalam file: ${missingCols.join(', ')}. Pastikan header baris pertama sesuai format.`
			});
		}

		// ── 3. Build lookup maps ───────────────────────────────────────────────────
		// Gate AND explicit opt-in must both be true
		const [isRosterGate, featurePreference] = await Promise.all([
			checkServerGate(event.locals, 'new_roster_flow'),
			getFeaturePreference(event.locals)
		]);
		if (!isRosterGate || featurePreference !== 'new_domain') {
			return fail(403, { error: 'Fitur ini belum tersedia.' });
		}

		const churchService = new ChurchService(churchId);
		const eventService = new EventService(churchId);
		const rosterService = new RosterService(repo);

		const [masses, communitiesRaw] = await Promise.all([
			churchService.retrieveMasses(),
			repo.listCommunitiesForChurch(churchId)
		]);

		// community name (normalised) → id  (community table is authoritative when new_domain is active)
		const communityMap = new Map<string, string>(
			communitiesRaw.map((c) => [normalise(c.name), c.id])
		);
		logger.debug('admin_roster_upload: community map', { size: communityMap.size });

		// mass time string (e.g. "17:00") → mass.id
		const massMap = new Map<string, string>();
		for (const m of masses) {
			if (m.time) massMap.set(normalise(m.time), m.id);
		}

		// ── 4. Load events for the month ──────────────────────────────────────────
		const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
		const lastDayDate = new Date(year, month, 0); // day 0 of next month = last day of this month
		const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

		const monthEvents = await eventService.listEventsByDateRange(firstDay, lastDay);
		logger.debug('admin_roster_upload: events for month', {
			year, month, firstDay, lastDay, count: monthEvents.length
		});

		// eventKey `${date}_${massId}_${churchCode}` → event.id
		const eventMap = new Map<string, string>();
		for (const e of monthEvents) {
			if (e.massId && e.date && e.churchCode) {
				const key = `${e.date}_${e.massId}_${normalise(e.churchCode)}`;
				eventMap.set(key, e.id);
			}
		}

		// ── 5. Group XLSX rows by event key → communityIds ────────────────────────
		const result: RosterUploadResult = { created: 0, skipped: 0, errors: [] };

		// Find actual column names from the header (header may have different casing)
		const colMap = Object.fromEntries(
			Object.keys(firstRow).map((h) => [h.toUpperCase().trim(), h])
		);
		const colCommunity = colMap[COL_COMMUNITY];
		const colDate = colMap[COL_DATE];
		const colTime = colMap[COL_TIME];
		const colLocation = colMap[COL_LOCATION];

		// eventKey → { communityIds, rawDate, rawTime, rawLocation }
		const eventGroups = new Map<string, { communityIds: string[]; eventId: string | null }>();

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const rawCommunity = String(row[colCommunity] ?? '').trim();
			const rawDate = String(row[colDate] ?? '').trim();
			const rawTime = String(row[colTime] ?? '').trim();
			const rawLocation = colLocation ? String(row[colLocation] ?? '').trim() : '';

			// Skip empty rows
			if (!rawCommunity && !rawDate && !rawTime) continue;

			// Resolve community
			const communityId = communityMap.get(normalise(rawCommunity));
			if (!communityId) {
				result.errors.push(`Baris ${i + 2}: Lingkungan "${rawCommunity}" tidak ditemukan.`);
				continue;
			}

			// Resolve date
			const isoDate = parseIndonesianDate(rawDate, year);
			if (!isoDate) {
				result.errors.push(`Baris ${i + 2}: Tanggal "${rawDate}" tidak dapat diproses.`);
				continue;
			}

			// Resolve mass by time
			const massId = massMap.get(normalise(rawTime));
			if (!massId) {
				result.errors.push(`Baris ${i + 2}: Jam misa "${rawTime}" tidak ditemukan dalam data misa.`);
				continue;
			}

			// Build event lookup key
			const locationNorm = normalise(rawLocation);
			const eventKey = `${isoDate}_${massId}_${locationNorm}`;
			const eventId = eventMap.get(eventKey) ?? null;

			if (!eventId) {
				result.errors.push(
					`Baris ${i + 2}: Jadwal misa untuk "${rawDate} ${rawTime}${rawLocation ? ' ' + rawLocation : ''}" tidak ditemukan.`
				);
				continue;
			}

			if (!eventGroups.has(eventKey)) {
				eventGroups.set(eventKey, { communityIds: [], eventId });
			}
			eventGroups.get(eventKey)!.communityIds.push(communityId);
		}

		// ── 6. Create rosters ─────────────────────────────────────────────────────
		for (const [, { communityIds, eventId }] of eventGroups) {
			if (!eventId || communityIds.length === 0) continue;

			// Skip if roster already exists
			const existing = await rosterService.loadRoster(eventId);
			if (existing) {
				result.skipped++;
				logger.debug('admin_roster_upload: roster already exists, skipping', { eventId });
				continue;
			}

			await rosterService.createRoster({ eventId, createdByUserId, communityIds });
			result.created++;
			logger.info('admin_roster_upload: roster created', { eventId, communityCount: communityIds.length });
		}

		const metadata = {
			year, month,
			rows_parsed: rows.length,
			rosters_created: result.created,
			rosters_skipped: result.skipped,
			error_count: result.errors.length,
			processing_time_ms: Date.now() - startTime
		};

		await Promise.all([
			statsigService.logEvent('admin_roster_upload', 'submit', session || undefined, metadata),
			trackServerEvent('admin_roster_upload', { event_type: 'upload', ...metadata }, session || undefined)
		]);

		logger.info('admin_roster_upload: complete', metadata);

		return {
			success: true,
			created: result.created,
			skipped: result.skipped,
			errors: result.errors
		};
	}
};
