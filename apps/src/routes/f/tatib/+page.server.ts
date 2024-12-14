import type { Actions, PageServerLoad } from './$types';
import { fail, error } from '@sveltejs/kit';
import { repo } from '$lib/server/db';
import type { Event as ChurchEvent, EventUsher } from '$core/entities/Event';
import { featureFlags } from '$lib/utils/FeatureFlag';
import { calculateEventDate } from '$lib/utils/dateUtils';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { logger } from '$src/lib/utils/logger';
import { QueueManager } from '$core/service/QueueManager';
import type { Church } from '$core/entities/schedule';

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
export const load: PageServerLoad = async (events) => {
	const churchId = events.cookies.get('cid') as string | '';
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

		return { church, masses, wilayahs, lingkungans, success: false, assignedUshers: [] };
	} catch (err) {
		logger.error('Error fetching data:', err);
		throw error(500, 'Gagal memuat jadwal misa, wilayah, dan lingkungan');
	}
};

export const actions = {
	default: async ({ request, cookies }) => {
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
			return fail(400, { error: 'Batas konfirmasi tugas Senin s.d. Kamis' });
		}

		// Server-side validation
		if (!massId || !wilayahId || !lingkunganId || !ushersString) {
			return fail(400, { error: 'Mohon lengkapi semua isian.' });
		}

		try {
			const selectedMass = await repo.getMassById(massId);
			const selectedLingkungan = await repo.getLingkunganById(lingkunganId);

			if (!selectedMass) {
				return fail(404, { error: 'Misa tidak ditemukan' });
			}

			if (!selectedLingkungan) {
				return fail(404, { error: 'Lingkungan tidak ditemukan' });
			}

			const eventDate = calculateEventDate(submittedAt, selectedMass);
			let ushersArray: EventUsher[];
			try {
				ushersArray = JSON.parse(ushersString);
			} catch (err) {
				return fail(400, { error: 'Gagal parsing data petugas' });
			}

			const newEvent: ChurchEvent = {
				id: '',
				church: churchId,
				mass: massId,
				date: eventDate,
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
			if (!createdUshers) {
				return fail(400, {
					error: 'Lingkungan sudah melakukan konfirmasi tugas'
				});
			}

			// Update ushers with position
			await queueManager.submitConfirmationQueue(createdEvent, selectedLingkungan);

			try {
				await queueManager.processConfirmationQueue();
			} catch (err) {
				logger.error('Error processing queue:', err);
				return fail(404, { error: err });
			}

			// Return ushers position to client
			return { success: true, json: { ushers: queueManager.assignedUshers } };
		} catch (err) {
			logger.error('Error creating event:', err);
			return fail(404, { error: err });
		}
	}
} satisfies Actions;
