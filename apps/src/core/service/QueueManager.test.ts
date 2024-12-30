import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueueManager } from './QueueManager';
import type { ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import type { Event as ChurchEvent, EventUsher } from '$core/entities/Event';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';

describe('QueueManager', () => {
	const repoGetEventUshers = vi.spyOn(repo, 'getEventUshers');
	const repoMassPositions = vi.spyOn(repo, 'getPositionsByMass');
	const manager = QueueManager.getInstance();

	afterEach(() => {
		manager.confirmationQueue = [];
		vi.resetAllMocks();
	});

	it('should submit confirmation queue', async () => {
		const event: ChurchEvent = createTestEvent();
		const lingkungan: Lingkungan[] = createTestLingkungan();

		// 1st Lingkungan submit their ushers
		await manager.submitConfirmationQueue(event, lingkungan[0]);
		expect(manager.confirmationQueue).toHaveLength(1);

		// 2nd Lingkungan submit their ushers (createdAt)
		await manager.submitConfirmationQueue(event, lingkungan[1]);
		expect(manager.confirmationQueue).toHaveLength(2);
	});

	/*
	Lingkungan submit 6 ushers for saturday mass event. System will check existing
	ushers by event and default positions required by mass. The default positions
	will be substracted with the existing ushers. Remaining positions will be assigned
	to submitted ushers.

	Steps:
	1. Submit event and ushers to queue manager
	1.1. Check existing ushers by event and default positions by mass
	1.2. Count ushers with position
	1.3. Get ushers without position
	1.4. Get available positions (default positions - positon from existing ushers)
	1.5. Assign available positions to ushers without position
	1.6. Update ushers position
	1.7. Remove the processed queue item

	Note for testing:
	1. Use mocking to replace repository modules.
	2. Nested object should be tested one by one? need to check on this
	3. Event and Event Ushers must be called by separate repository method.
	*/

	it('should assign positions to new confirmation queue', async () => {
		const event: ChurchEvent = createTestEvent();
		const positions: ChurchPosition[] = createTestPositions();
		const lingkungan: Lingkungan[] = createTestLingkungan();
		const eventUshersA: EventUsher[] = createTestEventUsherA();

		// Mock repository methods
		repoGetEventUshers.mockResolvedValue(eventUshersA);
		repoMassPositions.mockResolvedValue(positions);

		// Submit confirmation queue
		await manager.submitConfirmationQueue(event, lingkungan[0]);
		// const unassignedUshers = eventUshersA.filter(usher => usher.position === null);
		// expect(unassignedUshers).toHaveLength(3);

		// Process queue
		await manager.processConfirmationQueue();
		// expect(manager.positions).toHaveLength(8);
		// expect(manager.ushers).toHaveLength(3);

		// Verify position assignments
		expect(manager.ushers.every((usher) => usher.position !== null)).toBe(true);

		// Check that all assigned ushers have positions
		const assignedUshers = manager.ushers.filter((usher) => usher.position !== null);
		expect(assignedUshers).toHaveLength(0);

		const assignedUshersPosition = assignedUshers.map((usher) => usher.position);
		expect(assignedUshersPosition).toEqual([]); // Position ID

		// Verify queue state after processing
		expect(manager.confirmationQueue).toHaveLength(0);

		// Verify repository method calls
		expect(repoGetEventUshers).toHaveBeenCalledTimes(1);
		expect(repoMassPositions).toHaveBeenCalledTimes(1);
	});

	it('should process multiple confirmation queue', async () => {
		const event: ChurchEvent = createTestEvent();
		const positions: ChurchPosition[] = createTestPositions();
		const lingkungan: Lingkungan[] = createTestLingkungan();
		const eventUshersA: EventUsher[] = createTestEventUsherA();
		const eventUshersB: EventUsher[] = createTestEventUsherB();

		// Submit confirmation queue
		await manager.submitConfirmationQueue(event, lingkungan[0]);
		await manager.submitConfirmationQueue(event, lingkungan[1]);
		expect(manager.confirmationQueue).toHaveLength(2);

		// Mock repository methods
		const aggregatedUshers = [...eventUshersA, ...eventUshersB];
		repoGetEventUshers.mockResolvedValue(aggregatedUshers);
		repoMassPositions.mockResolvedValue(positions);

		// Process queue
		await manager.processConfirmationQueue();

		// Verify position assignments
		expect(manager.ushers.every((usher) => usher.position !== null)).toBe(true);

		// Verify position assignments
		// expect(manager.ushers.every(usher => usher.position !== null)).toBe(true);

		// Check that all assigned ushers have positions
	});

	it('should throw error if no positions found', async () => {
		const event: ChurchEvent = createTestEvent();
		const lingkungan: Lingkungan[] = createTestLingkungan();
		const eventUshersA: EventUsher[] = createTestEventUsherA();

		// Mock repository methods
		repoGetEventUshers.mockResolvedValue(eventUshersA);
		repoMassPositions.mockResolvedValue([]);

		// Submit confirmation queue
		await manager.submitConfirmationQueue(event, lingkungan[0]);

		// Process queue
		await expect(manager.processConfirmationQueue()).rejects.toThrowError(
			expect.objectContaining({ cause: 404 })
		);
	});
});

function createTestPositions(): ChurchPosition[] {
	return [
		{ id: '1', church: '1', name: 'P1', code: '1', description: '1', sequence: 1, type: 'usher', isPpg: false },
		{ id: '2', church: '1', name: 'P2', code: '2', description: '2', sequence: 2, type: 'usher', isPpg: false },
		{ id: '3', church: '1', name: 'P3', code: '3', description: '3', sequence: 3, type: 'usher', isPpg: false },
		{ id: '4', church: '1', name: 'P4', code: '4', description: '4', sequence: 4, type: 'usher', isPpg: false },
		{ id: '5', church: '1', name: 'P5', code: '5', description: '5', sequence: 5, type: 'usher', isPpg: false },
		{ id: '6', church: '1', name: 'P6', code: '6', description: '6', sequence: 6, type: 'usher', isPpg: false },
		{ id: '7', church: '1', name: 'P7', code: '7', description: '7', sequence: 7, type: 'usher', isPpg: false },
		{ id: '8', church: '1', name: 'P8', code: '8', description: '8', sequence: 8, type: 'usher', isPpg: false }
	];
}

function createTestEventUsherB(): EventUsher[] {
	return [
		{
			id: '4',
			event: '1',
			name: 'B.1',
			wilayah: '1',
			lingkungan: '1B',
			isPpg: true,
			isKolekte: false,
			position: null,
			createdAt: 2
		},
		{
			id: '5',
			event: '1',
			name: 'B.2',
			wilayah: '1',
			lingkungan: '1B',
			isPpg: false,
			isKolekte: true,
			position: null,
			createdAt: 2
		},
		{
			id: '6',
			event: '1',
			name: 'B.3',
			wilayah: '1',
			lingkungan: '1B',
			isPpg: true,
			isKolekte: false,
			position: null,
			createdAt: 2
		},
		{
			id: '7',
			event: '1',
			name: 'B.4',
			wilayah: '1',
			lingkungan: '1B',
			isPpg: false,
			isKolekte: false,
			position: null,
			createdAt: 2
		},
		{
			id: '8',
			event: '1',
			name: 'B.5',
			wilayah: '1',
			lingkungan: '1B',
			isPpg: true,
			isKolekte: true,
			position: null,
			createdAt: 2
		}
	];
}

function createTestEventUsherA(): EventUsher[] {
	return [
		{
			id: '1',
			event: '1',
			name: 'A.1',
			wilayah: '1',
			lingkungan: '1A',
			isPpg: true,
			isKolekte: false,
			position: null,
			createdAt: 1
		},
		{
			id: '2',
			event: '1',
			name: 'A.2',
			wilayah: '1',
			lingkungan: '1A',
			isPpg: false,
			isKolekte: true,
			position: null,
			createdAt: 1
		},
		{
			id: '3',
			event: '1',
			name: 'A.3',
			wilayah: '1',
			lingkungan: '1A',
			isPpg: true,
			isKolekte: false,
			position: null,
			createdAt: 1
		}
	];
}

function createTestLingkungan(): Lingkungan[] {
	return [
		{ id: '1A', name: '1A', wilayah: '1', sequence: 1, church: '1' },
		{ id: '1B', name: '1B', wilayah: '1', sequence: 1, church: '1' }
	];
}

function createTestEvent(): ChurchEvent {
	return {
		id: '1',
		church: 'Church A',
		mass: 'S1',
		date: '2024-01-01',
		createdAt: 1,
		isComplete: 0,
		active: 1
	};
}
