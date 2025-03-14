import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions, RequestEvent } from './$types';
import { EventService } from '$core/service/EventService';
import { logger } from '$src/lib/utils/logger';
import { ChurchService } from '$core/service/ChurchService';
import { AuthService } from '$core/service/AuthService';
import { captureEvent } from '$src/lib/utils/analytic';

export const load: PageServerLoad = async (events) => {
	const session = await events.locals.auth();

	if (!session) {
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid ?? '';
	const eventId = events.params.id;

	const eventService = new EventService(churchId);
	const [jadwalDetail] = await Promise.all([eventService.getJadwalDetail(eventId)]);

	// Get zones
	const churchService = new ChurchService(churchId);
	const [zones] = await Promise.all([churchService.getZonesByEvent(eventId)]);

	// Get users for PIC
	const authService = new AuthService(churchId);
	const [users] = await Promise.all([authService.getUsers()]);

	await captureEvent(events, 'jadwal_detail_page_view');

	return {
		jadwalDetail,
		users,
		zones
	};
};

/** @satisfies {import('./$types').Actions} */
export const actions: Actions = {
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
	jadwalDetailPic: async (event: RequestEvent) => {
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
			user: formData.get('pic') as string
		}

		const eventService = new EventService(churchId);
		await eventService.insertEventPic(submittedPic);

		logger.info(`Event ${eventId} PIC set to ${submittedPic.user}`);

		return { success: true };
	}
};
