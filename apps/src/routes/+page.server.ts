import { hasRole } from '$src/auth';
import type { PageServerLoad } from './$types';
import { PostHog } from 'posthog-node';

export const load: PageServerLoad = async (event) => {


    const session = await event.locals.auth();
    const isAdmin = hasRole(session, 'admin');
    const posthog = new PostHog(import.meta.env.VITE_POSTHOG_KEY, {
        host: 'https://us.i.posthog.com'
    });

    posthog.capture({
        distinctId: session?.user?.id ?? 'anonymous',
        event: '$pageview',
        properties: {
            $set: { $pageview: true }
        }
    });
    await posthog.shutdown();

    return {
        session,
        isAdmin
    };
};
