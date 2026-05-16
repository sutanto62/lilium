import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { RosterService } from '$core/service/RosterService';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';
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
	const { session } = await handlePageLoad(event, 'jadwal_roster_upload');

	if (!session) {
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid ?? '';
	if (!churchId) {
		logger.error('admin_roster_upload.load: no church ID in session');
		throw error(500, 'Invalid session data');
	}

	const churchService = new ChurchService(churchId);
	const [lingkungans, masses] = await Promise.all([
		churchService.retrieveLingkungans(),
		churchService.retrieveMasses()
	]);

	logger.debug('admin_roster_upload.load: loaded reference data', {
		lingkunganCount: lingkungans.length,
		massCount: masses.length
	});

	return { lingkungans, masses };
};

export const actions: Actions = {
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
		const churchService = new ChurchService(churchId);
		const eventService = new EventService(churchId);
		const rosterService = new RosterService(repo);

		const [lingkungans, masses] = await Promise.all([
			churchService.retrieveLingkungans(),
			churchService.retrieveMasses()
		]);

		// community name (normalised) → community.id
		const communityMap = new Map<string, string>(
			lingkungans.map((l) => [normalise(l.name), l.id])
		);

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
			posthogService.trackEvent('admin_roster_upload', { event_type: 'upload', ...metadata }, session || undefined)
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
