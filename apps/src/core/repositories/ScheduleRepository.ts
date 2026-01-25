import type { User } from '$core/entities/Authentication';
import type {
	CetakJadwalResponse,
	ChurchEvent,
	ChurchEventResponse,
	EventPicRequest,
	EventScheduleResponse,
	EventUsher
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
import type { UsherResponse } from "$core/entities/Usher";
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
	deactivateMass: (massId: string) => Promise<boolean>;

	// Region
	listWilayahByChurch: (churchId: string) => Promise<Wilayah[]>;
	listLingkunganByChurch: (churchId: string) => Promise<Lingkungan[]>;
	findLingkunganById: (id: string) => Promise<Lingkungan>;

	// TODO: change Promies<string[]> array of usher id
	// Event
	insertEvent: (event: ChurchEvent) => Promise<ChurchEvent>;

	createEventPic: (pic: EventPicRequest) => Promise<boolean>;
	getEventByChurch: (churchId: string, massId: string, date: string) => Promise<ChurchEvent>;

	// Ushers
	listUsherByEvent(eventId: string): Promise<UsherResponse[]>; // formatted response
	findEventUshers(eventId: string, lingkunganId?: string, date?: string): Promise<EventUsher[]>; // TODO: remove date - event already have date
	listUsherByLingkungan(eventId: string, lingkunganId: string): Promise<UsherResponse[]>;
	getEventUshersPosition(eventId: string, isPpg: boolean): Promise<string[]>;
	persistEventUshers: (
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	) => Promise<number>;


	listEvents(churchId: string, limit?: number): Promise<ChurchEvent[]>;
	listEventsByWeekNumber(churchId: string, weekNumbers: number[], isToday: boolean, limit?: number): Promise<ChurchEvent[]>;
	listEventsByDateRange(churchId: string, startDate: string, endDate: string): Promise<ChurchEvent[]>;
	listEventsByLingkungan(churchId: string, lingkunganId: string, all?: boolean): Promise<ChurchEventResponse[]>;
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
	listPositionByMass(churchId: string, massId: string): Promise<ChurchPosition[]>;
	createPosition(position: Omit<ChurchPosition, 'id' | 'church' | 'active'> & { zone: string }): Promise<ChurchPosition>;
	updatePosition(
		positionId: string,
		patch: Partial<Pick<ChurchPosition, 'name' | 'code' | 'description' | 'type' | 'isPpg' | 'sequence' | 'zone'>>
	): Promise<ChurchPosition>;
	softDeletePosition(positionId: string): Promise<void>;
	reorderZonePositions(zoneId: string, items: { id: string; sequence: number }[]): Promise<void>;
	// findPositionByMass(churchId: string, massId: string)

	// Authentication
	getUserByEmail(email: string): Promise<User>;
	findUsersByChurch(churchId: string): Promise<User[]>;

	// Report
	// findUshersByEvent(eventId: string, date: string): Promise<any[]>;
}
