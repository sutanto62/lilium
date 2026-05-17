import { checkServerGate } from '$lib/server/featureFlags';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();
	const session = await event.locals.auth();

	const isNewRosterFlow = await checkServerGate(event.locals, 'new_roster_flow');

	const metadata = {
		is_new_roster_flow: isNewRosterFlow,
		load_time_ms: Date.now() - startTime
	};

	await Promise.all([
		statsigService.logEvent('admin_dashboard_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_dashboard_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { isNewRosterFlow };
};;;
