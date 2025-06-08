import { logger } from '$src/lib/utils/logger';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { authHandle } from './auth';

/**
 * This file contains SvelteKit hooks that run on the server side.
 * 
 * Hooks are used to run code during the request/response lifecycle.
 * They allow you to modify the request and response objects, and to perform
 * actions before and after the request is handled.
 * 
 * Current hooks:
 * - authHandle: Handles authentication using @auth/sveltekit
 * - redirectUnauthorized: Checks if user is authenticated but not in database
 * 
 * The hooks are combined using the sequence() function from @sveltejs/kit/hooks
 * and run in the order specified.
 * 
 * @see https://kit.svelte.dev/docs/hooks
 * @see https://authjs.dev/reference/sveltekit
 */


const redirectUnauthorized: Handle = async ({ event, resolve }) => {
	// Check if the user is authenticated but not in the database
	const session = await event.locals.auth();

	if (session?.user?.unregistered) {
		logger.warn(`unregistered user ${session.user.email} detected`);
	}

	return resolve(event);
};

export const handle = sequence(authHandle, redirectUnauthorized);
