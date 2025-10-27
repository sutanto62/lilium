import { logger } from '$lib/utils/logger';
import type { RequestEvent } from '@sveltejs/kit';
import { posthogService } from '../application/PostHogService';
import { statsigService } from '../application/StatsigService';

/**
 * Handles common page load operations including session management and analytics
 * 
 * @param event - The SvelteKit request event
 * @param pageId - Identifier for the page view analytics
 * @returns The session object and any additional data
 */
export async function handlePageLoad(event: RequestEvent, pageId: string) {
    try {
        const session = await event.locals.auth();

        // Track page view with both Statsig and PostHog
        // TODO: add user if session is not null
        await statsigService.logEvent(`${pageId}_view_server`, 'load');
        await Promise.all([
            statsigService.logEvent(`${pageId}_view_server`, 'load'),
            posthogService.trackEvent(`${pageId}_view_server`, {
                event_type: 'page_load',
                page_id: pageId
            }, session || undefined)
        ]);

        return {
            session,
            error: null
        };
    } catch (error) {
        logger.error(`Error in ${pageId} page load:`, error);
        return {
            session: null,
            error
        };
    }
} 