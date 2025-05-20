import type { Event as ChurchEvent, EventUsher } from '$core/entities/Event';
import type { ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import { repo } from '$src/lib/server/db';
import { featureFlags } from '$src/lib/utils/FeatureFlag';
import { EventService } from './EventService';

export interface ConfirmationQueue {
	event: ChurchEvent;
	lingkungan: Lingkungan;
}

/**
 * QueueManager class
 *
 * This class manages the queue of ushers for church events and assigns positions to them.
 * It follows the Singleton pattern to ensure only one instance exists throughout the application.
 */
export class QueueManager {
	private static instance: QueueManager;
	/** Array of existing ushers */
	public eventUshers: EventUsher[] = [];
	/** Array of available positions */
	public massZonePositions: ChurchPosition[] = [];
	/** Queue of confirmation requests */
	public confirmationQueue: ConfirmationQueue[] = []; // TODO: make sure to include past unprocessed queue events
	public assignedUshers: (EventUsher & { zone?: string, positionName?: string })[] = [];
	/** Last assigned position index for non-PPG positions */
	private nextIndexNonPpg: number = 0;
	/** Last assigned position index for PPG positions */
	private lastIndexPpg: number = 0;
	/** Event service instance */
	private eventService: EventService;

	private constructor() {
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
	 * 3. Assigns positions to unassigned ushers using round-robin algorithm
	 * 4. Updates the ushers in the database with their new positions
	 * 5. Removes the processed queue item
	 * 
	 * @throws {Error} If no positions are found for the mass
	 * @returns {Promise<void>}
	 */
	async processQueue(): Promise<void> {

		this.assignedUshers = [];

		for (const batch of this.confirmationQueue) {

			// 1. Get mass zone positions by event. Consider VITE_FEATURE_PPG
			this.massZonePositions = await repo.getPositionsByMass(batch.event.church, batch.event.mass);
			const isPpgEnabled = featureFlags.isEnabled('ppg');
			const eventPositions = isPpgEnabled
				? this.massZonePositions
				: this.massZonePositions.filter(pos => !pos.isPpg);
			this.massZonePositions = eventPositions;

			if (this.massZonePositions.length === 0) {
				throw new Error(`Gagal menemukan titik tugas untuk ${batch.event.mass}`, { cause: 404 })
			}

			// 2. Get event ushers for the event (including past unprocessed events)
			this.eventUshers = await repo.getEventUshers(batch.event.id);

			// 3. Define next index 
			const eupLatestPositionId = this.latestPositionId(this.eventUshers.map(usher => usher.position || ''));
			this.nextIndexNonPpg = this.nextPositionIndex(eupLatestPositionId || '', this.massZonePositions.map(position => position.id));

			// 4. Distribute position to ushers 
			const assignedUshers = this.eventUshers.filter((usher) => usher.position !== null);
			const unassignedUshers = this.eventUshers.filter((usher) => usher.position === null);
			const newAssignedUshers = await this.distributePositions(
				unassignedUshers,
				batch.event.id,
				this.nextIndexNonPpg
			);

			// Update event_ushers in the repository
			this.eventUshers = [...assignedUshers, ...newAssignedUshers];
			if (this.eventUshers.length > 0) {
				const result = await repo.editEventUshers(this.eventUshers);
			}

			// Remove the processed queue item
			this.confirmationQueue.shift();
			this.assignedUshers = [...this.assignedUshers, ...newAssignedUshers];
		}
	}

	/**
	 * Assigns positions to unassigned ushers using round robin algorithm
	 * 
	 * Return newly assigned ushers
	 * 
	 * @param {EventUsher[]} unassignedUshers - Array of unassigned ushers
	 * @param {string} eventId - The event ID
	 * @param {number} assignedCount - Number of already assigned ushers
	 * @param {ChurchPosition[]} availablePositions - Array of available positions
	 * @private
	 */
	private async distributePositions(
		unassignedUshers: EventUsher[],
		eventId: string,
		nextIndex: number
	): Promise<EventUsher[]> {
		// Map each usher to a position, cycling through available positions
		const assignedUshers = unassignedUshers.map((usher) => {
			// Get position at current index, cycling back to start if needed
			const position = this.massZonePositions[nextIndex % this.massZonePositions.length];
			nextIndex += 1;

			return {
				...usher,
				event: eventId,
				position: position.id,
				zone: position.zone,
				positionName: position.name
			};
		});

		return assignedUshers;
	}

	public reset(): void {
		this.eventUshers = [];
		this.massZonePositions = [];
		this.confirmationQueue = [];
		this.nextIndexNonPpg = 0;
		this.lastIndexPpg = 0;
	}

	private latestPositionId(arr: string[]): string | null {
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
