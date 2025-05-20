import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const { session } = await handlePageLoad(event, 'jadwal_cetak');

    if (!session) {
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid ?? '';
    const eventId = event.params.id;

    const churchService = new ChurchService(churchId);
    const church = await churchService.getChurch();

    const eventService = new EventService(churchId);
    const [jadwalDetail] = await Promise.all([eventService.getCetakJadwal(eventId)]);

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
