/**
 * Server-side PostHog tracking using posthog-node.
 *
 * posthog-js (PostHogService) is browser-only — all trackEvent calls in
 * +page.server.ts files silently no-op. Use this module instead for all
 * server-side PostHog events.
 *
 * Usage:
 *   import { trackServerEvent } from '$src/lib/server/posthogNode';
 *   await trackServerEvent('admin_jadwal_view', { load_time_ms: 42 }, session);
 */
import { PostHog } from 'posthog-node';
import type { Session } from '@auth/sveltekit';

let _client: PostHog | null = null;

function getClient(): PostHog {
	if (!_client) {
		const key = import.meta.env.VITE_POSTHOG_KEY ?? '';
		const host = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';
		_client = new PostHog(key, {
			host,
			// Flush on every event so no explicit shutdown() is needed per request.
			flushAt: 1,
			flushInterval: 0
		});
	}
	return _client;
}

/**
 * Capture a server-side analytics event via posthog-node.
 *
 * - Never throws — analytics failures must never break app flow.
 * - Uses the session user's email as the distinct ID; falls back to 'anonymous'.
 * - Mirrors the Statsig logEvent call signature for easy parallel usage:
 *     await Promise.all([
 *       statsigService.logEvent('event_name', 'action', session, metadata),
 *       trackServerEvent('event_name', { event_type: 'action', ...metadata }, session)
 *     ]);
 */
export async function trackServerEvent(
	event: string,
	properties: Record<string, unknown> = {},
	session?: Session | null
): Promise<void> {
	try {
		const client = getClient();
		const distinctId = session?.user?.email ?? 'anonymous';
		client.capture({
			distinctId,
			event,
			properties: {
				...properties,
				...(session?.user?.email ? { $set: { email: session.user.email, name: session.user.name } } : {})
			}
		});
		// flushAt: 1 ensures the event is sent immediately without needing shutdown()
	} catch {
		// Swallow — analytics must never break app flow
	}
}
