import type { PageServerLoad } from './$types';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { repo } from '$src/lib/server/db';
import { redirect } from '@sveltejs/kit';
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
	const eventsDetailed = await Promise.all(
		massEvents.map(async (event) => {
			// Fetch ushers for the event
			const ushers = await eventService.getEventUshers(event.id);

			// Get mass details and positions
			const massId = await repo.getEventById(event.id);
			const massUshers = await churchService.getPositionsByMass(massId.mass);
			const totalUshers = massUshers?.length ?? 0;

			// Calculate usher statistics
			const confirmedUshers = ushers?.length ?? 0;
			const totalPpg = ushers.filter((usher) => usher.isPpg).length ?? 0;
			const totalKolekte = ushers.filter((usher) => usher.isKolekte).length ?? 0;

			// Return event with additional usher count information
			return {
				...event,
				usherCounts: {
					progress: (confirmedUshers / totalUshers) * 100,
					totalUshers: totalUshers,
					confirmedUshers,
					totalPpg,
					totalKolekte
				}
			};
		})
	);

	// Return masses and processed events
	return {
		masses,
		events: eventsDetailed
	};
};
