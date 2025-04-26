import type { PageServerLoad } from './$types';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { repo } from '$src/lib/server/db';
import { redirect, error } from '@sveltejs/kit';
import { logger } from '$src/lib/utils/logger';
import { getWeekNumber, formatDate } from '$src/lib/utils/dateUtils';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import type { Event } from '$core/entities/Event';
import type { Mass } from '$core/entities/Schedule';

interface EventWithUsherCounts extends Event {
	usherCounts: {
		progress: number;
		totalUshers: number;
		confirmedUshers: number;
		totalPpg: number;
		totalKolekte: number;
	};
}

/**
 * Page server load function for the jadwal (schedule) page.
 * @type {import('./$types').PageServerLoad}
 */
export const load: PageServerLoad = async (event) => {
	// Check if the user is authenticated
	const { session } = await handlePageLoad(event, 'jadwal');

	if (!session) {
		logger.info(`Redirecting to signin page`);
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('No church ID found in session');
		throw error(500, 'Invalid session data');
	}

	let masses: Mass[] = [];
	let eventsDetail: EventWithUsherCounts[] = [];

	// Initialize services
	const churchService = new ChurchService(churchId);
	const eventService = new EventService(churchId);

	// Fetch masses and events concurrently
	try {
		const [fetchedMasses, massEvents] = await Promise.all([
			churchService.getMasses(),
			churchService.getEvents(10)
		]);

		masses = fetchedMasses;

		// Process each event to include detailed data
		eventsDetail = await Promise.all(
			massEvents.map(async (event: Event) => {
				// Fetch ushers for the event
				const ushers = await eventService.getEventUshers(event.id);

				// Get mass details and positions
				const massDetails = await repo.getEventById(event.id);
				if (!massDetails) {
					logger.error(`No mass details found for event ${event.id}`);
					throw error(500, 'Failed to fetch mass details');
				}

				const requiredPositions = await churchService.getPositionsByMass(massDetails.mass);
				const totalUshers = requiredPositions?.length ?? 0;

				// Calculate usher statistics
				const confirmedUshers = ushers?.length ?? 0;
				const totalPpg = ushers.filter((usher) => usher.isPpg).length;
				const totalKolekte = ushers.filter((usher) => usher.isKolekte).length;

				// Keep progress between 0 and 100
				const progress = Math.min((confirmedUshers / totalUshers) * 100, 100);

				// Return event with additional usher count information
				return {
					...event,
					usherCounts: {
						progress,
						totalUshers,
						confirmedUshers,
						totalPpg,
						totalKolekte
					}
				};
			})
		);
	} catch (err) {
		logger.error('Error fetching masses and events:', err);
		throw error(500, 'Failed to fetch schedule data');
	}

	// Filter events into this week and past events based on week number
	const currentWeek = getWeekNumber(new Date().toISOString());
	const thisWeekEvents = eventsDetail.filter((event) => event.weekNumber === currentWeek);
	const pastEvents = eventsDetail.filter((event) => (event.weekNumber ?? 0) < currentWeek);

	const activityItems = pastEvents.map(event => ({
		link: `<a href="/admin/jadwal/${event.id}" class="font-semibold text-primary-600 dark:text-primary-500 hover:underline">${event.mass}</a>`,
		date: formatDate(event.date),
		church: event.church,
		churchCode: event.churchCode,
		mass: event.mass,
		progress: Math.round(event.usherCounts.progress)
	}));

	// Return masses and processed events
	return {
		masses,
		currentWeek: thisWeekEvents,
		pastWeek: activityItems
	};
};
