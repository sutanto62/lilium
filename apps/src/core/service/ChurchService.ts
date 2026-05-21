import type { ChurchEvent } from '$core/entities/Event';
import type {
	Church,
	ChurchPosition,
	ChurchZone,
	ChurchZoneGroup,
	Lingkungan,
	Mass,
	MassZone,
	Wilayah
} from '$core/entities/Schedule';
import type { ChurchFacility, ParishHierarchy } from '$core/entities/Parish';
import type { ParishRepository } from '$core/repositories/ParishRepository';
import type { FacilityRepository } from '$core/repositories/FacilityRepository';
import { repo } from '$src/lib/server/db';

/**
 * ChurchService is a class responsible for managing church-related data,
 * including zones, masses, and events. It interacts with a repository to
 * fetch and store this data based on a specific church ID.
 */
export class ChurchService {
	churchId: string; // Unique identifier for the church
	church: Church;
	churches: Church[]; // Array to hold church schedules
	zones: ChurchZone[]; // Array to hold church zones
	masses: Mass[]; // Array to hold mass schedules
	events: ChurchEvent[]; // Array to hold church events
	wilayahs: Wilayah[]; // Array to hold wilayahs
	lingkungans: Lingkungan[]; // Array to hold lingkungans

	constructor(
		churchId: string,
		private readonly parishRepo?: ParishRepository,
		private readonly facilityRepo?: FacilityRepository
	) {
		this.churchId = churchId;
		this.church = {
			id: '',
			name: '',
			code: '',
			parish: '',
			requirePpg: 0,
			active: 1
		};
		this.churches = []; // Initialize churches array
		this.zones = []; // Initialize zones array
		this.masses = []; // Initialize masses array
		this.events = []; // Initialize events array
		this.wilayahs = []; // Initialize wilayahs array
		this.lingkungans = []; // Initialize lingkungans array
	}

	/**
	 * Initializes the ChurchService by fetching zones and masses concurrently.
	 */
	async initialize(): Promise<void> {
		await Promise.all([this.fetchZones(), this.fetchMasses(), this.retrieveLingkungans()]);
	}

	async retrieveChurch(): Promise<Church> {
		this.church = await repo.findChurchById(this.churchId);
		return this.church;
	}

	/**
	 * Fetches the zones for the church from the repository and stores them.
	 */
	private async fetchZones(): Promise<void> {
		this.zones = await repo.getZones(this.churchId);
	}

	/**
	 * Fetches the masses for the church from the repository and stores them.
	 */
	private async fetchMasses(): Promise<void> {
		this.masses = await repo.getMasses(this.churchId);
	}

	/**
	 * Retrieves the list of masses for the church, initializing if necessary.
	 * @returns A promise that resolves to an array of Mass objects.
	 */
	async retrieveMasses(): Promise<Mass[]> {
		await this.initialize();
		return this.masses;
	}

	async retrieveAllMasses(): Promise<Mass[]> {
		return await repo.getAllMasses(this.churchId);
	}

	/**
	 * Retrieves the list of zones for the church, initializing if necessary.
	 * @returns A promise that resolves to an array of ChurchZone objects.
	 */
	async retrieveZones(): Promise<ChurchZone[]> {
		await this.initialize();
		return this.zones;
	}

	/**
	 * Retrieves the list of zones for a specific mass, initializing if necessary.
	 * @param massId The ID of the mass to filter zones by
	 * @returns A promise that resolves to an array of ChurchZone objects for the given mass
	 */
	async retrieveZonesByEvent(eventId: string): Promise<ChurchZone[]> {
		const zones = await repo.getZonesByEvent(this.churchId, eventId);
		return zones;
	}

	async retrieveZoneGroupsByEvent(eventId: string): Promise<ChurchZoneGroup[]> {
		const zoneGroups = await repo.findZoneGroupsByEvent(this.churchId, eventId);
		return zoneGroups;
	}

	/**
	 * @deprecated This method should be moved to EventService. Use EventService.retrieveEventsByWeekRange() instead.
	 * Retrieves the list of events for the church from the repository.
	 * @returns A promise that resolves to an array of Event objects.
	 */
	async retrieveEvents(limit?: number): Promise<ChurchEvent[]> {
		this.events = await repo.listEvents(this.churchId, limit);
		return this.events;
	}

	/**
	 * Retrieves the list of wilayahs (regions) for the church from the repository.
	 * @returns A promise that resolves to an array of Wilayah objects.
	 */
	async retrieveWilayahs(): Promise<Wilayah[]> {
		this.wilayahs = await repo.listWilayahByChurch(this.churchId);
		return this.wilayahs;
	}

	/**
	 * Retrieves the list of lingkungans (sub-regions) for the church from the repository.
	 * @returns A promise that resolves to an array of Lingkungan objects.
	 */
	async retrieveLingkungans(): Promise<Lingkungan[]> {
		this.lingkungans = await repo.listLingkunganByChurch(this.churchId);
		return this.lingkungans;
	}

	async retrieveLingkunganById(lingkunganId: string): Promise<Lingkungan> {
		return await repo.findLingkunganById(lingkunganId);
	}

	async retrievePositionsByMass(massId: string): Promise<ChurchPosition[]> {
		return await repo.listPositionByMass(this.churchId, massId);
	}

	/**
	 * Deactivates a mass schedule (soft delete)
	 * Sets active = 0 to preserve historical data
	 */
	async deactivateMass(massId: string): Promise<boolean> {
		return await repo.deactivateMass(massId);
	}

	async createMass(input: Omit<Mass, 'id'>): Promise<Mass> {
		return await repo.createMass(input);
	}

	async updateMass(massId: string, patch: Partial<Omit<Mass, 'id' | 'church'>>): Promise<Mass> {
		return await repo.updateMass(massId, patch);
	}

	async createZone(input: Omit<ChurchZone, 'id'>): Promise<ChurchZone> {
		return await repo.createZone(input);
	}

	async updateZone(zoneId: string, patch: Partial<Omit<ChurchZone, 'id' | 'church'>>): Promise<ChurchZone> {
		return await repo.updateZone(zoneId, patch);
	}

	async deactivateZone(zoneId: string): Promise<boolean> {
		return await repo.deactivateZone(zoneId);
	}

	async retrieveAllZoneGroups(): Promise<ChurchZoneGroup[]> {
		return await repo.listAllZoneGroups(this.churchId);
	}

	async retrieveZoneGroups(): Promise<ChurchZoneGroup[]> {
		return await repo.listZoneGroups(this.churchId);
	}

	async createZoneGroup(input: Omit<ChurchZoneGroup, 'id'>): Promise<ChurchZoneGroup> {
		return await repo.createZoneGroup(input);
	}

	async updateZoneGroup(id: string, patch: Partial<Omit<ChurchZoneGroup, 'id' | 'church'>>): Promise<ChurchZoneGroup> {
		return await repo.updateZoneGroup(id, patch);
	}

	async deactivateZoneGroup(id: string): Promise<boolean> {
		return await repo.deactivateZoneGroup(id);
	}

	async retrieveMassZones(): Promise<MassZone[]> {
		return await repo.getMassZones(this.churchId);
	}

	async createMassZone(massId: string, zoneId: string): Promise<MassZone> {
		return await repo.createMassZone(massId, zoneId);
	}

	async deactivateMassZone(massZoneId: string): Promise<boolean> {
		return await repo.deactivateMassZone(massZoneId);
	}

// ─── New domain methods (Phase 5) ────────────────────────────────────────────

	async retrieveParishHierarchy(parishId: string): Promise<ParishHierarchy> {
		if (!this.parishRepo) {
			throw new Error('ParishRepository not provided to ChurchService');
		}
		return this.parishRepo.findParishHierarchy(parishId);
	}

	async retrieveChurchFacility(): Promise<ChurchFacility> {
		if (!this.facilityRepo) {
			throw new Error('FacilityRepository not provided to ChurchService');
		}
		return this.facilityRepo.findChurchFacility(this.churchId);
	}
}
}
