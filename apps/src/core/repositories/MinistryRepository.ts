import type { Ministry, MinistryRole } from '$core/entities/Ministry';

/**
 * Port: ministry catalog (Type Object pattern — Ministry → MinistryRole).
 * Implementations live in lib/server/adapters/SQLiteDbMinistry.ts.
 * No Drizzle imports — core layer stays infrastructure-free.
 */
export interface MinistryRepository {
	/** List all active ministries, ordered by name. */
	listMinistries(): Promise<Ministry[]>;

	/** List all active roles for a ministry, ordered by name. */
	listRolesByMinistry(ministryId: string): Promise<MinistryRole[]>;

	/**
	 * Find a specific role by its ministry code + role code.
	 * Used by RosterService to resolve submitted ministryRoleCode strings
	 * into full MinistryRole entities before persisting.
	 * Returns null when the code pair does not exist.
	 */
	findRoleByCode(ministryCode: string, roleCode: string): Promise<MinistryRole | null>;

	/** Find a single ministry by its unique code (e.g. "USHER"). */
	findMinistryByCode(code: string): Promise<Ministry | null>;
}
