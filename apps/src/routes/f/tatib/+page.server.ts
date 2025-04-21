import type { Actions, PageServerLoad } from './$types';
import { fail, error } from '@sveltejs/kit';
import { repo } from '$lib/server/db';
import type { Event as ChurchEvent, EventUsher } from '$core/entities/Event';
import { featureFlags } from '$lib/utils/FeatureFlag';
import { calculateEventDate, getWeekNumber } from '$lib/utils/dateUtils';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { logger } from '$src/lib/utils/logger';
import { QueueManager } from '$core/service/QueueManager';
import type { Church } from '$core/entities/Schedule';
import { handlePageLoad } from '$src/lib/server/pageHandler';

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
	const churchId = event.cookies.get('cid') as string | '';

	let church: Church | null = null;
	church = await repo.findChurchById(churchId);
	if (!church) {
		throw error(404, 'Gereja belum terdaftar');
	}
	churchService = new ChurchService(churchId);

	try {
		const [masses, wilayahs, lingkungans] = await Promise.all([
			churchService.getMasses(),
			churchService.getWilayahs(),
			churchService.getLingkungans()
		]);

		return {
			church,
			masses,
			wilayahs,
			lingkungans,
			success: false,
			assignedUshers: [],
		};
	} catch (err) {
		logger.error('Error fetching data:', err);
		throw error(500, 'Gagal memuat jadwal misa, wilayah, dan lingkungan');
	}
};

export const actions = {
	default: async ({ request, cookies }) => {
		logger.info('Ushers confirmation is starting')
		const churchId = cookies.get('cid') as string | '';
		if (!churchId) {
			return fail(404, { error: 'Tidak ada gereja yang terdaftar' }); // check session cookie
		}

		const submittedAt = new Date();
		const formData = await request.formData();
		const massId = formData.get('massId') as string;
		const wilayahId = formData.get('wilayahId') as string;
		const lingkunganId = formData.get('lingkunganId') as string;
		const ushersString = formData.get('ushers') as string;

		// Validate to reject entry if submittedAt weekday is Sunday, Friday, and Saturday
		if (featureFlags.isEnabled('no_saturday_sunday') && [0, 5, 6].includes(submittedAt.getDay())) {
			logger.warn(`Lingkungan ${lingkunganId} tried to confirm at closed window.`)
			return fail(400, { error: 'Batas konfirmasi tugas Senin s.d. Kamis' });
		}

		// Validate mandatory input 
		if (!massId || !wilayahId || !lingkunganId || !ushersString) {
			return fail(400, { error: 'Mohon lengkapi semua isian.' });
		}

		try {
			const [selectedMass, positions] = await Promise.all([
				repo.getMassById(massId),
				repo.getPositionsByMass(churchId, massId)
			]);

			// Validate mass ushers position
			if (positions.length === 0) {
				logger.warn(`Mass ${selectedMass?.name} has no usher position configured yet.`)
				return fail(404, { error: `Misa ${selectedMass?.name} belum memiliki titik tugas.` })
			}

			const selectedLingkungan = await repo.getLingkunganById(lingkunganId);

			if (!selectedMass) {
				logger.warn(`Mass not found.`)
				return fail(404, { error: `Misa tidak ditemukan` });
			}

			if (!selectedLingkungan) {
				logger.warn(`Lingkungan not found`)
				return fail(404, { error: 'Lingkungan tidak ditemukan' });
			}

			// Validate ushers
			const eventDate = calculateEventDate(submittedAt, selectedMass);
			let ushersArray: EventUsher[];
			try {
				ushersArray = JSON.parse(ushersString);
			} catch (err) {
				logger.warn(`Failed to parse ushers list`)
				return fail(400, { error: 'Gagal parsing data petugas' });
			}

			const newEvent: ChurchEvent = {
				id: '',
				church: churchId,
				mass: massId,
				date: eventDate,
				weekNumber: getWeekNumber(eventDate),
				createdAt: 0,
				isComplete: 0,
				active: 1
			};

			// Insert event ushers (create event if not exists)
			eventService = new EventService(churchId);
			const createdEvent = await eventService.confirmEvent(newEvent);

			// Insert ushers into event
			const createdUshers = await eventService.insertEventUshers(
				createdEvent.id,
				ushersArray,
				wilayahId,
				lingkunganId
			);

			// Validate double input by lingkungan
			if (!createdUshers) {
				logger.warn(`Lingkungan ${lingkunganId} double input`)
				return fail(400, {
					error: 'Lingkungan sudah melakukan konfirmasi tugas'
				});
			}

			// Update ushers with position
			await queueManager.submitConfirmationQueue(createdEvent, selectedLingkungan);

			try {
				await queueManager.processConfirmationQueue();
			} catch (err) {
				logger.warn('Error processing queue:', err);
				if (err instanceof Error)
					return fail(404, { error: err.message });
			}

			// Return ushers position to client
			return { success: true, json: { ushers: queueManager.assignedUshers } };
		} catch (err) {
			logger.warn('Error creating event:', err);
			return fail(404, { error: err });
		}
	}
} satisfies Actions;
