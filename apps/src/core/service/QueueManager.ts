import type { ChurchEvent, EventUsher } from '$core/entities/Event';
import type { Church, ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import { ServiceError } from '$core/errors/ServiceError';
import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import { logger } from '$src/lib/utils/logger';

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
 * QueueManager handles assignment of ushers to positions for church events.
 *
 * It follows a queue-based system where events are submitted for processing,
 * and ushers are assigned positions using a round-robin algorithm.
 *
 * When requirePpg is false:
 * - All positions are treated as a unified pool (ignores position.isPpg property)
 * - All ushers (PPG and non-PPG) are assigned to any available position
 *
 * When requirePpg is true:
 * - Positions are separated into PPG and non-PPG pools
 * - PPG ushers are assigned to PPG positions, non-PPG ushers to non-PPG positions
 *
 * Ushers that exceed available positions remain unassigned (position = null).
 *
 * Use createInstance() to get a fresh instance per request.
 */
export class QueueManager {
	/** Array of assigned ushers — populated after processQueue() completes. */
	public assignedUshers: AssignedEventUsher[] = [];

	private eventUshers: EventUsher[] = [];
	private massZonePositions: ChurchPosition[] = [];
	private eventPositions: ChurchPosition[] = [];
	private confirmationQueue: ConfirmationQueue[] = [];

	private nextIndexNonPpg: number = 0;
	private nextIndexPpg: number = 0;

	constructor(
		private readonly repo: ScheduleRepository,
		private readonly isPpgEnabled: boolean,
		private readonly isRoundRobinEnabled: boolean,
		private readonly checkRequirePpg: (church: Church) => Promise<boolean>
	) {}

	/**
	 * Creates a fresh QueueManager instance for per-request use.
	 * Feature flags must be resolved before calling; pass them as arguments
	 * to avoid async-constructor races.
	 */
	public static createInstance(
		repo: ScheduleRepository,
		isPpgEnabled: boolean,
		isRoundRobinEnabled: boolean,
		checkRequirePpg: (church: Church) => Promise<boolean>
	): QueueManager {
		return new QueueManager(repo, isPpgEnabled, isRoundRobinEnabled, checkRequirePpg);
	}

	/**
	 * Enqueues an event/lingkungan pair for position assignment.
	 */
	submitConfirmationQueue(event: ChurchEvent, lingkungan: Lingkungan): void {
		this.confirmationQueue.push({ event, lingkungan });
	}

	/**
	 * Processes the confirmation queue by assigning positions to unassigned ushers.
	 *
	 * For each queued event:
	 * 1. Gets all positions for the event's mass
	 * 2. Fetches church entity and determines requirePpg (from church.requirePpg + Statsig)
	 * 3. Filters positions based on requirePpg:
	 *    - If false: uses all positions (unified pool, ignores isPpg)
	 *    - If true: uses existing logic (separate PPG/non-PPG based on isPpgEnabled)
	 * 4. Gets all ushers for the event
	 * 5. Calculates round-robin indices for each pool
	 * 6. Separates assigned and unassigned ushers
	 * 7. Assigns positions to unassigned ushers using role-based round-robin algorithm
	 * 8. Updates the ushers in the database with their new positions
	 * 9. Removes the processed queue item
	 *
	 * Extra ushers that exceed available positions remain unassigned (position = null).
	 *
	 * @throws {Error} If no positions are found for the mass
	 */
	async processQueue(): Promise<void> {
		this.assignedUshers = [];

		for (const batch of this.confirmationQueue) {
			// 1. Get mass zone positions by event.
			this.massZonePositions = await this.repo.listPositionByMass(batch.event.church, batch.event.mass);

			if (this.massZonePositions.length === 0) {
				throw new Error(`Gagal menemukan titik tugas untuk ${batch.event.mass}`, { cause: 404 });
			}

			// 2. Fetch church entity and determine if PPG is required
			const church = await this.repo.findChurchById(batch.event.church);
			const requirePpg = await this.checkRequirePpg(church);

			// 3. Filter positions based on requirePpg
			if (!requirePpg) {
				// When requirePpg is false, use all positions (ignore isPpg property)
				this.eventPositions = this.massZonePositions;
			} else {
				// When requirePpg is true, use existing logic based on isPpgEnabled
				this.eventPositions = this.isPpgEnabled
					? this.massZonePositions
					: this.massZonePositions.filter(pos => !pos.isPpg);
			}

			// 4. Get event ushers for the event (including past unprocessed events)
			this.eventUshers = await this.repo.findEventUshers(batch.event.id);

			// 5. Calculate next position indices for each role pool
			const nonPpgPositions = this.massZonePositions.filter(pos => !pos.isPpg);
			const ppgPositions = this.massZonePositions.filter(pos => pos.isPpg);

			if (!requirePpg) {
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

			// 6. Distribute positions to ushers based on roles
			const assignedUshers = this.eventUshers.filter((usher) => usher.position !== null);
			const unassignedUshers = this.eventUshers.filter((usher) => usher.position === null);

			const newAssignedUshers = this.distributePositionsByRole(
				unassignedUshers,
				batch.event.id,
				ppgPositions,
				nonPpgPositions,
				this.massZonePositions,
				requirePpg
			);

			// 7. Convert AssignedEventUsher back to EventUsher for database update
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
					await this.repo.editEventUshers(this.eventUshers);
				} catch (error) {
					logger.error(`Error updating event ushers: ${error}`);
					throw ServiceError.database('Failed to update event ushers', { originalError: error });
				}
			}

			// 8. Remove the processed queue item and collect results
			this.confirmationQueue.shift();
			this.assignedUshers = [...this.assignedUshers, ...newAssignedUshers];

			// Sort assigned ushers by name for consistent display order
			this.assignedUshers.sort((a, b) => a.name.localeCompare(b.name));
		}
	}

	/**
	 * Assigns positions to unassigned ushers using a role-based round-robin algorithm.
	 *
	 * When requirePpg is false:
	 * - All positions form a unified pool (position.isPpg is ignored)
	 * - All ushers are assigned from that pool
	 *
	 * When requirePpg is true and isPpgEnabled is true:
	 * - PPG ushers → PPG positions; non-PPG ushers → non-PPG positions
	 *
	 * When requirePpg is true and isPpgEnabled is false:
	 * - All ushers → non-PPG positions only
	 *
	 * Ushers that exceed available positions remain unassigned.
	 */
	private distributePositionsByRole(
		unassignedUshers: EventUsher[],
		eventId: string,
		ppgPositions: ChurchPosition[],
		nonPpgPositions: ChurchPosition[],
		allPositionsSorted: ChurchPosition[],
		requirePpg: boolean
	): AssignedEventUsher[] {
		const assignedUshers: AssignedEventUsher[] = [];

		// Returns the next index to use, respecting round-robin vs sequential mode
		const getNextPositionIndex = (currentIndex: number, positionsLength: number): number | null => {
			if (this.isRoundRobinEnabled) {
				return currentIndex % positionsLength;
			}
			// Sequential mode: only assign if a position slot is available
			return currentIndex < positionsLength ? currentIndex : null;
		};

		// Sorts positions by sequence ascending, nulls last
		const sortBySequence = (positions: ChurchPosition[]): ChurchPosition[] =>
			[...positions].sort((a, b) =>
				(a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER)
			);

		// Returns positions not yet taken by currently assigned ushers
		const getAvailablePositions = (allPositions: ChurchPosition[], taken: string[]): ChurchPosition[] => {
			const sorted = sortBySequence(allPositions);
			return this.isRoundRobinEnabled ? sorted : sorted.filter(p => !taken.includes(p.id));
		};

		const takenPositionIds = (): string[] =>
			this.eventUshers.filter(u => u.position !== null).map(u => u.position!);

		if (!requirePpg) {
			// Unified pool: assign all ushers to any available position (ignore position.isPpg)
			const available = getAvailablePositions(allPositionsSorted, takenPositionIds());
			let idx = this.isRoundRobinEnabled ? this.nextIndexNonPpg : 0;

			for (const usher of unassignedUshers) {
				if (available.length === 0) {
					logger.warn(`No available positions for usher: ${usher.name}`);
					break;
				}
				const posIdx = getNextPositionIndex(idx, available.length);
				if (posIdx === null) {
					logger.warn(`No more available positions for usher: ${usher.name}`);
					break;
				}
				const pos = available[posIdx];
				idx += 1;
				this.nextIndexNonPpg += 1;
				assignedUshers.push({ ...usher, event: eventId, position: pos.id, zone: pos.zone, positionName: pos.name });
			}
		} else if (this.isPpgEnabled) {
			// Separate pools: PPG ushers → PPG positions; non-PPG ushers → non-PPG positions
			const taken = takenPositionIds();
			const availPpg = getAvailablePositions(ppgPositions, taken);
			const availNonPpg = getAvailablePositions(nonPpgPositions, taken);

			let ppgIdx = this.isRoundRobinEnabled ? this.nextIndexPpg : 0;
			for (const usher of unassignedUshers.filter(u => u.isPpg)) {
				if (availPpg.length === 0) { logger.warn(`no available ppg position for ${usher.name}`); break; }
				const posIdx = getNextPositionIndex(ppgIdx, availPpg.length);
				if (posIdx === null) { logger.warn(`no available ppg position for ${usher.name}`); break; }
				const pos = availPpg[posIdx];
				ppgIdx += 1;
				this.nextIndexPpg += 1;
				assignedUshers.push({ ...usher, event: eventId, position: pos.id, zone: pos.zone, positionName: pos.name });
			}

			let nonPpgIdx = this.isRoundRobinEnabled ? this.nextIndexNonPpg : 0;
			for (const usher of unassignedUshers.filter(u => !u.isPpg)) {
				if (availNonPpg.length === 0) { logger.warn(`no available non-PPG positions for usher: ${usher.name}`); break; }
				const posIdx = getNextPositionIndex(nonPpgIdx, availNonPpg.length);
				if (posIdx === null) { logger.warn(`no more available non-PPG positions for usher: ${usher.name}`); break; }
				const pos = availNonPpg[posIdx];
				nonPpgIdx += 1;
				this.nextIndexNonPpg += 1;
				assignedUshers.push({ ...usher, event: eventId, position: pos.id, zone: pos.zone, positionName: pos.name });
			}
		} else {
			// isPpgEnabled false: all ushers assigned to non-PPG positions only
			const available = getAvailablePositions(nonPpgPositions, takenPositionIds());

			for (const usher of unassignedUshers) {
				if (available.length === 0) { logger.warn(`No available non-PPG positions for usher: ${usher.name}`); continue; }
				const posIdx = getNextPositionIndex(this.nextIndexNonPpg, available.length);
				if (posIdx === null) { logger.warn(`no more available non-PPG positions for usher: ${usher.name}`); break; }
				const pos = available[posIdx];
				this.nextIndexNonPpg += 1;
				assignedUshers.push({ ...usher, event: eventId, position: pos.id, zone: pos.zone, positionName: pos.name });
			}
		}

		return assignedUshers;
	}

	public reset(): void {
		this.eventUshers = [];
		this.massZonePositions = [];
		this.confirmationQueue = [];
		this.assignedUshers = [];
		this.nextIndexNonPpg = 0;
		this.nextIndexPpg = 0;
	}

	private findLatestUniquePositionId(arr: string[]): string | null {
		if (arr.length === 0) return null;

		const counts = new Map<string, number>();
		for (const id of arr) {
			if (id?.trim()) counts.set(id, (counts.get(id) ?? 0) + 1);
		}

		const hasEmpty = arr.some(id => !id?.trim());

		if (hasEmpty) {
			// Partial assignment — scan backwards for the last singly-seen id
			for (let i = arr.length - 1; i >= 0; i--) {
				const id = arr[i];
				if (id?.trim() && counts.get(id) === 1) return id;
			}
		} else {
			// All positions have been assigned
			for (const id of arr) {
				if (id?.trim() && counts.get(id) === 1) return id;
			}
		}

		return null;
	}

	private nextPositionIndex(latestPositionId: string, positions: string[]): number {
		if (!latestPositionId) return 0;
		const current = positions.findIndex(p => p === latestPositionId);
		if (current === -1) return 0;
		return (current + 1) % positions.length;
	}
}
