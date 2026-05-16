import type { ChurchFacility } from '$core/entities/Parish';
import { checkServerGate } from '$lib/server/featureFlags';
import { repo } from '$lib/server/db';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';
import { logger } from '$src/lib/utils/logger';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Gate check: new_domain_model enables the Church Facility hierarchy view
	const isNewDomainModel = await checkServerGate(event.locals, 'new_domain_model');
	logger.debug('admin_zone_v2.load: gate check', { isNewDomainModel });

	if (!isNewDomainModel) {
		// Old behaviour: redirect to admin home (zone config is in settings sub-pages)
		logger.debug('admin_zone_v2.load: gate off → redirect /admin');
		throw redirect(301, '/admin');
	}

	const { session } = await handlePageLoad(event, 'admin_zone_v2');
	if (!session) {
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid ?? '';
	if (!churchId) {
		logger.error('admin_zone_v2.load: Church ID not found in session');
		throw error(404, 'Gereja belum terdaftar');
	}

	const startTime = Date.now();
	logger.debug('admin_zone_v2.load: loading ChurchFacility', { churchId });
	let facility: ChurchFacility;

	try {
		facility = await repo.findChurchFacility(churchId);
	} catch (err) {
		logger.error('admin_zone_v2.load: Failed to load church facility', { err, churchId });
		throw error(500, 'Gagal memuat data fasilitas gereja');
	}

	const sectionCount = facility.sections.length;
	const zoneCount = [...facility.zonesBySection.values()].reduce((acc, z) => acc + z.length, 0);
	const stationCount = [...facility.stationsByZone.values()].reduce(
		(acc, s) => acc + s.length,
		0
	);

	const metadata = {
		section_count: sectionCount,
		zone_count: zoneCount,
		station_count: stationCount,
		load_time_ms: Date.now() - startTime
	};
	logger.info('admin_zone_v2.load: OK', metadata);

	await Promise.all([
		statsigService.logEvent('admin_zone_v2_view', 'load', session, metadata),
		posthogService.trackEvent('admin_zone_v2_view', { event_type: 'page_load', ...metadata }, session)
	]);

	return { facility };
};
