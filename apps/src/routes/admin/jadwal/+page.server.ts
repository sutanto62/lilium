import type { ChurchEvent } from '$core/entities/Event';
import type { Mass } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { UsherService } from '$core/service/UsherService';
import { statsigService } from '$src/lib/application/StatsigService';
import { repo } from '$src/lib/server/db';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { formatDate, getWeekNumber } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface EventWithUsherCounts extends ChurchEvent {
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
		logger.warn(`Redirecting to signin page`);
		throw redirect(302, '/signin');
	}

	await statsigService.logEvent('jadwal_view', 'event', session || undefined);

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
	const usherService = new UsherService(churchId);

	// Fetch masses and events concurrently
	try {
		const [fetchedMasses, massEvents] = await Promise.all([
			churchService.retrieveMasses(),
			eventService.retrieveEventsByWeekRange({ weekNumber: getWeekNumber(new Date().toISOString()), isToday: true })
		]);

		masses = fetchedMasses;

		// Process each event to include detailed data
		eventsDetail = await Promise.all(
			massEvents.map(async (event: ChurchEvent) => {
				// Get mass details and positions
				const massDetails = await repo.getEventById(event.id);
				if (!massDetails) {
					logger.error(`No mass details found for event ${event.id}`);
					throw error(500, 'Failed to fetch mass details');
				}

				// Fetch ushers for the event
				const ushers = await usherService.retrieveUsherByEvent(event.id);

				// Calculate usher statistics
				const requiredPositions = await churchService.retrievePositionsByMass(event.massId ? event.massId : '');
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

	// Filter events into current week + next week and past events
	// Note: retrieveEventsByWeekRange already returns events for current week + next week with year boundary handling
	// Since isToday=true was used, all events in eventsDetail are from today onwards
	// We use date-based filtering to handle year boundaries correctly
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// Calculate start of current week (Monday)
	const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0, Sunday = 6
	const startOfCurrentWeek = new Date(today);
	startOfCurrentWeek.setDate(today.getDate() - dayOfWeek);
	startOfCurrentWeek.setHours(0, 0, 0, 0);

	// Calculate end of next week (Sunday of next week, 13 days from start of current week)
	const endOfNextWeek = new Date(startOfCurrentWeek);
	endOfNextWeek.setDate(startOfCurrentWeek.getDate() + 13); // 14 days total (0-13 inclusive)
	endOfNextWeek.setHours(23, 59, 59, 999);

	// Filter events by actual dates (handles year boundaries correctly)
	// This ensures we only include events within the next two weeks
	const nextTwoWeeks = eventsDetail.filter((event) => {
		const eventDate = new Date(event.date);
		eventDate.setHours(0, 0, 0, 0);
		return eventDate >= startOfCurrentWeek && eventDate <= endOfNextWeek;
	});

	// Past events (should be empty due to isToday filter, but kept for safety)
	const pastEvents = eventsDetail.filter((event) => {
		const eventDate = new Date(event.date);
		eventDate.setHours(0, 0, 0, 0);
		return eventDate < startOfCurrentWeek;
	});

	const activityItems = pastEvents.map(event => ({
		link: `<a href="/admin/jadwal/${event.id}" class="font-semibold text-primary-600 dark:text-primary-500 hover:underline">${event.mass}</a>`,
		date: formatDate(event.date),
		church: event.church,
		churchCode: event.churchCode,
		mass: event.mass,
		massId: event.massId,
		progress: Math.round(event.usherCounts.progress),
		totalUshers: event.usherCounts.totalUshers,
		confirmedUshers: event.usherCounts.confirmedUshers,
		totalPpg: event.usherCounts.totalPpg,
		totalKolekte: event.usherCounts.totalKolekte
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
