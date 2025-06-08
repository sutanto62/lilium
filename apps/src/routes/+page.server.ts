import { hasRole } from '$src/auth';
import { statsigService } from '$src/lib/application/StatsigService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    await statsigService.use();

    const session = await event.locals.auth();
    const isAdmin = hasRole(session, 'admin');
    const isUser = hasRole(session, 'user');

    // Feature flag
    const isNoSaturdaySunday = await statsigService.checkGate('no_saturday_sunday');

    return {
        session,
        isAdmin,
        isUser,
        isNoSaturdaySunday,
        success: true
    };
};
