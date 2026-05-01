import { handlePageLoad } from '$src/lib/server/pageHandler';
import { hasRole } from '$src/auth';
import { logger } from '$src/lib/utils/logger';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { session } = await handlePageLoad(event, 'zone');
	if (!session) {
		logger.warn('admin_zone.load: No session found');
		throw redirect(302, '/signin');
	}
	if (!hasRole(session, 'admin')) {
		logger.warn('admin_zone.load: User does not have admin role');
		throw redirect(302, '/');
	}
	return {};
};
