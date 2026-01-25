import type { EventUsher } from '$core/entities/Event';
import type { Church } from '$core/entities/Schedule';
import { ServiceError, ServiceErrorType } from '$core/errors/ServiceError';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { QueueManager } from '$core/service/QueueManager';
import { UsherService } from '$core/service/UsherService';
import { repo } from '$lib/server/db';
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
 * This function asynchronously fetches events, wilayahs, and lingkungans
 * using Promise.all for concurrent execution. It then returns these
 * data to be used in the page.
 *
 * @returns {Promise<{events: any, wilayahs: any, lingkungans: any}>}
 */
export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	// Get session if available (public page, but users might be logged in)
	const session = await event.locals.auth();

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

		const returnData = {
			church,
			wilayahs,
			lingkungans,
			events,
			eventsDate: eventsDate,
			success: false,
			assignedUshers: [],
			formData: null,
			showForm,
			requirePpg,
			currentDay: getCurrentDayName(),
			formAvailabilityReason: showForm ? 'Form tersedia' : 'Form hanya tersedia pada hari kerja (Senin-Kamis)'
		};
		return returnData;
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

/**
 * Actions for the tatib (tata tertib/ushers) form.
 * 
 * The default action handles form submission for confirming ushers for a church event.
 * It validates the submitted data, processes the ushers information, and assigns positions
 * to the ushers based on their roles and sequence.
 * 
 * The flow includes:
 * 1. Validating form data including church, event, wilayah and lingkungan
 * 2. Parsing and validating ushers information (names, roles)
 * 3. Assigning positions based on business rules
 * 4. Saving the confirmed ushers to the database
 * 
 * @returns {Promise<ActionFailure<{error: string, formData: any}> | {success: boolean, json: any}>}
 *          Returns a success object with the processed data if successful,
 *          or an ActionFailure with error details if validation fails
 */

export const actions = {
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
