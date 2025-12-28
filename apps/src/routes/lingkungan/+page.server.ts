import { EventService } from '$core/service/EventService';
import { UsherService } from '$core/service/UsherService';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';
import { getWeekNumber } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const startTime = Date.now();

    const session = await event.locals.auth();
    const churchId = event.cookies.get('cid') as string || import.meta.env.VITE_CHURCH_ID;
    const eventService = new EventService(churchId);

    const weekNumber = getWeekNumber(new Date().toISOString());

    try {
        const events = await eventService.retrieveEventsByWeekRange({ weekNumber, isToday: true });

        // Track page load with performance and metadata
        const pageLoadMetadata = {
            load_time_ms: Date.now() - startTime,
            total_events: events.length,
            week_number: weekNumber,
            has_events: events.length > 0
        };

        await Promise.all([
            statsigService.logEvent('lingkungan_titik_tugas_view', 'load', session || undefined, pageLoadMetadata),
            posthogService.trackEvent('lingkungan_titik_tugas_view', {
                event_type: 'page_load',
                ...pageLoadMetadata
            }, session || undefined)
        ]);

        return {
            success: true,
            events: events,
            session
        };
    } catch (err) {
        logger.error('lingkungan_titik_tugas: Error fetching data', err);

        const errorMetadata = {
            error_type: err instanceof Error ? err.name : 'unknown',
            error_message: err instanceof Error ? err.message : String(err)
        };

        await Promise.all([
            statsigService.logEvent('lingkungan_titik_tugas_error', 'data_fetch_failed', session || undefined, errorMetadata),
            posthogService.trackEvent('lingkungan_titik_tugas_error', {
                event_type: 'data_fetch_failed',
                ...errorMetadata
            }, session || undefined)
        ]);

        throw err;
    }
};

export const actions = {
    // Retrieve ushers for a specific event
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
            const ushers = await usherService.retrieveUsherByEvent(eventId);

            return {
                success: true,
                selectedEventId: eventId,
                ushers
            };

        } catch (error) {
            logger.error('lingkungan_titik_tugas: Failed to fetch ushers', { eventId, error });

            const session = await event.locals.auth();
            const errorMetadata = {
                error_type: error instanceof Error ? error.name : 'unknown',
                error_message: error instanceof Error ? error.message : String(error),
                event_id: eventId
            };

            await Promise.all([
                statsigService.logEvent('lingkungan_titik_tugas_error', 'usher_fetch_failed', session || undefined, errorMetadata),
                posthogService.trackEvent('lingkungan_titik_tugas_error', {
                    event_type: 'usher_fetch_failed',
                    ...errorMetadata
                }, session || undefined)
            ]);

            return {
                success: false,
                error: 'Gagal mengambil data'
            };
        }
    }
} satisfies Actions;
