import type { ChurchFacility } from '$core/entities/Parish';
import type { Section, Station, Zone } from '$core/entities/Facility';

/**
 * Port: physical hierarchy (Church → Section → Zone → Station).
 * Implementations live in lib/server/adapters/SQLiteDbFacility.ts.
 * No Drizzle imports — core layer stays infrastructure-free.
 */
export interface FacilityRepository {
	/**
	 * Load the full physical hierarchy below one church.
	 * Returns pre-built Maps (zonesBySection, stationsByZone) to avoid N+1
	 * queries on schedule and zone-assignment pages.
	 */
	findChurchFacility(churchId: string): Promise<ChurchFacility>;

	/** List all active sections for a church, ordered by sequence. */
	listSectionsByChurch(churchId: string): Promise<Section[]>;

	/** List all active zones for a church, optionally filtered by section. */
	listZonesByChurch(churchId: string, sectionId?: string): Promise<Zone[]>;

	/** List all zones that are assigned to a specific event (via mass_zone join). */
	listZonesByEvent(eventId: string): Promise<Zone[]>;

	/** List all active stations within a zone, ordered by sequence. */
	listStationsByZone(zoneId: string): Promise<Station[]>;
}
