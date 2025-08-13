import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { getServerTimezoneInfo } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { TZDate } from '@date-fns/tz';
import type { PageServerLoad } from './$types';

/**
 * Page server load function for the petunjuk (instructions) page.
 * 
 * This function:
 * 1. Gets the current user session
 * 2. Captures analytics event for page view
 * 3. Returns server timezone information for debugging
 * 
 * @returns {Promise<{}>} Object containing session, error, and timezone info
 */
export const load: PageServerLoad = async (event) => {
    const { session, error } = await handlePageLoad(event, 'petunjuk');

    const currentServerTime = new Date();
    const timezoneInfo = getServerTimezoneInfo();
    const asiaJakartaTime = new TZDate(currentServerTime, 'Asia/Jakarta');

    // Feature flag
    const isFeatureTimezone = await statsigService.checkGate('timezone');
    logger.debug('feature flag isFeatureTimezone: ', isFeatureTimezone);

    return {
        session,
        error,
        isFeatureTimezone,
        currentServerTime,
        timezoneInfo,
        asiaJakartaTime
    };
};
