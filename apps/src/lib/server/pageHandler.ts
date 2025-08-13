import { logger } from '$lib/utils/logger';
import type { RequestEvent } from '@sveltejs/kit';
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

        // TODO: add user if session is not null
        await statsigService.logEvent(`${pageId}_view_server`, 'load');

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