// ─── Ministry catalog: Type Object pattern ────────────────────────────────────

/**
 * Type Object: the catalog entry for a ministry category.
 * New ministry types are inserted as rows, not as enum values.
 * Seed rows: USHER, PRODIAKON, PETA, EMHC, ALTAR_SERVER
 */
export interface Ministry {
	readonly id: string;
	readonly name: string; // "Penerima Tamu", "Prodiakon", "PETA"
	readonly code: string; // "USHER", "PRODIAKON", "PETA", "EMHC"
	readonly description: string | null;
	readonly requiresStation: boolean; // false for PETA (roster author, not station-bound)
	readonly active: number;
}

/**
 * Sub-catalog: a role within a ministry.
 * Replaces boolean isPpg / isKolekte flags.
 * Seed rows: REGULAR, KOLEKTE, PPG, PPKG, PROCESSIONAL (all under USHER)
 */
export interface MinistryRole {
	readonly id: string;
	readonly ministryId: string; // FK to Ministry
	readonly name: string; // "Regular", "Kolekte", "PPG", "PPKG"
	readonly code: string; // "REGULAR", "KOLEKTE", "PPG", "PPKG"
	readonly isSpecialCollection: boolean; // true for Kolekte, PPG, PPKG
	readonly active: number;
}
