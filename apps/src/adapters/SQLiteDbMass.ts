import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { mass } from '$lib/server/db/schema';

export async function findMasses(db: ReturnType<typeof drizzle>, churchId: string) {
	return await db.select().from(mass).where(eq(mass.church, churchId)).orderBy(mass.sequence);
}

export async function getMassById(db: ReturnType<typeof drizzle>, id: string) {
	const result = await db.select().from(mass).where(eq(mass.id, id)).limit(1);
	return Array.isArray(result) ? result[0] : result;
}
