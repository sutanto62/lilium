import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { captureEvent } from '$lib/utils/analytic';

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();

	// Redirect to signin if not authenticated
	if (!session) {
		throw redirect(302, '/signin');
	}

	// Redirect to register if user is unregistered
	if (session.user?.unregistered) {
		throw redirect(302, '/');
	}

	await captureEvent(event, 'admin_page_view');

	return { session };
};
