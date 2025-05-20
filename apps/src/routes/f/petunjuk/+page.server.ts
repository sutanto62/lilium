import { handlePageLoad } from '$src/lib/server/pageHandler';
import type { PageServerLoad } from '../../$types';

/**
 * Page server load function for the petunjuk (instructions) page.
 * 
 * This function:
 * 1. Gets the current user session
 * 2. Captures analytics event for page view
 * 3. Returns empty object as no additional data is needed
 * 
 * @returns {Promise<{}>} Empty object as no additional data is needed
 */
export const load: PageServerLoad = async (event) => {
    await handlePageLoad(event, 'petunjuk');
    return {
        success: true,
        assignedUshers: []
    };
};
