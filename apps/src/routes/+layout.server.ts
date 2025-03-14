import type { Church } from '$core/entities/Schedule';
import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { repo } from '$src/lib/server/db';
import posthog from 'posthog-js';
import { browser } from '$app/environment';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	// Define church at cookie for app to use
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

	if (browser) {
		posthog.init(
			import.meta.env.VITE_POSTHOG_KEY,
			{
				api_host: 'https://us.i.posthog.com',
				person_profiles: 'always', // or 'always' to create profiles for anonymous users as well
				capture_pageview: false, // disable pageview capture for server-side
				capture_pageleave: false // disable pageleave capture for server-side
			}
		)
	}

	return {
		church: churchConfigured,
		session: await locals.auth()
	};
};
