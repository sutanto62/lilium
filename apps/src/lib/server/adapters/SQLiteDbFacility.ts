import type { Church, ChurchPosition, ChurchZone, ChurchZoneGroup, MassZone } from '$core/entities/Schedule';
import type { Section, Zone, Station } from '$core/entities/Facility';
import type { ChurchFacility } from '$core/entities/Parish';
import {
	church,
	church_position,
	church_zone,
	church_zone_group,
	event,
	mass,
	mass_zone,
	section,
	zone,
	station
} from '$src/lib/server/db/schema';
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

export async function listZoneGroups(
	db: ReturnType<typeof drizzle>,
	churchId: string
): Promise<ChurchZoneGroup[]> {
	const result = await db
		.select()
		.from(church_zone_group)
		.where(and(eq(church_zone_group.church, churchId), eq(church_zone_group.active, 1)))
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

export async function createZoneGroup(
	db: ReturnType<typeof drizzle>,
	input: Omit<ChurchZoneGroup, 'id'>
): Promise<ChurchZoneGroup> {
	const id = uuidv4();
	const result = await db
		.insert(church_zone_group)
		.values({
			id,
			church: input.church ?? null,
			name: input.name,
			code: input.code ?? null,
			description: input.description ?? null,
			sequence: input.sequence ?? null,
			active: input.active ?? 1
		})
		.returning();
	const row = result[0];
	return {
		id: row.id,
		church: row.church ?? '',
		name: row.name,
		code: row.code,
		description: row.description,
		sequence: row.sequence,
		active: row.active,
	};
}

export async function updateZoneGroup(
	db: ReturnType<typeof drizzle>,
	id: string,
	patch: Partial<Omit<ChurchZoneGroup, 'id' | 'church'>>
): Promise<ChurchZoneGroup> {
	const updateData: Record<string, unknown> = {};
	if (patch.name !== undefined) updateData.name = patch.name;
	if (patch.code !== undefined) updateData.code = patch.code ?? null;
	if (patch.description !== undefined) updateData.description = patch.description ?? null;
	if (patch.sequence !== undefined) updateData.sequence = patch.sequence ?? null;
	if (patch.active !== undefined) updateData.active = patch.active;

	const result = await db
		.update(church_zone_group)
		.set(updateData)
		.where(eq(church_zone_group.id, id))
		.returning();

	if (!result[0]) throw new Error(`ZoneGroup not found: ${id}`);
	const row = result[0];
	return {
		id: row.id,
		church: row.church ?? '',
		name: row.name,
		code: row.code,
		description: row.description,
		sequence: row.sequence,
		active: row.active,
	};
}

export async function deactivateZoneGroup(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<boolean> {
	const result = await db
		.update(church_zone_group)
		.set({ active: 0 })
		.where(eq(church_zone_group.id, id))
		.returning();
	return result.length > 0;
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

export async function findZonesByMass(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	massId: string
): Promise<ChurchZone[]> {
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
		.from(mass_zone)
		.innerJoin(church_zone, eq(church_zone.id, mass_zone.zone))
		.leftJoin(church_zone_group, eq(church_zone_group.id, church_zone.church_zone_group))
		.where(and(
			eq(mass_zone.mass, massId),
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
				eq(mass_zone.active, 1),
				eq(church_zone.active, 1)
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
		_zoneGroupName: row.church_zone_group?.name ?? null,
		_zoneGroupSequence: row.church_zone_group?.sequence ?? null
	} as ChurchPosition & {
		_zoneId: string;
		_zoneName: string;
		_zoneGroupId: string | null;
		_zoneGroupName: string | null;
		_zoneGroupSequence: number | null;
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
	patch: Partial<Pick<ChurchPosition, 'name' | 'code' | 'description' | 'type' | 'isPpg' | 'sequence' | 'zone'>>
): Promise<ChurchPosition> {
	// Build update object, only including defined fields
	const updateData: Record<string, unknown> = {};
	if (patch.name !== undefined) updateData.name = patch.name;
	if (patch.code !== undefined) updateData.code = patch.code ?? null;
	if (patch.description !== undefined) updateData.description = patch.description ?? null;
	if (patch.type !== undefined) updateData.type = patch.type as 'usher' | 'prodiakon' | 'peta';
	if (patch.isPpg !== undefined) updateData.isPpg = patch.isPpg ? 1 : 0;
	if (patch.sequence !== undefined) updateData.sequence = patch.sequence ?? null;
	if (patch.zone !== undefined) updateData.zone = patch.zone;

	const result = await db
		.update(church_position)
		.set(updateData)
		.where(eq(church_position.id, positionId))
		.returning();

	if (!result[0]) {
		throw new Error(`Position not found: ${positionId}`);
	}

	const updatedPosition = result[0];

	// Get zone to return zone name (use updated zone if zone was changed, otherwise use existing)
	const zoneId = updatedPosition.zone;
	if (!zoneId) {
		throw new Error(`Position ${positionId} has no zone assigned`);
	}

	const zoneResult = await db
		.select()
		.from(church_zone)
		.where(eq(church_zone.id, zoneId))
		.limit(1);

	if (!zoneResult[0]) {
		throw new Error(`Zone ${zoneId} not found`);
	}

	return {
		id: result[0].id,
		church: zoneResult[0].church ?? '',
		zone: zoneResult[0].name ?? '',
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

export async function createZone(
	db: ReturnType<typeof drizzle>,
	input: Omit<ChurchZone, 'id'>
): Promise<ChurchZone> {
	const id = uuidv4();
	const result = await db
		.insert(church_zone)
		.values({
			id,
			church: input.church ?? null,
			church_zone_group: input.group ?? null,
			name: input.name,
			code: input.code ?? null,
			description: input.description ?? null,
			sequence: input.sequence ?? null,
			active: input.active ?? 1
		})
		.returning();
	const row = result[0];
	return {
		id: row.id,
		church: row.church ?? '',
		group: row.church_zone_group ?? null,
		name: row.name,
		code: row.code,
		description: row.description,
		sequence: row.sequence,
		active: row.active
	};
}

export async function updateZone(
	db: ReturnType<typeof drizzle>,
	zoneId: string,
	patch: Partial<Omit<ChurchZone, 'id' | 'church'>>
): Promise<ChurchZone> {
	const updateData: Record<string, unknown> = {};
	if (patch.name !== undefined) updateData.name = patch.name;
	if (patch.code !== undefined) updateData.code = patch.code ?? null;
	if (patch.description !== undefined) updateData.description = patch.description ?? null;
	if (patch.sequence !== undefined) updateData.sequence = patch.sequence ?? null;
	if (patch.group !== undefined) updateData.church_zone_group = patch.group ?? null;
	if (patch.active !== undefined) updateData.active = patch.active;

	const result = await db
		.update(church_zone)
		.set(updateData)
		.where(eq(church_zone.id, zoneId))
		.returning();

	if (!result[0]) throw new Error(`Zone not found: ${zoneId}`);
	const row = result[0];
	return {
		id: row.id,
		church: row.church ?? '',
		group: row.church_zone_group ?? null,
		name: row.name,
		code: row.code,
		description: row.description,
		sequence: row.sequence,
		active: row.active
	};
}

export async function deactivateZone(
	db: ReturnType<typeof drizzle>,
	zoneId: string
): Promise<boolean> {
	const result = await db
		.update(church_zone)
		.set({ active: 0 })
		.where(eq(church_zone.id, zoneId))
		.returning();
	return result.length > 0;
}

export async function findMassZonesByChurch(
	db: ReturnType<typeof drizzle>,
	churchId: string
): Promise<MassZone[]> {
	const result = await db
		.select({
			id: mass_zone.id,
			mass: mass_zone.mass,
			zone: mass_zone.zone,
			sequence: mass_zone.sequence,
			active: mass_zone.active
		})
		.from(mass_zone)
		.innerJoin(mass, eq(mass_zone.mass, mass.id))
		.where(and(eq(mass.church, churchId), eq(mass_zone.active, 1)))
		.orderBy(mass_zone.sequence);

	return result.map((row) => ({
		id: row.id,
		mass: row.mass,
		zone: row.zone,
		sequence: row.sequence ?? 0,
		active: row.active
	}));
}

export async function createMassZone(
	db: ReturnType<typeof drizzle>,
	massId: string,
	zoneId: string
): Promise<MassZone> {
	const id = uuidv4();
	const result = await db
		.insert(mass_zone)
		.values({ id, mass: massId, zone: zoneId, sequence: 0, active: 1 })
		.returning();
	const row = result[0];
	return {
		id: row.id,
		mass: row.mass,
		zone: row.zone,
		sequence: row.sequence ?? 0,
		active: row.active
	};
}

export async function deactivateMassZone(
	db: ReturnType<typeof drizzle>,
	massZoneId: string
): Promise<boolean> {
	const result = await db
		.update(mass_zone)
		.set({ active: 0 })
		.where(eq(mass_zone.id, massZoneId))
		.returning();
	return result.length > 0;
}

// ─── New physical hierarchy methods (FacilityRepository) ──────────────────────

/** List active sections for a church ordered by sequence. */
export async function listSectionsByChurch(
	db: ReturnType<typeof drizzle>,
	churchId: string
): Promise<Section[]> {
	const rows = await db
		.select()
		.from(section)
		.where(and(eq(section.churchId, churchId), eq(section.active, 1)))
		.orderBy(section.sequence);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		code: r.code ?? null,
		description: r.description ?? null,
		sequence: r.sequence ?? null,
		churchId: r.churchId,
		active: r.active
	}));
}

/** List active zones for a church, optionally filtered by section. */
export async function listZonesByChurch(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	sectionId?: string
): Promise<Zone[]> {
	const conditions = [eq(zone.churchId, churchId), eq(zone.active, 1)] as ReturnType<typeof eq>[];
	if (sectionId) conditions.push(eq(zone.sectionId, sectionId));

	const rows = await db
		.select()
		.from(zone)
		.where(and(...conditions))
		.orderBy(zone.sequence);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		code: r.code ?? null,
		description: r.description ?? null,
		sequence: r.sequence ?? null,
		churchId: r.churchId,
		sectionId: r.sectionId ?? null,
		active: r.active
	}));
}

/**
 * List zones associated with an event's church (new zone table).
 * The new `zone` table does not yet have a mass_zone relationship.
 * Returns all active zones for the church associated with the event.
 * TODO: wire up new mass_zone → zone FK in Phase 6/7.
 */
export async function listNewZonesByEvent(
	db: ReturnType<typeof drizzle>,
	eventId: string
): Promise<Zone[]> {
	const eventRows = await db
		.select({ churchId: event.church_id })
		.from(event)
		.where(eq(event.id, eventId))
		.limit(1);

	if (!eventRows[0]) return [];

	return listZonesByChurch(db, eventRows[0].churchId);
}

/** List active stations within a zone ordered by sequence. */
export async function listStationsByZone(
	db: ReturnType<typeof drizzle>,
	zoneId: string
): Promise<Station[]> {
	const rows = await db
		.select()
		.from(station)
		.where(and(eq(station.zoneId, zoneId), eq(station.active, 1)))
		.orderBy(station.sequence);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		code: r.code ?? null,
		description: r.description ?? null,
		sequence: r.sequence ?? null,
		churchId: r.churchId,
		zoneId: r.zoneId,
		ministryId: r.ministryId,
		defaultRoleId: r.defaultRoleId ?? null,
		active: r.active
	}));
}

/**
 * Load the full physical hierarchy for one church.
 * Returns pre-built Maps (zonesBySection, stationsByZone) to avoid N+1 queries.
 */
export async function findChurchFacility(
	db: ReturnType<typeof drizzle>,
	churchId: string
): Promise<ChurchFacility> {
	const churchRows = await db
		.select()
		.from(church)
		.where(eq(church.id, churchId))
		.limit(1);

	if (!churchRows[0]) {
		throw new Error(`Church not found: ${churchId}`);
	}

	const [sections, zones, allStations] = await Promise.all([
		listSectionsByChurch(db, churchId),
		listZonesByChurch(db, churchId),
		db
			.select()
			.from(station)
			.where(and(eq(station.churchId, churchId), eq(station.active, 1)))
			.orderBy(station.sequence)
	]);

	// Build zonesBySection Map
	const zonesBySection = new Map<string, Zone[]>();
	for (const z of zones) {
		const sectionKey = z.sectionId ?? '__none__';
		const arr = zonesBySection.get(sectionKey) ?? [];
		arr.push(z);
		zonesBySection.set(sectionKey, arr);
	}

	// Build stationsByZone Map
	const stationsByZone = new Map<string, Station[]>();
	for (const s of allStations) {
		const arr = stationsByZone.get(s.zoneId) ?? [];
		arr.push({
			id: s.id,
			name: s.name,
			code: s.code ?? null,
			description: s.description ?? null,
			sequence: s.sequence ?? null,
			churchId: s.churchId,
			zoneId: s.zoneId,
			ministryId: s.ministryId,
			defaultRoleId: s.defaultRoleId ?? null,
			active: s.active
		});
		stationsByZone.set(s.zoneId, arr);
	}

	const row = churchRows[0];
	return {
		church: {
			id: row.id,
			name: row.name,
			code: row.code,
			parishId: row.parishId ?? '',
			requiresSpecialCollection: row.requirePpg ?? 0,
			active: row.active
		},
		sections,
		zonesBySection,
		stationsByZone
	};
}

// ─── Section CRUD ─────────────────────────────────────────────────────────────

/** Create a new section for a church. */
export async function createSection(
	db: ReturnType<typeof drizzle>,
	input: Omit<Section, 'id'>
): Promise<Section> {
	const id = uuidv4();
	await db.insert(section).values({
		id,
		churchId: input.churchId,
		name: input.name,
		code: input.code ?? null,
		description: input.description ?? null,
		sequence: input.sequence ?? null,
		active: input.active
	});
	return { id, ...input };
}

/** Update mutable fields on an existing section. */
export async function updateSection(
	db: ReturnType<typeof drizzle>,
	id: string,
	patch: Partial<Pick<Section, 'name' | 'code' | 'description' | 'sequence'>>
): Promise<boolean> {
	const result = await db
		.update(section)
		.set({ ...patch })
		.where(eq(section.id, id))
		.returning({ id: section.id });
	return result.length > 0;
}

/** Soft-delete a section (sets active = 0). */
export async function deactivateSection(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<boolean> {
	const result = await db
		.update(section)
		.set({ active: 0 })
		.where(eq(section.id, id))
		.returning({ id: section.id });
	return result.length > 0;
}

// ─── Zone CRUD (new zone table, distinct from legacy church_zone) ──────────────

/** Create a new zone in the new domain zone table. */
export async function createNewZone(
	db: ReturnType<typeof drizzle>,
	input: Omit<Zone, 'id'>
): Promise<Zone> {
	const id = uuidv4();
	await db.insert(zone).values({
		id,
		churchId: input.churchId,
		sectionId: input.sectionId ?? null,
		name: input.name,
		code: input.code ?? null,
		description: input.description ?? null,
		sequence: input.sequence ?? null,
		active: input.active
	});
	return { id, ...input };
}

/** Update mutable fields on a zone (new domain). */
export async function updateNewZone(
	db: ReturnType<typeof drizzle>,
	id: string,
	patch: Partial<Pick<Zone, 'name' | 'code' | 'description' | 'sequence' | 'sectionId'>>
): Promise<boolean> {
	const result = await db
		.update(zone)
		.set({ ...patch })
		.where(eq(zone.id, id))
		.returning({ id: zone.id });
	return result.length > 0;
}

/** Soft-delete a zone (new domain). */
export async function deactivateNewZone(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<boolean> {
	const result = await db
		.update(zone)
		.set({ active: 0 })
		.where(eq(zone.id, id))
		.returning({ id: zone.id });
	return result.length > 0;
}

// ─── Station CRUD ─────────────────────────────────────────────────────────────

/** Create a new station. */
export async function createStation(
	db: ReturnType<typeof drizzle>,
	input: Omit<Station, 'id'>
): Promise<Station> {
	const id = uuidv4();
	await db.insert(station).values({
		id,
		churchId: input.churchId,
		zoneId: input.zoneId,
		ministryId: input.ministryId,
		defaultRoleId: input.defaultRoleId ?? null,
		name: input.name,
		code: input.code ?? null,
		description: input.description ?? null,
		sequence: input.sequence ?? null,
		active: input.active
	});
	return { id, ...input };
}

/** Update mutable fields on an existing station. */
export async function updateStation(
	db: ReturnType<typeof drizzle>,
	id: string,
	patch: Partial<Pick<Station, 'name' | 'code' | 'description' | 'sequence' | 'zoneId' | 'ministryId' | 'defaultRoleId'>>
): Promise<boolean> {
	const result = await db
		.update(station)
		.set({ ...patch })
		.where(eq(station.id, id))
		.returning({ id: station.id });
	return result.length > 0;
}

/** Soft-delete a station. */
export async function deactivateStation(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<boolean> {
	const result = await db
		.update(station)
		.set({ active: 0 })
		.where(eq(station.id, id))
		.returning({ id: station.id });
	return result.length > 0;
}

// ─── Church (Facility.Church) read/update ─────────────────────────────────────

/** Find a church by id, returning the Facility.Church domain shape. */
export async function findFacilityChurchById(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<import('$core/entities/Facility').Church | null> {
	const [row] = await db.select().from(church).where(eq(church.id, id)).limit(1);
	if (!row) return null;
	return {
		id: row.id,
		name: row.name,
		code: row.code,
		parishId: row.parishId ?? '',
		requiresSpecialCollection: row.requirePpg ?? 0,
		active: row.active
	};
}

/** Update mutable fields on a church. Maps requiresSpecialCollection → requirePpg DB column. */
export async function updateFacilityChurch(
	db: ReturnType<typeof drizzle>,
	id: string,
	patch: Partial<
		Pick<import('$core/entities/Facility').Church, 'name' | 'code' | 'requiresSpecialCollection'>
	>
): Promise<boolean> {
	const setValues: Record<string, unknown> = {};
	if (patch.name !== undefined) setValues.name = patch.name;
	if (patch.code !== undefined) setValues.code = patch.code;
	if (patch.requiresSpecialCollection !== undefined)
		setValues.requirePpg = patch.requiresSpecialCollection;
	if (Object.keys(setValues).length === 0) return false;
	const result = await db
		.update(church)
		.set(setValues)
		.where(eq(church.id, id))
		.returning({ id: church.id });
	return result.length > 0;
}

