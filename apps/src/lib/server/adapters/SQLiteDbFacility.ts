import type { Church, ChurchPosition, ChurchZone, ChurchZoneGroup } from '$core/entities/Schedule';
import { church, church_position, church_zone, church_zone_group, event, mass, mass_zone } from '$src/lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';

export async function findChurches(db: ReturnType<typeof drizzle>): Promise<Church[]> {
	return await db.select().from(church).orderBy(church.code);
}

export async function findChurchById(db: ReturnType<typeof drizzle>, id: string): Promise<Church> {
	const result = await db.select().from(church).where(eq(church.id, id)).limit(1);

	return {
		id: result[0]?.id ?? '',
		name: result[0]?.name ?? '',
		code: result[0]?.code ?? '',
		parish: result[0]?.parish ?? '',
		requirePpg: result[0]?.requirePpg ?? 0,
		active: result[0]?.active ?? 1
	};
}

export async function findZonesByChurch(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<ChurchZone[]> {
	const result = await db
		.select()
		.from(church_zone)
		.where(eq(church_zone.church, id))
		.orderBy(church_zone.sequence);

	return result.map((zone) => ({
		id: zone.id,
		church: zone.church ?? '',
		group: zone.church_zone_group ?? null,
		name: zone.name,
		code: zone.code,
		description: zone.description,
		sequence: zone.sequence,
		active: zone.active
	}));
}

export async function findZoneGroupsByEvent(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	eventId: string
): Promise<ChurchZoneGroup[]> {
	const result = await db
		.select()
		.from(church_zone_group)
		.where(
			and(
				eq(church_zone_group.church, churchId),
				eq(church_zone_group.active, 1)
			)
		)
		.orderBy(church_zone_group.sequence);

	return result.map((group) => ({
		id: group.id,
		church: group.church ?? '',
		name: group.name,
		code: group.code,
		description: group.description,
		sequence: group.sequence,
		active: group.active,
	}));
}

export async function findZonesByEvent(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	eventId: string
): Promise<ChurchZone[]> {

	// const resultEvent = await db.select().from(event).where(eq(event.id, eventId)).limit(1);
	// logger.debug(`resultEvent: ${JSON.stringify(resultEvent)}`);

	// const massZones = await db
	// 	.select()
	// 	.from(mass_zone)
	// 	.where(
	// 		and(
	// 			eq(mass_zone.mass, resultEvent[0].mass_id),
	// 			eq(mass_zone.active, 1)
	// 		)
	// 	)
	// 	.orderBy(mass_zone.sequence);

	// const zoneIds = massZones.map((zone) => zone.zone);
	// if (zoneIds.length === 0) {
	// 	return [];
	// }

	// const churchZones = await db
	// 	.select()
	// 	.from(church_zone)
	// 	.where(
	// 		and(
	// 			eq(church_zone.church, churchId),
	// 			inArray(church_zone.id, zoneIds),
	// 			eq(church_zone.active, 1)
	// 		)
	// 	)
	// 	.orderBy(church_zone.sequence);

	// logger.debug(`churchZones: ${churchZones.map((zone) => zone.name).join(', ')}`);

	const zones = await db
		.select({
			id: church_zone.id,
			church: church_zone.church,
			group: church_zone_group.name,
			name: church_zone.name,
			code: church_zone.code,
			description: church_zone.description,
			sequence: church_zone.sequence,
			active: church_zone.active
		})
		.from(event)
		.leftJoin(mass, eq(event.mass_id, mass.id))
		.rightJoin(mass_zone, eq(mass_zone.mass, mass.id))
		.leftJoin(church_zone, eq(church_zone.id, mass_zone.zone))
		.leftJoin(church_zone_group, eq(church_zone_group.id, church_zone.church_zone_group))
		.where(and(
			eq(event.id, eventId),
			eq(church_zone.church, churchId),
			eq(mass_zone.active, 1),
			eq(church_zone.active, 1)
		))
		.orderBy(church_zone.sequence);

	return zones.map((zone) => ({
		id: zone.id ?? '',
		church: zone.church ?? '',
		group: zone.group,
		name: zone.name ?? '',
		code: zone.code ?? '',
		description: zone.description ?? '',
		sequence: zone.sequence ?? 0,
		active: zone.active ?? 0
	}));
}

export async function findPositionByChurch(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<ChurchPosition[]> {
	const result = await db
		.select()
		.from(church_position)
		.innerJoin(church_zone, eq(church_position.zone, church_zone.id))
		.where(eq(church_zone.church, id))
		.orderBy(church_position.sequence);

	return result.map((position) => ({
		id: position.church_position.id,
		church: position.church_zone?.church ?? '',
		zone: position.church_zone?.name ?? '',
		name: position.church_position.name,
		code: position.church_position.code,
		description: position.church_position.description,
		isPpg: position.church_position.isPpg ? true : false,
		sequence: position.church_position.sequence,
		type: position.church_position.type,
		active: position.church_position.active
	}));
}

// TODO: add params to detect feature flag is ppg?
/**
 * Finds positions available for a specific mass at a church
 * 
 * Queries the church_position table joined with church_zone and mass_zone
 * to get all positions configured for a given mass at a church.
 * Results are ordered by zone and position sequences.
 *
 * @param db - The SQLite database connection
 * @param churchId - ID of the church to find positions for
 * @param massId - ID of the mass to find positions for
 * @returns Promise resolving to array of ChurchPosition objects containing:
 *  - id: Unique ID of the position
 *  - church: Church ID this position belongs to
 *  - name: Name of the position
 *  - code: Position code
 *  - description: Position description
 *  - isPpg: Boolean indicating if position is PPG
 *  - sequence: Sort order sequence number
 *  - type: Position type
 */
export async function listPositionByMass(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	massId: string
): Promise<ChurchPosition[]> {
	const result = await db
		.select()
		.from(church_position)
		.leftJoin(church_zone, eq(church_position.zone, church_zone.id))
		.leftJoin(church_zone_group, eq(church_zone.church_zone_group, church_zone_group.id))
		.leftJoin(mass_zone, eq(mass_zone.zone, church_zone.id))
		.where(
			and(
				eq(church_zone.church, churchId),
				eq(mass_zone.mass, massId),
				eq(church_position.active, 1),
				eq(mass_zone.active, 1)
			)
		)
		.orderBy(church_position.sequence);

	return result.map((position) => ({
		id: position.church_position.id,
		church: position.church_zone?.church ?? '',
		zone: position.church_zone?.name ?? '',
		name: position.church_position.name,
		code: position.church_position.code,
		description: position.church_position.description,
		isPpg: position.church_position.isPpg ? true : false,
		sequence: position.church_position.sequence,
		type: position.church_position.type,
		active: position.church_position.active
	}));
}

