import type { Church } from '$core/entities/Schedule';
import { repo } from '$src/lib/server/db';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	// Define church at cookie for app to use
	const { cookies } = event;
	const session = await event.locals.auth();

	const cid = import.meta.env.VITE_CHURCH_ID;
	let churchConfigured: Church | null = null;
	churchConfigured = await repo.findChurchById(cid);

	if (!churchConfigured) {
		throw error(500, `CID ${cid} belum terdaftar pada LIS`);
	} else {
		cookies.set('cid', churchConfigured.id, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});
	}

	return {
		church: churchConfigured,
		session: session
	};
};
