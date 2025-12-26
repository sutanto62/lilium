/**
 * Server-side page load and actions for the Admin Misa page
 * 
 * Handles:
 * - Loading events based on date filter or default week range
 * - Bulk creating mass schedules for the next month
 */
import { EventType } from '$core/entities/Event';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { getWeekNumber, getWeekNumbers } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * Server-side load function that fetches events for the admin misa page
 * 
 * Behavior:
 * - Authenticates user and redirects to signin if not authenticated
 * - If ?date=YYYY-MM-DD query param exists: fetches events for that specific date
 * - Otherwise: fetches events for upcoming weeks (default behavior)
 * 
 * @param event - SvelteKit load event containing request, url, etc.
 * @returns Page data including events array
 */
export const load: PageServerLoad = async (event) => {
    // Track page load analytics
    await statsigService.logEvent('misa_view_server', 'load');

    // Authenticate user and check permissions
    const { session } = await handlePageLoad(event, 'misa');
    if (!session) {
        throw redirect(302, '/signin');
    }

    // Get church ID from session and initialize event service
    const churchId = session.user?.cid ?? '';
    const eventService = new EventService(churchId);

    // Check for date filter in URL search params (?date=YYYY-MM-DD)
    const dateParam = event.url.searchParams.get('date');
    let events;

    if (dateParam) {
        // User selected a specific date: fetch events for that single date
        // dateParam is already in YYYY-MM-DD format from client (set by handleDateSelect)
        // The client uses formatDateLocal() to avoid timezone issues when converting Date to string
        // Use dateParam directly to avoid unnecessary Date parsing which could introduce timezone issues
        // The database query will handle invalid dates gracefully (returns empty array)
        const dateStr = dateParam;
        // Get events for the selected date (start and end are the same date)
        events = await eventService.listEventsByDateRange(dateStr, dateStr);
    } else {
        // Default behavior: get events for current week and next week (2 weeks total)
        // getWeekNumbers(1) returns [currentWeek, nextWeek] - 2 weeks starting from today
        const weekNumbers = getWeekNumbers(1);
        events = await eventService.retrieveEventsByWeekRange({ weekNumbers, isToday: true });
    }

    // Return page data - only events is currently used, other fields kept for compatibility
    return {
        wilayahs: [],
        lingkungans: [],
        events: events,
        eventsDate: [],
        success: false,
        assignedUshers: []
    };
};

/**
 * Server actions for form submissions
 * 
 * The default action handles bulk creation of mass schedules for the next month.
 * It creates events based on active mass schedules, matching days of the week.
 */
export const actions = {
    /**
     * Bulk create mass events for the next month
     * 
     * Process:
     * 1. Validates authentication and church ID
     * 2. Retrieves active mass schedules
     * 3. Checks if events for next month already exist
     * 4. Loops through each day of next month
     * 5. Matches day of week with mass schedules
     * 6. Creates events for matching days
     * 7. Returns success/error response
     * 
     * @param request - SvelteKit request object
     * @param locals - SvelteKit locals containing auth session
     * @returns Action result with success/error status and message
     */
    default: async ({ request, locals }) => {
        logger.info('admin_misa_bulk_create: Starting bulk create for next month');

        // Authenticate user
        const session = await locals.auth();
        if (!session) {
            logger.error('admin_misa_bulk_create: No session found');
            return fail(401, { error: 'Anda harus login untuk membuat jadwal misa' });
        }

        // Get church ID from session
        const churchId = session.user?.cid ?? '';
        if (!churchId) {
            logger.error('admin_misa_bulk_create: Church ID not found in session');
            return fail(404, { error: 'Tidak ada gereja yang terdaftar' });
        }

        // Initialize services
        const churchService = new ChurchService(churchId);
        const eventService = new EventService(churchId);

        try {
            // Get all mass schedules and filter for active ones only
            const masses = await churchService.retrieveMasses();
            const activeMasses = masses.filter(mass => mass.active === 1);

            // Validate that there are active mass schedules to use as templates
            if (activeMasses.length === 0) {
                logger.warn('admin_misa_bulk_create: No active masses found');
                return fail(400, { error: 'Tidak ada jadwal misa aktif. Silakan aktifkan jadwal misa terlebih dahulu.' });
            }

            // Calculate next month's date range
            // nextMonth: First day of next month (e.g., if today is Jan 15, nextMonth is Feb 1)
            // lastDayOfNextMonth: Last day of next month (e.g., Feb 28/29)
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const lastDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

            // Check if events for next month already exist to prevent duplicates
            const startDate = nextMonth.toISOString().split('T')[0]; // Format as YYYY-MM-DD
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

            // Track creation results
            let createdCount = 0;
            const errors: string[] = [];

            // Loop through each day of next month
            for (let date = new Date(nextMonth); date <= lastDayOfNextMonth; date.setDate(date.getDate() + 1)) {
                // Get day of week name in English (e.g., "monday", "sunday")
                // Note: Adjusting for timezone offset to ensure correct day calculation
                const dayOfWeek = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
                    .toLocaleDateString('en-EN', { weekday: 'long' })
                    .toLowerCase();

                // Find mass schedules that are scheduled for this day of the week
                // Mass schedules have a 'day' field (e.g., "monday", "sunday") that we match against
                const massesForDay = activeMasses.filter(mass => mass.day === dayOfWeek);

                // Create events for each mass schedule that matches this day
                for (const mass of massesForDay) {
                    try {
                        const eventDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD

                        // Calculate week number for the event date (used for liturgical week tracking)
                        const weekNumber = getWeekNumber(eventDate);

                        // Create the event with mass schedule details
                        await eventService.createEvent({
                            church: churchId,
                            mass: mass.id, // Reference to the mass schedule template
                            date: eventDate,
                            weekNumber: weekNumber,
                            isComplete: 0, // Event starts as incomplete (no ushers assigned yet)
                            active: 1, // Event is active
                            type: EventType.MASS,
                            code: mass.code, // Mass code (e.g., "M1", "M2")
                            description: mass.name // Mass name/description
                        });
                        createdCount++;
                    } catch (err) {
                        // Collect individual errors but continue processing other events
                        const eventDate = date.toISOString().split('T')[0];
                        const errorMsg = `Gagal membuat jadwal untuk ${eventDate} - ${mass.name}`;
                        logger.error('admin_misa_bulk_create: Error creating event', { err, eventDate, massId: mass.id });
                        errors.push(errorMsg);
                    }
                }
            }

            // Handle partial success (some events created, some failed)
            if (errors.length > 0) {
                logger.warn('admin_misa_bulk_create: Some events failed to create', {
                    createdCount,
                    errorCount: errors.length
                });
                // Return error with partial success message (show first 3 errors)
                return fail(500, {
                    error: `Berhasil membuat ${createdCount} jadwal, namun ${errors.length} jadwal gagal dibuat. ${errors.slice(0, 3).join('; ')}`
                });
            }

            // All events created successfully
            logger.info('admin_misa_bulk_create: Successfully created events', { createdCount });
            return { success: true, message: `Berhasil membuat ${createdCount} jadwal misa untuk bulan depan.` };
        } catch (err) {
            // Handle unexpected errors during bulk creation
            logger.error('admin_misa_bulk_create: Error creating events', err);
            return fail(500, { error: 'Gagal membuat jadwal misa. Silakan coba lagi atau hubungi administrator.' });
        }
    }
} satisfies Actions;

