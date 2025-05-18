import type { User } from '$core/entities/Authentication';
import type {
	CetakJadwalResponse,
	Event as ChurchEvent,
	EventPicRequest,
	EventUsher,
	JadwalDetailResponse,
	UsherByEvent
} from '$core/entities/Event';
import type {
	Church,
	ChurchPosition,
	ChurchZone,
	Lingkungan,
	Mass,
	Wilayah,
} from '$core/entities/Schedule';
import {
	event,
	mass,
} from '$lib/server/db/schema';

// Port
/*
 * `typeof mass.$inferSelect` type inference by Drizzle
 */
export interface ScheduleRepository {
	// Mass
	getMasses: (churchId: string) => Promise<Mass[]>;
	getMassById: (id: string) => Promise<typeof mass.$inferSelect | null>;

	// Region
	getWilayahs: (churchId: string) => Promise<Wilayah[]>;
	getLingkungans: (churchId: string) => Promise<Lingkungan[]>;
	getLingkunganById: (id: string) => Promise<Lingkungan | null>;

	// TODO: change Promies<string[]> array of usher id
	// Event
	insertEvent: (event: ChurchEvent) => Promise<ChurchEvent>;
	insertEventUshers: (
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	) => Promise<boolean>;
	createEventPic: (pic: EventPicRequest) => Promise<boolean>;
	getEventByChurch: (churchId: string, massId: string, date: string) => Promise<ChurchEvent>;
	getEventUshers(eventId: string, lingkunganId?: string, date?: string): Promise<EventUsher[]>;
	getEventUshersPosition(eventId: string, isPpg: boolean): Promise<string[]>;
	getEvents(churchId: string, limit?: number): Promise<ChurchEvent[]>;
	getEventsByWeekNumber(churchId: string, weekNumbers: number[], limit?: number): Promise<ChurchEvent[]>;
	getEventsByDateRange(churchId: string, startDate: string, endDate: string): Promise<ChurchEvent[]>;
	getEventById(id: string): Promise<ChurchEvent>;
	findJadwalDetail(eventId: string): Promise<JadwalDetailResponse>;
	deactivateEvent(eventId: string): Promise<boolean>;
	listUshers(eventId: string): Promise<UsherByEvent[]>; // formatted response
	findEvent(churchId: string, massId?: string, date?: string): Promise<typeof event.$inferSelect>;
	findEventById(id: string): Promise<ChurchEvent>; // formatted response
	findEventByIdResponse(id: string): Promise<typeof event.$inferSelect | null>; // returned as it is
	editEventUshers(ushers: EventUsher[]): Promise<void>;
	findCetakJadwal(eventId: string): Promise<CetakJadwalResponse>;

	// Facility
	getChurches(): Promise<Church[]>;
	findChurchById(id: string): Promise<Church>;
	getZones(id: string): Promise<ChurchZone[]>;
	getZonesByEvent(churchId: string, eventId: string): Promise<ChurchZone[]>;
	findPositionByChurch(id: string): Promise<ChurchPosition[]>;
	getPositionsByMass(churchId: string, massId: string): Promise<ChurchPosition[]>;
	// findPositionByMass(churchId: string, massId: string)

	// Authentication
	getUserByEmail(email: string): Promise<User>;
	findUsersByChurch(churchId: string): Promise<User[]>;

	// Report
	// findUshersByEvent(eventId: string, date: string): Promise<any[]>;
}
