import { statsigService } from '$src/lib/application/StatsigService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	await statsigService.use();
	const error = url.searchParams.get('error');
	const status = url.searchParams.get('status');

	return {
		error,
		status
	};
};
