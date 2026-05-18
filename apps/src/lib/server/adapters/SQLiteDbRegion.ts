import type { Lingkungan, Wilayah as LegacyWilayah } from '$core/entities/Schedule';
import type { Community, CommunityWithAncestry, ParishHierarchy, Wilayah } from '$core/entities/Parish';
import type { CreateCommunityInput } from '$core/repositories/ParishRepository';
import type { Church } from '$core/entities/Facility';
import { ServiceError } from '$core/errors/ServiceError';
import { community, church, lingkungan, parish, wilayah } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import { v4 as uuidv4 } from 'uuid';

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
		active: r.active === 1
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
		active: r.active === 1
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
		active: r.active === 1
	}));
}

/**
 * List all active communities that belong to the same parish as the given church.
 * Used when only churchId is available (e.g. from session) and parishId is unknown.
 */
export async function listCommunitiesForChurch(
	db: ReturnType<typeof drizzle>,
	churchId: string
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
		.innerJoin(church, eq(community.parishId, church.parishId))
		.where(and(eq(church.id, churchId), eq(community.active, 1)))
		.orderBy(wilayah.sequence, community.sequence);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		wilayahId: r.wilayahId ?? '',
		wilayahName: r.wilayahName ?? '',
		sequence: r.sequence ?? null,
		parishId: r.parishId ?? '',
		active: r.active === 1
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
			active: r.community_active === 1
		},
		wilayah: {
			id: r.wilayah_id ?? '',
			name: r.wilayah_name ?? '',
			code: r.wilayah_code ?? null,
			sequence: r.wilayah_sequence ?? null,
			parishId: r.wilayah_parishId ?? '',
			active: (r.wilayah_active ?? 1) === 1
		},
		parish: {
			id: r.parish_id ?? '',
			name: r.parish_name ?? '',
			code: r.parish_code ?? '',
			active: (r.parish_active ?? 1) === 1
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
			active: parishRows[0].active === 1
		},
		wilayahs: wilayahRows,
		communitiesByWilayah,
		churches
	};
}

// ─── Community CRUD ─────────────────────────────────────────────────────────────

/** Resolve parishId from a churchId. Throws ServiceError.notFound if church has no linked parish. */
export async function getParishIdByChurch(
	db: ReturnType<typeof drizzle>,
	churchId: string
): Promise<string> {
	const [row] = await db
		.select({ parishId: church.parishId })
		.from(church)
		.where(eq(church.id, churchId))
		.limit(1);
	if (!row?.parishId) {
		throw ServiceError.notFound('Church has no associated parish', { churchId });
	}
	return row.parishId;
}

/** Create a new community row. Returns the persisted Community with wilayahName from a JOIN. */
export async function createCommunity(
	db: ReturnType<typeof drizzle>,
	input: CreateCommunityInput
): Promise<Community> {
	const [wilayahRow] = await db
		.select({ name: wilayah.name })
		.from(wilayah)
		.where(eq(wilayah.id, input.wilayahId))
		.limit(1);
	if (!wilayahRow) {
		throw ServiceError.notFound('Wilayah not found', { wilayahId: input.wilayahId });
	}

	const id = uuidv4();
	await db.insert(community).values({
		id,
		name: input.name,
		wilayahId: input.wilayahId,
		parishId: input.parishId,
		sequence: input.sequence ?? null,
		active: input.active
	});

	return {
		id,
		name: input.name,
		wilayahId: input.wilayahId,
		wilayahName: wilayahRow.name,
		sequence: input.sequence,
		parishId: input.parishId,
		active: input.active === 1
	};
}

/** Update mutable fields on an existing community. Returns false if no row was matched. */
export async function updateCommunity(
	db: ReturnType<typeof drizzle>,
	id: string,
	patch: Partial<Pick<Community, 'name' | 'wilayahId' | 'sequence'>>
): Promise<boolean> {
	const result = await db
		.update(community)
		.set({ ...patch })
		.where(eq(community.id, id))
		.returning({ id: community.id });
	return result.length > 0;
}

/** Soft-delete a community (sets active = 0). Returns false if no row was matched. */
export async function deactivateCommunity(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<boolean> {
	const result = await db
		.update(community)
		.set({ active: 0 })
		.where(eq(community.id, id))
		.returning({ id: community.id });
	return result.length > 0;
}

// ─── Parish CRUD ─────────────────────────────────────────────────────────────

/** Find a parish by id. Returns null if not found. */
export async function findParishById(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<import('$core/entities/Parish').Parish | null> {
	const [row] = await db.select().from(parish).where(eq(parish.id, id)).limit(1);
	if (!row) return null;
	return { id: row.id, name: row.name, code: row.code, active: row.active === 1 };
}

/** Update mutable fields on the parish record. Returns false if no row was matched. */
export async function updateParish(
	db: ReturnType<typeof drizzle>,
	id: string,
	patch: Partial<Pick<import('$core/entities/Parish').Parish, 'name' | 'code'>>
): Promise<boolean> {
	const result = await db
		.update(parish)
		.set(patch)
		.where(eq(parish.id, id))
		.returning({ id: parish.id });
	return result.length > 0;
}

// ─── Wilayah CRUD ─────────────────────────────────────────────────────────────

/** Create a new wilayah. Returns the persisted Wilayah. */
export async function createWilayah(
	db: ReturnType<typeof drizzle>,
	input: import('$core/repositories/ParishRepository').CreateWilayahInput
): Promise<import('$core/entities/Parish').Wilayah> {
	const id = uuidv4();
	const seq = input.sequence ?? 0;
	await db.insert(wilayah).values({
		id,
		name: input.name,
		code: input.code ?? null,
		sequence: seq,
		parishId: input.parishId,
		active: input.active
	});
	return {
		id,
		name: input.name,
		code: input.code ?? null,
		sequence: seq,
		parishId: input.parishId,
		active: input.active === 1
	};
}

/** Update mutable fields on an existing wilayah. Returns false if no row was matched. */
export async function updateWilayah(
	db: ReturnType<typeof drizzle>,
	id: string,
	patch: { name?: string; code?: string | null; sequence?: number | null }
): Promise<boolean> {
	const setValues: Record<string, unknown> = {};
	if (patch.name !== undefined) setValues.name = patch.name;
	if ('code' in patch) setValues.code = patch.code;
	if (patch.sequence !== undefined) setValues.sequence = patch.sequence ?? 0;

	const result = await db
		.update(wilayah)
		.set(setValues)
		.where(eq(wilayah.id, id))
		.returning({ id: wilayah.id });
	return result.length > 0;
}

/** Soft-delete a wilayah (sets active = 0). Returns false if no row was matched. */
export async function deactivateWilayah(
	db: ReturnType<typeof drizzle>,
	id: string
): Promise<boolean> {
	const result = await db
		.update(wilayah)
		.set({ active: 0 })
		.where(eq(wilayah.id, id))
		.returning({ id: wilayah.id });
	return result.length > 0;
}
