import { logger } from '$src/lib/utils/logger';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { EventService } from '$core/service/EventService';
import { ChurchService } from '$core/service/ChurchService';
export const load: PageServerLoad = async (events) => {
    const session = await events.locals.auth();

    if (!session) {
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid ?? '';
    const eventId = events.params.id;

    const churchService = new ChurchService(churchId);
    const church = await churchService.getChurch();

    const eventService = new EventService(churchId);
    const [jadwalDetail] = await Promise.all([eventService.getCetakJadwal(eventId)]);

    logger.debug(JSON.stringify(church, null, 2));
    return { church, jadwalDetail };
};