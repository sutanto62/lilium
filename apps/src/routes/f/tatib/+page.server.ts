import type { EventUsher } from '$core/entities/Event';
import type { Church } from '$core/entities/Schedule';
import type { MinistryRole } from '$core/entities/Ministry';
import type { RosterEntry } from '$core/entities/Roster';
import { ServiceError, ServiceErrorType } from '$core/errors/ServiceError';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { MinistryService } from '$core/service/MinistryService';
import { RosterService } from '$core/service/RosterService';
import { QueueManager } from '$core/service/QueueManager';
import { UsherService } from '$core/service/UsherService';
import { repo } from '$lib/server/db';
import { checkServerGate } from '$lib/server/featureFlags';
import { formatDate, getWeekNumber } from '$lib/utils/dateUtils';
import { validateUsherNames } from '$lib/utils/usherValidation';
import { shouldRequirePpg } from '$lib/utils/ppgUtils';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';
import { logger } from '$src/lib/utils/logger';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const queueManager = QueueManager.getInstance();

/**
 * Determines if the usher confirmation form should be shown based on:
 * 1. Feature flag 'no_saturday_sunday' - if enabled, only show on weekdays
 * 2. Current day of week - weekdays (Mon-Fri) are always allowed
 *
 * @returns {Promise<boolean>} True if form should be shown, false otherwise
 */
async function shouldShowUsherForm(): Promise<boolean> {
	const isNoSaturdaySundayEnabled = await statsigService.checkGate('no_saturday_sunday');

	// If feature flag is disabled, always show form
	if (!isNoSaturdaySundayEnabled) {
		return true;
	}

	// If feature flag is enabled, only show on weekdays (Mon-Fri)
	const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	const isWeekday = [1, 2, 3, 4, 5].includes(today);
	const currentDay = getCurrentDayName();

	logger.info(`Form visibility check: day=${currentDay}, isWeekday=${isWeekday}, featureFlag=${isNoSaturdaySundayEnabled}`);

	return isWeekday;
}

/**
 * Gets the current day name for better logging and user feedback
 * @returns {string} Day name in Indonesian
 */
function getCurrentDayName(): string {
	const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
	const today = new Date().getDay();
	return days[today];
}

/**
 * PageServerLoad function for the form-tatib page.
 *
 * When the `new_roster_flow` gate is on AND `rosterId` + `communityId` query
 * params are present, loads the specific RosterEntry for the community to display
 * the new public submission form (D4: no login required).
 *
 * When the gate is off or params are absent, falls back to the legacy form.
 *
 * @returns Combined data for both old and new form variants
 */
export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	// Get session if available (public page, but users might be logged in)
	const session = await event.locals.auth();

	// Check new_roster_flow gate
	const isNewRosterFlow = await checkServerGate(event.locals, 'new_roster_flow');

	// Extract optional new-flow params from the query string.
	// Both must be present to enter the new roster flow; absence falls back to the legacy path.
	const rosterId = event.url.searchParams.get('rosterId');
	const communityId = event.url.searchParams.get('communityId');
	const hasNewFlowParams = !!rosterId && !!communityId;

	logger.debug('tatib.load: gate check', { isNewRosterFlow, hasNewFlowParams, rosterId, communityId });

	// ── New roster flow path ────────────────────────────────────────────────────
	if (isNewRosterFlow && hasNewFlowParams) {
		logger.debug('tatib.load: new roster flow — validating token', { rosterId, communityId });
		// Load roster entry — validate token (rosterId + communityId) against DB
		let rosterEntry: RosterEntry | null = null;
		let ministryRoles: MinistryRole[] = [];

		try {
			// We load by rosterId directly via findRosterById
			const fullRoster = await repo.findRosterById(rosterId);
			if (!fullRoster) {
				logger.warn('tatib.load: roster not found', { rosterId });
				throw error(404, 'Roster tidak ditemukan');
			}

			// Find the entry for this community
			rosterEntry = fullRoster.entries.find((e) => e.communityId === communityId) ?? null;
			if (!rosterEntry) {
				logger.warn('tatib.load: community entry not found in roster', { rosterId, communityId });
				throw error(404, 'Data komunitas tidak ditemukan dalam roster ini');
			}

			logger.debug('tatib.load: token valid', { rosterId, communityId, entryStatus: rosterEntry.status });

			// Load USHER ministry roles for the form
			const ministryService = new MinistryService(repo);
			const ministries = await ministryService.listMinistries();
			const usherMinistry = ministries.find((m) => m.code === 'USHER');
			if (usherMinistry) {
				ministryRoles = await ministryService.listRolesByMinistry(usherMinistry.id);
			} else {
				logger.warn('tatib.load: USHER ministry not found — role selector will be empty');
			}
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err) throw err; // re-throw SvelteKit errors
			logger.error('tatib_new_view.load: Error loading roster entry', { err, rosterId, communityId });
			throw error(500, 'Gagal memuat data roster');
		}

		const loadMetadata = {
			load_time_ms: Date.now() - startTime,
			roster_id: rosterId,
			community_id: communityId,
			entry_status: rosterEntry?.status ?? 'unknown'
		};

		await Promise.all([
			statsigService.logEvent('tatib_new_view', 'load', session || undefined, loadMetadata),
			posthogService.trackEvent('tatib_new_view', { event_type: 'page_load', ...loadMetadata }, session || undefined)
		]);

		return {
			isNewRosterFlow: true,
			rosterEntry,
			ministryRoles,
			rosterId,
			communityId,
			// Legacy fields — not used in new flow but required for type compatibility
			church: null,
			wilayahs: [],
			lingkungans: [],
			events: [],
			eventsDate: [],
			success: false,
			assignedUshers: [],
			formData: null,
			showForm: true,
			requirePpg: false,
			currentDay: getCurrentDayName(),
			formAvailabilityReason: 'Form tersedia'
		};
	}

	// ── Legacy path ────────────────────────────────────────────────────────────
	logger.debug('tatib.load: legacy path');
	// Get church ID from cookie
	const churchId = event.cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID;

	// Show form if not no_saturday_sunday
	const showForm = await shouldShowUsherForm();

	let church: Church | null = null;
	church = await repo.findChurchById(churchId);
	if (!church) {
		throw error(404, 'Gereja belum terdaftar');
	}

	// Check if PPG is required for this church
	const requirePpg = await shouldRequirePpg(church);

	const churchService = new ChurchService(churchId);
	const eventService = new EventService(churchId);

	let weekNumber = getWeekNumber();

	try {
		const [wilayahs, lingkungans, events] = await Promise.all([
			churchService.retrieveWilayahs(),
			churchService.retrieveLingkungans(),
			eventService.retrieveEventsByWeekRange({ weekNumber }),
		]);

		// Return unique events date sort ascending
		const eventsDate = events.length
			? [...new Set(events.map(event => event.date))]
			: [];

		// Track page load with performance and metadata
		const pageLoadMetadata = {
			load_time_ms: Date.now() - startTime,
			total_events: events.length,
			events_date_count: eventsDate.length,
			wilayahs_count: wilayahs.length,
			lingkungans_count: lingkungans.length,
			show_form: showForm,
			require_ppg: requirePpg,
			current_day: getCurrentDayName(),
			has_events: events.length > 0
		};

		await Promise.all([
			statsigService.logEvent('tatib_view_server', 'load', session || undefined, pageLoadMetadata),
			posthogService.trackEvent('tatib_view_server', {
				event_type: 'page_load',
				...pageLoadMetadata
			}, session || undefined)
		]);

		return {
			isNewRosterFlow: false,
			rosterEntry: null,
			ministryRoles: [],
			rosterId: null,
			communityId: null,
			church,
			wilayahs,
			lingkungans,
			events,
			eventsDate,
			success: false,
			assignedUshers: [],
			formData: null,
			showForm,
			requirePpg,
			currentDay: getCurrentDayName(),
			formAvailabilityReason: showForm ? 'Form tersedia' : 'Form hanya tersedia pada hari kerja (Senin-Kamis)'
		};
	} catch (err) {
		logger.error('tatib_view_server: Error fetching data', err);

		const errorMetadata = {
			error_type: err instanceof Error ? err.name : 'unknown',
			error_message: err instanceof Error ? err.message : String(err)
		};

		await Promise.all([
			statsigService.logEvent('tatib_error', 'data_fetch_failed', session || undefined, errorMetadata),
			posthogService.trackEvent('tatib_error', {
				event_type: 'data_fetch_failed',
				...errorMetadata
			}, session || undefined)
		]);

		throw error(500, 'Gagal memuat jadwal misa, wilayah, dan lingkungan');
	}
};

export const actions = {
	/**
	 * New roster flow action: submit usher names for a community's roster entry.
	 * Transitions the entry from draft → submitted.
	 * Public form — D4: no auth guard.
	 */
	submitRosterEntry: async ({ request, url, locals }) => {
		const startTime = Date.now();
		const session = await locals.auth();

		const formData = await request.formData();
		const rosterId = (formData.get('rosterId') as string)?.trim();
		const communityId = (formData.get('communityId') as string)?.trim();
		const ushersJson = (formData.get('ushers') as string)?.trim();

		logger.debug('tatib.submitRosterEntry: received', { rosterId, communityId, hasUshers: !!ushersJson });

		if (!rosterId || !communityId) {
			return fail(400, { error: 'Data roster tidak lengkap. Silakan akses ulang halaman ini.' });
		}

		if (!ushersJson) {
			return fail(422, { error: 'Mohon masukkan nama petugas.' });
		}

		// Validate token: rosterId + communityId must exist in DB
		let parsedUshers: Array<{ name: string; ministryRoleCode: string }>;
		try {
			parsedUshers = JSON.parse(ushersJson);
		} catch {
			return fail(422, { error: 'Format data petugas tidak valid.' });
		}

		if (!Array.isArray(parsedUshers) || parsedUshers.length === 0) {
			return fail(422, { error: 'Mohon masukkan minimal satu nama petugas.' });
		}

		// Validate each usher has a name and a role code
		for (const usher of parsedUshers) {
			if (!usher.name?.trim()) {
				return fail(422, { error: 'Semua petugas harus memiliki nama.' });
			}
			if (!usher.ministryRoleCode?.trim()) {
				return fail(422, { error: 'Semua petugas harus memiliki peran.' });
			}
		}

		logger.debug('tatib.submitRosterEntry: validating token and entry status', { rosterId, communityId, usherCount: parsedUshers.length });
		const rosterService = new RosterService(repo);

		try {
			// Verify the roster entry exists (token validation against DB)
			const roster = await repo.findRosterById(rosterId);
			if (!roster) {
				logger.warn('tatib.submitRosterEntry: roster not found', { rosterId });
				return fail(404, { error: 'Roster tidak ditemukan.' });
			}

			const entry = roster.entries.find((e) => e.communityId === communityId);
			if (!entry) {
				logger.warn('tatib.submitRosterEntry: community not in roster', { rosterId, communityId });
				return fail(404, { error: 'Data komunitas tidak ditemukan dalam roster ini.' });
			}

			logger.debug('tatib.submitRosterEntry: token OK, entry status', { rosterId, communityId, status: entry.status });

			if (entry.status !== 'draft') {
				// Community already submitted — show read-only validation error (not a 500)
				return fail(422, {
					error: `Konfirmasi petugas sudah ${entry.status === 'submitted' ? 'tersubmit' : 'dikonfirmasi'}. Tidak dapat disubmit ulang.`
				});
			}

			const updatedEntry = await rosterService.submitEntry({
				rosterId,
				communityId,
				ushers: parsedUshers
			});

			const successMetadata = {
				processing_time_ms: Date.now() - startTime,
				community_name: entry.communityName,
				wilayah_name: entry.wilayahName,
				roster_id: rosterId,
				ushers_count: parsedUshers.length
			};

			await Promise.all([
				statsigService.logEvent('tatib_new_submit', 'success', session || undefined, successMetadata),
				posthogService.trackEvent('tatib_new_submit', {
					event_type: 'success',
					...successMetadata
				}, session || undefined)
			]);

			return {
				success: true,
				rosterEntry: updatedEntry,
				communityName: entry.communityName,
				wilayahName: entry.wilayahName,
				ushersCount: parsedUshers.length
			};
		} catch (err) {
			if (err instanceof ServiceError) {
				const errMetadata = { error_type: err.type, error_message: err.message };

				switch (err.type) {
					case ServiceErrorType.VALIDATION_ERROR:
						await Promise.all([
							statsigService.logEvent('tatib_new_error', 'validation_error', session || undefined, errMetadata),
							posthogService.trackEvent('tatib_new_error', { event_type: 'validation_error', ...errMetadata }, session || undefined)
						]);
						return fail(422, { error: err.message });
					case ServiceErrorType.CONFLICT_ERROR:
						await Promise.all([
							statsigService.logEvent('tatib_new_error', 'conflict', session || undefined, errMetadata),
							posthogService.trackEvent('tatib_new_error', { event_type: 'conflict', ...errMetadata }, session || undefined)
						]);
						return fail(409, {
							error: 'Data sedang diperbarui oleh pengguna lain. Silakan muat ulang halaman dan coba lagi.'
						});
					case ServiceErrorType.NOT_FOUND_ERROR:
						return fail(404, { error: err.message });
					default:
						logger.error('tatib_new_error: Service error', { err });
						return fail(500, { error: 'Terjadi kesalahan sistem. Silakan coba lagi.' });
				}
			}

			logger.error('tatib_new_error: Unexpected error', { err });
			return fail(500, { error: 'Terjadi kesalahan internal.' });
		}
	},

	/**
	 * Legacy default action: handles form submission for confirming ushers for a church event.
	 */
	default: async ({ request, cookies, locals }) => {
		const startTime = Date.now();

		// Get session if available (public page, but users might be logged in)
		const session = await locals.auth();

		const churchId = cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID;
		if (!churchId) {
			const errorMetadata = {
				error_type: 'missing_church_id',
				error_message: 'Tidak ada gereja yang terdaftar'
			};

			await Promise.all([
				statsigService.logEvent('tatib_error', 'missing_church_id', session || undefined, errorMetadata),
				posthogService.trackEvent('tatib_error', {
					event_type: 'missing_church_id',
					...errorMetadata
				}, session || undefined)
			]);

			return fail(404, { error: 'Tidak ada gereja yang terdaftar' }); // check session cookie
		}

		const eventService = new EventService(churchId);
		const usherService = new UsherService(churchId);

		const formData = await request.formData();
		const scheduledDate = formData.get('eventDate') as string;
		const scheduledEventId = formData.get('eventId') as string;
		const wilayahId = formData.get('wilayahId') as string;
		const lingkunganId = formData.get('lingkunganId') as string;
		const ushersJson = formData.get('ushers') as string;

		let epochCreatedDate: number;

		// Show form if not no_saturday_sunday
		const showForm = await shouldShowUsherForm();

		const formValues = {
			eventDate: scheduledDate,
			eventId: scheduledEventId,
			wilayahId,
			lingkunganId,
			ushers: ushersJson
		};

		// Validate to reject entry if submittedAt weekday is Sunday, Friday, and Saturday
		if (!showForm) {
			const currentDay = getCurrentDayName();
			logger.warn(`lingkungan ${lingkunganId} tried to confirm at closed window on ${currentDay}`);

			const errorMetadata = {
				error_type: 'closed_window',
				error_message: `Konfirmasi tugas hanya tersedia pada hari Senin s.d. Kamis. Hari ini: ${currentDay}`,
				current_day: currentDay,
				lingkungan_id: lingkunganId
			};

			await Promise.all([
				statsigService.logEvent('tatib_error', 'closed_window', session || undefined, errorMetadata),
				posthogService.trackEvent('tatib_error', {
					event_type: 'closed_window',
					...errorMetadata
				}, session || undefined)
			]);

			return fail(422, {
				error: `Konfirmasi tugas hanya tersedia pada hari Senin s.d. Kamis. Hari ini: ${currentDay}`,
				formData: formValues
			});
		}

		// Validate mandatory input
		if ((!scheduledEventId) || !wilayahId || !lingkunganId || !ushersJson) {
			const errorMetadata = {
				error_type: 'validation_error',
				error_message: 'Mohon lengkapi semua isian.',
				has_event_id: !!scheduledEventId,
				has_wilayah_id: !!wilayahId,
				has_lingkungan_id: !!lingkunganId,
				has_ushers: !!ushersJson
			};

			await Promise.all([
				statsigService.logEvent('tatib_error', 'validation_error', session || undefined, errorMetadata),
				posthogService.trackEvent('tatib_error', {
					event_type: 'validation_error',
					...errorMetadata
				}, session || undefined)
			]);

			return fail(422, { error: 'Mohon lengkapi semua isian.', formData: formValues });
		}

		try {
			// Get the mass ID from the event
			const confirmedEvent = await eventService.retrieveEventById(scheduledEventId)

			// Get church and check PPG requirement for validation
			const church = await repo.findChurchById(churchId);
			if (!church) {
				throw error(404, 'Gereja belum terdaftar');
			}
			const requirePpg = await shouldRequirePpg(church);

			// TODO: change to service
			const [selectedMass, selectedLingkungan, massZonePositions] = await Promise.all([
				repo.getMassById(confirmedEvent.mass),
				repo.findLingkunganById(lingkunganId),
				repo.listPositionByMass(churchId, confirmedEvent.mass)
			]);

			// Validate mass ushers position
			if (massZonePositions.length === 0) {
				logger.warn(`mass zone position not found: ${selectedMass?.name}.`);
				const errorMetadata = {
					error_type: 'mass_zone_position_not_found',
					error_message: `Misa ${selectedMass?.name} belum memiliki titik tugas.`,
					mass_name: selectedMass?.name
				};

				await Promise.all([
					statsigService.logEvent('tatib_error', 'mass_zone_position_not_found', session || undefined, errorMetadata),
					posthogService.trackEvent('tatib_error', {
						event_type: 'mass_zone_position_not_found',
						...errorMetadata
					}, session || undefined)
				]);

				return fail(404, { error: `Misa ${selectedMass?.name} belum memiliki titik tugas.` });
			}

			if (!selectedMass) {
				logger.warn(`mass not found.`);
				const errorMetadata = {
					error_type: 'mass_not_found',
					error_message: 'Misa tidak ditemukan'
				};

				await Promise.all([
					statsigService.logEvent('tatib_error', 'mass_not_found', session || undefined, errorMetadata),
					posthogService.trackEvent('tatib_error', {
						event_type: 'mass_not_found',
						...errorMetadata
					}, session || undefined)
				]);

				return fail(404, { error: `Misa tidak ditemukan` });
			}

			if (!selectedLingkungan) {
				logger.warn(`lingkungan not found`);
				const errorMetadata = {
					error_type: 'lingkungan_not_found',
					error_message: 'Lingkungan tidak ditemukan',
					lingkungan_id: lingkunganId
				};

				await Promise.all([
					statsigService.logEvent('tatib_error', 'lingkungan_not_found', session || undefined, errorMetadata),
					posthogService.trackEvent('tatib_error', {
						event_type: 'lingkungan_not_found',
						...errorMetadata
					}, session || undefined)
				]);

				return fail(404, { error: 'Lingkungan tidak ditemukan' });
			}

			// Validate ushers
			let ushersArray: EventUsher[];
			try {
				ushersArray = JSON.parse(ushersJson);
			} catch (err) {
				logger.warn(`failed to parse ushers list`);
				const errorMetadata = {
					error_type: 'parse_error',
					error_message: 'Gagal parsing data petugas'
				};

				await Promise.all([
					statsigService.logEvent('tatib_error', 'parse_error', session || undefined, errorMetadata),
					posthogService.trackEvent('tatib_error', {
						event_type: 'parse_error',
						...errorMetadata
					}, session || undefined)
				]);

				return fail(422, { error: 'Gagal parsing data petugas' });
			}

			const validation = validateUsherNames(ushersArray, requirePpg);
			if (!validation.isValid) {
				logger.warn(`invalid ushers list: ${validation.error} (requirePpg=${requirePpg})`);
				const errorMetadata = {
					error_type: 'validation_error',
					error_message: validation.error,
					ushers_count: ushersArray.length,
					require_ppg: requirePpg
				};

				await Promise.all([
					statsigService.logEvent('tatib_error', 'validation_error', session || undefined, errorMetadata),
					posthogService.trackEvent('tatib_error', {
						event_type: 'validation_error',
						...errorMetadata
					}, session || undefined)
				]);

				return fail(422, { error: validation.error, formData: formValues });
			}

			// Insert ushers into event
			try {
				epochCreatedDate = await usherService.assignEventUshers(
					confirmedEvent.id,
					ushersArray,
					wilayahId,
					lingkunganId
				);
			} catch (error: unknown) {
				// Handle ServiceError types appropriately
				if (error instanceof ServiceError) {
					const errorMetadata = {
						error_type: error.type,
						error_message: error.message
					};

					switch (error.type) {
						case ServiceErrorType.VALIDATION_ERROR:
							await Promise.all([
								statsigService.logEvent('tatib_error', 'validation_error', session || undefined, errorMetadata),
								posthogService.trackEvent('tatib_error', {
									event_type: 'validation_error',
									...errorMetadata
								}, session || undefined)
							]);
							return fail(422, {
								error: error.message,
								formData: formValues
							});
						case ServiceErrorType.DUPLICATE_ERROR:
							await Promise.all([
								statsigService.logEvent('tatib_error', 'duplicate_error', session || undefined, errorMetadata),
								posthogService.trackEvent('tatib_error', {
									event_type: 'duplicate_error',
									...errorMetadata
								}, session || undefined)
							]);
							return fail(400, {
								error: error.message,
								formData: formValues
							});
						case ServiceErrorType.DATABASE_ERROR:
							logger.error('tatib_error: Database error in usher assignment', error);
							await Promise.all([
								statsigService.logEvent('tatib_error', 'database_error', session || undefined, errorMetadata),
								posthogService.trackEvent('tatib_error', {
									event_type: 'database_error',
									...errorMetadata
								}, session || undefined)
							]);
							return fail(500, {
								error: 'Terjadi kesalahan sistem. Silakan coba lagi.',
								formData: formValues
							});
						default:
							logger.error('tatib_error: Unknown service error', error);
							await Promise.all([
								statsigService.logEvent('tatib_error', 'unknown_service_error', session || undefined, errorMetadata),
								posthogService.trackEvent('tatib_error', {
									event_type: 'unknown_service_error',
									...errorMetadata
								}, session || undefined)
							]);
							return fail(500, {
								error: 'Terjadi kesalahan internal.',
								formData: formValues
							});
					}
				}

				// Handle unexpected errors
				logger.error('tatib_error: Unexpected error in usher assignment', error);
				const errorMetadata = {
					error_type: 'unexpected_error',
					error_message: error instanceof Error ? error.message : 'Detail tidak diketahui'
				};

				await Promise.all([
					statsigService.logEvent('tatib_error', 'unexpected_error', session || undefined, errorMetadata),
					posthogService.trackEvent('tatib_error', {
						event_type: 'unexpected_error',
						...errorMetadata
					}, session || undefined)
				]);

				return fail(500, {
					error: 'Terjadi kesalahan internal: ' + (error instanceof Error ? error.message : 'Detail tidak diketahui'),
					formData: formValues
				});
			}

			// Update ushers with position
			try {
				await queueManager.submitConfirmationQueue(confirmedEvent, selectedLingkungan);
				await queueManager.processQueue();
				queueManager.reset();
			} catch (err) {
				logger.warn('tatib_error: failed processing queue', err);
				const errorMetadata = {
					error_type: 'queue_processing_error',
					error_message: err instanceof Error ? err.message : 'Detail tidak diketahui'
				};

				await Promise.all([
					statsigService.logEvent('tatib_error', 'queue_processing_error', session || undefined, errorMetadata),
					posthogService.trackEvent('tatib_error', {
						event_type: 'queue_processing_error',
						...errorMetadata
					}, session || undefined)
				]);

				if (err instanceof Error)
					return fail(404, { error: err.message });
			}

			const createdDate = new Date(epochCreatedDate);
			const processingTime = Date.now() - startTime;

			// Return ushers position to client
			const submitted = formatDate(createdDate.toISOString(), 'datetime', 'id-ID', 'Asia/Jakarta');
			logger.info(`lingkungan ${selectedLingkungan.name} confirmed for ${selectedMass.name} at ${submitted}`);

			// Track successful submission
			const successMetadata = {
				processing_time_ms: processingTime,
				lingkungan: selectedLingkungan.name,
				wilayah: selectedLingkungan.wilayahName,
				mass: selectedMass.name,
				event_date: confirmedEvent.date,
				ushers_count: ushersArray.length,
				assigned_positions_count: queueManager.assignedUshers.length
			};

			await Promise.all([
				statsigService.logEvent('tatib_confirm_ushers', 'success', session || undefined, successMetadata),
				posthogService.trackEvent('tatib_confirm_ushers', {
					event_type: 'success',
					...successMetadata
				}, session || undefined)
			]);

			// TODO: wrap returned data with timezone info
			return {
				success: true, json: {
					submitted: submitted,
					lingkungan: selectedLingkungan.name,
					wilayahName: selectedLingkungan.wilayahName,
					mass: selectedMass.name,
					event: formatDate(confirmedEvent.date, 'long'),
					ushers: queueManager.assignedUshers,
				}
			};
		} catch (err) {
			logger.warn('tatib_error: failed creating event', err);
			const errorMetadata = {
				error_type: err instanceof Error ? err.name : 'unknown',
				error_message: err instanceof Error ? err.message : String(err)
			};

			await Promise.all([
				statsigService.logEvent('tatib_error', 'unexpected_error', session || undefined, errorMetadata),
				posthogService.trackEvent('tatib_error', {
					event_type: 'unexpected_error',
					...errorMetadata
				}, session || undefined)
			]);

			return fail(500, { error: 'Terjadi kesalahan internal: ' + (err instanceof Error ? err.message : 'Detail tidak diketahui'), formData: formValues });
		}
	}
} satisfies Actions;
