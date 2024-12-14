import {
	mass,
	event,
} from '$lib/server/db/schema';
import type {
	Church,
	ChurchZone,
	Lingkungan,
	Wilayah,
	ChurchPosition,
} from '$core/entities/schedule';
import type {
	Event as ChurchEvent,
	EventUsher,
	JadwalDetailResponse,
	UsherByEvent
} from '$core/entities/Event';
import type { User } from '@auth/sveltekit';

// Port
/*
 * `typeof mass.$inferSelect` type inference by Drizzle
 */
export interface ScheduleRepository {
	// Mass
	getMasses: (churchId: string) => Promise<(typeof mass.$inferSelect)[]>;
	getMassById: (id: string) => Promise<typeof mass.$inferSelect | null>;

	// Region
	getWilayahs: (churchId: string) => Promise<Wilayah[]>;
	getLingkungans: (churchId: string) => Promise<Lingkungan[]>;
	getLingkunganById: (id: string) => Promise<Lingkungan | null>;

	// TODO: change Promies<string[]> array of usher id
	// Event
	insertEvent: (churchId: string, massId: string, date: string) => Promise<ChurchEvent>;
	insertEventUshers: (
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	) => Promise<boolean>;
	getEventByChurch: (churchId: string, massId: string, date: string) => Promise<ChurchEvent>;
	getEventUshers(eventId: string, lingkunganId?: string, date?: string): Promise<EventUsher[]>;
	getEvents(churchId: string): Promise<ChurchEvent[]>;
	getEventById(id: string): Promise<ChurchEvent>;
	getJadwalDetail(eventId: string): Promise<JadwalDetailResponse>;
	deactivateEvent(eventId: string): Promise<boolean>;
	listUshers(eventId: string): Promise<UsherByEvent[]>; // formatted response
	findEvent(churchId: string, massId?: string, date?: string): Promise<typeof event.$inferSelect>;
	findEventById(id: string): Promise<ChurchEvent>; // formatted response
	editEventUshers(ushers: EventUsher[]): Promise<void>;

	// Facility
	getChurches(): Promise<Church[]>;
	findChurchById(id: string): Promise<Church>;
	getZones(id: string): Promise<ChurchZone[]>;
	findPositionByChurch(id: string): Promise<any[]>;
	getPositionsByMass(churchId: string, massId: string): Promise<ChurchPosition[]>;
	// findPositionByMass(churchId: string, massId: string)

	// Authentication
	getUserByEmail(email: string): Promise<User>;

	// Report
	// findUshersByEvent(eventId: string, date: string): Promise<any[]>;
}
