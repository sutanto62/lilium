import { handlePageLoad } from '$src/lib/server/pageHandler';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    await handlePageLoad(event, 'formulir');
    throw redirect(302, '/f/tatib');
}; 