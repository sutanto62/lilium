import { hasRole } from '$src/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    const isAdmin = hasRole(session, 'admin');
    return {
        session,
        isAdmin
    };
};
