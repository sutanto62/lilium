// ─── Roster aggregate: Aggregate Root + State Machine ─────────────────────────

export type RosterStatus = 'draft' | 'submitted' | 'confirmed';

/** Value: one parishioner in a RosterEntry */
export interface RosterUsher {
	readonly id: string;
	readonly name: string; // name string; future: Parishioner FK
	readonly ministryRoleId: string; // FK to MinistryRole — REGULAR, KOLEKTE, PPG, PPKG
	readonly stationId: string | null; // FK to Station (position assignment)
	readonly sequence: number | null;
}

/** Child entity: one Community's assignment to one Celebration */
export interface RosterEntry {
	readonly id: string;
	readonly rosterId: string;
	readonly communityId: string;
	/** Snapshot at assignment time — survives future community renames */
	readonly communityName: string;
	readonly wilayahId: string;
	readonly wilayahName: string;
	readonly status: RosterStatus;
	readonly submittedAt: number | null;
	readonly confirmedAt: number | null;
	readonly confirmedByUserId: string | null; // FK to user — who confirmed this entry
	readonly ushers: ReadonlyArray<RosterUsher>;
}

/** Aggregate Root */
export interface Roster {
	readonly id: string;
	readonly eventId: string; // FK to event (the Celebration)
	readonly createdByUserId: string; // PETA member who authored this roster
	readonly version: number; // optimistic lock — increment on each PETA edit
	readonly status: RosterStatus; // overall status = min(entry statuses)
	readonly createdAt: number;
	readonly updatedAt: number;
	readonly entries: ReadonlyArray<RosterEntry>;
}

// ─── Commands accepted by RosterService ───────────────────────────────────────

export interface CreateRosterCommand {
	eventId: string;
	createdByUserId: string;
	communityIds: string[]; // PETA picks which communities serve this Celebration
}

export interface SubmitRosterEntryCommand {
	rosterId: string;
	communityId: string;
	ushers: Array<{ name: string; ministryRoleCode: string }>;
}

export interface ConfirmRosterEntryCommand {
	rosterId: string;
	communityId: string;
	confirmedByUserId: string;
}
