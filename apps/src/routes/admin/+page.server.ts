import { checkServerGate, getFeaturePreference } from '$lib/server/featureFlags';
import { posthogService } from '$src/lib/application/PostHogService';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();
	const session = await event.locals.auth();

	// Gate AND explicit opt-in must both be true — gate alone is insufficient
	// (gate can be true from org-wide rollout without the user opting into new_domain)
	const [isRosterGate, featurePreference] = await Promise.all([
		checkServerGate(event.locals, 'new_roster_flow'),
		getFeaturePreference(event.locals)
	]);
	const isNewRosterFlow = isRosterGate && featurePreference === 'new_domain';

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
