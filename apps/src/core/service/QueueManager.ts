import type { ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import type { Event as ChurchEvent, EventUsher } from '$core/entities/Event';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';

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
	public ushers: EventUsher[] = [];
	/** Array of available positions */
	public positions: ChurchPosition[] = [];
	/** Queue of confirmation requests */
	public confirmationQueue: ConfirmationQueue[] = []; // TODO: make sure to include past unprocessed queue events
	public assignedUshers: (EventUsher & { positionName?: string })[] = [];

	private constructor() { }

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
	 * @param {ChurchEvent} event - The church event
	 * @param {Lingkungan} lingkungan - The lingkungan (community) submitting the queue
	 * @returns {Promise<void>}
	 */
	async submitConfirmationQueue(event: ChurchEvent, lingkungan: Lingkungan): Promise<void> {
		this.confirmationQueue.push({ event, lingkungan });
	}

	/**
	 * Processes the confirmation queue
	 * @returns {Promise<void>}
	 */
	async processConfirmationQueue(): Promise<void> {
		logger.debug(`processing queue of ${this.confirmationQueue.length} event(s)`);
		this.assignedUshers = [];

		for (const queue of this.confirmationQueue) {
			this.ushers = await repo.getEventUshers(queue.event.id); // Get all ushers for the event (including past unprocessed events)

			this.positions = await repo.getPositionsByMass(queue.event.church, queue.event.mass);

			// Break 
			if (this.positions.length === 0) {
				throw new Error(`Gagal menemukan titik tugas untuk ${queue.event.mass}`, { cause: 404 })
			}

			// Count assigned ushers
			const assignedUshers = this.ushers.filter((usher) => usher.position !== null);

			const unassignedUshers = this.ushers.filter((usher) => usher.position === null);

			// Assign positions to unassigned ushers
			const newAssignedUshers = this.assignPositions(unassignedUshers, assignedUshers.length);

			// Update the ushers array
			this.ushers = [...assignedUshers, ...newAssignedUshers];

			// Update event_ushers in the repository
			await repo.editEventUshers(this.ushers);

			// Remove the processed queue item
			this.confirmationQueue.shift();

			this.assignedUshers = [...this.assignedUshers, ...newAssignedUshers];
		}

		// make sure to reset the queue after processing
		this.reset();
	}

	/**
	 * Assigns positions to unassigned ushers using round robin algorithm
	 * @param {EventUsher[]} unassignedUshers - Array of unassigned ushers
	 * @param {number} assignedCount - Number of already assigned ushers
	 * @private
	 */
	private assignPositions(unassignedUshers: EventUsher[], assignedCount: number): EventUsher[] {
		logger.debug(`assigning ${unassignedUshers.length} ushers`);

		const useAllPositions = true; // This could be made configurable via constructor/method

		// Get available positions based on control flag
		const availablePositions = useAllPositions
			? this.positions // Use all positions
			: this.positions.slice(assignedCount); // Only use empty positions

		if (availablePositions.length === 0) {
			throw new Error('Tidak ada titik tugas yang tersedia', { cause: 404 });
		}

		logger.debug(`found ${availablePositions.length} available positions`);

		const newAssignedUshers = unassignedUshers.map((usher, index) => {

			const positionIndex = index % availablePositions.length;

			logger.debug(`${usher.name} position index: ${availablePositions[positionIndex].name}`);

			return {
				...usher,
				position: availablePositions[positionIndex].id,
				positionName: availablePositions[positionIndex].name
			};
		});

		logger.debug(`finished assigning ${newAssignedUshers.length} ushers to ${availablePositions.length} positions`);

		return newAssignedUshers;
	}

	private reset(): void {
		this.ushers = [];
		this.positions = [];
		this.confirmationQueue = [];
	}
}
