import type { PageServerLoad } from './$types';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { repo } from '$src/lib/server/db';
import { redirect } from '@sveltejs/kit';
import { logger } from '$src/lib/utils/logger';
import { getWeekNumber, formatDate } from '$src/lib/utils/dateUtils';
import { captureEvent } from '$src/lib/utils/analytic';

/**
 * Page server load function for the jadwal (schedule) page.
 * @type {import('./$types').PageServerLoad}
 */
export const load: PageServerLoad = async (events) => {
	// Check if the user is authenticated
	const session = await events.locals.auth();

	if (!session) {
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid ?? '';

	// Initialize services
	const churchService = new ChurchService(churchId);
	const eventService = new EventService(churchId);

	// Fetch masses and events concurrently
	const [masses, massEvents] = await Promise.all([
		churchService.getMasses(),
		churchService.getEvents()
	]);

	// Process each event to include detailed data
	const eventsDetail = await Promise.all(
		massEvents.map(async (event) => {
			// Fetch ushers for the event
			const ushers = await eventService.getEventUshers(event.id);

			// Get mass details and positions
			const massId = await repo.getEventById(event.id);
			const requiredPositions = await churchService.getPositionsByMass(massId.mass);
			const totalUshers = requiredPositions?.length ?? 0;

			// Calculate usher statistics
			const confirmedUshers = ushers?.length ?? 0;
			const totalPpg = ushers.filter((usher) => usher.isPpg).length ?? 0;
			const totalKolekte = ushers.filter((usher) => usher.isKolekte).length ?? 0;

			// Keep progress between 0 and 100
			const progress = Math.min((confirmedUshers / totalUshers) * 100, 100);

			// Return event with additional usher count information
			return {
				...event,
				usherCounts: {
					progress: progress,
					totalUshers: totalUshers,
					confirmedUshers,
					totalPpg,
					totalKolekte
				}
			};
		})
	);

	// Filter events into this week and past events based on week number
	const currentWeek = getWeekNumber(new Date().toISOString());
	const thisWeekEvents = eventsDetail.filter(event => event.weekNumber === currentWeek);
	const pastEvents = eventsDetail.filter(event => (event.weekNumber ?? 0) < currentWeek);

	const activityItems = pastEvents.map(event => ({
		title: `<a href="/admin/jadwal/${event.id}" class="font-semibold text-primary-600 dark:text-primary-500 hover:underline">${event.mass}</a>`,
		date: formatDate(event.date),
		src: '',
		alt: ''
	}));

	await captureEvent(events, 'jadwal_page_view');

	// Return masses and processed events
	return {
		masses,
		currentWeek: thisWeekEvents,
		pastWeek: activityItems
	};
};
