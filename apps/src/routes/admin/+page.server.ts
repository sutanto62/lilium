import { checkServerGate } from '$lib/server/featureFlags';
import { logger } from '$src/lib/utils/logger';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const isNewRosterFlow = await checkServerGate(event.locals, 'new_roster_flow');
	logger.debug('admin.load: gate check', { isNewRosterFlow });

	return { isNewRosterFlow };
};;
