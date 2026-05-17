import { checkServerGate } from '$lib/server/featureFlags';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	// Parent admin/+layout.server.ts already handles auth, redirect, and featurePreference.
	// new_domain_model: eligibility ceiling — controls toggle visibility.
	// new_settings_pages: controls which nav items are shown (child of new_domain_model).
	const [isNewDomainEligible, isNewUX] = await Promise.all([
		checkServerGate(event.locals, 'new_domain_model'),
		checkServerGate(event.locals, 'new_settings_pages')
	]);
	return { isNewDomainEligible, isNewUX };
};
