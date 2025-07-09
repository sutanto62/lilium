import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

// Services
import { ServiceError } from '$core/errors/ServiceError';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { hasRole } from '$src/auth';
import { statsigService } from '$src/lib/application/StatsigService';

export const load: PageServerLoad = async (event) => {
	await statsigService.use();

	const { session } = await handlePageLoad(event, 'jadwal_detail');

	if (!session) {
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid ?? '';
	const eventId = event.params.id;

	const eventService = new EventService(churchId);
	const [eventDetail] = await Promise.all([eventService.retrieveEventSchedule(eventId)]);

	// Get zones
	const churchService = new ChurchService(churchId);
	// const [zones] = await Promise.all([churchService.retrieveZonesByEvent(eventId)]);
	const zoneGroups = await churchService.retrieveZoneGroupsByEvent(eventId);

	return {
		eventDetail,
		zones: zoneGroups,
		wilayahs: [],
		lingkungans: [],
		events: [],
		eventsDate: [],
		success: false,
		assignedUshers: []
	};
};

/** @satisfies {import('./$types').Actions} */
export const actions: Actions = {
	/**
	 * Deactivates (soft deletes) an event
	 * @param event The request event containing session data and params
	 * @throws {error} 404 if church ID is not found in session
	 * @throws {redirect} 303 redirect to jadwal page after successful deactivation
	 */
	deactivate: async (event: RequestEvent) => {
		// Get church id from cookie
		const session = await event.locals.auth();
		const churchId = session?.user?.cid ?? '';
		const eventId = event.params.id;

		if (!churchId) {
			logger.error('Church not found');
			throw error(404, 'Gereja belum terdaftar');
		}

		const eventService = new EventService(churchId);

		try {
			logger.info(`Deactivating event ${eventId} by ${session?.user?.name}`);
			const result = await eventService.deactivateEvent(eventId);
			if (!result) {
				throw ServiceError.database('Gagal menonaktifkan jadwal');
			}
		} catch (error) {
			logger.error('Error deactivating event:', error);
			throw ServiceError.database('Gagal menonaktifkan jadwal');
		}
		return redirect(303, '/admin/jadwal');
	},
	/**
	 * Updates event's PIC
	 * @param event The request event containing session data and params
	 * @throws {error} 404 if church ID is not found in session
	 * @throws {redirect} 303 redirect to jadwal page after successful deactivation
	 */
	updatePic: async (event: RequestEvent) => {
		const session = await event.locals.auth(); // why?
		const churchId = session?.user?.cid ?? ''; // why?
		const eventId = event.params.id;

		if (!churchId) {
			logger.error('Church not found');
			throw error(404, 'Gereja belum terdaftar');
		}

		const formData = await event.request.formData();
		const submittedPic = {
			event: eventId,
			zone: formData.get('zone') as string,
			name: formData.get('pic') as string
		}

		const eventService = new EventService(churchId);
		await eventService.assignEventPic(submittedPic);

		return { success: true };
	},
	/**
	 * Deletes event usher for a specific lingkungan
	 * @param event The request event containing session data and params 
	 * @throws {error} 404 if church ID is not found in session
	 * @returns {success: true} on successful deletion
	 */
	deleteEventUsher: async (event: RequestEvent) => {
		const session = await event.locals.auth();
		const churchId = session?.user?.cid ?? '';
		const eventId = event.params.id;

		if (!churchId) {
			logger.error('Church not found');
			throw error(404, 'Gereja belum terdaftar');
		}

		const formData = await event.request.formData();
		const lingkungan = formData.get('lingkungan') as string;

		const eventService = new EventService(churchId);

		if (hasRole(session, 'admin')) {
			await eventService.removeUsherAssignment(eventId, lingkungan);
			logger.info(`Event usher deleted: ${lingkungan} by ${session?.user?.name}`);
		}

		return { success: true };
	},
};
