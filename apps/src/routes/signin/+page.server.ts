import type { Actions, PageServerLoad } from './$types';
import { signIn, providerMap } from '$src/auth';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	const callbackUrl = event.url.searchParams.get('callbackUrl') || '/admin';

	if (session) {
		throw redirect(303, callbackUrl);
	}

	// Access providerMap through load data to prevent $env/dynamic/private error
	return {
		providers: providerMap
	};
};

export const actions = {
	default: signIn
} satisfies Actions;
