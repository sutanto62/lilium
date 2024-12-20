import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions, RequestEvent } from './$types';
import { EventService } from '$core/service/EventService';
import { logger } from '$src/lib/utils/logger';

export const load: PageServerLoad = async (events) => {
	const session = await events.locals.auth();

	if (!session) {
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid ?? '';
	const eventId = events.params.id;

	const eventService = new EventService(churchId);
	const [jadwalDetail] = await Promise.all([eventService.getJadwalDetail(eventId)]);

	return {
		jadwalDetail
	};
};

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

		throw redirect(303, '/jadwal');
	}
};
