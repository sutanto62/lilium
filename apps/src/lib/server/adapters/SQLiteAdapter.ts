import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import { drizzle } from 'drizzle-orm/libsql';
import {
	createEvent,
	createEventPic,
	deleteEventUsher,
	editEventUshers,
	findCetakJadwal,
	findEvent,
	findEventByChurch,
	findEventById,
	findEventByIdResponse,
	findEventSchedule,
	findEventUshers,
	findEventUshersPosition,
	listEvents,
	listEventsByDateRange,
	listEventsByLingkungan,
	listEventsByWeekNumber,
	listUsherByEvent,
	listUsherByLingkungan,
	persistEventUsher,
	softDeleteEvent,
	updateEventById
} from './SQLiteDbEvent';
import {
	createPosition,
	findChurchById,
	findChurches,
	findPositionByChurch,
	findZoneGroupsByEvent,
	findZonesByChurch,
	findZonesByEvent,
	listPositionByMass,
	reorderZonePositions,
	softDeletePosition,
	updatePosition
} from './SQLiteDbFacility';
import { deactivateMass as deactivateMassDb, findMassById, findMasses } from './SQLiteDbMass';
import { findLingkunganById, listLingkunganByChurch, listWilayahByChurch } from './SQLiteDbRegion';

import type { ChurchEvent, EventPicRequest, EventUsher } from '$core/entities/Event';
import type { Church, ChurchZone, Lingkungan } from '$core/entities/Schedule';
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
	listWilayahByChurch = (churchId: string) => listWilayahByChurch(this.db, churchId);
	listLingkunganByChurch = (churchId: string) => listLingkunganByChurch(this.db, churchId);
	findLingkunganById = (id: string): Promise<Lingkungan> => findLingkunganById(this.db, id);

	// SQLiteDbMass
	getMasses = (churchId: string) => findMasses(this.db, churchId);
	getMassById = (id: string) => findMassById(this.db, id);
	deactivateMass = (massId: string) => deactivateMassDb(this.db, massId);

	// SQLiteDbEvents
	getEventByChurch = (churchId: string, massId: string, date: string) =>
		findEventByChurch(this.db, churchId, massId, date);
	listPositionByMass = (churchId: string, massId: string) =>
		listPositionByMass(this.db, churchId, massId);
	getEventById = (id: string) => findEventById(this.db, id);
	updateEventById = (id: string, event: ChurchEvent) => updateEventById(this.db, id, event);
	getEventByIdResponse = (id: string) => findEventByIdResponse(this.db, id);
	listEvents = (churchId: string, limit?: number) => listEvents(this.db, churchId, limit);
	listEventsByWeekNumber = (churchId: string, weekNumber: number[], isToday: boolean, limit?: number) =>
		listEventsByWeekNumber(this.db, churchId, weekNumber, isToday, limit);
	listEventsByDateRange = (churchId: string, startDate: string, endDate: string) =>
		listEventsByDateRange(this.db, churchId, startDate, endDate);
	listEventsByLingkungan = (churchId: string, lingkunganId: string, all?: boolean) =>
		listEventsByLingkungan(this.db, churchId, lingkunganId, all);


	findEventSchedule = (eventId: string) => findEventSchedule(this.db, eventId);
	deactivateEvent = (eventId: string) => softDeleteEvent(this.db, eventId);

	insertEvent = (event: ChurchEvent) =>
		createEvent(this.db, event);
	createEventPic = (request: EventPicRequest) => createEventPic(this.db, request);

	editEventUshers = (eventUshers: EventUsher[]) => editEventUshers(this.db, eventUshers);
	findEvent = (churchId: string, massId?: string, date?: string) =>
		findEvent(this.db, churchId, massId, date);
	findEventById = (id: string) => findEventByIdResponse(this.db, id);
	findCetakJadwal = (eventId: string) => findCetakJadwal(this.db, eventId);
	removeEventUsher = (eventId: string, lingkunganId: string) => deleteEventUsher(this.db, eventId, lingkunganId);

	// Ushers
	listUsherByEvent = (eventId: string) => listUsherByEvent(this.db, eventId);
	findEventUshers = (eventId: string, lingkunganId?: string, date?: string) =>
		findEventUshers(this.db, eventId, lingkunganId, date);
	listUsherByLingkungan = (eventId: string, lingkunganId: string) =>
		listUsherByLingkungan(this.db, eventId, lingkunganId);
	getEventUshersPosition = (eventId: string, isPpg: boolean): Promise<string[]> =>
		findEventUshersPosition(this.db, eventId, isPpg);
	persistEventUshers = (
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	) => persistEventUsher(this.db, eventId, ushers, wilayahId, lingkunganId);


	// SQLiteDbFacility
	getChurches = () => findChurches(this.db);
	findChurchById = (id: string): Promise<Church> => findChurchById(this.db, id);

	getZones = (id: string): Promise<ChurchZone[]> => findZonesByChurch(this.db, id);
	getZonesByEvent = (churchId: string, eventId: string) => findZonesByEvent(this.db, churchId, eventId);
	findZoneGroupsByEvent = (churchId: string, eventId: string) => findZoneGroupsByEvent(this.db, churchId, eventId);
	findPositionByChurch = (id: string) => findPositionByChurch(this.db, id);
	createPosition = (position: Omit<import('$core/entities/Schedule').ChurchPosition, 'id' | 'church' | 'active'> & { zone: string }) =>
		createPosition(this.db, position);
	updatePosition = (positionId: string, patch: Partial<Pick<import('$core/entities/Schedule').ChurchPosition, 'name' | 'code' | 'description' | 'type' | 'isPpg'>>) =>
		updatePosition(this.db, positionId, patch);
	softDeletePosition = (positionId: string) => softDeletePosition(this.db, positionId);
	reorderZonePositions = (zoneId: string, items: { id: string; sequence: number }[]) =>
		reorderZonePositions(this.db, zoneId, items);

	// Authentication
	getUserByEmail = (email: string) => findUserByEmail(this.db, email);
	getUsers = (churchId: string) => findUsersByChurch(this.db, churchId);
	findUsersByChurch = (churchId: string) => findUsersByChurch(this.db, churchId);

	// Report
	// findUshersByEvent = (eventId: string, date: string) => findUshersByEvent(this.db, eventId, date)dd
}

