// ─── Territorial hierarchy: Parish → Wilayah → Community ──────────────────────

/** Administrative root. One Parish owns one or more Wilayahs and one or more Churches. */
export interface Parish {
	readonly id: string;
	readonly name: string;
	readonly code: string;
	readonly active: boolean;
}

export interface Wilayah {
	readonly id: string;
	readonly name: string;
	readonly code: string | null;
	readonly sequence: number | null;
	readonly parishId: string; // FK to Parish
	readonly active: boolean;
}

export interface Community {
	readonly id: string;
	readonly name: string;
	readonly wilayahId: string; // FK to Wilayah
	readonly wilayahName: string; // denormalized via JOIN — avoids repeated lookups
	readonly sequence: number | null;
	readonly parishId: string; // FK to Parish (for direct parish-scoped queries)
	readonly active: boolean;
}

/** Full ancestry of a Community — used in RosterEntry snapshots */
export interface CommunityWithAncestry {
	readonly community: Community;
	readonly wilayah: Wilayah;
	readonly parish: Parish;
}

// ─── Shared value objects ──────────────────────────────────────────────────────

/** Scoping context passed to services instead of bare string IDs */
export interface ChurchContext {
	readonly parishId: string;
	readonly churchId: string;
	readonly churchCode: string;
}

/**
 * The full territorial + physical hierarchy for a Parish, pre-loaded and indexed.
 * Built once per request; avoids N+1 queries in roster and schedule pages.
 */
export interface ParishHierarchy {
	readonly parish: Parish;
	// --- Territorial branch ---
	readonly wilayahs: ReadonlyArray<Wilayah>;
	readonly communitiesByWilayah: ReadonlyMap<string, ReadonlyArray<Community>>;
	// --- Physical branch ---
	readonly churches: ReadonlyArray<import('./Facility.js').Church>;
}

/**
 * The physical hierarchy below one Church, pre-loaded and indexed.
 * Used by schedule and position-distribution services.
 */
export interface ChurchFacility {
	readonly church: import('./Facility.js').Church;
	readonly sections: ReadonlyArray<import('./Facility.js').Section>;
	readonly zonesBySection: ReadonlyMap<string, ReadonlyArray<import('./Facility.js').Zone>>;
	readonly stationsByZone: ReadonlyMap<string, ReadonlyArray<import('./Facility.js').Station>>;
}
