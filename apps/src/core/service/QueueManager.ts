import type { ChurchEvent, EventUsher } from '$core/entities/Event';
import type { Church, ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import { ServiceError } from '$core/errors/ServiceError';
import { statsigService } from '$lib/application/StatsigService';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { shouldRequirePpg } from '$src/lib/utils/ppgUtils';
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
 * 
 * When shouldRequirePpg is false:
 * - All positions are treated as a unified pool (ignores position.isPpg property)
 * - All ushers (PPG and non-PPG) are assigned to any available position
 * - Uses single round-robin index for all positions
 * 
 * When shouldRequirePpg is true:
 * - Positions are separated into PPG and non-PPG pools
 * - PPG ushers are assigned to PPG positions, non-PPG ushers to non-PPG positions
 * - Uses separate round-robin indices for each pool
 * 
 * Extra ushers that exceed available positions remain unassigned (position = null).
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
	/** Round-robin feature flag state */
	public isRoundRobinEnabled: boolean = false;
	/** Whether PPG requirement is enforced (from church.requirePpg + Statsig) */
	public shouldRequirePpg: boolean = false;

	private nextIndexNonPpg: number = 0;
	private nextIndexPpg: number = 0;
	private eventService: EventService;

	private constructor() {
		// Initialize statsig and check feature flags
		statsigService.use().then(async () => {
			this.isPpgEnabled = await statsigService.checkGate('ppg');
			this.isRoundRobinEnabled = await statsigService.checkGate('round_robin');
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
	 * 1. Gets all positions for the event's mass
	 * 2. Fetches church entity and determines shouldRequirePpg (from church.requirePpg + Statsig)
	 * 3. Filters positions based on shouldRequirePpg:
	 *    - If false: uses all positions (unified pool, ignores isPpg)
	 *    - If true: uses existing logic (separate PPG/non-PPG based on isPpgEnabled)
	 * 4. Gets all ushers for the event
	 * 5. Calculates round-robin indices:
	 *    - If shouldRequirePpg is false: single unified index for all positions
	 *    - If shouldRequirePpg is true: separate indices for PPG and non-PPG positions
	 * 6. Separates assigned and unassigned ushers
	 * 7. Assigns positions to unassigned ushers using role-based round-robin algorithm
	 * 8. Updates the ushers in the database with their new positions
	 * 9. Removes the processed queue item
	 * 
	 * Extra ushers that exceed available positions remain unassigned (position = null).
	 * 
	 * @throws {Error} If no positions are found for the mass
	 * @returns {Promise<void>}
	 */
	async processQueue(): Promise<void> {

		this.assignedUshers = [];

		for (const batch of this.confirmationQueue) {
			// 1. Get mass zone positions by event. 
			this.massZonePositions = await repo.listPositionByMass(batch.event.church, batch.event.mass);

			if (this.massZonePositions.length === 0) {
				throw new Error(`Gagal menemukan titik tugas untuk ${batch.event.mass}`, { cause: 404 })
			}

			// 2. Fetch church entity and determine if PPG is required
			const church = await repo.findChurchById(batch.event.church);
			this.shouldRequirePpg = await shouldRequirePpg(church);

			// 3. Filter positions based on shouldRequirePpg
			if (!this.shouldRequirePpg) {
				// When shouldRequirePpg is false, use all positions (ignore isPpg property)
				this.eventPositions = this.massZonePositions;
			} else {
				// When shouldRequirePpg is true, use existing logic based on isPpgEnabled
				this.eventPositions = this.isPpgEnabled
					? this.massZonePositions
					: this.massZonePositions.filter(pos => !pos.isPpg);
			}

			// 4. Get event ushers for the event (including past unprocessed events)
			this.eventUshers = await repo.findEventUshers(batch.event.id);

			// 5. Calculate next position indices for different role types
			const nonPpgPositions = this.massZonePositions.filter(pos => !pos.isPpg);
			const ppgPositions = this.massZonePositions.filter(pos => pos.isPpg);

			if (!this.shouldRequirePpg) {
				// Unified pool: use single index for all positions
				const allPositionIds = this.massZonePositions.map(position => position.id);
				const eupLatestPositionId = this.findLatestUniquePositionId(
					this.eventUshers.map(usher => usher.position || '')
				);
				this.nextIndexNonPpg = this.nextPositionIndex(eupLatestPositionId || '', allPositionIds);
			} else {
				// Separate pools: calculate indices for PPG and non-PPG positions
				const eupLatestNonPpgPositionId = this.findLatestUniquePositionId(
					this.eventUshers.filter(usher => !usher.isPpg).map(usher => usher.position || '')
				);
				this.nextIndexNonPpg = this.nextPositionIndex(
					eupLatestNonPpgPositionId || '',
					nonPpgPositions.map(position => position.id)
				);

				const eupLatestPpgPositionId = this.findLatestUniquePositionId(
					this.eventUshers.filter(usher => usher.isPpg).map(usher => usher.position || '')
				);
				this.nextIndexPpg = this.nextPositionIndex(
					eupLatestPpgPositionId || '',
					ppgPositions.map(position => position.id)
				);
			}

			// 6. Distribute position to ushers based on roles
			const assignedUshers = this.eventUshers.filter((usher) => usher.position !== null);
			const unassignedUshers = this.eventUshers.filter((usher) => usher.position === null);

			const newAssignedUshers = await this.distributePositionsByRole(
				unassignedUshers,
				batch.event.id,
				ppgPositions,
				nonPpgPositions,
				this.massZonePositions,
				this.shouldRequirePpg
			);

			// 5. Convert AssignedEventUsher back to EventUsher for database update
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

			// Check for any ushers without positions and log them
			const ushersWithoutPosition = updatedEventUshers.filter(usher => !usher.position);
			if (ushersWithoutPosition.length > 0) {
				logger.warn(`Found ${ushersWithoutPosition.length} ushers without positions for event ${batch.event.id}`);
				for (const usher of ushersWithoutPosition) {
					logger.warn(`  Usher without position: ${usher.name} (isPpg: ${usher.isPpg}, isKolekte: ${usher.isKolekte})`);
				}
			}

			if (this.eventUshers.length > 0) {
				try {
					const result = await repo.editEventUshers(this.eventUshers);
				} catch (error) {
					logger.error(`Error updating event ushers: ${error}`);
					throw ServiceError.database('Failed to update event ushers', { originalError: error });
				}
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
	 * When shouldRequirePpg is false:
	 * - All positions are treated as a unified pool (ignores position.isPpg property)
	 * - All ushers (PPG and non-PPG) are assigned to any available position
	 * - Uses single round-robin index for all positions
	 * 
	 * When shouldRequirePpg is true:
	 * - When isRoundRobinEnabled is true:
	 *   - Uses round-robin distribution for fair position rotation
	 * - When isRoundRobinEnabled is false:
	 *   - Uses sequential assignment (first usher gets first position, etc.)
	 * - When isPpgEnabled is true:
	 *   - Ushers with isPpg = true → Assign to the next available PPG position
	 *   - Ushers with isKolekte = true → Assign to the next available non-PPG position
	 * - When isPpgEnabled is false:
	 *   - All ushers → Assign only to non-PPG positions
	 * 
	 * Extra ushers that exceed available positions remain unassigned (position = null).
	 * 
	 * @param {EventUsher[]} unassignedUshers - Array of unassigned ushers
	 * @param {string} eventId - The event ID
	 * @param {ChurchPosition[]} ppgPositions - Array of PPG positions
	 * @param {ChurchPosition[]} nonPpgPositions - Array of non-PPG positions
	 * @param {ChurchPosition[]} allPositionsSorted - All positions sorted by sequence (for unified pool)
	 * @param {boolean} shouldRequirePpg - Whether PPG requirement is enforced
	 * @private
	 */
	private async distributePositionsByRole(
		unassignedUshers: EventUsher[],
		eventId: string,
		ppgPositions: ChurchPosition[],
		nonPpgPositions: ChurchPosition[],
		allPositionsSorted: ChurchPosition[],
		shouldRequirePpg: boolean
	): Promise<AssignedEventUsher[]> {

		const assignedUshers: AssignedEventUsher[] = [];

		// Helper function to get next position index based on round-robin setting
		const getNextPositionIndex = (currentIndex: number, positionsLength: number): number | null => {
			if (this.isRoundRobinEnabled) {
				return currentIndex % positionsLength;
			} else {
				// Sequential mode: only assign if position is available
				return currentIndex < positionsLength ? currentIndex : null;
			}
		};

		// Helper function to sort positions by sequence (nulls last)
		const sortPositionsBySequence = (positions: ChurchPosition[]): ChurchPosition[] => {
			return [...positions].sort((a, b) => {
				const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
				const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
				return seqA - seqB;
			});
		};

		// Helper function to get available positions (excluding already assigned ones)
		const getAvailablePositions = (allPositions: ChurchPosition[], assignedPositions: string[]): ChurchPosition[] => {
			const sorted = sortPositionsBySequence(allPositions);
			if (this.isRoundRobinEnabled) {
				return sorted;
			}
			return sorted.filter(position => !assignedPositions.includes(position.id));
		};

		if (!shouldRequirePpg) {
			// Unified pool: assign all ushers to any available position (ignore position.isPpg)
			// Use allPositionsSorted to maintain sequence order (already sorted by sequence from DB)
			const allPositions = allPositionsSorted;
			const allUshers = unassignedUshers;

			// Get currently assigned positions for this event
			const assignedPositions = this.eventUshers
				.filter(usher => usher.position !== null)
				.map(usher => usher.position!);

			// Get available positions (excluding already assigned ones)
			const availablePositions = getAvailablePositions(allPositions, assignedPositions);

			// Assign all ushers from unified pool
			let usherIndex = this.isRoundRobinEnabled ? this.nextIndexNonPpg : 0;
			for (const usher of allUshers) {
				if (availablePositions.length === 0) {
					logger.warn(`No available positions for usher: ${usher.name}`);
					break;
				}

				const positionIndex = getNextPositionIndex(usherIndex, availablePositions.length);
				if (positionIndex === null) {
					logger.warn(`No more available positions for usher: ${usher.name}`);
					break;
				}

				const position = availablePositions[positionIndex];
				usherIndex += 1;
				this.nextIndexNonPpg += 1; // Update index for round-robin continuity

				assignedUshers.push({
					...usher,
					event: eventId,
					position: position.id,
					zone: position.zone,
					positionName: position.name
				});
			}
		} else if (this.isPpgEnabled) {
			// Separate pools: existing role-based logic
			// Separate ushers by role
			const ppgUshers = unassignedUshers.filter(usher => usher.isPpg);
			const nonPpgUshers = unassignedUshers.filter(usher => !usher.isPpg);
			// Get currently assigned positions for this event
			const assignedPositions = this.eventUshers
				.filter(usher => usher.position !== null)
				.map(usher => usher.position!);

			// Get available positions (excluding already assigned ones)
			const availablePpgPositions = getAvailablePositions(ppgPositions, assignedPositions);
			const availableNonPpgPositions = getAvailablePositions(nonPpgPositions, assignedPositions);

			// 1a. Assign PPG ushers to available PPG positions
			let pppUshersIndex = this.isRoundRobinEnabled ? this.nextIndexPpg : 0;
			for (const usher of ppgUshers) {
				if (availablePpgPositions.length === 0) {
					logger.warn(`no available non-ppg position for ${usher.name}`);
					break;
				}

				const positionIndex = getNextPositionIndex(pppUshersIndex, availablePpgPositions.length);
				if (positionIndex === null) {
					logger.warn(`no available ppg position for ${usher.name}`);
					break;
				}

				const position = availablePpgPositions[positionIndex];
				pppUshersIndex += 1;
				this.nextIndexPpg += 1; // keep for next round-robin fixing 

				assignedUshers.push({
					...usher,
					event: eventId,
					position: position.id,
					zone: position.zone,
					positionName: position.name
				});
			}

			// 1b. Assign Non PPG ushers to available non-PPG positions
			let nonPppUshersIndex = this.isRoundRobinEnabled ? this.nextIndexNonPpg : 0;
			for (const usher of nonPpgUshers) {
				if (availableNonPpgPositions.length === 0) {
					logger.warn(`  no available non-PPG positions for Kolekte usher: ${usher.name}`);
					break;
				}

				const positionIndex = getNextPositionIndex(nonPppUshersIndex, availableNonPpgPositions.length);
				if (positionIndex === null) {
					logger.warn(`  no more available non-PPG positions for Kolekte usher: ${usher.name}`);
					break;
				}

				const position = availableNonPpgPositions[positionIndex];
				nonPppUshersIndex += 1;
				this.nextIndexNonPpg += 1; // keep for next round-robin fixing 

				assignedUshers.push({
					...usher,
					event: eventId,
					position: position.id,
					zone: position.zone,
					positionName: position.name
				});
			}
		} else {
			// 2a. All ushers assigned to available non-PPG positions only
			// Separate ushers by role (for reference, but all will use non-PPG positions)
			const ppgUshers = unassignedUshers.filter(usher => usher.isPpg);
			const nonPpgUshers = unassignedUshers.filter(usher => !usher.isPpg);
			const allUshers = [...ppgUshers, ...nonPpgUshers];

			// Get currently assigned positions for this event
			const assignedPositions = this.eventUshers
				.filter(usher => usher.position !== null)
				.map(usher => usher.position!);

			// Get available positions (excluding already assigned ones)
			const availableNonPpgPositions = getAvailablePositions(nonPpgPositions, assignedPositions);

			for (const usher of allUshers) {
				if (availableNonPpgPositions.length === 0) {
					logger.warn(`No available non-PPG positions for usher: ${usher.name}`);
					continue;
				}

				const positionIndex = getNextPositionIndex(this.nextIndexNonPpg, availableNonPpgPositions.length);
				if (positionIndex === null) {
					logger.warn(`  no more available non-PPG positions for usher: ${usher.name}`);
					break;
				}

				const position = availableNonPpgPositions[positionIndex];
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
