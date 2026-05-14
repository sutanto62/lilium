import type { Lingkungan, Wilayah as LegacyWilayah } from '$core/entities/Schedule';
import type { Community, CommunityWithAncestry, ParishHierarchy, Wilayah } from '$core/entities/Parish';
import type { Church } from '$core/entities/Facility';
import { community, church, lingkungan, parish, wilayah } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';

export async function listWilayahByChurch(db: ReturnType<typeof drizzle>, churchId: string) {
	const result = await db
		.select()
		.from(wilayah)
		.where(eq(wilayah.church, churchId))
		.orderBy(wilayah.sequence);

	return result as LegacyWilayah[];
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

// ─── New Parish-domain methods (ParishRepository) ─────────────────────────────

/** List active wilayahs for a parish ordered by sequence. */
export async function listWilayahsByParish(
	db: ReturnType<typeof drizzle>,
	parishId: string
): Promise<Wilayah[]> {
	const rows = await db
		.select({
			id: wilayah.id,
			name: wilayah.name,
			code: wilayah.code,
			sequence: wilayah.sequence,
			parishId: wilayah.parishId,
			active: wilayah.active
		})
		.from(wilayah)
		.where(and(eq(wilayah.parishId, parishId), eq(wilayah.active, 1)))
		.orderBy(wilayah.sequence);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		code: r.code ?? null,
		sequence: r.sequence ?? null,
		parishId: r.parishId ?? parishId,
		active: r.active
	}));
}

/** List active communities for a wilayah ordered by sequence. */
export async function listCommunitiesByWilayah(
	db: ReturnType<typeof drizzle>,
	wilayahId: string
): Promise<Community[]> {
	const rows = await db
		.select({
			id: community.id,
			name: community.name,
			wilayahId: community.wilayahId,
			wilayahName: wilayah.name,
			sequence: community.sequence,
			parishId: community.parishId,
			active: community.active
		})
		.from(community)
		.leftJoin(wilayah, eq(community.wilayahId, wilayah.id))
		.where(and(eq(community.wilayahId, wilayahId), eq(community.active, 1)))
		.orderBy(community.sequence);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		wilayahId: r.wilayahId ?? wilayahId,
		wilayahName: r.wilayahName ?? '',
		sequence: r.sequence ?? null,
		parishId: r.parishId ?? '',
		active: r.active
	}));
}

/** List all active communities for a parish, ordered by wilayah then sequence. */
export async function listCommunities(
	db: ReturnType<typeof drizzle>,
	parishId: string
): Promise<Community[]> {
	const rows = await db
		.select({
			id: community.id,
			name: community.name,
			wilayahId: community.wilayahId,
			wilayahName: wilayah.name,
			sequence: community.sequence,
			parishId: community.parishId,
			active: community.active
		})
		.from(community)
		.leftJoin(wilayah, eq(community.wilayahId, wilayah.id))
		.where(and(eq(community.parishId, parishId), eq(community.active, 1)))
		.orderBy(wilayah.sequence, community.sequence);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		wilayahId: r.wilayahId ?? '',
		wilayahName: r.wilayahName ?? '',
		sequence: r.sequence ?? null,
		parishId: r.parishId ?? parishId,
		active: r.active
	}));
}

/** Find a single community with its full ancestry (wilayah + parish snapshots). */
export async function findCommunityById(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<CommunityWithAncestry | null> {
	const rows = await db
		.select({
			community_id: community.id,
			community_name: community.name,
			community_wilayahId: community.wilayahId,
			community_wilayahName: wilayah.name,
			community_sequence: community.sequence,
			community_parishId: community.parishId,
			community_active: community.active,
			wilayah_id: wilayah.id,
			wilayah_name: wilayah.name,
			wilayah_code: wilayah.code,
			wilayah_sequence: wilayah.sequence,
			wilayah_parishId: wilayah.parishId,
			wilayah_active: wilayah.active,
			parish_id: parish.id,
			parish_name: parish.name,
			parish_code: parish.code,
			parish_active: parish.active
		})
		.from(community)
		.leftJoin(wilayah, eq(community.wilayahId, wilayah.id))
		.leftJoin(parish, eq(community.parishId, parish.id))
		.where(eq(community.id, id))
		.limit(1);

	if (!rows[0]) return null;
	const r = rows[0];

	return {
		community: {
			id: r.community_id,
			name: r.community_name,
			wilayahId: r.community_wilayahId ?? '',
			wilayahName: r.community_wilayahName ?? '',
			sequence: r.community_sequence ?? null,
			parishId: r.community_parishId ?? '',
			active: r.community_active
		},
		wilayah: {
			id: r.wilayah_id ?? '',
			name: r.wilayah_name ?? '',
			code: r.wilayah_code ?? null,
			sequence: r.wilayah_sequence ?? null,
			parishId: r.wilayah_parishId ?? '',
			active: r.wilayah_active ?? 1
		},
		parish: {
			id: r.parish_id ?? '',
			name: r.parish_name ?? '',
			code: r.parish_code ?? '',
			active: r.parish_active ?? 1
		}
	};
}

/**
 * Load the full territorial + physical hierarchy for a parish.
 * Returns pre-built Maps to avoid N+1 queries on roster/schedule pages.
 */
export async function findParishHierarchy(
	db: ReturnType<typeof drizzle>,
	parishId: string
): Promise<ParishHierarchy> {
	// Load all in parallel
	const [parishRows, wilayahRows, communityRows, churchRows] = await Promise.all([
		db.select().from(parish).where(eq(parish.id, parishId)).limit(1),
		listWilayahsByParish(db, parishId),
		listCommunities(db, parishId),
		db
			.select({
				id: church.id,
				name: church.name,
				code: church.code,
				parishId: church.parishId,
				requiresSpecialCollection: church.requirePpg,
				active: church.active
			})
			.from(church)
			.where(and(eq(church.parishId, parishId), eq(church.active, 1)))
	]);

	if (!parishRows[0]) {
		throw new Error(`Parish not found: ${parishId}`);
	}

	// Build communitiesByWilayah Map
	const communitiesByWilayah = new Map<string, Community[]>();
	for (const c of communityRows) {
		const arr = communitiesByWilayah.get(c.wilayahId) ?? [];
		arr.push(c);
		communitiesByWilayah.set(c.wilayahId, arr);
	}

	const churches: Church[] = churchRows.map((c) => ({
		id: c.id,
		name: c.name,
		code: c.code,
		parishId: c.parishId ?? parishId,
		requiresSpecialCollection: c.requiresSpecialCollection ?? 0,
		active: c.active
	}));

	return {
		parish: {
			id: parishRows[0].id,
			name: parishRows[0].name,
			code: parishRows[0].code,
			active: parishRows[0].active
		},
		wilayahs: wilayahRows,
		communitiesByWilayah,
		churches
	};
}
