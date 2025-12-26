import { EventType } from '$core/entities/Event';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { getWeekNumber, getWeekNumbers } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    await statsigService.logEvent('misa_view_server', 'load');

    const { session } = await handlePageLoad(event, 'misa');
    if (!session) {
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid ?? '';
    const eventService = new EventService(churchId);

    // Check for date filter in URL search params
    const dateParam = event.url.searchParams.get('date');
    let events;

    if (dateParam) {
        // Filter events by specific date
        const selectedDate = new Date(dateParam);
        const dateStr = selectedDate.toISOString().split('T')[0];
        // Get events for the selected date (start and end are the same date)
        events = await eventService.listEventsByDateRange(dateStr, dateStr);
    } else {
        // Default behavior: get events for upcoming weeks
        const weekNumbers = getWeekNumbers(1);
        events = await eventService.retrieveEventsByWeekRange({ weekNumbers, isToday: true });
    }

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
    default: async ({ request, locals }) => {
        logger.info('admin_misa_bulk_create: Starting bulk create for next month');

        const session = await locals.auth();
        if (!session) {
            logger.error('admin_misa_bulk_create: No session found');
            return fail(401, { error: 'Anda harus login untuk membuat jadwal misa' });
        }

        const churchId = session.user?.cid ?? '';
        if (!churchId) {
            logger.error('admin_misa_bulk_create: Church ID not found in session');
            return fail(404, { error: 'Tidak ada gereja yang terdaftar' });
        }

        const churchService = new ChurchService(churchId);
        const eventService = new EventService(churchId);

        try {
            const masses = await churchService.retrieveMasses();
            const activeMasses = masses.filter(mass => mass.active === 1);

            if (activeMasses.length === 0) {
                logger.warn('admin_misa_bulk_create: No active masses found');
                return fail(400, { error: 'Tidak ada jadwal misa aktif. Silakan aktifkan jadwal misa terlebih dahulu.' });
            }

            // Get current date and calculate next month's dates
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const lastDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

            // Check if events for next month already exist
            const startDate = nextMonth.toISOString().split('T')[0];
            const endDate = lastDayOfNextMonth.toISOString().split('T')[0];
            const existingEvents = await eventService.listEventsByDateRange(startDate, endDate);

            if (existingEvents && existingEvents.length > 0) {
                logger.warn('admin_misa_bulk_create: Events for next month already exist', {
                    count: existingEvents.length,
                    startDate,
                    endDate
                });
                return fail(400, {
                    error: `Jadwal misa untuk bulan depan sudah dibuat (${existingEvents.length} jadwal ditemukan). Silakan hapus jadwal yang ada terlebih dahulu jika ingin membuat ulang.`
                });
            }

            let createdCount = 0;
            const errors: string[] = [];

            // Loop through each day of next month
            for (let date = new Date(nextMonth); date <= lastDayOfNextMonth; date.setDate(date.getDate() + 1)) {
                // Get day of week in English, starting from Monday (1) to Sunday (7)
                const dayOfWeek = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
                    .toLocaleDateString('en-EN', { weekday: 'long' })
                    .toLowerCase();

                // Find masses scheduled for this day of week
                const massesForDay = activeMasses.filter(mass => mass.day === dayOfWeek);

                // Create events for each mass on this day
                for (const mass of massesForDay) {
                    try {
                        const eventDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD

                        // Get week number using dateUtils
                        const weekNumber = getWeekNumber(eventDate);

                        await eventService.createEvent({
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
                        createdCount++;
                    } catch (err) {
                        const eventDate = date.toISOString().split('T')[0];
                        const errorMsg = `Gagal membuat jadwal untuk ${eventDate} - ${mass.name}`;
                        logger.error('admin_misa_bulk_create: Error creating event', { err, eventDate, massId: mass.id });
                        errors.push(errorMsg);
                    }
                }
            }

            if (errors.length > 0) {
                logger.warn('admin_misa_bulk_create: Some events failed to create', {
                    createdCount,
                    errorCount: errors.length
                });
                return fail(500, {
                    error: `Berhasil membuat ${createdCount} jadwal, namun ${errors.length} jadwal gagal dibuat. ${errors.slice(0, 3).join('; ')}`
                });
            }

            logger.info('admin_misa_bulk_create: Successfully created events', { createdCount });
            return { success: true, message: `Berhasil membuat ${createdCount} jadwal misa untuk bulan depan.` };
        } catch (err) {
            logger.error('admin_misa_bulk_create: Error creating events', err);
            return fail(500, { error: 'Gagal membuat jadwal misa. Silakan coba lagi atau hubungi administrator.' });
        }
    }
} satisfies Actions;

