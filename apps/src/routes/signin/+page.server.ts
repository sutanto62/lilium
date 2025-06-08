import { providerMap, signIn } from '$src/auth';
import { statsigService } from '$src/lib/application/StatsigService';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	await statsigService.use();
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
