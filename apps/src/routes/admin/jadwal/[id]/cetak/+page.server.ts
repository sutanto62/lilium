import { logger } from '$src/lib/utils/logger';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { EventService } from '$core/service/EventService';

export const load: PageServerLoad = async (events) => {
    const session = await events.locals.auth();

    if (!session) {
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid ?? '';
    const eventId = events.params.id;

    const eventService = new EventService(churchId);
    const [jadwalDetail] = await Promise.all([eventService.getJadwalDetail(eventId)]);

    return { jadwalDetail };
};