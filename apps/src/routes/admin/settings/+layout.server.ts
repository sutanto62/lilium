import { checkServerGate } from '$lib/server/featureFlags';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	// Parent admin/+layout.server.ts already handles auth, redirect, and featurePreference.
	// We extend it with the new_settings_pages gate check.
	const isNewUX = await checkServerGate(event.locals, 'new_settings_pages');
	return { isNewUX };
};
