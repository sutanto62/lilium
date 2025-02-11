import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { mass } from '$lib/server/db/schema';
import { logger } from '$src/lib/utils/logger';
import type { Mass } from '$core/entities/Schedule';

export async function findMasses(db: ReturnType<typeof drizzle>, churchId: string): Promise<Mass[]> {
	const result = await db.select().from(mass).where(eq(mass.church, churchId)).orderBy(mass.sequence);
	return result.map((mass) => ({
		id: mass.id,
		church: mass.church,
		name: mass.name,
		code: mass.code,
		day: mass.day,
		sequence: mass.sequence
	}));
}

export async function getMassById(db: ReturnType<typeof drizzle>, id: string) {
	const result = await db.select().from(mass).where(eq(mass.id, id)).limit(1);
	return Array.isArray(result) ? result[0] : result;
}
