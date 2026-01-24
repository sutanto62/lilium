import type { Church, ChurchPosition, ChurchZone, ChurchZoneGroup } from '$core/entities/Schedule';
import { church, church_position, church_zone, church_zone_group, event, mass, mass_zone } from '$src/lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import { v4 as uuidv4 } from 'uuid';

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

	return result.map((row) => ({
		id: row.church_position.id,
		church: row.church_zone?.church ?? '',
		zone: row.church_zone?.name ?? '',
		name: row.church_position.name,
		code: row.church_position.code,
		description: row.church_position.description,
		isPpg: row.church_position.isPpg ? true : false,
		sequence: row.church_position.sequence,
		type: row.church_position.type,
		active: row.church_position.active,
		// Include additional data for MassPositionView mapping (accessed via type assertion in service)
		_zoneId: row.church_zone?.id ?? '',
		_zoneName: row.church_zone?.name ?? '',
		_zoneGroupId: row.church_zone_group?.id ?? null,
		_zoneGroupName: row.church_zone_group?.name ?? null
	} as ChurchPosition & {
		_zoneId: string;
		_zoneName: string;
		_zoneGroupId: string | null;
		_zoneGroupName: string | null;
	}));
}

/**
 * Creates a new church position
 * 
 * @param db - The SQLite database connection
 * @param position - Position data (zone should be zone ID, not name)
 * @returns Promise resolving to created ChurchPosition
 */
export async function createPosition(
	db: ReturnType<typeof drizzle>,
	position: Omit<ChurchPosition, 'id' | 'church' | 'active'> & { zone: string }
): Promise<ChurchPosition> {
	// Get zone to get church ID and zone name
	const zoneResult = await db
		.select()
		.from(church_zone)
		.where(eq(church_zone.id, position.zone))
		.limit(1);

	if (!zoneResult[0]) {
		throw new Error(`Zone not found: ${position.zone}`);
	}

	const zone = zoneResult[0];
	const positionId = uuidv4();

	const result = await db
		.insert(church_position)
		.values({
			id: positionId,
			zone: position.zone,
			name: position.name,
			code: position.code ?? null,
			description: position.description ?? null,
			isPpg: position.isPpg ? 1 : 0,
			sequence: position.sequence ?? null,
			type: position.type as 'usher' | 'prodiakon' | 'peta',
			active: 1,
			createdAt: undefined // Let database default handle this
		})
		.returning();

	return {
		id: result[0].id,
		church: zone.church ?? '',
		zone: zone.name, // Return zone name for consistency with other methods
		name: result[0].name,
		code: result[0].code,
		description: result[0].description,
		isPpg: result[0].isPpg ? true : false,
		sequence: result[0].sequence,
		type: result[0].type,
		active: result[0].active
	};
}

/**
 * Updates an existing church position
 * 
 * @param db - The SQLite database connection
 * @param positionId - ID of the position to update
 * @param patch - Partial position data to update
 * @returns Promise resolving to updated ChurchPosition
 */
export async function updatePosition(
	db: ReturnType<typeof drizzle>,
	positionId: string,
	patch: Partial<Pick<ChurchPosition, 'name' | 'code' | 'description' | 'type' | 'isPpg'>>
): Promise<ChurchPosition> {
	// Build update object, only including defined fields
	const updateData: Record<string, unknown> = {};
	if (patch.name !== undefined) updateData.name = patch.name;
	if (patch.code !== undefined) updateData.code = patch.code ?? null;
	if (patch.description !== undefined) updateData.description = patch.description ?? null;
	if (patch.type !== undefined) updateData.type = patch.type as 'usher' | 'prodiakon' | 'peta';
	if (patch.isPpg !== undefined) updateData.isPpg = patch.isPpg ? 1 : 0;

	const result = await db
		.update(church_position)
		.set(updateData)
		.where(eq(church_position.id, positionId))
		.returning();

	if (!result[0]) {
		throw new Error(`Position not found: ${positionId}`);
	}

	const updatedPosition = result[0];

	// Get zone to return zone name
	if (!updatedPosition.zone) {
		throw new Error(`Position ${positionId} has no zone assigned`);
	}

	const zoneId = updatedPosition.zone; // TypeScript now knows this is not null
	const zoneResult = await db
		.select()
		.from(church_zone)
		.where(eq(church_zone.id, zoneId))
		.limit(1);

	return {
		id: result[0].id,
		church: zoneResult[0]?.church ?? '',
		zone: zoneResult[0]?.name ?? '',
		name: result[0].name,
		code: result[0].code,
		description: result[0].description,
		isPpg: result[0].isPpg ? true : false,
		sequence: result[0].sequence,
		type: result[0].type,
		active: result[0].active
	};
}

/**
 * Soft deletes a church position by setting active = 0
 * 
 * @param db - The SQLite database connection
 * @param positionId - ID of the position to deactivate
 */
export async function softDeletePosition(
	db: ReturnType<typeof drizzle>,
	positionId: string
): Promise<void> {
	await db
		.update(church_position)
		.set({ active: 0 })
		.where(eq(church_position.id, positionId));
}

/**
 * Reorders positions within a zone by updating their sequence values
 * 
 * @param db - The SQLite database connection
 * @param zoneId - ID of the zone containing the positions
 * @param items - Array of position IDs and their new sequence values
 */
export async function reorderZonePositions(
	db: ReturnType<typeof drizzle>,
	zoneId: string,
	items: { id: string; sequence: number }[]
): Promise<void> {
	await db.transaction(async (tx) => {
		for (const item of items) {
			await tx
				.update(church_position)
				.set({ sequence: item.sequence })
				.where(and(eq(church_position.id, item.id), eq(church_position.zone, zoneId)));
		}
	});
}

