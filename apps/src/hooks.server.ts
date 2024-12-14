import { authHandle } from './auth';
import { sequence } from '@sveltejs/kit/hooks';
import { logger } from './lib/utils/logger';
import type { Handle } from '@sveltejs/kit';

const redirectUnauthorized: Handle = async ({ event, resolve }) => {
	// Check if the user is authenticated but not in the database
	const session = await event.locals.auth();

	if (session?.user?.unregistered) {
		logger.warn(`unregistered user ${session.user.email} detected`);
	}

	return resolve(event);
};

export const handle = sequence(authHandle, redirectUnauthorized);
