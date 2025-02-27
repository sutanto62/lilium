import { v4 as uuidv4 } from 'uuid';
import { repo } from '$src/lib/server/db';
import type {
	Event as ChurchEvent,
	EventUsher,
	UsherByEvent,
	JadwalDetailResponse,
	CetakJadwalResponse,
	EventPicRequest
} from '$core/entities/Event';
import { logger } from '$src/lib/utils/logger';

export class EventService {
	churchId: string;
	eventDate: string;

	constructor(churchId: string) {
		this.churchId = churchId;
		this.eventDate = '';
	}

	async getEventById(eventId: string): Promise<ChurchEvent> {
		return await repo.findEventById(eventId);
	}

	async getEventUshersByEventId(eventId: string): Promise<UsherByEvent[]> {
		logger.warn('getEventUshersByEventId is deprecated. Use getEventUshers instead.');
		return this.getEventUshers(eventId);
	}

	async getEventUshers(eventId: string): Promise<UsherByEvent[]> {
		return await repo.listUshers(eventId);
	}

	async getJadwalDetail(eventId: string): Promise<JadwalDetailResponse> {
		return await repo.findJadwalDetail(eventId);
	}

	async deactivateEvent(eventId: string): Promise<boolean> {
		return await repo.deactivateEvent(eventId);
	}

	async confirmEvent(event: ChurchEvent): Promise<ChurchEvent> {
		const createdEvent = await repo.getEventByChurch(event.church, event.mass, event.date);

		if (createdEvent && Object.keys(createdEvent).length > 0) {
			return createdEvent;
		}

		return await this.insertEvent(event);
	}

	async insertEvent(event: Omit<ChurchEvent, 'id' | 'createdAt'>): Promise<ChurchEvent> {
		try {
			const newEvent: ChurchEvent = {
				...event,
				id: uuidv4(),
				createdAt: new Date().getTime()
			};

			const insertedEvent = await repo.insertEvent(newEvent.church, newEvent.mass, newEvent.date);

			if (!insertedEvent) {
				throw new Error('Failed to insert event');
			}

			return insertedEvent;
		} catch (error) {
			logger.error('Gagal menambah tugas misa:', error);
			throw new Error('Sistem gagal mencatat konfirmasi tugas');
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

	async insertEventPic(pic: EventPicRequest): Promise<boolean> {
		return await repo.createEventPic(pic);
	}

	async getCetakJadwal(eventId: string): Promise<CetakJadwalResponse> {
		return await repo.findCetakJadwal(eventId);
	}
}
