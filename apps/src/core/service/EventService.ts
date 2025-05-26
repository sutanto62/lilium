import type {
	CetakJadwalResponse,
	Event as ChurchEvent,
	EventPicRequest,
	EventUsher,
	JadwalDetailResponse,
	UsherByEvent
} from '$core/entities/Event';
import { EventType } from '$core/entities/Event';
import { ServiceError } from '$core/errors/ServiceError';
import { repo } from '$src/lib/server/db';
import { getWeekNumber } from '$src/lib/utils/dateUtils';
import { logger } from '$src/lib/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class EventService {
	churchId: string;
	eventDate: string;

	constructor(churchId: string) {
		this.churchId = churchId;
		this.eventDate = '';
	}

	/**
	 * Retrieves events by week number for upcomping 2 weeks
	 * 
	 * @param weekNumber - The week number to retrieve events for
	 * @param limit - The maximum number of events to retrieve, omit to return all events
	 * @returns A promise that resolves to an array of Event objects
	 */
	async getEventsByWeekNumber(weekNumber?: number, weekNumbers?: number[], limit?: number): Promise<ChurchEvent[]> {
		const upcomingWeeks = weekNumber ? [weekNumber, weekNumber + 1] : (weekNumbers ?? []);
		const events = await repo.getEventsByWeekNumber(this.churchId, upcomingWeeks, limit);
		return events;
	}

	async getEventsByDateRange(startDate: string, endDate: string): Promise<ChurchEvent[]> {
		return await repo.getEventsByDateRange(this.churchId, startDate, endDate);
	}

	async getEvents(): Promise<ChurchEvent[]> {
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

	async getEventById(eventId: string): Promise<ChurchEvent> {
		return await repo.getEventById(eventId);
	}

	// Omit mass: preventing changes in event mass's position
	async updateEventById(eventId: string, event: Omit<ChurchEvent, 'id' | 'church' | 'churchCode' | 'mass'>): Promise<ChurchEvent> {
		const existingEvent = await this.getEventById(eventId);

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

	async getEventByIdResponse(eventId: string): Promise<ChurchEvent> {
		return await repo.findEventById(eventId);
	}

	async getEventUshersByEventId(eventId: string): Promise<UsherByEvent[]> {
		logger.warn('getEventUshersByEventId is deprecated. Use getEventUshers instead.');
		return this.getEventUshers(eventId);
	}

	// return formated responses
	async getEventUshers(eventId: string): Promise<UsherByEvent[]> {
		return await repo.listUshers(eventId);
	}

	async getUshersByEvent(eventId: string): Promise<EventUsher[]> {
		return await repo.getEventUshers(eventId);
	}

	async getEventUshersPosition(eventId: string, isPpg: boolean): Promise<string[]> {
		return await repo.getEventUshersPosition(eventId, isPpg);
	}

	async getJadwalDetail(eventId: string): Promise<JadwalDetailResponse> {
		return await repo.findJadwalDetail(eventId);
	}

	async deactivateEvent(eventId: string): Promise<boolean> {
		return await repo.deactivateEvent(eventId);
	}

	async removeEventUsher(eventId: string, lingkunganId: string): Promise<boolean> {
		return await repo.removeEventUsher(eventId, lingkunganId);
	}

	/**
	 * Confirms or creates a new church event.
	 * 
	 * This method first checks if an event already exists for the given church, mass and date.
	 * If it exists, returns the existing event. Otherwise creates a new event.
	 * 
	 * @param event - The event details containing church ID, mass ID and date
	 * @returns Promise<ChurchEvent> - The existing or newly created event
	 */

	/**
	 * @deprecated confirm by predefined event
	 */
	async confirmEvent(event: ChurchEvent): Promise<ChurchEvent> {
		const createdEvent = await repo.getEventByChurch(event.church, event.mass, event.date);

		if (createdEvent && Object.keys(createdEvent).length > 0) {
			return createdEvent;
		}

		return await this.insertEvent(event);
	}

	async insertEvent(event: Omit<ChurchEvent, 'id' | 'createdAt'>): Promise<ChurchEvent> {
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

	async insertEventUshers(
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	): Promise<boolean> {
		try {
			const result = await repo.insertEventUshers(eventId, ushers, wilayahId, lingkunganId);
			if (!result) {
				return false;
			}
			return true;
		} catch (error) {
			logger.error('Gagal menambahkan petugas pada tugas misa:', error);
			throw new Error('Sistem gagal mencatat petugas');
		}
	}

	async insertEventPic(request: EventPicRequest): Promise<boolean> {
		return await repo.createEventPic(request);
	}

	async getCetakJadwal(eventId: string): Promise<CetakJadwalResponse> {
		return await repo.findCetakJadwal(eventId);
	}
}
