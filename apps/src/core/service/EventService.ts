import type {
	CetakJadwalResponse,
	ChurchEvent,
	ChurchEventResponse,
	EventPicRequest,
	EventScheduleResponse,
	EventUsher
} from '$core/entities/Event';
import { EventType } from '$core/entities/Event';
import type { UsherResponse } from "$core/entities/Usher";
import { ServiceError } from '$core/errors/ServiceError';
import { repo } from '$src/lib/server/db';
import { getUpcomingWeekNumbers, getWeekNumber } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { UsherService } from './UsherService';


export interface WeekRangeOptions {
	weekNumber?: number;
	weekNumbers?: number[];
	isToday?: boolean;
	limit?: number;
}

/**
 * Service class for managing church events and related operations
 * Use of Facade Pattern (temporarily) with Service Layer Pattern for specific domain
 */
export class EventService {
	churchId: string;
	eventDate: string;
	usherService: UsherService;

	/**
	 * Creates a new EventService instance
	 * @param churchId - The ID of the church
	 */
	constructor(churchId: string) {
		this.churchId = churchId;
		this.eventDate = '';
		this.usherService = new UsherService(churchId);
	}


	/**
	 * Retrieves events by week number(s)
	 * 
	 * Behavior:
	 * - If weekNumber is provided: retrieves events for that week and the next week (2 weeks total)
	 *   Year boundary handling: When weekNumber is 52 or 53, also includes week 1 to catch next year's
	 *   events. The date filter ensures only events from the correct time period are returned.
	 * - If weekNumbers array is provided: retrieves events for the specified week numbers
	 * - If neither is provided: returns empty array (invalid input)
	 * 
	 * Important: Week numbers are stored without year context. The date filter (isToday) ensures
	 * events from the correct time period are returned, even when week numbers repeat across years.
	 * 
	 * Example edge cases:
	 * - weekNumber: 52 (Dec 26, 2025) → queries [52, 53, 1] to catch week 52 of 2025 and week 1 of 2026
	 * - weekNumber: 53 → queries [53, 1] to catch week 53 of current year and week 1 of next year
	 * 
	 * @param options - Configuration options for retrieving events
	 * @param options.weekNumber - Single week number (will retrieve this week + next week, handles year boundaries)
	 * @param options.weekNumbers - Array of specific week numbers to retrieve (alternative to weekNumber)
	 * @param options.isToday - If true, includes events from today onwards; if false, only future events
	 * @param options.limit - Optional limit on number of events to return
	 * @returns A promise that resolves to an array of Event objects
	 */
	async retrieveEventsByWeekRange(options: WeekRangeOptions = {}): Promise<ChurchEvent[]> {
		const { weekNumber, weekNumbers, isToday = false, limit } = options;

		// Transform single weekNumber to array [weekNumber, nextWeek] (2 weeks)
		// Handle year boundaries: if weekNumber is 52 or 53, next week might be week 1 of next year
		// Since week numbers are stored without year context, we include both possibilities.
		// The date filter (isToday) ensures only events from the correct time period are returned
		let upcomingWeeks: number[] = weekNumber !== undefined
			? getUpcomingWeekNumbers(weekNumber)
			: (weekNumbers ?? []);

		// Handle edge case: if no week numbers provided, return empty array
		if (upcomingWeeks.length === 0) {
			logger.warn('EventService.retrieveEventsByWeekRange: No week numbers provided', { options });
			return [];
		}

		const events = await repo.listEventsByWeekNumber(this.churchId, upcomingWeeks, isToday, limit);
		return events;
	}

	/**
	 * Retrieves events within a specified date range
	 * @param startDate - The start date in ISO format (YYYY-MM-DD)
	 * @param endDate - The end date in ISO format (YYYY-MM-DD)
	 * @returns A promise that resolves to an array of Event objects
	 */
	async listEventsByDateRange(startDate: string, endDate: string): Promise<ChurchEvent[]> {
		return await repo.listEventsByDateRange(this.churchId, startDate, endDate);
	}

	/**
	 * Retrieves events by lingkungan
	 * @param lingkunganId - The ID of the lingkungan
	 * @param all - If true, all events will be returned, otherwise only active events will be returned
	 * @returns A promise that resolves to an array of Event objects
	 */
	async listEventsByLingkungan(lingkunganId: string, all?: boolean): Promise<ChurchEventResponse[]> {
		return await repo.listEventsByLingkungan(this.churchId, lingkunganId, all);
	}

	/**
	 * Retrieves a specific event by its ID
	 * @param eventId - The ID of the event to retrieve
	 * @returns A promise that resolves to the Event object
	 */
	async retrieveEventById(eventId: string): Promise<ChurchEvent> {
		return await repo.getEventById(eventId);
	}

	/**
	 * Creates a new event
	 * @param event - The event details to create (excluding id and createdAt)
	 * @returns A promise that resolves to the newly created Event
	 * @throws ServiceError if validation fails or event already exists
	 */
	async createEvent(event: Omit<ChurchEvent, 'id' | 'createdAt'>): Promise<ChurchEvent> {
		try {
			// Validate required fields
			if (!event.church) {
				throw ServiceError.validation('Church ID is required', { field: 'church' });
			}
			if (!event.mass) {
				throw ServiceError.validation('Mass ID is required', { field: 'mass' });
			}
			if (!event.date) {
				throw ServiceError.validation('Event date is required', { field: 'date' });
			}
			if (!event.code) {
				throw ServiceError.validation('Event code is required', { field: 'code' });
			}
			if (!event.description) {
				throw ServiceError.validation('Event description is required', { field: 'description' });
			}

			// Check if event already exists
			const existingEvent = await repo.getEventByChurch(event.church, event.mass, event.date);
			if (existingEvent && Object.keys(existingEvent).length > 0) {
				throw ServiceError.duplicate('Event already exists for this church, mass, and date', {
					church: event.church,
					mass: event.mass,
					date: event.date
				});
			}

			const newEvent: ChurchEvent = {
				...event,
				id: uuidv4(),
				createdAt: new Date().getTime()
			};

			const insertedEvent = await repo.insertEvent(newEvent);
			if (!insertedEvent) {
				throw ServiceError.database('Failed to insert event into database', { event: newEvent });
			}

			return insertedEvent;
		} catch (error) {
			logger.error('Failed to insert event:', error);
			if (error instanceof ServiceError) {
				throw error;
			}
			throw ServiceError.unknown('System failed to record event confirmation', { originalError: error });
		}
	}

	/**
	 * Updates an existing event by its ID.
	 * Omit mass: preventing changes in event mass's position
	 * @param eventId - The ID of the event to update
	 * @param event - The updated event data (excluding id, church, churchCode, and mass)
	 * @returns A promise that resolves to the updated Event object
	 * @throws Error if code or description is missing
	 */
	async updateEvent(eventId: string, event: Omit<ChurchEvent, 'id' | 'church' | 'churchCode' | 'mass'>): Promise<ChurchEvent> {
		const existingEvent = await this.retrieveEventById(eventId);

		let updatedEvent: ChurchEvent = {
			...event,
			id: eventId,
			church: existingEvent.church,
			mass: existingEvent.mass
		};

		if (!event.code) {
			throw new Error('Kode tidak ditemukan');
		}

		if (!event.description) {
			throw new Error('Deskripsi tidak ditemukan');
		}

		if (!event.weekNumber || event.weekNumber === null) {
			updatedEvent.weekNumber = getWeekNumber(event.date);
		}

		return await repo.updateEventById(eventId, updatedEvent);
	}

	/**
	 * Deactivates an event by its ID
	 * @param eventId - The ID of the event to deactivate
	 * @returns A promise that resolves to true if successful
	 */
	async deactivateEvent(eventId: string): Promise<boolean> {
		return await repo.deactivateEvent(eventId);
	}

	// --- END of CORE SERVICES

	// USHER SERVICE

	/**
	 * Retrieves formatted usher assignments for a specific event
	 * @deprecated Use usherService.retrieveEventUshers instead
	 * @param eventId - The ID of the event
	 * @returns A promise that resolves to an array of UsherByEvent objects
	 */
	async retrieveEventUshers(eventId: string): Promise<UsherResponse[]> {
		return this.usherService.retrieveUsherByEvent(eventId);
	}

	/**
	 * Retrieves all ushers assigned to a specific event
	 * @deprecated Use usherService.fetchEventUsherAssignments instead
	 * @param eventId - The ID of the event
	 * @returns A promise that resolves to an array of EventUsher objects
	 */
	async retrieveEventUsherAssignments(eventId: string): Promise<EventUsher[]> {
		return this.usherService.retrieveUsherAssignments(eventId);
	}

	/**
	 * Retrieves usher positions for a specific event
	 * @deprecated Use usherService.fetchEventUshersPositions instead
	 * @param eventId - The ID of the event
	 * @param isPpg - Flag indicating if positions are for PPG
	 * @returns A promise that resolves to an array of position strings
	 */
	async retrieveEventUshersPositions(eventId: string, isPpg: boolean): Promise<string[]> {
		return this.usherService.retrieveUshersPositions(eventId, isPpg);
	}

	/**
	 * Assigns ushers to an event
	 * @deprecated Use usherService.assignEventUshers instead
	 * @param eventId - The ID of the event
	 * @param ushers - Array of ushers to assign
	 * @param wilayahId - The ID of the wilayah
	 * @param lingkunganId - The ID of the lingkungan
	 * @returns A promise that resolves to true if successful
	 * @throws Error if assignment fails
	 */
	async assignEventUshers(
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	): Promise<number> {
		return this.usherService.assignEventUshers(eventId, ushers, wilayahId, lingkunganId);
	}

	/**
	 * Removes a usher assignment from an event
	 * @param eventId - The ID of the event
	 * @param lingkunganId - The ID of the lingkungan
	 * @returns A promise that resolves to true if successful
	 */
	async removeUsherAssignment(eventId: string, lingkunganId: string): Promise<boolean> {
		return await repo.removeEventUsher(eventId, lingkunganId);
	}

	// End of USHER SERVICE

	// SCHEDULE SERVICE

	/**
	 * Retrieves detailed schedule information for an event
	 * @param eventId - The ID of the event
	 * @returns A promise that resolves to a JadwalDetailResponse object
	 */
	async retrieveEventSchedule(eventId: string): Promise<EventScheduleResponse> {
		// TODO: move repo's logic here
		return await repo.findEventSchedule(eventId);
	}

	/**
	 * Retrieves schedule printing details for an event
	 * @param eventId - The ID of the event
	 * @returns A promise that resolves to a CetakJadwalResponse object
	 */
	async retrieveEventPrintSchedule(eventId: string): Promise<CetakJadwalResponse> {
		return await repo.findCetakJadwal(eventId);
	}

	/**
	 * Retrieves a list of stub events (for testing/development)
	 * @returns A promise that resolves to an array of stub Event objects
	 */
	async retrieveStubEvents(): Promise<ChurchEvent[]> {
		const stubEvents: ChurchEvent[] = [
			{
				id: '1',
				church: '1',
				mass: '1',
				date: '2025-05-29',
				weekNumber: 1,
				createdAt: 1715731200000,
				isComplete: 1,
				active: 1,
				type: EventType.FEAST,
				code: 'S1',
				description: 'Hari Raya Kenaikan Tuhan '
			},
			{
				id: '2',
				church: '1',
				mass: '2',
				date: '2025-12-25',
				weekNumber: 2,
				createdAt: 1715731200000,
				isComplete: 1,
				active: 1,
				type: EventType.FEAST,
				code: 'S2',
				description: 'Perayaan Natal'
			}
		];
		return stubEvents;
	}


	// SCHEDULE SERVICE

	/**
	 * Retrieves an event by ID with full response details
	 * @param eventId - The ID of the event to retrieve
	 * @returns A promise that resolves to the Event object with full details
	 */
	async retrieveEventDetails(eventId: string): Promise<ChurchEvent> {
		return await repo.findEventById(eventId);
	}

	/**
	 * @deprecated Use fetchEventUshers instead
	 * Retrieves ushers assigned to a specific event
	 * @param eventId - The ID of the event
	 * @returns A promise that resolves to an array of UsherByEvent objects
	 */
	async retrieveEventUshersByEventId(eventId: string): Promise<UsherResponse[]> {
		logger.warn('getEventUshersByEventId is deprecated. Use getEventUshers instead.');
		return this.retrieveEventUshers(eventId);
	}

	/**
	 * @deprecated Use predefined event confirmation instead
	 * Confirms or creates a new church event
	 * @param event - The event details to confirm or create
	 * @returns A promise that resolves to the existing or newly created Event
	 */
	async confirmEvent(event: ChurchEvent): Promise<ChurchEvent> {
		const createdEvent = await repo.getEventByChurch(event.church, event.mass, event.date);

		if (createdEvent && Object.keys(createdEvent).length > 0) {
			return createdEvent;
		}

		return await this.createEvent(event);
	}

	/**
	 * Assigns a person in charge (PIC) to an event
	 * @param request - The PIC assignment request details
	 * @returns A promise that resolves to true if successful
	*/
	async assignEventPic(request: EventPicRequest): Promise<boolean> {
		return await repo.createEventPic(request);
	}


}
