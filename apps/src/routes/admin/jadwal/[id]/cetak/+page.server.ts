import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { logger } from '../../../../../lib/utils/logger';

export const load: PageServerLoad = async (event) => {
    await statsigService.use();

    const { session } = await handlePageLoad(event, 'jadwal_cetak');

    if (!session) {
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid ?? '';
    const eventId = event.params.id;

    const churchService = new ChurchService(churchId);
    const church = await churchService.retrieveChurch();

    const eventService = new EventService(churchId);
    const [jadwalDetail] = await Promise.all([eventService.retrieveEventPrintSchedule(eventId)]);

    return {
        church,
        jadwalDetail,
        wilayahs: [],
        lingkungans: [],
        events: [],
        eventsDate: [],
        selectedEventId: null,
        selectedWilayahId: null,
        selectedLingkunganId: null,
        success: true,
        assignedUshers: []
    };
};
