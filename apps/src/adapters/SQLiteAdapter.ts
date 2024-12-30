import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import {
	createEvent,
	createEventUsher,
	findEventUshers,
	findEventByChurch,
	findEvent,
	findEventByIdResponse,
	findEvents,
	updateEventUshers,
	findEventById,
	findUshersByEvent,
	findJadwalDetail,
	softDeleteEvent
} from './SQLiteDbEvent';
import { findMasses, getMassById } from './SQLiteDbMass';
import {
	findChurches,
	findChurchById,
	findZonesByChurch,
	findPositionByChurch,
	findPositionByMass
} from './SQLiteDbFacility';
import { findWilayahs, findLingkungans, findLingkunganById } from './SQLiteDbRegion';

import type { Church, ChurchZone } from '$core/entities/Schedule';
import type { EventUsher } from '$core/entities/Event';
import { findUserByEmail } from './SQLiteDbUser';

// Adapter
export class SQLiteAdapter implements ScheduleRepository {
	private db: ReturnType<typeof drizzle>;

	constructor(db: ReturnType<typeof drizzle>) {
		this.db = db;
	}

	// SQLiteDbRegion
	getWilayahs = (churchId: string) => findWilayahs(this.db, churchId);
	getLingkungans = (churchId: string) => findLingkungans(this.db, churchId);
	getLingkunganById = (id: string) => findLingkunganById(this.db, id);

	// SQLiteDbMass
	getMasses = (churchId: string) => findMasses(this.db, churchId);
	getMassById = (id: string) => getMassById(this.db, id);

	// SQLiteDbEvents
	getEventByChurch = (churchId: string, massId: string, date: string) =>
		findEventByChurch(this.db, churchId, massId, date);
	getPositionsByMass = (churchId: string, massId: string) =>
		findPositionByMass(this.db, churchId, massId);
	getEventById = (id: string) => findEventById(this.db, id);
	getEvents = (churchId: string) => findEvents(this.db, churchId);
	getEventUshers = (eventId: string, lingkunganId?: string, date?: string) =>
		findEventUshers(this.db, eventId, lingkunganId, date);
	getJadwalDetail = (eventId: string) => findJadwalDetail(this.db, eventId);
	deactivateEvent = (eventId: string) => softDeleteEvent(this.db, eventId);
	insertEvent = (churchId: string, massId: string, date: string) =>
		createEvent(this.db, churchId, massId, date);

	insertEventUshers = (
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	) => createEventUsher(this.db, eventId, ushers, wilayahId, lingkunganId);
	listUshers = (eventId: string) => findUshersByEvent(this.db, eventId);
	editEventUshers = (ushers: EventUsher[]) => updateEventUshers(this.db, ushers);
	findEvent = (churchId: string, massId?: string, date?: string) =>
		findEvent(this.db, churchId, massId, date);
	findEventById = (id: string) => findEventByIdResponse(this.db, id);

	// SQLiteDbFacility
	getChurches = () => findChurches(this.db);
	findChurchById = (id: string): Promise<Church> => findChurchById(this.db, id);

	getZones = (id: string): Promise<ChurchZone[]> => findZonesByChurch(this.db, id);

	findPositionByChurch = (id: string) => findPositionByChurch(this.db, id);

	// Authentication
	getUserByEmail = (email: string) => findUserByEmail(this.db, email);

	// Report
	// findUshersByEvent = (eventId: string, date: string) => findUshersByEvent(this.db, eventId, date)dd
}
