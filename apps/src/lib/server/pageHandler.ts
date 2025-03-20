import type { RequestEvent } from '@sveltejs/kit';
import { captureEventServer } from '$lib/utils/analytic';
import { logger } from '$lib/utils/logger';

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
        await captureEventServer(session?.user?.email ?? 'visitor', `${pageId}_page_view`);

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