import type { Event } from '$core/entities/Event';
import type { Mass } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { UsherService } from '$core/service/UsherService';
import { statsigService } from '$src/lib/application/StatsigService';
import { repo } from '$src/lib/server/db';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { formatDate, getWeekNumber } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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
	await statsigService.use();

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
	const usherService = new UsherService(churchId);

	// Fetch masses and events concurrently
	try {
		const [fetchedMasses, massEvents] = await Promise.all([
			churchService.retrieveMasses(),
			churchService.retrieveEvents()
		]);

		masses = fetchedMasses;

		// Process each event to include detailed data
		eventsDetail = await Promise.all(
			massEvents.map(async (event: Event) => {
				// Get mass details and positions
				const massDetails = await repo.getEventById(event.id);
				if (!massDetails) {
					logger.error(`No mass details found for event ${event.id}`);
					throw error(500, 'Failed to fetch mass details');
				}

				// Fetch ushers for the event
				const ushers = await usherService.retrieveEventUshers(event.id);

				// Calculate usher statistics
				const requiredPositions = await churchService.retrievePositionsByMass(massDetails.mass);
				const totalUshers = requiredPositions?.length ?? 0;
				const confirmedUshers = ushers?.length ?? 0;
				const totalPpg = ushers.filter((usher) => usher.isPpg).length;
				const totalKolekte = ushers.filter((usher) => usher.isKolekte).length;

				// Calculate progress with safety check for division by zero
				const progress = totalUshers === 0 ? 0 : Math.min((confirmedUshers / totalUshers) * 100, 100);

				// Return event with additional usher count information
				return {
					...event,
					massDetails,
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
	const nextTwoWeeks = eventsDetail.filter((event) => {
		const weekNumber = event.weekNumber ?? 0;
		return weekNumber >= currentWeek && weekNumber <= currentWeek + 1;
	});
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
		currentWeek: nextTwoWeeks,
		pastWeek: activityItems,
		wilayahs: [],
		lingkungans: [],
		events: [],
		eventsDate: [],
		success: false,
		assignedUshers: []
	};
};
