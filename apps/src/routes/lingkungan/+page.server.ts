import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { UsherService } from '$core/service/UsherService';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    await statsigService.use();

    const { session } = await handlePageLoad(event, 'lingkungan');
    if (!session) {
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid;
    if (!churchId) {
        logger.error('No church ID found in session');
        throw error(500, 'Invalid session data');
    }
    const lingkunganId = session.user?.lingkunganId;
    if (!lingkunganId) {
        logger.error('No lingkungan ID found in session');
        return {
            success: false,
            message: 'Lingkungan tidak ditemukan'
        }
        // throw error(500, 'Invalid session data');
    }

    const eventService = new EventService(churchId);
    const usherService = new UsherService(churchId);
    const churchService = new ChurchService(churchId);
    const lingkungan = await churchService.retrieveLingkunganById(lingkunganId);
    const lingkunganEvents = await eventService.retrieveEventsByLingkungan(lingkunganId, true);

    // Fetch ushers for each event
    const eventsWithUshers = await Promise.all(
        lingkunganEvents.map(async (event) => {
            const ushers = await usherService.retrieveEventUshersByLingkungan(event.id, lingkunganId);

            return {
                ...event,
                ushers
            };
        })
    );

    return {
        success: true,
        lingkungan,
        events: eventsWithUshers
    }
};
