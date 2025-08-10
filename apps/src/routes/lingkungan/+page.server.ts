import { EventService } from '$core/service/EventService';
import { UsherService } from '$core/service/UsherService';
import { statsigService } from '$src/lib/application/StatsigService';
import { getWeekNumber } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    await statsigService.logEvent('lingkungan_view_server', 'load');

    const churchId = event.cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID;
    const eventService = new EventService(churchId);

    const weekNumber = getWeekNumber(new Date().toISOString());

    const events = await eventService.retrieveEventsByWeekRange({ weekNumber, isToday: true });

    return {
        success: true,
        events: events
    }
};

export const actions = {
    default: async (event) => {
        const data = await event.request.formData();
        const eventId = data.get('eventId') as string;

        if (!eventId) {
            return {
                success: false,
                error: 'Tidak ada jadwal yang dipilih'
            };
        }

        try {
            const churchId = event.cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID;

            const usherService = new UsherService(churchId);
            const ushers = await usherService.retrieveEventUshers(eventId);

            return {
                success: true,
                selectedEventId: eventId,
                ushers
            };

        } catch (error) {
            logger.error('Failed to fetch ushers:', error);
            return {
                success: false,
                error: 'Gagal mengambil data'
            };
        }
    }
} satisfies Actions;
