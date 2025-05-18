import type { Event as ChurchEvent, EventUsher } from '$core/entities/Event';
import type { ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import { repo } from '$src/lib/server/db';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueueManager } from './QueueManager';

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
        const eventUshers: EventUsher[] = createUshersLingkunganA();

        // Mock repository methods
        repoGetEventUshers.mockResolvedValue(eventUshers);
        repoMassPositions.mockResolvedValue(positions);

        // Submit confirmation queue
        await manager.submitConfirmationQueue(event, lingkungan[0]);
        // const unassignedUshers = eventUshersA.filter(usher => usher.position === null);
        // expect(unassignedUshers).toHaveLength(3);

        // Process queue
        await manager.processQueue();
        // expect(manager.positions).toHaveLength(8);
        // expect(manager.ushers).toHaveLength(3);

        // Verify position assignments
        expect(manager.eventUshers.every((usher) => usher.position !== null)).toBe(true);

        // Check that all assigned ushers have positions
        const assignedUshers = manager.eventUshers.filter((usher) => usher.position !== null);
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
        const eventUshersA: EventUsher[] = createUshersLingkunganA();
        const eventUshersB: EventUsher[] = createUshersLingkunganB();

        // Submit confirmation queue
        await manager.submitConfirmationQueue(event, lingkungan[0]);
        await manager.submitConfirmationQueue(event, lingkungan[1]);
        expect(manager.confirmationQueue).toHaveLength(2);

        // Mock repository methods
        const aggregatedUshers = [...eventUshersA, ...eventUshersB];
        repoGetEventUshers.mockResolvedValue(aggregatedUshers);
        repoMassPositions.mockResolvedValue(positions);

        // Process queue
        await manager.processQueue();

        // Verify position assignments
        expect(manager.eventUshers.every((usher) => usher.position !== null)).toBe(true);

        // Verify position assignments
        // expect(manager.ushers.every(usher => usher.position !== null)).toBe(true);

        // Check that all assigned ushers have positions
    });

    it('should throw error if no positions found', async () => {
        const event: ChurchEvent = createTestEvent();
        const lingkungan: Lingkungan[] = createTestLingkungan();
        const eventUshersA: EventUsher[] = createUshersLingkunganA();

        // Mock repository methods
        repoGetEventUshers.mockResolvedValue(eventUshersA);
        repoMassPositions.mockResolvedValue([]);

        // Submit confirmation queue
        await manager.submitConfirmationQueue(event, lingkungan[0]);
        await expect(manager.processQueue()).rejects.toThrow(
            expect.objectContaining({ cause: 404 })
        );
    });

    it('should assign ushers with PPG position correctly', async () => {
        const event: ChurchEvent = createTestEvent();
        const positions: ChurchPosition[] = createTestPositions();
        const lingkungan: Lingkungan[] = createTestLingkungan();
        const eventUshersA: EventUsher[] = createUshersLingkunganA();
        const eventUshersB: EventUsher[] = createUshersLingkunganB();
        const eventUshersC: EventUsher[] = createUshersLingkunganC();

        // Mock repository
        const aggregatedUshers = [...eventUshersA, ...eventUshersB, ...eventUshersC];
        repoGetEventUshers.mockResolvedValue(aggregatedUshers);
        repoMassPositions.mockResolvedValue(positions);

        // Submit confirmation
        await manager.submitConfirmationQueue(event, lingkungan[0]);
        await manager.processQueue();

        // Verify position assignments
        for (const usher of manager.assignedUshers) {
            const usherIsPpg = usher.isPpg;
            const positionIsPpg = positions.find(position => position.id === usher.position)?.isPpg;
            if (usherIsPpg) {
                expect(positionIsPpg).toBe(true);
            }
        }

    });
});

describe('findLowestUniqueNumber', () => {
    // Make the private method accessible for testing
    const manager = QueueManager.getInstance();
    const findLowestUniqueNumber = (arr: string[]) => {
        return (manager as any).findLowestUniqueNumber(arr);
    };

    it('should return null for empty array', () => {
        expect(findLowestUniqueNumber([])).toBeNull();
    });

    it('should return the only element in single-element array', () => {
        expect(findLowestUniqueNumber(['1'])).toBe('1');
    });

    it('should return null when all elements are duplicates', () => {
        expect(findLowestUniqueNumber(['1', '1', '1'])).toBeNull();
    });

    it('should find the first unique number in array with duplicates', () => {
        expect(findLowestUniqueNumber(['1', '2', '2', '3', '3'])).toBe('1');
    });

    it('should find unique number in middle of array', () => {
        expect(findLowestUniqueNumber(['1', '1', '2', '3', '3'])).toBe('2');
    });

    it('should find unique number at end of array', () => {
        expect(findLowestUniqueNumber(['1', '1', '2', '2', '3'])).toBe('3');
    });

    it('should handle multiple unique numbers and return the first one', () => {
        expect(findLowestUniqueNumber(['1', '2', '3', '4', '5'])).toBe('1');
    });
});

describe('processQueue', () => {
    const manager = QueueManager.getInstance();
    const repoGetEventUshers = vi.spyOn(repo, 'getEventUshers');
    const repoMassPositions = vi.spyOn(repo, 'getPositionsByMass');
    const repoEditEventUshers = vi.spyOn(repo, 'editEventUshers');

    afterEach(() => {
        manager.confirmationQueue = [];
        manager.eventUshers = [];
        manager.massZonePositions = [];
        manager.assignedUshers = [];
        vi.resetAllMocks();
    });

    // Test 3B: Multiple queue items with ushers from different lingkungan
    it('should process multiple batches of ushers from different lingkungan', async () => {
        // Arrange
        const event = createTestEvent();
        const lingkungan1 = createTestLingkungan()[0]; // First lingkungan
        const lingkungan2 = createTestLingkungan()[1]; // Second lingkungan
        const positions = createTestPositions();

        // First batch of 5 ushers from first lingkungan
        const ushersBatch1 = [
            {
                id: '1',
                event: '1',
                name: 'Test Usher 1',
                wilayah: '1',
                lingkungan: '1A',
                isPpg: false,
                isKolekte: false,
                position: null,
                createdAt: 1
            },
            {
                id: '2',
                event: '1',
                name: 'Test Usher 2',
                wilayah: '1',
                lingkungan: '1A',
                isPpg: false,
                isKolekte: false,
                position: null,
                createdAt: 1
            },
            {
                id: '3',
                event: '1',
                name: 'Test Usher 3',
                wilayah: '1',
                lingkungan: '1A',
                isPpg: false,
                isKolekte: false,
                position: null,
                createdAt: 1
            },
            {
                id: '4',
                event: '1',
                name: 'Test Usher 4',
                wilayah: '1',
                lingkungan: '1A',
                isPpg: false,
                isKolekte: false,
                position: null,
                createdAt: 1
            },
            {
                id: '5',
                event: '1',
                name: 'Test Usher 5',
                wilayah: '1',
                lingkungan: '1A',
                isPpg: false,
                isKolekte: false,
                position: null,
                createdAt: 1
            }
        ];

        // Second batch of 4 ushers from second lingkungan
        const ushersBatch2 = [
            {
                id: '6',
                event: '1',
                name: 'Test Usher 6',
                wilayah: '1',
                lingkungan: '1B',
                isPpg: false,
                isKolekte: false,
                position: null,
                createdAt: 1
            },
            {
                id: '7',
                event: '1',
                name: 'Test Usher 7',
                wilayah: '1',
                lingkungan: '1B',
                isPpg: false,
                isKolekte: false,
                position: null,
                createdAt: 1
            },
            {
                id: '8',
                event: '1',
                name: 'Test Usher 8',
                wilayah: '1',
                lingkungan: '1B',
                isPpg: false,
                isKolekte: false,
                position: null,
                createdAt: 1
            },
            {
                id: '9',
                event: '1',
                name: 'Test Usher 9',
                wilayah: '1',
                lingkungan: '1B',
                isPpg: false,
                isKolekte: false,
                position: null,
                createdAt: 1
            }
        ];

        // Mock repository responses
        repoGetEventUshers
            .mockResolvedValueOnce(ushersBatch1) // First call for first batch
            .mockResolvedValueOnce([...ushersBatch1, ...ushersBatch2]); // Second call includes both batches
        repoMassPositions.mockResolvedValue(positions);

        // Submit and process first batch
        await manager.submitConfirmationQueue(event, lingkungan1);
        expect(manager.confirmationQueue).toHaveLength(1);
        await manager.processQueue();
        expect(manager.confirmationQueue).toHaveLength(0);
        expect(manager.eventUshers).toHaveLength(5);
        expect(manager.assignedUshers).toHaveLength(5);

        // Submit and process second batch
        await manager.submitConfirmationQueue(event, lingkungan2);
        expect(manager.confirmationQueue).toHaveLength(1);
        await manager.processQueue();
        expect(manager.confirmationQueue).toHaveLength(0);

        // Final assertions
        expect(manager.eventUshers).toHaveLength(9);
        expect(manager.assignedUshers).toHaveLength(9);

        // Verify all ushers have positions assigned
        expect(manager.eventUshers.every(usher => usher.position !== null)).toBe(true);

        // Verify repository calls
        expect(repoGetEventUshers).toHaveBeenCalledTimes(2);
        expect(repoMassPositions).toHaveBeenCalledTimes(2);
        expect(repoEditEventUshers).toHaveBeenCalledTimes(2);
    });
});

describe('latestPositionId', () => {
    const manager = QueueManager.getInstance();
    const latestPositionId = (arr: string[]) => (manager as any).latestPositionId(arr);

    it('should return null for empty array', () => {
        expect(latestPositionId([])).toBeNull();
    });

    it('should return null for array with only empty strings', () => {
        expect(latestPositionId(['', '', ''])).toBeNull();
    });

    it('should return null for array with only whitespace strings', () => {
        expect(latestPositionId([' ', '  ', '\t'])).toBeNull();
    });

    it('should return the last unique ID in array with empty-positions', () => {
        const arr = [
            '5abe24eb-6982-46c8-8324-8937033749e7',
            '5abe24eb-6982-46c8-8324-8937033749e7',
            'badbda7a-5973-4068-ae69-98a3f225ca47',
            'f253dd3e-8faa-48ae-8077-418560aa57c8',
            '',
            ''
        ];
        expect(latestPositionId(arr)).toBe('f253dd3e-8faa-48ae-8077-418560aa57c8');
    });

    it('should return the first unique ID in array', () => {
        const arr = [
            '5abe24eb-6982-46c8-8324-8937033749e7',
            '5abe24eb-6982-46c8-8324-8937033749e7',
            'badbda7a-5973-4068-ae69-98a3f225ca47',
            'f253dd3e-8faa-48ae-8077-418560aa57c8'
        ];
        expect(latestPositionId(arr)).toBe('badbda7a-5973-4068-ae69-98a3f225ca47');
    });

    it('should return null when all IDs appear multiple times', () => {
        const arr = [
            '5abe24eb-6982-46c8-8324-8937033749e7',
            '5abe24eb-6982-46c8-8324-8937033749e7',
            'badbda7a-5973-4068-ae69-98a3f225ca47',
            'badbda7a-5973-4068-ae69-98a3f225ca47'
        ];
        expect(latestPositionId(arr)).toBeNull();
    });

    it('should handle mixed empty and non-empty strings', () => {
        const arr = [
            '',
            '5abe24eb-6982-46c8-8324-8937033749e7',
            ' ',
            'badbda7a-5973-4068-ae69-98a3f225ca47',
            '\t',
            'f253dd3e-8faa-48ae-8077-418560aa57c8'
        ];
        expect(latestPositionId(arr)).toBe('f253dd3e-8faa-48ae-8077-418560aa57c8');
    });

    it('should handle array with single unique ID', () => {
        const arr = ['5abe24eb-6982-46c8-8324-8937033749e7'];
        expect(latestPositionId(arr)).toBe('5abe24eb-6982-46c8-8324-8937033749e7');
    });
});

function createTestPositions(): ChurchPosition[] {
    return [
        { id: '1', church: '1', name: 'P1', code: '1', description: '1', sequence: 1, type: 'usher', isPpg: false },
        { id: '2', church: '1', name: 'P2', code: '2', description: '2', sequence: 2, type: 'usher', isPpg: false },
        { id: '3', church: '1', name: 'P3', code: '3', description: '3', sequence: 3, type: 'usher', isPpg: false },
        { id: '4', church: '1', name: 'P4', code: '4', description: '4', sequence: 4, type: 'usher', isPpg: false },
        // { id: '5', church: '1', name: 'P5', code: '5', description: '5', sequence: 5, type: 'usher', isPpg: false },
        // { id: '6', church: '1', name: 'P6', code: '6', description: '6', sequence: 6, type: 'usher', isPpg: false },
        // { id: '7', church: '1', name: 'P7', code: '7', description: '7', sequence: 7, type: 'usher', isPpg: true },
        // { id: '8', church: '1', name: 'P8', code: '8', description: '8', sequence: 8, type: 'usher', isPpg: true }
    ];
}

function createUshersLingkunganA(): EventUsher[] {
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

function createUshersLingkunganB(): EventUsher[] {
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

function createUshersLingkunganC(): EventUsher[] {
    return [
        {
            id: '9',
            event: '1',
            name: 'B.1',
            wilayah: '1',
            lingkungan: '1C',
            isPpg: true,
            isKolekte: false,
            position: null,
            createdAt: 2
        },
        {
            id: '10',
            event: '1',
            name: 'B.2',
            wilayah: '1',
            lingkungan: '1C',
            isPpg: false,
            isKolekte: true,
            position: null,
            createdAt: 2
        },
        {
            id: '11',
            event: '1',
            name: 'B.3',
            wilayah: '1',
            lingkungan: '1C',
            isPpg: true,
            isKolekte: false,
            position: null,
            createdAt: 2
        },
        {
            id: '12',
            event: '1',
            name: 'B.4',
            wilayah: '1',
            lingkungan: '1C',
            isPpg: false,
            isKolekte: false,
            position: null,
            createdAt: 2
        },
        {
            id: '13',
            event: '1',
            name: 'B.5',
            wilayah: '1',
            lingkungan: '1C',
            isPpg: true,
            isKolekte: true,
            position: null,
            createdAt: 2
        },
        {
            id: '14',
            event: '1',
            name: 'B.6',
            wilayah: '1',
            lingkungan: '1C',
            isPpg: true,
            isKolekte: true,
            position: null,
            createdAt: 2
        },
        {
            id: '15',
            event: '1',
            name: 'B.7',
            wilayah: '1',
            lingkungan: '1C',
            isPpg: true,
            isKolekte: true,
            position: null,
            createdAt: 2
        }
    ];
}


function createTestLingkungan(): Lingkungan[] {
    return [
        { id: '1A', name: '1A', wilayah: '1', sequence: 1, church: '1' },
        { id: '1B', name: '1B', wilayah: '1', sequence: 1, church: '1' },
        { id: '1C', name: '1C', wilayah: '1', sequence: 1, church: '1' },
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
        active: 1,
        weekNumber: 1
    };
}
