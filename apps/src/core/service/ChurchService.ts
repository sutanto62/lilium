import type {
	ChurchZone,
	Mass,
	Wilayah,
	Lingkungan,
	ChurchPosition,
	Church
} from '$core/entities/Schedule';
import type { Event } from '$core/entities/Event';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { debug } from 'console';

/**
 * ChurchService is a class responsible for managing church-related data,
 * including zones, masses, and events. It interacts with a repository to
 * fetch and store this data based on a specific church ID.
 */
export class ChurchService {
	churchId: string; // Unique identifier for the church
	churches: Church[]; // Array to hold church schedules
	zones: ChurchZone[]; // Array to hold church zones
	masses: Mass[]; // Array to hold mass schedules
	events: Event[]; // Array to hold church events
	wilayahs: Wilayah[]; // Array to hold wilayahs
	lingkungans: Lingkungan[]; // Array to hold lingkungans

	constructor(churchId: string) {
		this.churchId = churchId;
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
		await Promise.all([this.fetchZones(), this.fetchMasses(), this.getLingkungans()]);
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
		logger.debug('Fetching masses');
		this.masses = await repo.getMasses(this.churchId);
	}
	/**
	 * Retrieves the list of masses for the church, initializing if necessary.
	 * @returns A promise that resolves to an array of Mass objects.
	 */
	async getMasses(): Promise<Mass[]> {
		await this.initialize();
		return this.masses;
	}

	/**
	 * Retrieves the list of zones for the church, initializing if necessary.
	 * @returns A promise that resolves to an array of ChurchZone objects.
	 */
	async getZones(): Promise<ChurchZone[]> {
		await this.initialize();
		return this.zones;
	}

	/**
	 * Retrieves the list of zones for a specific mass, initializing if necessary.
	 * @param massId The ID of the mass to filter zones by
	 * @returns A promise that resolves to an array of ChurchZone objects for the given mass
	 */
	async getZonesByEvent(eventId: string): Promise<ChurchZone[]> {
		const zones = await repo.getZonesByEvent(this.churchId, eventId);
		return zones;
	}

	/**
	 * Retrieves the list of events for the church from the repository.
	 * @returns A promise that resolves to an array of Event objects.
	 */
	async getEvents(): Promise<Event[]> {
		this.events = await repo.getEvents(this.churchId);
		return this.events;
	}

	/**
	 * Retrieves the list of wilayahs (regions) for the church from the repository.
	 * @returns A promise that resolves to an array of Wilayah objects.
	 */
	async getWilayahs(): Promise<Wilayah[]> {
		this.wilayahs = await repo.getWilayahs(this.churchId);
		return this.wilayahs;
	}

	/**
	 * Retrieves the list of lingkungans (sub-regions) for the church from the repository.
	 * @returns A promise that resolves to an array of Lingkungan objects.
	 */
	async getLingkungans(): Promise<Lingkungan[]> {
		this.lingkungans = await repo.getLingkungans(this.churchId);
		return this.lingkungans;
	}

	async getPositionsByMass(massId: string): Promise<ChurchPosition[]> {
		return await repo.getPositionsByMass(this.churchId, massId);
	}
}
