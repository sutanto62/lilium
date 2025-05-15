import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

// Services
import { AuthService } from '$core/service/AuthService';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';

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
		logger.debug(`formData ${JSON.stringify(formData)}`);
		const submittedPic = {
			event: eventId,
			zone: formData.get('zone') as string,
			name: formData.get('pic') as string
		}
		logger.debug(`submittedPic ${JSON.stringify(submittedPic)}`);

		const eventService = new EventService(churchId);
		await eventService.insertEventPic(submittedPic);

		return { success: true };
	}
};
