import type { ServerLoadEvent } from '@sveltejs/kit';
import { PostHog } from 'posthog-node';

export const captureEvent = async (event: ServerLoadEvent, event_name: any) => {
    const session = await event.locals.auth();

    const posthog = new PostHog(import.meta.env.VITE_POSTHOG_KEY, { host: 'https://us.i.posthog.com' });
    const user = session?.user?.id ?? 'anonymous';

    posthog.capture({ distinctId: user, event: event_name });

    await posthog.shutdown();
}
