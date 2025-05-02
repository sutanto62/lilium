import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type {
	Event as ChurchEvent,
	EventUsher,
	JadwalDetailZone,
	JadwalDetailResponse,
	CetakJadwalResponse,
	UsherByEvent,
	EventPicRequest,
	CetakJadwalSection
} from '$core/entities/Event';
import {
	church,
	mass,
	wilayah,
	lingkungan,
	event,
	event_usher,
	event_zone_pic,
	church_position,
	church_zone,
	user
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { featureFlags } from '$lib/utils/FeatureFlag';
import { logger } from '$src/lib/utils/logger';
import { getWeekNumber } from '$src/lib/utils/dateUtils';

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
			week_number: getWeekNumber(date),
			created_at: new Date().getTime(),
			isComplete: 0,
			active: 1
		})
		.returning({
			id: event.id,
			church: event.church_id,
			mass: event.mass_id,
			date: event.date,
			weekNumber: event.week_number,
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

export async function createEventPic(
	db: ReturnType<typeof drizzle>,
	pic: EventPicRequest
): Promise<boolean> {
	const picValues = {
		id: uuidv4(),
		event: pic.event,
		zone: pic.zone,
		pic: pic.user
	}

	// 1 zone 1 pic only 
	const existingPic = await db
		.select()
		.from(event_zone_pic)
		.where(and(
			eq(event_zone_pic.event, pic.event),
			eq(event_zone_pic.zone, pic.zone),
			eq(event_zone_pic.pic, pic.user)
		));

	if (existingPic.length > 0) {
		logger.warn(`Failed to create event zone pic ${JSON.stringify(picValues)}`);
		return false;
	}

	await db.insert(event_zone_pic).values(picValues);
	logger.debug(`Created event zone pic ${JSON.stringify(picValues)}`);
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

	logger.debug(`found ${result.length} event ushers`);

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
	const massEventUsher = await db
		.select({
			id: church_zone.id,
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

	// Get event PIC
	const massEventPic = await db
		.select({
			id: event_zone_pic.id,
			event: event_zone_pic.event,
			zone: church_zone.name,
			pic: user.name
		})
		.from(event_zone_pic)
		.leftJoin(user, eq(user.id, event_zone_pic.pic))
		.leftJoin(church_zone, eq(church_zone.id, event_zone_pic.zone))
		.where(eq(event_zone_pic.event, eventId));

	// Define the type for our accumulator (reducer)
	interface ZoneAccumulator {
		[key: string]: JadwalDetailZone;
	}

	// Transforms result to rows: JadwalDetailZone
	const groupedByZone = massEventUsher.reduce((acc: ZoneAccumulator, r) => {
		const zoneName = r.zone || 'Non Zona';
		const zoneId = r.id || '';
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

		// Add pic
		if (massEventPic.length > 0) {
			acc[zoneName].pic = massEventPic
				.filter((pic) => pic.zone === zoneName)
				.map((pic) => pic.pic)
				.filter((pic): pic is string => pic !== null);
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

	// Process data into required format
	const rowsUshers = processUshersByZone(massEventUsher, massEventPic);
	const rowsKolekte = processSpecialUshers(massEventUsher.filter(usher => usher.isKolekte === 1), 'Menghitung uang kolekte');
	const rowsPpg = processSpecialUshers(massEventUsher.filter(usher => usher.isPpg === 1), 'Menghitung uang amplop PPG');

	return {
		...massEvent,
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
		.orderBy(church_zone.sequence, church_position.sequence)
		.where(eq(event_usher.event, eventId));
}

async function fetchEventPics(db: ReturnType<typeof drizzle>, eventId: string) {
	return await db
		.select({
			id: event_zone_pic.id,
			event: event_zone_pic.event,
			zone: church_zone.name,
			pic: user.name
		})
		.from(event_zone_pic)
		.leftJoin(user, eq(user.id, event_zone_pic.pic))
		.leftJoin(church_zone, eq(church_zone.id, event_zone_pic.zone))
		.where(eq(event_zone_pic.event, eventId));
}

function processUshersByZone(ushers: any[], pics: any[]): CetakJadwalSection[] {
	// Define the type for our accumulator (reducer)
	interface CetakAccumulator {
		[key: string]: CetakJadwalSection;
	}

	const rowsUshersData = ushers.reduce((acc: CetakAccumulator, r) => {
		const zone = r.zone || 'Non Zona';

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
				.map((pic) => pic.pic)
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

function processSpecialUshers(ushers: any[], zoneName: string): CetakJadwalSection[] {
	if (ushers.length === 0) {
		return [];
	}

	const section: CetakJadwalSection = {
		zone: zoneName,
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
