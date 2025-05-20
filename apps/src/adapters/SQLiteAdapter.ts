import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import { drizzle } from 'drizzle-orm/libsql';
import {
	createEvent,
	createEventPic,
	createEventUsher,
	findCetakJadwal,
	findEvent,
	findEventByChurch,
	findEventById,
	findEventByIdResponse,
	findEvents,
	findEventsByDateRange,
	findEventsByWeekNumber,
	findEventUshers,
	findEventUshersPosition,
	findJadwalDetail,
	findUshersByEvent,
	softDeleteEvent,
	updateEventUshers,
} from './SQLiteDbEvent';
import {
	findChurchById,
	findChurches,
	findPositionByChurch,
	findPositionByMass,
	findZonesByChurch,
	findZonesByEvent
} from './SQLiteDbFacility';
import { findMassById, findMasses } from './SQLiteDbMass';
import { findLingkunganById, findLingkungans, findWilayahs } from './SQLiteDbRegion';

import type { Event as ChurchEvent, EventPicRequest, EventUsher } from '$core/entities/Event';
import type { Church, ChurchZone } from '$core/entities/Schedule';
import { findUserByEmail, findUsersByChurch } from './SQLiteDbUser';

// Adapter
// It is used to abstract the database implementation.
// Future implementation can be changed to different database type.
// For example, PostgreSQL, MySQL, etc.

export class SQLiteAdapter implements ScheduleRepository {
	private db: ReturnType<typeof drizzle>;

	constructor(db: ReturnType<typeof drizzle>) {
		this.db = db;
	}
	findEventByIdResponse(id: string): Promise<{ date: string; id: string; church_id: string; code: string | null; active: number; createdAt: number | null; created_at: number; mass_id: string; week_number: number | null; isComplete: number; type: 'mass' | 'feast'; description: string | null; } | null> {
		throw new Error('Method not implemented.');
	}

	// SQLiteDbRegion
	getWilayahs = (churchId: string) => findWilayahs(this.db, churchId);
	getLingkungans = (churchId: string) => findLingkungans(this.db, churchId);
	getLingkunganById = (id: string) => findLingkunganById(this.db, id);

	// SQLiteDbMass
	getMasses = (churchId: string) => findMasses(this.db, churchId);
	getMassById = (id: string) => findMassById(this.db, id);

	// SQLiteDbEvents
	getEventByChurch = (churchId: string, massId: string, date: string) =>
		findEventByChurch(this.db, churchId, massId, date);
	getPositionsByMass = (churchId: string, massId: string) =>
		findPositionByMass(this.db, churchId, massId);
	getEventById = (id: string) => findEventById(this.db, id);
	getEventByIdResponse = (id: string) => findEventByIdResponse(this.db, id);
	getEvents = (churchId: string, limit?: number) => findEvents(this.db, churchId, limit);
	getEventsByWeekNumber = (churchId: string, weekNumber: number[], limit?: number) =>
		findEventsByWeekNumber(this.db, churchId, weekNumber, limit);
	getEventsByDateRange = (churchId: string, startDate: string, endDate: string) =>
		findEventsByDateRange(this.db, churchId, startDate, endDate);
	getEventUshers = (eventId: string, lingkunganId?: string, date?: string) =>
		findEventUshers(this.db, eventId, lingkunganId, date);
	getEventUshersPosition = (eventId: string, isPpg: boolean): Promise<string[]> =>
		findEventUshersPosition(this.db, eventId, isPpg);
	findJadwalDetail = (eventId: string) => findJadwalDetail(this.db, eventId);
	deactivateEvent = (eventId: string) => softDeleteEvent(this.db, eventId);

	insertEvent = (event: ChurchEvent) =>
		createEvent(this.db, event);
	createEventPic = (request: EventPicRequest) => createEventPic(this.db, request);
	insertEventUshers = (
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	) => createEventUsher(this.db, eventId, ushers, wilayahId, lingkunganId);
	listUshers = (eventId: string) => findUshersByEvent(this.db, eventId);
	editEventUshers = (eventUshers: EventUsher[]) => updateEventUshers(this.db, eventUshers);
	findEvent = (churchId: string, massId?: string, date?: string) =>
		findEvent(this.db, churchId, massId, date);
	findEventById = (id: string) => findEventByIdResponse(this.db, id);
	findCetakJadwal = (eventId: string) => findCetakJadwal(this.db, eventId);

	// SQLiteDbFacility
	getChurches = () => findChurches(this.db);
	findChurchById = (id: string): Promise<Church> => findChurchById(this.db, id);

	getZones = (id: string): Promise<ChurchZone[]> => findZonesByChurch(this.db, id);
	getZonesByEvent = (churchId: string, eventId: string) => findZonesByEvent(this.db, churchId, eventId);
	findPositionByChurch = (id: string) => findPositionByChurch(this.db, id);

	// Authentication
	getUserByEmail = (email: string) => findUserByEmail(this.db, email);
	getUsers = (churchId: string) => findUsersByChurch(this.db, churchId);
	findUsersByChurch = (churchId: string) => findUsersByChurch(this.db, churchId);

	// Report
	// findUshersByEvent = (eventId: string, date: string) => findUshersByEvent(this.db, eventId, date)dd
}

