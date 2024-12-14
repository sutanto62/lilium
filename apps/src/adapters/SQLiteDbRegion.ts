import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { lingkungan, wilayah } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Lingkungan } from '$core/entities/schedule';

export async function findWilayahs(db: ReturnType<typeof drizzle>, churchId: string) {
	return await db
		.select()
		.from(wilayah)
		.where(eq(wilayah.church, churchId))
		.orderBy(wilayah.sequence);
}

export async function findLingkungans(
	db: ReturnType<typeof drizzle>,
	churchId: string
): Promise<Lingkungan[]> {
	return await db
		.select()
		.from(lingkungan)
		.where(eq(lingkungan.church, churchId))
		.orderBy(lingkungan.sequence);
}

export async function findLingkunganById(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<Lingkungan | null> {
	const result = await db.select().from(lingkungan).where(eq(lingkungan.id, id)).limit(1);
	return result[0] as Lingkungan | null;
}
