import type { Community, CommunityWithAncestry, Parish, ParishHierarchy, Wilayah } from '$core/entities/Parish';

export type CreateCommunityInput = {
	name: string;
	wilayahId: string;
	parishId: string;
	sequence: number | null;
	active: number;
};

export type CreateWilayahInput = {
	name: string;
	code: string | null;
	sequence: number | null;
	parishId: string;
	active: number;
};

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

	/** Resolve the parishId for a given churchId. Throws ServiceError.notFound if church has no parish. */
	getParishIdByChurch(churchId: string): Promise<string>;

	/** Create a new community. Returns the persisted Community with wilayahName populated. */
	createCommunity(input: CreateCommunityInput): Promise<Community>;

	/** Update mutable fields on an existing community. Returns false if id not found. */
	updateCommunity(
		id: string,
		patch: Partial<Pick<Community, 'name' | 'wilayahId' | 'sequence'>>
	): Promise<boolean>;

	/** Soft-delete a community (sets active = 0). Returns false if id not found. */
	deactivateCommunity(id: string): Promise<boolean>;

	/** Find the single parish by id. Returns null if not found. */
	findParishById(id: string): Promise<Parish | null>;

	/** Update mutable fields on the parish record. Returns false if id not found. */
	updateParish(id: string, patch: Partial<Pick<Parish, 'name' | 'code'>>): Promise<boolean>;

	/** Create a new wilayah. Returns the persisted Wilayah. */
	createWilayah(input: CreateWilayahInput): Promise<Wilayah>;

	/** Update mutable fields on an existing wilayah. Returns false if id not found. */
	updateWilayah(
		id: string,
		patch: Partial<Pick<Wilayah, 'name' | 'code' | 'sequence'>>
	): Promise<boolean>;

	/** Soft-delete a wilayah (sets active = 0). Returns false if id not found. */
	deactivateWilayah(id: string): Promise<boolean>;
}
