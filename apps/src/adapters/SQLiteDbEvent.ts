import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type {
	Event as ChurchEvent,
	EventUsher,
	JadwalDetailZone,
	JadwalDetailResponse,
	UsherByEvent
} from '$core/entities/Event';
import {
	church,
	mass,
	wilayah,
	lingkungan,
	event,
	event_usher,
	church_position,
	church_zone
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { featureFlags } from '$lib/utils/FeatureFlag';
import { logger } from '$src/lib/utils/logger';

export async function createEvent(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	massId: string,
	date: string
): Promise<ChurchEvent> {
	return await db
		.insert(event)
		.values({
			id: uuidv4(),
			church_id: churchId,
			mass_id: massId,
			date: date,
			created_at: new Date().getTime(),
			isComplete: 0,
			active: 1
		})
		.returning({
			id: event.id,
			church: event.church_id,
			mass: event.mass_id,
			date: event.date,
			createdAt: event.created_at,
			isComplete: event.isComplete,
			active: event.active
		})
		.then((result: ChurchEvent[]) => result[0])
		.catch((error: Error) => {
			logger.error(`Error inserting event: ${error.message}`);
			throw error;
		});
}

export async function createEventUsher(
	db: ReturnType<typeof drizzle>,
	eventId: string,
	ushers: EventUsher[],
	wilayahId: string,
	lingkunganId: string
): Promise<boolean> {
	// Check if lingkungan is already submit event usher
	const ifSubmitted = await db
		.select()
		.from(event_usher)
		.where(and(eq(event_usher.event, eventId), eq(event_usher.lingkungan, lingkunganId)));

	if (featureFlags.isEnabled('no_multi_submit')) {
		if (ifSubmitted.length > 0) {
			return false;
		}
	}

	const usherValues = ushers.map((usher, index) => ({
		id: uuidv4(),
		event: eventId,
		name: usher.name,
		isPpg: usher.isPpg ? 1 : 0,
		isKolekte: usher.isKolekte ? 1 : 0,
		sequence: index + 1,
		wilayah: wilayahId,
		lingkungan: lingkunganId,
		position: null
	}));

	await db.insert(event_usher).values(usherValues);
	return true;
}

// export async function updateEventUshers(db: ReturnType<typeof drizzle>, ushers: EventUsher[]): Promise<void> {
//     const updates = ushers.map(usher => {
//         return db.update(event_usher).set({
//             position: usher.position
//         }).where(eq(event_usher.id, usher.id));
//     });
//     logger.info('updates query %s', JSON.stringify(updates));

//     await Promise.all(updates);
// }
export async function updateEventUshers(
	db: ReturnType<typeof drizzle>,
	ushers: EventUsher[]
): Promise<void> {
	const updates = ushers.map((usher) => {
		return db
			.update(event_usher)
			.set({ position: usher.position })
			.where(eq(event_usher.id, usher.id));
	});
	await Promise.all(updates);
}

export async function findEventByChurch(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	massId: string,
	date: string
): Promise<ChurchEvent> {
	const result = await db
		.select({
			id: event.id,
			church: church.id,
			mass: mass.id,
			date: event.date,
			createdAt: event.created_at
		})
		.from(event)
		.leftJoin(church, eq(church.id, event.church_id))
		.leftJoin(mass, eq(mass.id, event.mass_id))
		.where(and(eq(event.church_id, churchId), eq(event.mass_id, massId), eq(event.date, date)))
		.limit(1);

	return result[0] as ChurchEvent;
}

// FIXME: return empty object to avoid null error
export async function findEvent(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	massId?: string,
	date?: string
) {
	if (massId && date) {
		// TODO: implement
	}

	const result = await db
		.select()
		.from(event)
		.where(eq(event.church_id, churchId))
		.orderBy(event.date)
		.limit(1);
	return result[0];
}

export async function findEventById(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<ChurchEvent> {
	const query = await db
		.select({
			id: event.id,
			church: event.church_id,
			mass: event.mass_id,
			date: event.date,
			createdAt: event.created_at,
			isComplete: event.isComplete,
			active: event.active
		})
		.from(event)
		.where(and(eq(event.id, id), eq(event.active, 1)))
		.limit(1);
	return query[0];
}

export async function findEventByIdResponse(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<ChurchEvent> {
	const query = await db
		.select()
		.from(event)
		.where(eq(event.id, id))
		.leftJoin(church, eq(church.id, event.church_id))
		.leftJoin(mass, eq(mass.id, event.mass_id))
		.limit(1);

	const result = query.map(
		(row) =>
			({
				id: row.event.id,
				church: row.church?.name,
				mass: row.mass?.name,
				date: row.event.date,
				createdAt: row.event.created_at
			}) as ChurchEvent
	);

	return result[0];
}

// FIXME: return empty array to avoid null error
export async function findEvents(
	db: ReturnType<typeof drizzle>,
	churchId: string
): Promise<ChurchEvent[]> {
	const result = await db
		.select({
			id: event.id,
			church: church.name,
			mass: mass.name,
			date: event.date,
			createdAt: event.created_at,
			isComplete: event.isComplete
		})
		.from(event)
		.where(and(eq(event.church_id, churchId), eq(event.active, 1)))
		.leftJoin(church, eq(church.id, event.church_id))
		.leftJoin(mass, eq(mass.id, event.mass_id))
		.orderBy(event.date);

	return result.map(
		(row) =>
			({
				id: row.id,
				church: row.church,
				mass: row.mass,
				date: row.date,
				createdAt: row.createdAt,
				isComplete: row.isComplete
			}) as ChurchEvent
	);
}

export async function findEventUshers(
	db: ReturnType<typeof drizzle>,
	eventId: string,
	lingkunganId?: string,
	date?: string
): Promise<EventUsher[]> {
	const result = await db
		.select()
		.from(event_usher)
		.where(
			and(
				eq(event_usher.event, eventId),
				lingkunganId ? eq(event_usher.lingkungan, lingkunganId) : undefined
			)
		);

	return result.map(
		(row) =>
			({
				id: row.id,
				event: row.event,
				name: row.name,
				wilayah: row.wilayah,
				lingkungan: row.lingkungan,
				position: row.position,
				isPpg: row.isPpg === 1 ? true : false,
				isKolekte: row.isKolekte === 1 ? true : false,
				createdAt: row.createdAt ?? 0
			}) as EventUsher
	);
}

export async function findUshersByEvent(
	db: ReturnType<typeof drizzle>,
	eventId: string
): Promise<UsherByEvent[]> {
	const query = await db
		.select({
			id: event_usher.id,
			event: event_usher.event,
			name: event_usher.name,
			zone: church_zone.name,
			wilayah: wilayah.name,
			lingkungan: lingkungan.name,
			position: church_position.name,
			isPpg: event_usher.isPpg,
			isKolekte: event_usher.isKolekte,
			createdAt: event_usher.createdAt
		})
		.from(event_usher)
		.leftJoin(wilayah, eq(wilayah.id, event_usher.wilayah))
		.leftJoin(lingkungan, eq(lingkungan.id, event_usher.lingkungan))
		.leftJoin(church_position, eq(church_position.id, event_usher.position))
		.leftJoin(church_zone, eq(church_zone.id, church_position.zone))
		.where(eq(event_usher.event, eventId))
		.orderBy(event_usher.createdAt, church_zone.sequence, church_position.sequence);

	// Transform number to boolean
	const result = query.map((row) => ({
		...row,
		isPpg: row.isPpg === 1,
		isKolekte: row.isKolekte === 1
	}));

	return result;
}

export async function findJadwalDetail(
	db: ReturnType<typeof drizzle>,
	eventId: string
): Promise<JadwalDetailResponse> {
	// Get mass event
	const massEvent = await db
		.select({
			id: event.id,
			church: church.name,
			mass: mass.name,
			date: event.date
		})
		.from(event)
		.leftJoin(church, eq(church.id, event.church_id))
		.leftJoin(mass, eq(mass.id, event.mass_id))
		.where(and(eq(event.id, eventId), eq(event.active, 1)))
		.limit(1);

	if (massEvent.length === 0) {
		return {
			id: '',
			church: '',
			mass: '',
			date: '',
			rows: []
		};
	}

	// Get event ushers
	const result = await db
		.select({
			zone: church_zone.name,
			wilayah: wilayah.name,
			lingkungan: lingkungan.name,
			name: event_usher.name,
			position: church_position.name,
			isPpg: event_usher.isPpg,
			isKolekte: event_usher.isKolekte
		})
		.from(event_usher)
		.leftJoin(wilayah, eq(wilayah.id, event_usher.wilayah))
		.leftJoin(lingkungan, eq(lingkungan.id, event_usher.lingkungan))
		.leftJoin(church_position, eq(church_position.id, event_usher.position))
		.leftJoin(church_zone, eq(church_zone.id, church_position.zone))
		.where(eq(event_usher.event, eventId))
		.orderBy(church_zone.sequence, lingkungan.sequence, event_usher.sequence);

	// Define the type for our accumulator (reducer)
	interface ZoneAccumulator {
		[key: string]: JadwalDetailZone;
	}

	// Transforms result to rows: JadwalDetailZone
	const groupedByZone = result.reduce((acc: ZoneAccumulator, r) => {
		const zoneName = r.zone || 'Non Zona';
		if (!acc[zoneName]) {
			acc[zoneName] = {
				name: zoneName,
				lingkungan: [],
				pic: [], // TODO: Add PETA pic data when available
				zoneUshers: 0,
				zonePpg: 0,
				zoneKolekte: 0,
				detail: []
			};
		}

		// Count ushers, PPG, and Kolekte
		acc[zoneName].zoneUshers++;
		if (r.isPpg === 1) acc[zoneName].zonePpg++;
		if (r.isKolekte === 1) acc[zoneName].zoneKolekte++;

		const lingkunganName = r.lingkungan || 'Lingkungan';
		// Add lingkungan if not already present
		if (!acc[zoneName].lingkungan.includes(lingkunganName)) {
			acc[zoneName].lingkungan.push(lingkunganName);
		}

		// Add usher details
		const usherDetail = {
			name: r.name || 'No Name',
			position: r.position || 'Posisi Kosong',
			isPpg: r.isPpg === 1,
			isKolekte: r.isKolekte === 1
		};

		// Find or create lingkungan in detail
		let lingkunganDetail = acc[zoneName]?.detail?.find((d) => d.name === lingkunganName);
		if (!lingkunganDetail) {
			lingkunganDetail = {
				name: lingkunganName,
				zone: zoneName,
				ushers: []
			};
			acc[zoneName].detail?.push(lingkunganDetail);
		}

		lingkunganDetail.ushers.push(usherDetail);

		return acc;
	}, {} as ZoneAccumulator);

	// Convert the grouped object to an array
	const rows = Object.values(groupedByZone);

	// Safely access massEvent[0] or provide a default object
	const eventDetails = massEvent[0] || {
		id: '',
		church: '',
		mass: '',
		date: ''
	};

	return {
		...eventDetails,
		rows: rows
	};
}

export async function softDeleteEvent(
	db: ReturnType<typeof drizzle>,
	eventId: string
): Promise<boolean> {
	return await db
		.update(event)
		.set({ active: 0 })
		.where(eq(event.id, eventId))
		.then(() => true)
		.catch(() => false);
}
