import type { Ministry, MinistryRole } from '$core/entities/Ministry';
import { ministry, ministry_role } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';

// ─── Ministry catalog adapter (MinistryRepository) ────────────────────────────

/** List all active ministries ordered by name. */
export async function listMinistries(db: ReturnType<typeof drizzle>): Promise<Ministry[]> {
	const rows = await db
		.select()
		.from(ministry)
		.where(eq(ministry.active, 1))
		.orderBy(ministry.name);

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		code: r.code,
		description: r.description ?? null,
		requiresStation: r.requiresStation === 1,
		active: r.active
	}));
}

/** List all active roles for a ministry ordered by name. */
export async function listRolesByMinistry(
	db: ReturnType<typeof drizzle>,
	ministryId: string
): Promise<MinistryRole[]> {
	const rows = await db
		.select()
		.from(ministry_role)
		.where(and(eq(ministry_role.ministryId, ministryId), eq(ministry_role.active, 1)))
		.orderBy(ministry_role.name);

	return rows.map((r) => ({
		id: r.id,
		ministryId: r.ministryId,
		name: r.name,
		code: r.code,
		isSpecialCollection: r.isSpecialCollection === 1,
		active: r.active
	}));
}

/**
 * Find a specific role by its ministry code + role code.
 * Returns null when the code pair does not exist.
 */
export async function findRoleByCode(
	db: ReturnType<typeof drizzle>,
	ministryCode: string,
	roleCode: string
): Promise<MinistryRole | null> {
	const rows = await db
		.select({
			id: ministry_role.id,
			ministryId: ministry_role.ministryId,
			name: ministry_role.name,
			code: ministry_role.code,
			isSpecialCollection: ministry_role.isSpecialCollection,
			active: ministry_role.active
		})
		.from(ministry_role)
		.innerJoin(ministry, eq(ministry_role.ministryId, ministry.id))
		.where(
			and(
				eq(ministry.code, ministryCode),
				eq(ministry_role.code, roleCode),
				eq(ministry_role.active, 1)
			)
		)
		.limit(1);

	if (!rows[0]) return null;
	const r = rows[0];
	return {
		id: r.id,
		ministryId: r.ministryId,
		name: r.name,
		code: r.code,
		isSpecialCollection: r.isSpecialCollection === 1,
		active: r.active
	};
}

/** Find a single ministry by its unique code (e.g. "USHER"). */
export async function findMinistryByCode(
	db: ReturnType<typeof drizzle>,
	code: string
): Promise<Ministry | null> {
	const rows = await db
		.select()
		.from(ministry)
		.where(and(eq(ministry.code, code), eq(ministry.active, 1)))
		.limit(1);

	if (!rows[0]) return null;
	const r = rows[0];
	return {
		id: r.id,
		name: r.name,
		code: r.code,
		description: r.description ?? null,
		requiresStation: r.requiresStation === 1,
		active: r.active
	};
}
