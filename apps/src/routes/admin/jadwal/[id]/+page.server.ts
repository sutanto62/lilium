import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

// Services
import { AuthService } from '$core/service/AuthService';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { hasRole } from '$src/auth';

export const load: PageServerLoad = async (event) => {
	const { session } = await handlePageLoad(event, 'jadwal_detail');

	if (!session) {
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid ?? '';
	const eventId = event.params.id;

	const eventService = new EventService(churchId);
	const [jadwalDetail] = await Promise.all([eventService.getJadwalDetail(eventId)]);

	// Get zones
	const churchService = new ChurchService(churchId);
	const [zones] = await Promise.all([churchService.getZonesByEvent(eventId)]);

	// Get users for PIC
	const authService = new AuthService(churchId);

	return {
		jadwalDetail,
		zones,
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
		await eventService.deactivateEvent(eventId);

		logger.info(`Event ${eventId} deactivated`);

		throw redirect(303, '/admin/jadwal');
	},
	/**
	 * Updates event's PIC
	 * @param event The request event containing session data and params
	 * @throws {error} 404 if church ID is not found in session
	 * @throws {redirect} 303 redirect to jadwal page after successful deactivation
	 */
	updatePic: async (event: RequestEvent) => {
		const session = await event.locals.auth();
		const churchId = session?.user?.cid ?? '';
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
		await eventService.insertEventPic(submittedPic);

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
			await eventService.removeEventUsher(eventId, lingkungan);
			logger.info(`Event usher deleted: ${lingkungan}`);
		}

		return { success: true };
	},
};
