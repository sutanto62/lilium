import {
	EventType,
	type CetakJadwalResponse,
	type CetakJadwalSection,
	type Event as ChurchEvent,
	type ChurchEventResponse,
	type EventPicRequest,
	type EventScheduleResponse,
	type EventScheduleRows,
	type EventUsher,
	type UsherByEventResponse
} from '$core/entities/Event';
import {
	church,
	church_position,
	church_zone,
	church_zone_group,
	event,
	event_usher,
	event_zone_pic,
	lingkungan,
	mass,
	wilayah
} from '$lib/server/db/schema';
import { featureFlags } from '$lib/utils/FeatureFlag';
import { DatabaseError, ValidationError } from '$src/types/errors';
import { and, desc, eq, gt, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import { v4 as uuidv4 } from 'uuid';

export async function createEvent(
	db: ReturnType<typeof drizzle>,
	newEvent: ChurchEvent
): Promise<ChurchEvent> {
	try {
		const result = await db
			.insert(event)
			.values({
				id: newEvent.id,
				church_id: newEvent.church,
				mass_id: newEvent.mass,
				date: newEvent.date,
				week_number: newEvent.weekNumber ?? null,
				created_at: newEvent.createdAt ?? new Date().getTime(),
				isComplete: newEvent.isComplete ?? 0,
				active: newEvent.active ?? 1,
				code: newEvent.code ?? null,
				description: newEvent.description ?? null,
				type: newEvent.type ?? EventType.MASS
			})
			.returning();
		return {
			...result[0],
			church: result[0].church_id,
			mass: result[0].mass_id,
			type: result[0].type as EventType
		};
	} catch (error) {
		throw new DatabaseError(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

export async function createEventUsher(
	db: ReturnType<typeof drizzle>,
	eventId: string,
	ushers: EventUsher[],
	wilayahId: string,
	lingkunganId: string
): Promise<number> {
	// Check if lingkungan is already submit event usher
	const ifSubmitted = await db
		.select()
		.from(event_usher)
		.where(and(eq(event_usher.event, eventId), eq(event_usher.lingkungan, lingkunganId)));

	if (featureFlags.isEnabled('no_multi_submit')) {
		if (ifSubmitted.length > 0) {
			return 0;
		}
	}

	// Insert ushers
	const created_date = new Date().getTime()
	const usherValues = ushers.map((usher, index) => ({
		id: uuidv4(),
		event: eventId,
		name: usher.name,
		isPpg: usher.isPpg ? 1 : 0,
		isKolekte: usher.isKolekte ? 1 : 0,
		sequence: index + 1,
		wilayah: wilayahId,
		lingkungan: lingkunganId,
		position: null,
		createdAt: created_date
	}));

	await db.insert(event_usher).values(usherValues);
	// Return created date for validation and logging response
	return created_date;
}




/**
 * Creates a person in charge (PIC) for an event OR event zone
 * 
 * @param db - The database instance
 * @param request - The event PIC request containing event ID, zone ID, and PIC name
 * @returns A promise that resolves to true if the PIC was successfully created
 * 
 * @example
 * const result = await createEventPic(db, {
 *   event: "event-uuid",
 *   zone: "Gereja" or "Gereja Balkon Samping"
 *   name: "John Doe"
 * });
 */
export async function createEventPic(
	db: ReturnType<typeof drizzle>,
	request: EventPicRequest
): Promise<boolean> {
	const values = {
		id: uuidv4(),
		event: request.event,
		zone_group: request.zone,
		name: request.name,
	}

	await db.insert(event_zone_pic).values(values);
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

/**
 * Updates positions for multiple event ushers
 * 
 * @param db - The database instance
 * @param eventUshers - Array of EventUsher objects with updated positions
 * @returns Promise resolving to update result with success status and count
 * @throws {DatabaseError} When database operation fails
 * @throws {ValidationError} When input validation fails
 */
export async function editEventUshers(
	db: ReturnType<typeof drizzle>,
	eventUshers: EventUsher[]
): Promise<{ success: boolean; updatedCount: number }> {
	if (!eventUshers?.length) {
		return { success: true, updatedCount: 0 };
	}

	// Validate each usher has required fields
	for (const usher of eventUshers) {
		if (!usher.id || !usher.name) {
			throw new ValidationError('Invalid usher data: missing required fields');
		}
	}

	await db.transaction(async (tx) => {
		for (const item of eventUshers) {
			await tx.update(event_usher)
				.set({ position: item.position })
				.where(eq(event_usher.id, item.id));
		}
	});

	return { success: true, updatedCount: eventUshers.length };
}

export async function deleteEventUsher(
	db: ReturnType<typeof drizzle>,
	eventId: string,
	lingkunganId: string
): Promise<boolean> {
	const result = await db.delete(event_usher)
		.where(and(eq(event_usher.event, eventId), eq(event_usher.lingkungan, lingkunganId)))
		.returning();

	return result.length > 0;
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
			weekNumber: event.week_number,
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
			weekNumber: event.week_number,
			createdAt: event.created_at,
			isComplete: event.isComplete,
			active: event.active,
			type: event.type,
			code: event.code,
			description: event.description
		})
		.from(event)
		.where(and(eq(event.id, id), eq(event.active, 1)))
		.limit(1);

	return query[0] as ChurchEvent;
}

export async function updateEventById(
	db: ReturnType<typeof drizzle>,
	id: string,
	eventData: ChurchEvent
): Promise<ChurchEvent> {
	const updatedEventId = await db.update(event)
		.set({
			church_id: eventData.church,
			mass_id: eventData.mass,
			date: eventData.date,
			week_number: eventData.weekNumber ?? null,
			code: eventData.code ?? null,
			description: eventData.description ?? null,
			isComplete: eventData.isComplete ?? 0,
			active: eventData.active ?? 1,
			type: eventData.type ?? undefined,
		})
		.where(eq(event.id, id))
		.returning();

	return {
		...eventData,
		id: updatedEventId[0].id
	};
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
				createdAt: row.event.created_at,
				isComplete: row.event.isComplete,
				active: 1,
				code: row.event.code,
			}) as ChurchEvent
	);

	return result[0];
}

// FIXME: return empty array to avoid null error
export async function findEvents(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	limit?: number
): Promise<ChurchEvent[]> {
	const query = db
		.select({
			id: event.id,
			church: church.name,
			churchCode: church.code,
			mass: mass.name,
			date: event.date,
			weekNumber: event.week_number,
			createdAt: event.created_at,
			isComplete: event.isComplete,
			type: event.type,
			code: event.code,
			description: event.description
		})
		.from(event)
		.where(and(eq(event.church_id, churchId), eq(event.active, 1)))
		.leftJoin(church, eq(church.id, event.church_id))
		.leftJoin(mass, eq(mass.id, event.mass_id))
		.orderBy(event.date);

	if (limit !== undefined) {
		query.limit(limit);
	}

	const result = await query;

	return result.map(
		(row) =>
			({
				id: row.id,
				church: row.church,
				churchCode: row.churchCode,
				mass: row.mass,
				date: row.date,
				weekNumber: row.weekNumber,
				createdAt: row.createdAt,
				isComplete: row.isComplete,
				type: row.type || EventType.MASS as EventType,
				code: row.code,
				description: row.description,
				active: 1
			}) as ChurchEvent
	);
}


export async function findEventsByWeekNumber(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	weekNumbers: number[],
	limit?: number
): Promise<ChurchEvent[]> {
	const today = new Date();
	const query = db
		.select({
			id: event.id,
			church: church.name,
			churchCode: church.code,
			mass: mass.name,
			date: event.date,
			weekNumber: event.week_number,
			createdAt: event.created_at,
			isComplete: event.isComplete,
			type: event.type,
			code: event.code,
			description: event.description,
		})
		.from(event)
		.where(
			and(eq(event.church_id, churchId),
				inArray(event.week_number, weekNumbers),
				eq(event.active, 1),
				gt(event.date, today.toISOString().split('T')[0])
			))
		.leftJoin(church, eq(church.id, event.church_id))
		.leftJoin(mass, eq(mass.id, event.mass_id))
		.orderBy(event.date);

	if (limit !== undefined) {
		query.limit(limit);
	}

	const result = await query;

	if (!result?.length) {
		return [];
	}

	return result.map(
		(row) =>
			({
				id: row.id,
				church: row.church,
				churchCode: row.churchCode,
				mass: row.mass,
				date: row.date,
				weekNumber: row.weekNumber,
				createdAt: row.createdAt,
				isComplete: row.isComplete,
				type: row.type || EventType.MASS as EventType,
				code: row.code,
				description: row.description,
				active: 1
			}) as ChurchEvent
	);
}

/**
 * Finds ushers assigned to a specific event
 * 
 * Queries the event_usher table to get all ushers for a given event ID.
 * Can optionally filter by lingkungan ID.
 * 
 * @param db - The SQLite database connection
 * @param eventId - ID of the event to find ushers for
 * @param lingkunganId - Optional lingkungan ID to filter by
 * @param date - Optional date parameter (currently unused)
 * @returns Promise resolving to array of EventUsher objects containing:
 *  - id: Unique ID of the usher record
 *  - event: Event ID this usher is assigned to
 *  - name: Name of the usher
 *  - wilayah: Wilayah (region) ID the usher belongs to
 *  - lingkungan: Lingkungan (community) ID the usher belongs to
 *  - position: Position ID assigned to this usher
 *  - isPpg: Boolean indicating if usher is PPG
 *  - isKolekte: Boolean indicating if usher handles collections
 *  - createdAt: Timestamp when record was created
 */
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

export async function findUshersByLingkungan(
	db: ReturnType<typeof drizzle>,
	eventId: string,
	lingkunganId: string
): Promise<UsherByEventResponse[]> {
	const result = await db
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
		.where(and(eq(event_usher.event, eventId), eq(event_usher.lingkungan, lingkunganId)));

	return result.map(
		(row) =>
			({
				id: row.id,
				event: row.event,
				name: row.name,
				zone: row.zone,
				wilayah: row.wilayah,
				lingkungan: row.lingkungan,
				position: row.position,
				isPpg: row.isPpg === 1 ? true : false,
				isKolekte: row.isKolekte === 1 ? true : false,
				createdAt: row.createdAt ?? 0
			}) as UsherByEventResponse
	);
}

// TODO: Add pagination
export async function findUshersByEvent(
	db: ReturnType<typeof drizzle>,
	eventId: string
): Promise<UsherByEventResponse[]> {
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
		.where(
			and(
				eq(event_usher.event, eventId),
				eq(event_usher.active, 1)
			)
		)
		.orderBy(event_usher.createdAt, church_zone.sequence, church_position.sequence);

	// Transform number to boolean
	const result = query.map((row) => ({
		...row,
		isPpg: row.isPpg === 1,
		isKolekte: row.isKolekte === 1
	}));

	return result;
}

// TODO: move repo's logic to eventService.retrieveEventSchedule
export async function findEventSchedule(
	db: ReturnType<typeof drizzle>,
	eventId: string
): Promise<EventScheduleResponse> {

	// Get mass event
	const massEvent = await db
		.select({
			id: event.id,
			church: church.name,
			mass: mass.name,
			date: event.date,
			description: event.description
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
			description: '',
			rows: []
		};
	}

	// Get event ushers
	// TODO: could we use fetchEventUshers instead? lingkunganId is required
	const massEventUsher = await db
		.select({
			id: church_zone.id,
			zone: church_zone.name,
			eventUsherId: event_usher.id,
			groupId: church_zone.church_zone_group,
			group: church_zone_group.name,
			wilayah: wilayah.name,
			lingkunganId: lingkungan.id,
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
		.leftJoin(church_zone_group, eq(church_zone_group.id, church_zone.church_zone_group))
		.where(eq(event_usher.event, eventId))
		.orderBy(church_zone.sequence, lingkungan.sequence, church_position.sequence);

	// TODO: refactor to service
	const massEventPic = await db
		.select({
			id: event_zone_pic.id,
			event: event_zone_pic.event,
			zone: church_zone_group.name,
			name: event_zone_pic.name,
		})
		.from(event_zone_pic)
		.leftJoin(church_zone_group, eq(church_zone_group.id, event_zone_pic.zone_group))
		.where(eq(event_zone_pic.event, eventId));


	// Add PIC to event
	const massPic = massEventPic.filter((pic) => pic.zone === 'Global');
	massEvent[0].description = massPic.map((pic) => pic.name).join(', ') || '';

	// Define the type for our accumulator (reducer)
	interface ZoneAccumulator {
		[key: string]: EventScheduleRows;
	}

	// Transforms result to rows: JadwalDetailZone
	const groupedByZone = massEventUsher.reduce((acc: ZoneAccumulator, r) => {

		const zoneName = r.group || 'Non Zona';
		const zoneId = r.groupId || '';

		if (!acc[zoneName]) {
			acc[zoneName] = {
				id: zoneId,
				name: zoneName,
				lingkungan: [],
				pic: [], // TODO: Add PETA pic data when available
				zoneUshers: 0,
				zonePpg: 0,
				zoneKolekte: 0,
				detail: []
			};
		}

		// Add PIC to zone 
		if (massEventPic.length > 0) {
			acc[zoneName].pic = massEventPic
				.filter((pic) => pic.zone === zoneName)
				.map((pic) => pic.name)
				.filter((pic): pic is string => pic !== null);
		}

		// Count ushers, PPG, and Kolekte
		acc[zoneName].zoneUshers++;
		if (r.isPpg === 1) acc[zoneName].zonePpg++;
		if (r.isKolekte === 1) acc[zoneName].zoneKolekte++;

		const lingkunganName = r.lingkungan || 'Lingkungan';
		const lingkunganId = r.lingkunganId || '';

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
				id: lingkunganId,
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
		date: '',
		description: ''
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

// TODO: refactor business logic to service
export async function findCetakJadwal(
	db: ReturnType<typeof drizzle>,
	eventId: string
): Promise<CetakJadwalResponse> {
	// Get mass event
	const massEvent = await fetchEventDetails(db, eventId);

	if (!massEvent) {
		return createEmptyCetakJadwalResponse();
	}

	// Get event ushers with their positions and zones
	const massEventUsher = await fetchEventUshers(db, eventId);

	// Get event PIC
	const massEventPic = await fetchEventPics(db, eventId);
	const massPic = massEventPic.filter((pic) => pic.zone === 'Global');

	// Process data into required format
	const rowsUshers = processUshersByZone(massEventUsher, massEventPic);
	const rowsKolekte = processSpecialUshers(massEventUsher.filter(usher => usher.isKolekte === 1), 'Kolekte', 'Menghitung uang kolekte');
	const rowsPpg = processSpecialUshers(massEventUsher.filter(usher => usher.isPpg === 1), 'PPG', 'Menghitung uang amplop PPG');

	return {
		...massEvent,
		pic: massPic.map((pic) => pic.name).join(', ') || '',
		listUshers: rowsUshers,
		listPpg: rowsPpg,
		listKolekte: rowsKolekte
	};
}

// Helper functions
async function fetchEventDetails(db: ReturnType<typeof drizzle>, eventId: string) {
	const massEvent = await db
		.select({
			id: event.id,
			church: church.name,
			mass: mass.name,
			date: event.date,
			time: mass.time,
			briefingTime: mass.briefingTime
		})
		.from(event)
		.leftJoin(church, eq(church.id, event.church_id))
		.leftJoin(mass, eq(mass.id, event.mass_id))
		.where(and(eq(event.id, eventId), eq(event.active, 1)))
		.limit(1);

	if (massEvent.length === 0) {
		return null;
	}

	// Add weekday to massEvent
	const eventDate = new Date(massEvent[0].date);
	const weekdays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
	const weekday = weekdays[eventDate.getDay()];

	return {
		...massEvent[0],
		weekday
	};
}

function createEmptyCetakJadwalResponse(): CetakJadwalResponse {
	return {
		church: null,
		mass: null,
		pic: null,
		date: null,
		weekday: null,
		time: null,
		briefingTime: null,
		listUshers: [],
		listKolekte: [],
		listPpg: []
	};
}

async function fetchEventUshers(db: ReturnType<typeof drizzle>, eventId: string) {
	return await db
		.select({
			id: church_zone.id,
			group: church_zone_group.name,
			zone: church_zone.name,
			wilayah: wilayah.name,
			lingkungan: lingkungan.name,
			name: event_usher.name,
			position: church_position.name,
			sequence: church_position.sequence,
			isPpg: event_usher.isPpg,
			isKolekte: event_usher.isKolekte
		})
		.from(event_usher)
		.leftJoin(wilayah, eq(wilayah.id, event_usher.wilayah))
		.leftJoin(lingkungan, eq(lingkungan.id, event_usher.lingkungan))
		.leftJoin(church_position, eq(church_position.id, event_usher.position))
		.leftJoin(church_zone, eq(church_zone.id, church_position.zone))
		.leftJoin(church_zone_group, eq(church_zone_group.id, church_zone.church_zone_group))
		.orderBy(church_position.sequence)
		.where(eq(event_usher.event, eventId));
}

async function fetchEventPics(db: ReturnType<typeof drizzle>, eventId: string) {
	const result = await db
		.select({
			id: event_zone_pic.id,
			event: event_zone_pic.event,
			zone: church_zone_group.name,
			name: event_zone_pic.name
		})
		.from(event_zone_pic)
		.leftJoin(church_zone_group, eq(church_zone_group.id, event_zone_pic.zone_group))
		.where(eq(event_zone_pic.event, eventId));
	return result;

}

function processUshersByZone(ushers: any[], pics: any[]): CetakJadwalSection[] {
	// Define the type for our accumulator (reducer)
	interface CetakAccumulator {
		[key: string]: CetakJadwalSection;
	}

	const rowsUshersData = ushers.reduce((acc: CetakAccumulator, r) => {
		const zone = r.group || 'Non Zona';

		if (!acc[zone]) {
			acc[zone] = {
				zone: zone,
				pic: '',
				rowSpan: 0,
				ushers: []
			};
		}

		// Add pic
		if (pics.length > 0 && !acc[zone].pic) {
			acc[zone].pic = pics
				.filter((pic) => pic.zone === zone)
				.map((pic) => pic.name)
				.filter((pic): pic is string => pic !== null)
				.join(', ');
		}

		// Count ushers
		acc[zone].rowSpan++;

		// Add usher
		acc[zone].ushers.push(createUsherEntry(r));

		return acc;
	}, {} as CetakAccumulator);

	return Object.values(rowsUshersData);

	// Sort by zone and position
	// return Object.values(rowsUshersData).sort((a, b) => {
	// 	if (a.zone < b.zone) return -1;
	// 	if (a.zone > b.zone) return 1;

	// 	const aFirstPosition = a.ushers[0]?.position || '';
	// 	const bFirstPosition = b.ushers[0]?.position || '';
	// 	return aFirstPosition.localeCompare(bFirstPosition);
	// });
}

function processSpecialUshers(ushers: any[], zoneGroupName: string, zoneName: string): CetakJadwalSection[] {
	if (ushers.length === 0) {
		return [];
	}

	const section: CetakJadwalSection = {
		zone: zoneGroupName,
		pic: '',
		rowSpan: ushers.length,
		ushers: ushers.map(createUsherEntry)
	};

	return [section];
}

function createUsherEntry(usher: any) {
	return {
		position: usher.position || 'Posisi Kosong',
		sequence: usher.sequence || 0,
		name: usher.name || 'No Name',
		wilayah: usher.wilayah || 'Wilayah Kosong',
		lingkungan: usher.lingkungan || 'Lingkungan Kosong',
		kolekte: usher.isKolekte === 1 ? 'Kolekte' : 'Non Kolekte',
		ppg: usher.isPpg === 1 ? 'PPG' : 'Non PPG'
	};
}

export async function findEventUshersPosition(
	db: ReturnType<typeof drizzle>,
	eventId: string,
	isPpg: boolean): Promise<string[]> {

	const query = await db.select({
		position: event_usher.position
	})
		.from(event_usher)
		.leftJoin(church_position, eq(church_position.id, event_usher.position))
		.where(and(
			eq(event_usher.event, eventId),
			eq(event_usher.active, 1),
			eq(church_position.active, 1),
			isNotNull(event_usher.position),
			isPpg ? eq(event_usher.isPpg, 1) : undefined
		))
		.orderBy(church_position.sequence);

	return query.map(row => row.position).filter((pos): pos is string => pos !== null);
}

export async function findEventsByLingkungan(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	lingkunganId: string,
	all?: boolean
): Promise<ChurchEventResponse[]> {

	const query = db
		.select({
			id: event.id,
			church: church.name,
			mass: mass.name,
			date: event.date,
			weekNumber: event.week_number,
			createdAt: event.created_at,
			isComplete: event.isComplete,
			type: event.type,
			code: event.code,
			description: event.description,
			active: event.active
		})
		.from(event)
		.innerJoin(event_usher, eq(event_usher.event, event.id))
		.innerJoin(church, eq(church.id, event.church_id))
		.innerJoin(mass, eq(mass.id, event.mass_id))
		.where(
			and(
				eq(event.church_id, churchId),
				eq(event_usher.lingkungan, lingkunganId),
				all ? undefined : eq(event.active, 1) // if all is true, then we don't need to filter by active
			)
		)
		.groupBy(
			event.id,
			event.church_id,
			event.mass_id,
			event.date,
			event.week_number,
			event.created_at,
			event.isComplete,
			event.type,
			event.code,
			event.description,
			event.active
		)
		.orderBy(desc(event.date));

	const results = await query;

	// Transform to ChurchEvent type
	return results.map(row => ({
		id: row.id,
		church: row.church,
		mass: row.mass,
		date: row.date,
		weekNumber: row.weekNumber ?? undefined,
		createdAt: row.createdAt ?? undefined,
		isComplete: row.isComplete ?? 0,
		type: row.type as EventType,
		code: row.code ?? '',
		description: row.description ?? '',
		active: row.active ?? 1
	}));

}

export async function findEventsByDateRange(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	startDate: string,
	endDate: string
): Promise<ChurchEvent[]> {
	const query = db
		.select({
			id: event.id,
			church: church.name,
			churchCode: church.code,
			mass: mass.name,
			date: event.date,
			weekNumber: event.week_number,
			createdAt: event.created_at,
			isComplete: event.isComplete,
			type: event.type,
			code: event.code,
			description: event.description
		})
		.from(event)
		.where(
			and(
				eq(event.church_id, churchId),
				eq(event.active, 1),
				gte(event.date, startDate),
				lte(event.date, endDate)
			)
		)
		.leftJoin(church, eq(church.id, event.church_id))
		.leftJoin(mass, eq(mass.id, event.mass_id))
		.orderBy(event.date);

	const result = await query;

	return result.map(
		(row) =>
			({
				id: row.id,
				church: row.church,
				churchCode: row.churchCode,
				mass: row.mass,
				date: row.date,
				weekNumber: row.weekNumber,
				createdAt: row.createdAt,
				isComplete: row.isComplete,
				type: row.type || EventType.MASS as EventType,
				code: row.code,
				description: row.description,
				active: 1
			}) as ChurchEvent
	);
}
