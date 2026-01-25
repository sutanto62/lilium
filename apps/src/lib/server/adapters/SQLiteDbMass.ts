import type { Mass } from '$core/entities/Schedule';
import { mass } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';

export async function findMasses(db: ReturnType<typeof drizzle>, churchId: string): Promise<Mass[]> {
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
