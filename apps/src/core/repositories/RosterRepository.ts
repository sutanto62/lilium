import type {
	ConfirmRosterEntryCommand,
	CreateRosterCommand,
	Roster,
	RosterEntry,
	SubmitRosterEntryCommand
} from '$core/entities/Roster';

/**
 * Port: roster lifecycle (Aggregate Root pattern).
 * Implementations live in lib/server/adapters/SQLiteDbRoster.ts.
 * No Drizzle imports — core layer stays infrastructure-free.
 *
 * Concurrency contract:
 *   - submitEntry and confirmEntry are transactional (all-or-nothing).
 *   - All write operations that modify the Roster aggregate must increment
 *     roster.version (optimistic lock). Callers catch ServiceError.conflict
 *     on version mismatch and surface a retry prompt to the user.
 */
export interface RosterRepository {
	/**
	 * Create a new Roster for an event with one RosterEntry stub per community.
	 * Each entry starts with status 'draft'.
	 */
	createRoster(cmd: CreateRosterCommand): Promise<Roster>;

	/**
	 * Load the full Roster aggregate for an event, including all entries and
	 * their ushers. Returns null when no roster exists for the event yet.
	 */
	loadRoster(eventId: string): Promise<Roster | null>;

	/**
	 * Load a Roster by its own id (used for version-checked updates).
	 * Returns null when the id does not exist.
	 */
	findRosterById(rosterId: string): Promise<Roster | null>;

	/**
	 * Submit usher names for a community's entry.
	 * Transitions the entry from 'draft' → 'submitted'.
	 * Must be transactional: either all usher rows and the status update
	 * succeed together, or nothing changes.
	 */
	submitEntry(cmd: SubmitRosterEntryCommand): Promise<RosterEntry>;

	/**
	 * Confirm a submitted entry (PETA confirms the community's usher list).
	 * Transitions the entry from 'submitted' → 'confirmed'.
	 */
	confirmEntry(cmd: ConfirmRosterEntryCommand): Promise<RosterEntry>;

	/**
	 * Reopen a submitted or confirmed entry back to 'draft'.
	 * Used when PETA needs to request a revision from a community.
	 * Clears submittedAt / confirmedAt and removes existing usher rows.
	 */
	reopenEntry(rosterId: string, communityId: string): Promise<RosterEntry>;

	/**
	 * List all rosters (with entries) where a given community has an assignment.
	 * Used by the community view page to show upcoming service schedules.
	 */
	listByCommunity(communityId: string): Promise<Roster[]>;
}
