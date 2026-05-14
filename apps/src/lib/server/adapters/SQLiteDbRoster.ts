import type {
	ConfirmRosterEntryCommand,
	CreateRosterCommand,
	Roster,
	RosterEntry,
	RosterUsher,
	SubmitRosterEntryCommand
} from '$core/entities/Roster';
import { ServiceError } from '$core/errors/ServiceError';
import { community, ministry_role, roster, roster_entry, roster_usher, wilayah } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import { v4 as uuidv4 } from 'uuid';

// ─── Roster aggregate adapter (RosterRepository) ──────────────────────────────

// ── Private helpers ────────────────────────────────────────────────────────────

/** Map DB roster_usher rows to domain RosterUsher values. */
function mapUsher(r: {
	id: string;
	name: string;
	ministryRoleId: string;
	stationId: string | null;
	sequence: number | null;
}): RosterUsher {
	return {
		id: r.id,
		name: r.name,
		ministryRoleId: r.ministryRoleId,
		stationId: r.stationId ?? null,
		sequence: r.sequence ?? null
	};
}

/** Build a RosterEntry domain object from a row + ushers. */
function mapEntry(
	r: {
		id: string;
		rosterId: string;
		communityId: string;
		communityName: string;
		wilayahId: string;
		wilayahName: string;
		status: 'draft' | 'submitted' | 'confirmed';
		submittedAt: number | null;
		confirmedAt: number | null;
	},
	ushers: RosterUsher[]
): RosterEntry {
	return {
		id: r.id,
		rosterId: r.rosterId,
		communityId: r.communityId,
		communityName: r.communityName,
		wilayahId: r.wilayahId,
		wilayahName: r.wilayahName,
		status: r.status,
		submittedAt: r.submittedAt ?? null,
		confirmedAt: r.confirmedAt ?? null,
		ushers
	};
}

/** Build a full Roster aggregate from raw DB rows. */
function assembleRoster(
	rosterRow: {
		id: string;
		eventId: string;
		createdByUserId: string;
		version: number;
		status: 'draft' | 'submitted' | 'confirmed';
		createdAt: number | null;
		updatedAt: number | null;
	},
	entryRows: {
		id: string;
		rosterId: string;
		communityId: string;
		communityName: string;
		wilayahId: string;
		wilayahName: string;
		status: 'draft' | 'submitted' | 'confirmed';
		submittedAt: number | null;
		confirmedAt: number | null;
	}[],
	ushersByEntry: Map<string, RosterUsher[]>
): Roster {
	const entries = entryRows.map((e) => mapEntry(e, ushersByEntry.get(e.id) ?? []));
	return {
		id: rosterRow.id,
		eventId: rosterRow.eventId,
		createdByUserId: rosterRow.createdByUserId,
		version: rosterRow.version,
		status: rosterRow.status,
		createdAt: rosterRow.createdAt ?? 0,
		updatedAt: rosterRow.updatedAt ?? 0,
		entries
	};
}

// ── Public repository functions ────────────────────────────────────────────────

/**
 * Create a new Roster for an event with one RosterEntry stub per community.
 * Each entry starts with status 'draft'.
 */
export async function createRoster(
	db: ReturnType<typeof drizzle>,
	cmd: CreateRosterCommand
): Promise<Roster> {
	return await db.transaction(async (tx) => {
		const rosterId = uuidv4();
		const now = Math.floor(Date.now() / 1000);

		// Insert roster
		await tx.insert(roster).values({
			id: rosterId,
			eventId: cmd.eventId,
			createdByUserId: cmd.createdByUserId,
			version: 1,
			status: 'draft',
			createdAt: now,
			updatedAt: now
		});

		// Fetch community + wilayah snapshots
		const communityRows = await tx
			.select({
				id: community.id,
				name: community.name,
				wilayahId: community.wilayahId,
				wilayahName: wilayah.name
			})
			.from(community)
			.leftJoin(wilayah, eq(community.wilayahId, wilayah.id))
			.where(and(eq(community.active, 1)));

		const communityMap = new Map(communityRows.map((c) => [c.id, c]));

		const entryRows: RosterEntry[] = [];
		for (const communityId of cmd.communityIds) {
			const comm = communityMap.get(communityId);
			if (!comm) {
				throw ServiceError.notFound(`Community not found: ${communityId}`, { communityId });
			}

			const entryId = uuidv4();
			await tx.insert(roster_entry).values({
				id: entryId,
				rosterId,
				communityId,
				communityName: comm.name,
				wilayahId: comm.wilayahId ?? '',
				wilayahName: comm.wilayahName ?? '',
				status: 'draft',
				submittedAt: null,
				confirmedAt: null
			});

			entryRows.push({
				id: entryId,
				rosterId,
				communityId,
				communityName: comm.name,
				wilayahId: comm.wilayahId ?? '',
				wilayahName: comm.wilayahName ?? '',
				status: 'draft',
				submittedAt: null,
				confirmedAt: null,
				ushers: []
			});
		}

		return {
			id: rosterId,
			eventId: cmd.eventId,
			createdByUserId: cmd.createdByUserId,
			version: 1,
			status: 'draft',
			createdAt: now,
			updatedAt: now,
			entries: entryRows
		};
	});
}

/** Load the full Roster aggregate for an event. Returns null if none exists. */
export async function loadRoster(
	db: ReturnType<typeof drizzle>,
	eventId: string
): Promise<Roster | null> {
	const rosterRows = await db
		.select()
		.from(roster)
		.where(eq(roster.eventId, eventId))
		.limit(1);

	if (!rosterRows[0]) return null;
	return _loadFullRoster(db, rosterRows[0]);
}

/** Load a Roster by its own id. Returns null if not found. */
export async function findRosterById(
	db: ReturnType<typeof drizzle>,
	rosterId: string
): Promise<Roster | null> {
	const rosterRows = await db
		.select()
		.from(roster)
		.where(eq(roster.id, rosterId))
		.limit(1);

	if (!rosterRows[0]) return null;
	return _loadFullRoster(db, rosterRows[0]);
}

/** Internal helper: given a roster row, load all entries + ushers and assemble. */
async function _loadFullRoster(
	db: ReturnType<typeof drizzle>,
	rosterRow: {
		id: string;
		eventId: string;
		createdByUserId: string;
		version: number;
		status: 'draft' | 'submitted' | 'confirmed';
		createdAt: number | null;
		updatedAt: number | null;
	}
): Promise<Roster> {
	// Load entries
	const entryRows = await db
		.select()
		.from(roster_entry)
		.where(eq(roster_entry.rosterId, rosterRow.id))
		.orderBy(roster_entry.communityName);

	// Load ushers for all entries via JOIN
	const usherRows = await db
		.select({
			id: roster_usher.id,
			name: roster_usher.name,
			ministryRoleId: roster_usher.ministryRoleId,
			stationId: roster_usher.stationId,
			sequence: roster_usher.sequence,
			rosterEntryId: roster_usher.rosterEntryId
		})
		.from(roster_usher)
		.innerJoin(roster_entry, eq(roster_usher.rosterEntryId, roster_entry.id))
		.where(eq(roster_entry.rosterId, rosterRow.id))
		.orderBy(roster_usher.sequence);

	// Build usher map by entry id
	const ushersByEntry = new Map<string, RosterUsher[]>();
	for (const u of usherRows) {
		const arr = ushersByEntry.get(u.rosterEntryId) ?? [];
		arr.push(mapUsher(u));
		ushersByEntry.set(u.rosterEntryId, arr);
	}

	return assembleRoster(rosterRow, entryRows as Parameters<typeof assembleRoster>[1], ushersByEntry);
}

/**
 * Submit usher names for a community's entry.
 * Transitions the entry from 'draft' → 'submitted'.
 * Transactional: all usher rows and status update succeed together or nothing changes.
 */
export async function submitEntry(
	db: ReturnType<typeof drizzle>,
	cmd: SubmitRosterEntryCommand
): Promise<RosterEntry> {
	return await db.transaction(async (tx) => {
		// 1. Load entry — must exist and be in 'draft'
		const entries = await tx
			.select()
			.from(roster_entry)
			.where(
				and(
					eq(roster_entry.rosterId, cmd.rosterId),
					eq(roster_entry.communityId, cmd.communityId)
				)
			)
			.limit(1);

		if (!entries[0]) {
			throw ServiceError.notFound('Roster entry not found', {
				rosterId: cmd.rosterId,
				communityId: cmd.communityId
			});
		}

		const entry = entries[0];
		if (entry.status !== 'draft') {
			throw ServiceError.validation(
				`Entry cannot be submitted — current status is '${entry.status}'. Only 'draft' entries can be submitted.`,
				{ status: entry.status }
			);
		}

		// 2. Resolve ministryRoleCode → ministryRoleId for each usher
		const resolvedRoleIds: string[] = [];
		for (const usher of cmd.ushers) {
			const roleRows = await tx
				.select({ id: ministry_role.id })
				.from(ministry_role)
				.where(and(eq(ministry_role.code, usher.ministryRoleCode), eq(ministry_role.active, 1)))
				.limit(1);

			if (!roleRows[0]) {
				throw ServiceError.notFound(`Ministry role code not found: ${usher.ministryRoleCode}`, {
					code: usher.ministryRoleCode
				});
			}
			resolvedRoleIds.push(roleRows[0].id);
		}

		const now = Math.floor(Date.now() / 1000);

		// 3. Delete existing usher rows for this entry
		await tx.delete(roster_usher).where(eq(roster_usher.rosterEntryId, entry.id));

		// 4. Insert new usher rows
		const insertedUshers: RosterUsher[] = [];
		for (let i = 0; i < cmd.ushers.length; i++) {
			const usherId = uuidv4();
			await tx.insert(roster_usher).values({
				id: usherId,
				rosterEntryId: entry.id,
				name: cmd.ushers[i].name,
				ministryRoleId: resolvedRoleIds[i],
				stationId: null,
				sequence: i + 1,
				createdAt: now
			});
			insertedUshers.push({
				id: usherId,
				name: cmd.ushers[i].name,
				ministryRoleId: resolvedRoleIds[i],
				stationId: null,
				sequence: i + 1
			});
		}

		// 5. Update entry status to 'submitted'
		const updatedEntries = await tx
			.update(roster_entry)
			.set({ status: 'submitted', submittedAt: now })
			.where(eq(roster_entry.id, entry.id))
			.returning();

		// 6. Increment roster version (optimistic lock — detect concurrent modifications)
		const rosterUpdate = await tx
			.update(roster)
			.set({
				version: sql`${roster.version} + 1`,
				updatedAt: now
			})
			.where(eq(roster.id, cmd.rosterId))
			.returning();

		if (!rosterUpdate[0]) {
			throw ServiceError.conflict('Roster not found or version conflict during submitEntry', {
				rosterId: cmd.rosterId
			});
		}

		const updated = updatedEntries[0];
		return mapEntry(
			{
				id: updated.id,
				rosterId: updated.rosterId,
				communityId: updated.communityId,
				communityName: updated.communityName,
				wilayahId: updated.wilayahId,
				wilayahName: updated.wilayahName,
				status: updated.status as 'draft' | 'submitted' | 'confirmed',
				submittedAt: updated.submittedAt ?? null,
				confirmedAt: updated.confirmedAt ?? null
			},
			insertedUshers
		);
	});
}

/**
 * Confirm a submitted entry (PETA confirms the community's usher list).
 * Transitions the entry from 'submitted' → 'confirmed'.
 */
export async function confirmEntry(
	db: ReturnType<typeof drizzle>,
	cmd: ConfirmRosterEntryCommand
): Promise<RosterEntry> {
	return await db.transaction(async (tx) => {
		// 1. Load entry — must be 'submitted'
		const entries = await tx
			.select()
			.from(roster_entry)
			.where(
				and(
					eq(roster_entry.rosterId, cmd.rosterId),
					eq(roster_entry.communityId, cmd.communityId)
				)
			)
			.limit(1);

		if (!entries[0]) {
			throw ServiceError.notFound('Roster entry not found', {
				rosterId: cmd.rosterId,
				communityId: cmd.communityId
			});
		}

		const entry = entries[0];
		if (entry.status !== 'submitted') {
			throw ServiceError.validation(
				`Entry cannot be confirmed — current status is '${entry.status}'. Only 'submitted' entries can be confirmed.`,
				{ status: entry.status }
			);
		}

		const now = Math.floor(Date.now() / 1000);

		// 2. Update entry status to 'confirmed'
		const updatedEntries = await tx
			.update(roster_entry)
			.set({ status: 'confirmed', confirmedAt: now })
			.where(eq(roster_entry.id, entry.id))
			.returning();

		// 3. Increment roster version
		const rosterUpdate = await tx
			.update(roster)
			.set({
				version: sql`${roster.version} + 1`,
				updatedAt: now
			})
			.where(eq(roster.id, cmd.rosterId))
			.returning();

		if (!rosterUpdate[0]) {
			throw ServiceError.conflict('Roster not found or version conflict during confirmEntry', {
				rosterId: cmd.rosterId
			});
		}

		// 3. Load ushers for the entry
		const usherRows = await tx
			.select()
			.from(roster_usher)
			.where(eq(roster_usher.rosterEntryId, entry.id))
			.orderBy(roster_usher.sequence);

		const updated = updatedEntries[0];
		return mapEntry(
			{
				id: updated.id,
				rosterId: updated.rosterId,
				communityId: updated.communityId,
				communityName: updated.communityName,
				wilayahId: updated.wilayahId,
				wilayahName: updated.wilayahName,
				status: updated.status as 'draft' | 'submitted' | 'confirmed',
				submittedAt: updated.submittedAt ?? null,
				confirmedAt: updated.confirmedAt ?? null
			},
			usherRows.map(mapUsher)
		);
	});
}

/**
 * Reopen a submitted or confirmed entry back to 'draft'.
 * Clears submittedAt / confirmedAt and removes existing usher rows.
 */
export async function reopenEntry(
	db: ReturnType<typeof drizzle>,
	rosterId: string,
	communityId: string
): Promise<RosterEntry> {
	return await db.transaction(async (tx) => {
		const entries = await tx
			.select()
			.from(roster_entry)
			.where(
				and(eq(roster_entry.rosterId, rosterId), eq(roster_entry.communityId, communityId))
			)
			.limit(1);

		if (!entries[0]) {
			throw ServiceError.notFound('Roster entry not found', { rosterId, communityId });
		}

		const entry = entries[0];
		if (entry.status === 'draft') {
			throw ServiceError.validation('Entry is already in draft status', { status: entry.status });
		}

		const now = Math.floor(Date.now() / 1000);

		// Delete ushers
		await tx.delete(roster_usher).where(eq(roster_usher.rosterEntryId, entry.id));

		// Reset entry to draft
		const updatedEntries = await tx
			.update(roster_entry)
			.set({ status: 'draft', submittedAt: null, confirmedAt: null })
			.where(eq(roster_entry.id, entry.id))
			.returning();

		// Increment roster version
		await tx
			.update(roster)
			.set({
				version: sql`${roster.version} + 1`,
				updatedAt: now
			})
			.where(eq(roster.id, rosterId));

		const updated = updatedEntries[0];
		return mapEntry(
			{
				id: updated.id,
				rosterId: updated.rosterId,
				communityId: updated.communityId,
				communityName: updated.communityName,
				wilayahId: updated.wilayahId,
				wilayahName: updated.wilayahName,
				status: updated.status as 'draft' | 'submitted' | 'confirmed',
				submittedAt: updated.submittedAt ?? null,
				confirmedAt: updated.confirmedAt ?? null
			},
			[]
		);
	});
}

/**
 * List all rosters (with entries) where a given community has an assignment.
 */
export async function listByCommunity(
	db: ReturnType<typeof drizzle>,
	communityId: string
): Promise<Roster[]> {
	// Find all roster IDs that include this community
	const entryRows = await db
		.select({ rosterId: roster_entry.rosterId })
		.from(roster_entry)
		.where(eq(roster_entry.communityId, communityId));

	if (entryRows.length === 0) return [];

	const rosterIds = [...new Set(entryRows.map((e) => e.rosterId))];
	const rosters: Roster[] = [];

	for (const rosterId of rosterIds) {
		const r = await findRosterById(db, rosterId);
		if (r) rosters.push(r);
	}

	return rosters;
}
