import { EventType } from '$core/entities/Event';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { getWeekNumber, getWeekNumbers } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {

    const { session } = await handlePageLoad(event, 'misa');
    if (!session) {
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid ?? '';
    const eventService = new EventService(churchId);

    const weekNumbers = getWeekNumbers(1);

    const events = await eventService.getEventsByWeekNumber(undefined, weekNumbers);

    return {
        wilayahs: [],
        lingkungans: [],
        events: events,
        eventsDate: [],
        success: false,
        assignedUshers: []
    };
};

export const actions = {
    default: async ({ request, cookies }) => {
        logger.info('Creating new event');

        const churchId = cookies.get('cid') as string;
        if (!churchId) {
            return fail(404, { error: 'Tidak ada gereja yang terdaftar' });
        }

        const churchService = new ChurchService(churchId);
        const eventService = new EventService(churchId);

        const masses = await churchService.getMasses();

        try {
            // Get current date and calculate next month's dates
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const lastDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

            // Check if events for next month already exist
            const startDate = nextMonth.toISOString().split('T')[0];
            const endDate = lastDayOfNextMonth.toISOString().split('T')[0];
            const existingEvents = await eventService.getEventsByDateRange(startDate, endDate);

            if (existingEvents && existingEvents.length > 0) {
                logger.warn('Events for next month already exist');
                return fail(400, { error: 'Jadwal misa untuk bulan depan sudah dibuat' });
            }

            // Loop through each day of next month
            for (let date = new Date(nextMonth); date <= lastDayOfNextMonth; date.setDate(date.getDate() + 1)) {
                // Get day of week in Indonesian, starting from Monday (1) to Sunday (7)
                const dayOfWeek = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
                    .toLocaleDateString('en-EN', { weekday: 'long' })
                    .toLowerCase();

                // Find masses scheduled for this day of week
                const massesForDay = masses.filter(mass => mass.day === dayOfWeek && mass.active === 1);

                // Create events for each mass on this day
                for (const mass of massesForDay) {
                    const eventDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD

                    // Get week number using dateUtils
                    const weekNumber = getWeekNumber(eventDate);

                    await eventService.insertEvent({
                        church: churchId,
                        mass: mass.id,
                        date: eventDate,
                        weekNumber: weekNumber,
                        isComplete: 0,
                        active: 1,
                        type: EventType.MASS,
                        code: mass.code,
                        description: mass.name
                    });
                }
            }

            return { success: true };
        } catch (err) {
            logger.error('Error creating event:', err);
            return fail(500, { error: 'Gagal membuat jadwal misa' });
        }
    }
} satisfies Actions;

