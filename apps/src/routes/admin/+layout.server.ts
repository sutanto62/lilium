import { hasRole } from '$src/auth';
import { statsigService } from '$src/lib/application/StatsigService';
import { repo } from '$src/lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	// Use Statsig
	await statsigService.use();

	const session = await event.locals.auth();

	// Redirect to signin if not authenticated
	if (!session) {
		throw redirect(302, '/signin');
	}

	// Redirect to register if user is unregistered
	if (session.user?.unregistered) {
		throw redirect(302, '/');
	}

	// Check if user has admin role
	if (!hasRole(session, 'admin')) {
		throw redirect(302, '/');
	}

	// Load user preference from DB and sync to Statsig
	const dbUser = await repo.getUserByEmail(session.user?.email ?? '');
	const featurePreference = dbUser?.featurePreference ?? null;

	if (session.user?.name) {
		await statsigService.updateUser(session.user.name, {
			featurePreference: featurePreference ?? undefined
		});
	}

	return { session, featurePreference };
};
