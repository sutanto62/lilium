import type { EventUsher } from '$core/entities/Event';
import type { Church } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { QueueManager } from '$core/service/QueueManager';
import { repo } from '$lib/server/db';
import { featureFlags } from '$lib/utils/FeatureFlag';
import { getWeekNumber } from '$lib/utils/dateUtils';
import { validateUsherNames } from '$lib/utils/usherValidation';
import { initStatsig } from '$src/lib/utils/analytic';
import { logger } from '$src/lib/utils/logger';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

let churchService: ChurchService;
let eventService: EventService;

const queueManager = QueueManager.getInstance();

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
	const statsigClient = await initStatsig();
	statsigClient?.logEvent("tatib_page_view", "tatib_page_view", {
		church_id: event.cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID,
	})
	await statsigClient?.flush();

	const churchId = event.cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID;

	let church: Church | null = null;
	church = await repo.findChurchById(churchId);
	if (!church) {
		throw error(404, 'Gereja belum terdaftar');
	}
	churchService = new ChurchService(churchId);
	eventService = new EventService(churchId);

	let weekNumber = getWeekNumber();

	try {
		const [wilayahs, lingkungans, events] = await Promise.all([
			churchService.getWilayahs(),
			churchService.getLingkungans(),
			eventService.getEventsByWeekNumber(weekNumber),
		]);

		// Return unique events date sort ascending
		const eventsDate = events.length
			? [...new Set(events.map(event => event.date))]
			: [];

		const returnData = {
			church,
			wilayahs,
			lingkungans,
			events,
			eventsDate: eventsDate,
			success: false,
			assignedUshers: [],
			formData: null
		};
		return returnData;
	} catch (err) {
		logger.error('Error fetching data:', err);
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
	default: async ({ request, cookies }) => {
		logger.info('event ushers confirmation is starting')

		const churchId = cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID;
		if (!churchId) {
			return fail(404, { error: 'Tidak ada gereja yang terdaftar' }); // check session cookie
		}
		const eventService = new EventService(churchId);

		const submittedAt = new Date();
		const formData = await request.formData();
		const eventDate = formData.get('eventDate') as string;
		const eventId = formData.get('eventId') as string;
		const wilayahId = formData.get('wilayahId') as string;
		const lingkunganId = formData.get('lingkunganId') as string;
		const ushersString = formData.get('ushers') as string;

		const formValues = {
			eventDate,
			eventId,
			wilayahId,
			lingkunganId,
			ushers: ushersString
		};

		// Validate to reject entry if submittedAt weekday is Sunday, Friday, and Saturday
		if (featureFlags.isEnabled('no_saturday_sunday') && [0, 5, 6].includes(submittedAt.getDay())) {
			logger.warn(`lingkungan ${lingkunganId} tried to confirm at closed window.`)
			return fail(422, { error: 'Batas konfirmasi tugas Senin s.d. Kamis', formData: formValues });
		}

		// Validate mandatory input 
		if ((!eventId) || !wilayahId || !lingkunganId || !ushersString) {
			return fail(422, { error: 'Mohon lengkapi semua isian.', formData: formValues });
		}

		try {
			// Get the mass ID from the event
			const confirmedEvent = await eventService.getEventById(eventId)

			// TODO: change to service
			const [selectedMass, selectedLingkungan, massZonePositions] = await Promise.all([
				repo.getMassById(confirmedEvent.mass),
				repo.getLingkunganById(lingkunganId),
				repo.getPositionsByMass(churchId, confirmedEvent.mass)
			]);

			// Validate mass ushers position
			if (massZonePositions.length === 0) {
				logger.warn(`mass zone position not found: ${selectedMass?.name}.`);
				return fail(404, { error: `Misa ${selectedMass?.name} belum memiliki titik tugas.` });
			}

			if (!selectedMass) {
				logger.warn(`mass not found.`);
				return fail(404, { error: `Misa tidak ditemukan` });
			}

			if (!selectedLingkungan) {
				logger.warn(`lingkungan not found`);
				return fail(404, { error: 'Lingkungan tidak ditemukan' });
			}

			// Validate ushers
			let ushersArray: EventUsher[];
			try {
				ushersArray = JSON.parse(ushersString);
			} catch (err) {
				logger.warn(`failed to parse ushers list`);
				return fail(422, { error: 'Gagal parsing data petugas' });
			}

			const validation = validateUsherNames(ushersArray);
			if (!validation.isValid) {
				return fail(422, { error: validation.error, formData: formValues });
			}

			// Insert ushers into event
			const createdUshers = await eventService.insertEventUshers(
				confirmedEvent.id,
				ushersArray,
				wilayahId,
				lingkunganId
			);

			// Validate double input by lingkungan
			if (!createdUshers) {
				logger.warn(`invalid lngkungan ${lingkunganId} input`)
				return fail(400, {
					error: 'Lingkungan sudah melakukan konfirmasi tugas'
				});
			}

			// Update ushers with position
			try {
				await queueManager.submitConfirmationQueue(confirmedEvent, selectedLingkungan);
				await queueManager.processQueue();
				queueManager.reset();
			} catch (err) {
				logger.warn('failed processing queue:', err);
				if (err instanceof Error)
					return fail(404, { error: err.message });
			}

			// Return ushers position to client
			return { success: true, json: { ushers: queueManager.assignedUshers } };
		} catch (err) {
			logger.warn('failed creating event:', err);
			return fail(500, { error: 'Terjadi kesalahan internal: ' + (err instanceof Error ? err.message : 'Detail tidak diketahui'), formData: formValues });
		}
	}
} satisfies Actions;
