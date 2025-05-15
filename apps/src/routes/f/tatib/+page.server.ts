import type { Event as ChurchEvent, EventUsher } from '$core/entities/Event';
import type { Church } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { QueueManager } from '$core/service/QueueManager';
import { repo } from '$lib/server/db';
import { featureFlags } from '$lib/utils/FeatureFlag';
import { calculateEventDate, getWeekNumber } from '$lib/utils/dateUtils';
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
	const churchId = event.cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID;

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
		logger.info('event ushers confirmation is starting')
		const churchId = cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID;
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
			logger.warn(`lingkungan ${lingkunganId} tried to confirm at closed window.`)
			return fail(400, { error: 'Batas konfirmasi tugas Senin s.d. Kamis' });
		}

		// Validate mandatory input 
		if (!massId || !wilayahId || !lingkunganId || !ushersString) {
			return fail(400, { error: 'Mohon lengkapi semua isian.' });
		}

		try {
			const [selectedMass, massZonePositions] = await Promise.all([
				repo.getMassById(massId),
				repo.getPositionsByMass(churchId, massId)
			]);

			// Validate mass ushers position
			if (massZonePositions.length === 0) {
				logger.warn(`mass zone position not found: ${selectedMass?.name}.`)
				return fail(404, { error: `Misa ${selectedMass?.name} belum memiliki titik tugas.` })
			}

			const selectedLingkungan = await repo.getLingkunganById(lingkunganId);

			if (!selectedMass) {
				logger.warn(`mass not found.`)
				return fail(404, { error: `Misa tidak ditemukan` });
			}

			if (!selectedLingkungan) {
				logger.warn(`lingkungan not found`)
				return fail(404, { error: 'Lingkungan tidak ditemukan' });
			}

			// Validate ushers
			const eventDate = calculateEventDate(submittedAt, selectedMass);
			let ushersArray: EventUsher[];
			try {
				ushersArray = JSON.parse(ushersString);
			} catch (err) {
				logger.warn(`failed to parse ushers list`)
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
				logger.warn(`invalid lngkungan ${lingkunganId} input`)
				return fail(400, {
					error: 'Lingkungan sudah melakukan konfirmasi tugas'
				});
			}

			// Update ushers with position
			try {
				await queueManager.submitConfirmationQueue(createdEvent, selectedLingkungan);
				await queueManager.processQueue();
				await queueManager.reset();
			} catch (err) {
				logger.warn('failed processing queue:', err);
				if (err instanceof Error)
					return fail(404, { error: err.message });
			}

			// Return ushers position to client
			return { success: true, json: { ushers: queueManager.assignedUshers } };
		} catch (err) {
			logger.warn('failed creating event:', err);
			return fail(404, { error: err });
		}
	}
} satisfies Actions;
