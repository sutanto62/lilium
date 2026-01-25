/**
 * Server-side page load for the Admin Posisi (Mass Schedules) page
 * 
 * Handles:
 * - Authentication and authorization (admin role required)
 * - Loading all mass schedules for the church
 * - Analytics tracking
 */
import { hasRole } from '$src/auth';
import type { Mass } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Server-side load function that fetches mass schedules for the admin posisi page
 * 
 * Behavior:
 * - Authenticates user and redirects to signin if not authenticated
 * - Validates admin role (layout also checks, but explicit check for security)
 * - Validates church ID from session
 * - Fetches all mass schedules for the church
 * - Tracks analytics
 * 
 * @param event - SvelteKit load event containing request, url, etc.
 * @returns Page data including masses array
 */
export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	// Authenticate user and check permissions
	const { session } = await handlePageLoad(event, 'posisi');
	if (!session) {
		logger.warn('admin_posisi.load: No session found');
		throw redirect(302, '/signin');
	}

	// Explicit admin role check (layout also checks, but extra security)
	if (!hasRole(session, 'admin')) {
		logger.warn('admin_posisi.load: User does not have admin role');
		throw redirect(302, '/');
	}

	// Get church ID from session and validate
	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_posisi.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	// Initialize church service
	const churchService = new ChurchService(churchId);

	// Fetch all mass schedules
	let masses: Mass[] = [];
	try {
		masses = await churchService.retrieveMasses();
	} catch (err) {
		logger.error('admin_posisi.load: Error fetching masses', { err, churchId });

		// Track error with context
		const errorMetadata = {
			error_type: err instanceof Error ? err.name : 'unknown',
			error_message: err instanceof Error ? err.message : String(err),
			church_id: churchId
		};

		await Promise.all([
			statsigService.logEvent('admin_posisi_error', 'data_fetch_failed', session || undefined, errorMetadata),
			posthogService.trackEvent('admin_posisi_error', {
				event_type: 'data_fetch_failed',
				...errorMetadata
			}, session || undefined)
		]);

		throw error(500, 'Failed to fetch mass schedules');
	}

	// Track page load with performance and metadata
	const pageLoadMetadata = {
		total_masses: masses.length,
		active_masses: masses.filter(m => m.active === 1).length,
		inactive_masses: masses.filter(m => m.active === 0).length,
		load_time_ms: Date.now() - startTime,
		has_masses: masses.length > 0
	};

	await Promise.all([
		statsigService.logEvent('admin_posisi_view', 'load', session || undefined, pageLoadMetadata),
		posthogService.trackEvent('admin_posisi_view', {
			event_type: 'page_load',
			...pageLoadMetadata
		}, session || undefined)
	]);

	// Return page data
	return {
		masses
	};
};
