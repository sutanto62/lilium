import { repo } from '$src/lib/server/db';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	updateFeaturePreference: async (event) => {
		const session = await event.locals.auth();

		if (!session?.user?.email) {
			return fail(401, { error: 'Unauthenticated' });
		}

		if (session.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await event.request.formData();
		const preference = data.get('preference');

		// Accept a known value or null (to clear)
		const normalised = typeof preference === 'string' && preference.length > 0
			? preference
			: null;

		await repo.updateUserFeaturePreference(session.user.email, normalised);

		return { success: true, featurePreference: normalised };
	}
};
