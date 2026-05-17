import type { Community, CommunityWithAncestry, ParishHierarchy, Wilayah } from '$core/entities/Parish';

/**
 * Port: territorial hierarchy (Parish → Wilayah → Community).
 * Implementations live in lib/server/adapters/SQLiteDbRegion.ts.
 * No Drizzle imports — core layer stays infrastructure-free.
 */
export interface ParishRepository {
	/**
	 * Load the full territorial + physical hierarchy for a parish.
	 * Returns pre-built Maps (communitiesByWilayah, churches) to avoid N+1
	 * queries on roster and schedule pages.
	 */
	findParishHierarchy(parishId: string): Promise<ParishHierarchy>;

	/** List all active communities for a parish, ordered by wilayah then sequence. */
	listCommunities(parishId: string): Promise<Community[]>;

	/** Find a single community with its full ancestry (wilayah + parish snapshots). */
	findCommunityById(id: string): Promise<CommunityWithAncestry | null>;

	/** List all active wilayahs for a parish, ordered by sequence. */
	listWilayahsByParish(parishId: string): Promise<Wilayah[]>;

	/** List all active communities belonging to a wilayah, ordered by sequence. */
	listCommunitiesByWilayah(wilayahId: string): Promise<Community[]>;

	/**
	 * List all active communities that belong to the same parish as the given church.
	 * Useful when only churchId is available (e.g. from session) and parishId is unknown.
	 */
	listCommunitiesForChurch(churchId: string): Promise<Community[]>;
}
