import type { Lingkungan, Wilayah } from '$core/entities/Schedule';
import { lingkungan, wilayah } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';

export async function listWilayahByChurch(db: ReturnType<typeof drizzle>, churchId: string) {
	const result = await db
		.select()
		.from(wilayah)
		.where(eq(wilayah.church, churchId))
		.orderBy(wilayah.sequence);

	return result as Wilayah[];
}

export async function listLingkunganByChurch(db: ReturnType<typeof drizzle>, churchId: string): Promise<Lingkungan[]> {
	const result = await db
		.select({
			id: lingkungan.id,
			name: lingkungan.name,
			wilayah: lingkungan.wilayah,
			wilayahName: wilayah.name,
			sequence: lingkungan.sequence,
			church: lingkungan.church,
			active: lingkungan.active,
		})
		.from(lingkungan)
		.where(eq(lingkungan.church, churchId))
		.leftJoin(wilayah, eq(lingkungan.wilayah, wilayah.id))
		.orderBy(lingkungan.sequence);

	return result as Lingkungan[];
}

export async function findLingkunganById(db: ReturnType<typeof drizzle>, id: string): Promise<Lingkungan> {
	const result = await db
		.select(
			{
				id: lingkungan.id,
				name: lingkungan.name,
				wilayah: lingkungan.wilayah,
				wilayahName: wilayah.name,
				sequence: lingkungan.sequence,
				church: lingkungan.church,
				active: lingkungan.active,
			}
		)
		.from(lingkungan)
		.leftJoin(wilayah, eq(lingkungan.wilayah, wilayah.id))
		.where(eq(lingkungan.id, id))
		.limit(1);

	return result[0] as Lingkungan;
}
