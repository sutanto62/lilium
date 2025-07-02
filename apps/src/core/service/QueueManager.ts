import type { Event as ChurchEvent, EventUsher } from '$core/entities/Event';
import type { ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import { statsigService } from '$lib/application/StatsigService';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { EventService } from './EventService';

export interface ConfirmationQueue {
	event: ChurchEvent;
	lingkungan: Lingkungan;
}

// Extended EventUsher type for assigned ushers with additional properties
export interface AssignedEventUsher extends EventUsher {
	zone?: string;
	positionName?: string;
}

/**
 * The QueueManager is a Singleton class that manages the assignment of ushers to positions 
 * for church events. 
 *
 * It follows a queue-based system where events are submitted for processing, 
 * and ushers are assigned positions using a round-robin algorithm.
 */
export class QueueManager {
	private static instance: QueueManager;
	/** Array of existing ushers */
	public eventUshers: EventUsher[] = [];
	/** Array of available positions */
	public massZonePositions: ChurchPosition[] = [];
	/** Array of positions for the event */
	public eventPositions: ChurchPosition[] = [];
	/** Array of positions for the event */
	/** Queue of confirmation requests */
	public confirmationQueue: ConfirmationQueue[] = []; // TODO: make sure to include past unprocessed queue events
	/** Array of assigned ushers */
	public assignedUshers: AssignedEventUsher[] = [];
	/** PPG feature flag state */
	public isPpgEnabled: boolean = false;

	private nextIndexNonPpg: number = 0;
	private nextIndexPpg: number = 0;
	private eventService: EventService;

	private constructor() {
		// Initialize statsig and check feature flags
		statsigService.use().then(async () => {
			this.isPpgEnabled = await statsigService.checkGate('ppg');
		});
		const churchId = import.meta.env.VITE_CHURCH_ID;
		this.eventService = new EventService(churchId);
	}

	/**
	 * Gets the singleton instance of QueueManager
	 * @returns {QueueManager} The singleton instance
	 */
	public static getInstance(): QueueManager {
		if (!QueueManager.instance) {
			QueueManager.instance = new QueueManager();
		}
		return QueueManager.instance;
	}

	/**
	 * Submits a new confirmation queue
	 * 
	 * @param {ChurchEvent} event - The church event
	 * @param {Lingkungan} lingkungan - The lingkungan (community) submitting the queue
	 * @returns {Promise<void>}
	 */
	async submitConfirmationQueue(event: ChurchEvent, lingkungan: Lingkungan): Promise<void> {
		this.confirmationQueue.push({ event, lingkungan });
	}

	/**
	 * Processes the confirmation queue by assigning positions to unassigned ushers
	 * 
	 * For each queued event:
	 * 1. Gets all ushers and available positions for the event
	 * 2. Separates assigned and unassigned ushers
	 * 3. Assigns positions to unassigned ushers using role-based round-robin algorithm
	 * 4. Updates the ushers in the database with their new positions
	 * 5. Removes the processed queue item
	 * 
	 * @throws {Error} If no positions are found for the mass
	 * @returns {Promise<void>}
	 */
	async processQueue(): Promise<void> {

		this.assignedUshers = [];

		for (const batch of this.confirmationQueue) {

			// 1. Get mass zone positions by event. 
			this.massZonePositions = await repo.getPositionsByMass(batch.event.church, batch.event.mass);

			// Filter positions based on PPG feature flag
			this.eventPositions = this.isPpgEnabled
				? this.massZonePositions
				: this.massZonePositions.filter(pos => !pos.isPpg);

			if (this.massZonePositions.length === 0) {
				throw new Error(`Gagal menemukan titik tugas untuk ${batch.event.mass}`, { cause: 404 })
			}

			// 2. Get event ushers for the event (including past unprocessed events)
			this.eventUshers = await repo.getEventUshers(batch.event.id);


			// 3. Calculate next position indices for different role types
			const nonPpgPositions = this.massZonePositions.filter(pos => !pos.isPpg);
			const eupLatestNonPpgPositionId = this.findLatestUniquePositionId(this.eventUshers.filter(usher => !usher.isPpg).map(usher => usher.position || ''));
			this.nextIndexNonPpg = this.nextPositionIndex(eupLatestNonPpgPositionId || '', nonPpgPositions.map(position => position.id));

			const ppgPositions = this.massZonePositions.filter(pos => pos.isPpg);
			const eupLatestPpgPositionId = this.findLatestUniquePositionId(this.eventUshers.filter(usher => usher.isPpg).map(usher => usher.position || ''));
			this.nextIndexPpg = this.nextPositionIndex(eupLatestPpgPositionId || '', ppgPositions.map(position => position.id)); // should be 1 if latest position id is Z1.P4PPG

			// 4. Distribute position to ushers based on roles
			const assignedUshers = this.eventUshers.filter((usher) => usher.position !== null);
			const unassignedUshers = this.eventUshers.filter((usher) => usher.position === null);
			const newAssignedUshers = await this.distributePositionsByRole(
				unassignedUshers,
				batch.event.id,
				ppgPositions,
				nonPpgPositions
			);

			// Convert AssignedEventUsher back to EventUsher for database update
			const updatedEventUshers: EventUsher[] = [
				...assignedUshers,
				...newAssignedUshers.map(usher => ({
					id: usher.id,
					event: usher.event,
					name: usher.name,
					wilayah: usher.wilayah,
					lingkungan: usher.lingkungan,
					isPpg: usher.isPpg,
					isKolekte: usher.isKolekte,
					position: usher.position,
					createdAt: usher.createdAt
				}))
			];

			this.eventUshers = updatedEventUshers;
			if (this.eventUshers.length > 0) {
				const result = await repo.editEventUshers(this.eventUshers);
			}

			// Remove the processed queue item
			this.confirmationQueue.shift();
			this.assignedUshers = [...this.assignedUshers, ...newAssignedUshers];

			// Sort assigned ushers by name for consistent display order
			this.assignedUshers.sort((a, b) => a.name.localeCompare(b.name));
		}
	}

	/**
	 * Assigns positions to unassigned ushers using role-based round robin algorithm
	 * 
	 * When isPpgEnabled is true:
	 * - Ushers with isPpg = true → Assign to the next available PPG position
	 * - Ushers with isKolekte = true → Assign to the next available non-PPG position
	 * 
	 * When isPpgEnabled is false:
	 * - All ushers → Assign only to non-PPG positions
	 * 
	 * @param {EventUsher[]} unassignedUshers - Array of unassigned ushers
	 * @param {string} eventId - The event ID
	 * @param {ChurchPosition[]} ppgPositions - Array of PPG positions
	 * @param {ChurchPosition[]} nonPpgPositions - Array of non-PPG positions
	 * @private
	 */
	private async distributePositionsByRole(
		unassignedUshers: EventUsher[],
		eventId: string,
		ppgPositions: ChurchPosition[],
		nonPpgPositions: ChurchPosition[]
	): Promise<AssignedEventUsher[]> {
		const assignedUshers: AssignedEventUsher[] = [];

		// Separate ushers by role
		const ppgUshers = unassignedUshers.filter(usher => usher.isPpg);
		const kolekteUshers = unassignedUshers.filter(usher => usher.isKolekte && !usher.isPpg);
		const regularUshers = unassignedUshers.filter(usher => !usher.isPpg && !usher.isKolekte);
		if (this.isPpgEnabled) {
			// 1a. Assign PPG ushers to PPG positions
			for (const usher of ppgUshers) {
				if (ppgPositions.length === 0) {
					logger.warn(`  no PPG positions available for PPG usher: ${usher.name} `);
					continue;
				}

				const position = ppgPositions[this.nextIndexPpg % ppgPositions.length];
				this.nextIndexPpg += 1;

				assignedUshers.push({
					...usher,
					event: eventId,
					position: position.id,
					zone: position.zone,
					positionName: position.name
				});
			}

			// 1b. Assign Kolekte ushers to non-PPG positions
			for (const usher of kolekteUshers) {
				if (nonPpgPositions.length === 0) {
					logger.warn(`  no non - PPG positions available for Kolekte usher: ${usher.name} `);
					continue;
				}

				const position = nonPpgPositions[this.nextIndexNonPpg % nonPpgPositions.length];
				this.nextIndexNonPpg += 1;

				assignedUshers.push({
					...usher,
					event: eventId,
					position: position.id,
					zone: position.zone,
					positionName: position.name
				});
			}

			// Assign regular ushers to non-PPG positions
			for (const usher of regularUshers) {
				if (nonPpgPositions.length === 0) {
					logger.warn(`  no non - PPG positions available for regular usher: ${usher.name} `);
					continue;
				}

				const position = nonPpgPositions[this.nextIndexNonPpg % nonPpgPositions.length];
				this.nextIndexNonPpg += 1;

				assignedUshers.push({
					...usher,
					event: eventId,
					position: position.id,
					zone: position.zone,
					positionName: position.name
				});
			}
		} else {
			// 2a. All ushers assigned to non-PPG positions only
			const allUshers = [...ppgUshers, ...kolekteUshers, ...regularUshers];

			for (const usher of allUshers) {
				if (nonPpgPositions.length === 0) {
					logger.warn(`No non - PPG positions available for usher: ${usher.name} `);
					continue;
				}

				const position = nonPpgPositions[this.nextIndexNonPpg % nonPpgPositions.length];
				this.nextIndexNonPpg += 1;

				assignedUshers.push({
					...usher,
					event: eventId,
					position: position.id,
					zone: position.zone,
					positionName: position.name
				});
			}
		}

		return assignedUshers;
	}

	public reset(): void {
		this.eventUshers = [];
		this.massZonePositions = [];
		this.confirmationQueue = [];
		this.nextIndexNonPpg = 0;
		this.nextIndexPpg = 0;
	}

	private findLatestUniquePositionId(arr: string[]): string | null {
		// If array is empty, return null
		if (arr.length === 0) return null;

		// Create a Map to store unique IDs and their occurrences
		const idOccurrences = new Map<string, number>();

		// Count occurrences of each non-empty ID
		arr.forEach(id => {
			if (id && id.trim() !== "") {
				idOccurrences.set(id, (idOccurrences.get(id) || 0) + 1);
			}
		});

		// Detect empty positions in arr
		const emptyPositions = arr.filter(id => !id || id.trim() === "").length;

		// Find the first ID that appears only once
		if (emptyPositions) {
			// Partial positions have been assigned 
			for (let i = arr.length - 1; i >= 0; i--) {
				const id = arr[i];
				if (!id || id.trim() === "") continue;
				if (idOccurrences.get(id) === 1) {
					return id;
				}
			}
		} else {
			// All positions have been assigend
			for (const id of arr) {
				if (id && id.trim() !== "" && idOccurrences.get(id) === 1) {
					return id;
				}
			}
		}

		return null;
	}

	private nextPositionIndex(latestPositionId: string, massZonePositions: string[]): number {
		// If no latest position, start from beginning
		if (!latestPositionId) return 0;

		// Find current index
		const currentIndex = massZonePositions.findIndex(position => position === latestPositionId);

		// If position not found, start from beginning
		if (currentIndex === -1) return 0;

		// Calculate next index with loop back
		const nextIndex = (currentIndex + 1) % massZonePositions.length;

		return nextIndex;
	}
}
