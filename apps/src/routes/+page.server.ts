import { hasRole } from '$src/auth';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const startTime = Date.now();

    const session = await event.locals.auth();
    const isAdmin = hasRole(session, 'admin');
    const isUser = hasRole(session, 'user');

    // Feature flag
    const isNoSaturdaySunday = await statsigService.checkGate('no_saturday_sunday');

    // Track page load with performance and metadata
    const pageLoadMetadata = {
        load_time_ms: Date.now() - startTime,
        is_admin: isAdmin,
        is_user: isUser,
        no_saturday_sunday_enabled: isNoSaturdaySunday,
        has_session: !!session
    };

    await Promise.all([
        statsigService.logEvent('home_view_server', 'load', session || undefined, pageLoadMetadata),
        posthogService.trackEvent('home_view_server', {
            event_type: 'page_load',
            ...pageLoadMetadata
        }, session || undefined)
    ]);

    return {
        session,
        isAdmin,
        isUser,
        isNoSaturdaySunday,
        success: true
    };
};
