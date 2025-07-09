import type { User } from '$core/entities/Authentication';
import type {
	CetakJadwalResponse,
	Event as ChurchEvent,
	ChurchEventResponse,
	EventPicRequest,
	EventScheduleResponse,
	EventUsher,
	UsherByEventResponse
} from '$core/entities/Event';
import type {
	Church,
	ChurchPosition,
	ChurchZone,
	ChurchZoneGroup,
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
	getLingkunganById: (id: string) => Promise<Lingkungan>;

	// TODO: change Promies<string[]> array of usher id
	// Event
	insertEvent: (event: ChurchEvent) => Promise<ChurchEvent>;

	createEventPic: (pic: EventPicRequest) => Promise<boolean>;
	getEventByChurch: (churchId: string, massId: string, date: string) => Promise<ChurchEvent>;

	// Ushers
	listUshers(eventId: string): Promise<UsherByEventResponse[]>; // formatted response
	findEventUshers(eventId: string, lingkunganId?: string, date?: string): Promise<EventUsher[]>;
	listUshersByLingkungan(eventId: string, lingkunganId: string): Promise<UsherByEventResponse[]>;
	getEventUshersPosition(eventId: string, isPpg: boolean): Promise<string[]>;
	insertEventUshers: (
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	) => Promise<boolean>;


	getEvents(churchId: string, limit?: number): Promise<ChurchEvent[]>;
	getEventsByWeekNumber(churchId: string, weekNumbers: number[], limit?: number): Promise<ChurchEvent[]>;
	getEventsByDateRange(churchId: string, startDate: string, endDate: string): Promise<ChurchEvent[]>;
	getEventsByLingkungan(churchId: string, lingkunganId: string, all?: boolean): Promise<ChurchEventResponse[]>;
	getEventById(id: string): Promise<ChurchEvent>;
	updateEventById(eventId: string, event: ChurchEvent): Promise<ChurchEvent>;
	findEventSchedule(eventId: string): Promise<EventScheduleResponse>;
	deactivateEvent(eventId: string): Promise<boolean>;
	findEvent(churchId: string, massId?: string, date?: string): Promise<typeof event.$inferSelect>;
	findEventById(id: string): Promise<ChurchEvent>; // formatted response
	findEventByIdResponse(id: string): Promise<typeof event.$inferSelect | null>; // returned as it is
	editEventUshers(ushers: EventUsher[]): Promise<{ success: boolean; updatedCount: number }>;
	findCetakJadwal(eventId: string): Promise<CetakJadwalResponse>;
	removeEventUsher(eventId: string, lingkunganId: string): Promise<boolean>;

	// Facility
	getChurches(): Promise<Church[]>;
	findChurchById(id: string): Promise<Church>;
	getZones(id: string): Promise<ChurchZone[]>;
	getZonesByEvent(churchId: string, eventId: string): Promise<ChurchZone[]>;
	findZoneGroupsByEvent(churchId: string, eventId: string): Promise<ChurchZoneGroup[]>;
	findPositionByChurch(id: string): Promise<ChurchPosition[]>;
	getPositionsByMass(churchId: string, massId: string): Promise<ChurchPosition[]>;
	// findPositionByMass(churchId: string, massId: string)

	// Authentication
	getUserByEmail(email: string): Promise<User>;
	findUsersByChurch(churchId: string): Promise<User[]>;

	// Report
	// findUshersByEvent(eventId: string, date: string): Promise<any[]>;
}
