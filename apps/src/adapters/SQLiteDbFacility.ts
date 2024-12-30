import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { church, church_zone, church_position, mass_zone } from '$src/lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Church, ChurchPosition, ChurchZone } from '$core/entities/Schedule';

export async function findChurches(db: ReturnType<typeof drizzle>): Promise<Church[]> {
	return await db.select().from(church).orderBy(church.code);
}

export async function findChurchById(db: ReturnType<typeof drizzle>, id: string): Promise<Church> {
	const result = await db.select().from(church).where(eq(church.id, id)).limit(1);

	return result.map((church) => ({
		id: church.id,
		name: church.name ?? '',
		code: church.code ?? '',
		parish: church.parish ?? ''
	}))[0];
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
		name: zone.name,
		code: zone.code,
		description: zone.description,
		sequence: zone.sequence,
		pic: zone.pic
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
		name: position.church_position.name,
		code: position.church_position.code,
		description: position.church_position.description,
		isPpg: position.church_position.isPpg ? true : false,
		sequence: position.church_position.sequence,
		type: position.church_position.type
	}));
}

export async function findPositionByMass(
	db: ReturnType<typeof drizzle>,
	churchId: string,
	massId: string
): Promise<ChurchPosition[]> {
	const result = await db
		.select()
		.from(church_position)
		.leftJoin(church_zone, eq(church_position.zone, church_zone.id))
		.leftJoin(mass_zone, eq(mass_zone.zone, church_zone.id))
		.where(
			and(
				eq(church_position.zone, church_zone.id),
				eq(mass_zone.mass, massId),
				eq(church_zone.church, churchId)
			)
		)
		.orderBy(mass_zone.sequence, church_zone.sequence, church_position.sequence);

	return result.map((position) => ({
		id: position.church_position.id,
		church: position.church_zone?.church ?? '',
		name: position.church_position.name,
		code: position.church_position.code,
		description: position.church_position.description,
		isPpg: position.church_position.isPpg ? true : false,
		sequence: position.church_position.sequence,
		type: position.church_position.type
	}));
}
