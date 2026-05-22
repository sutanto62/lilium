import type { MassSchedule } from '$core/entities/Schedule';
import { mass } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import { v4 as uuidv4 } from 'uuid';

export async function findAllMasses(db: ReturnType<typeof drizzle>, churchId: string): Promise<MassSchedule[]> {
	const result = await db.select().from(mass).where(eq(mass.church, churchId)).orderBy(mass.sequence);
	return result.map((mass) => ({
		id: mass.id,
		church: mass.church,
		name: mass.name,
		code: mass.code,
		day: mass.day,
		sequence: mass.sequence,
		time: mass.time,
		briefingTime: mass.briefingTime,
		active: mass.active
	}));
}

export async function findMasses(db: ReturnType<typeof drizzle>, churchId: string): Promise<MassSchedule[]> {
	const result = await db.select().from(mass).where(and(eq(mass.church, churchId), eq(mass.active, 1))).orderBy(mass.sequence);
	return result.map((mass) => ({
		id: mass.id,
		church: mass.church,
		name: mass.name,
		code: mass.code,
		day: mass.day,
		sequence: mass.sequence,
		time: mass.time,
		briefingTime: mass.briefingTime,
		active: mass.active
	}));
}

export async function findMassById(db: ReturnType<typeof drizzle>, id: string) {
	const result = await db.select().from(mass).where(eq(mass.id, id)).limit(1);
	return Array.isArray(result) ? result[0] : result;
}

/**
 * Deactivates a mass schedule (soft delete)
 * Sets active = 0 to preserve historical data
 */
export async function deactivateMass(
	db: ReturnType<typeof drizzle>,
	massId: string
): Promise<boolean> {
	const result = await db
		.update(mass)
		.set({ active: 0 })
		.where(eq(mass.id, massId))
		.returning();
	return result.length > 0;
}

export async function createMass(
	db: ReturnType<typeof drizzle>,
	input: Omit<MassSchedule, 'id'>
): Promise<MassSchedule> {
	const id = uuidv4();
	const result = await db
		.insert(mass)
		.values({
			id,
			code: input.code ?? null,
			name: input.name,
			sequence: input.sequence ?? null,
			church: input.church ?? null,
			day: input.day as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
			time: input.time ?? null,
			briefingTime: input.briefingTime ?? null,
			active: input.active ?? 1,
			createdAt: undefined
		})
		.returning();
	const row = result[0];
	return {
		id: row.id ?? id,
		code: row.code,
		name: row.name,
		sequence: row.sequence,
		church: row.church,
		day: row.day,
		time: row.time,
		briefingTime: row.briefingTime,
		active: row.active
	};
}

export async function updateMass(
	db: ReturnType<typeof drizzle>,
	massId: string,
	patch: Partial<Omit<MassSchedule, 'id' | 'church'>>
): Promise<MassSchedule> {
	const updateData: Record<string, unknown> = {};
	if (patch.code !== undefined) updateData.code = patch.code ?? null;
	if (patch.name !== undefined) updateData.name = patch.name;
	if (patch.sequence !== undefined) updateData.sequence = patch.sequence ?? null;
	if (patch.day !== undefined) updateData.day = patch.day;
	if (patch.time !== undefined) updateData.time = patch.time ?? null;
	if (patch.briefingTime !== undefined) updateData.briefingTime = patch.briefingTime ?? null;
	if (patch.active !== undefined) updateData.active = patch.active;

	const result = await db
		.update(mass)
		.set(updateData)
		.where(eq(mass.id, massId))
		.returning();

	if (!result[0]) throw new Error(`Mass not found: ${massId}`);
	const row = result[0];
	return {
		id: row.id ?? massId,
		code: row.code,
		name: row.name,
		sequence: row.sequence,
		church: row.church,
		day: row.day,
		time: row.time,
		briefingTime: row.briefingTime,
		active: row.active
	};
}
