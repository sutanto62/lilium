// ─── Physical hierarchy: Church → Section → Zone → Station ────────────────────

export interface Church {
	readonly id: string;
	readonly name: string;
	readonly code: string;
	readonly parishId: string; // FK to Parish
	readonly requiresSpecialCollection: number; // drives PPG/PPKG collection logic
	readonly active: number;
}

/**
 * A named part of the church building.
 * Was: ChurchZoneGroup. Examples: "Main Nave", "Basement", "Overflow Tent".
 * Sections group Zones for display and capacity planning.
 */
export interface Section {
	readonly id: string;
	readonly name: string;
	readonly code: string | null;
	readonly description: string | null;
	readonly sequence: number | null;
	readonly churchId: string; // FK to Church
	readonly active: number;
}

/**
 * A service area within a Section, assignable to a ministry team.
 * Was: ChurchZone. Examples: "Left Aisle", "Main Entrance", "Altar Area".
 */
export interface Zone {
	readonly id: string;
	readonly name: string;
	readonly code: string | null;
	readonly description: string | null;
	readonly sequence: number | null;
	readonly churchId: string; // FK to Church
	readonly sectionId: string | null; // FK to Section (optional grouping)
	readonly active: number;
}

/**
 * A specific assignment point within a Zone.
 * Was: ChurchPosition. Examples: "Door 1", "Side Aisle 3", "Altar Left".
 * Canonical English usher term: Station. Indonesian: Pos.
 */
export interface Station {
	readonly id: string;
	readonly name: string;
	readonly code: string | null;
	readonly description: string | null;
	readonly sequence: number | null;
	readonly churchId: string; // FK to Church
	readonly zoneId: string; // FK to Zone
	readonly ministryId: string; // FK to Ministry (which ministry serves here)
	readonly defaultRoleId: string | null; // FK to MinistryRole (null = any role valid)
	readonly active: number;
}
