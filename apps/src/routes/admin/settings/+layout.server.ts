import { checkServerGate, getFeaturePreference } from '$lib/server/featureFlags';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	// new_domain_model: eligibility ceiling — controls toggle visibility.
	// new_settings_pages: controls which nav items are shown (child of new_domain_model).
	// featurePreference: exposed so child pages can enforce opt-in without a second DB read.
	const [isNewDomainEligible, isNewUX, featurePreference] = await Promise.all([
		checkServerGate(event.locals, 'new_domain_model'),
		checkServerGate(event.locals, 'new_settings_pages'),
		getFeaturePreference(event.locals)
	]);
	return { isNewDomainEligible, isNewUX, featurePreference };
};
