import type { Event as ChurchEvent, EventUsher } from '$core/entities/Event';
import type { ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import { repo } from '$src/lib/server/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueueManager } from '../QueueManager';

describe('QueueManager', () => {
    const repoGetEventUshers = vi.spyOn(repo, 'getEventUshers');
    const repoMassPositions = vi.spyOn(repo, 'getPositionsByMass');
    const repoEditEventUshers = vi.spyOn(repo, 'editEventUshers');
    const manager = QueueManager.getInstance();

    beforeEach(() => {
        manager.isPpgEnabled = false;
    });

    it('should filter out PPG positions when ppg is disabled', async () => {
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();

        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        await manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();
        await manager.reset();

        expect(manager.eventPositions.every(pos => !pos.isPpg)).toBe(true);
    });

    it('should include PPG positions when ppg is enabled', async () => {
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();
        manager.isPpgEnabled = true;

        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        await manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();
        await manager.reset();

        expect(manager.eventPositions.length).toBe(positions.length);
    });

    it('should assign positions with zone and positionName', async () => {
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();

        manager.isPpgEnabled = true;
        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        await manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();
        await manager.reset();

        expect(manager.assignedUshers[0]).toHaveProperty('zone');
        expect(manager.assignedUshers[0]).toHaveProperty('positionName');
    });

    it('should distribute positions by role if ppg is enabled', async () => {
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();

        manager.isPpgEnabled = true;
        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        await manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();
        await manager.reset();

        // Verify positions are assigned in sequence
        const assignedPositions = manager.assignedUshers.map(usher => usher.positionName);
        expect(assignedPositions).toEqual(['Z1.P4PPG', 'Z1.P1', 'Z1.P2', 'Z1.P3']);
    });

    it('should distribute positions to non-ppg positions only if ppg is disabled', async () => {
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();

        manager.isPpgEnabled = false;
        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        await manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();
        await manager.reset();

        // Verify positions are assigned in sequence
        const assignedPositions = manager.assignedUshers.map(usher => usher.positionName);
        expect(assignedPositions).toEqual(['Z1.P1', 'Z1.P2', 'Z1.P3', 'Z2.P1']);
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
});



describe('latestPositionId', () => {
    const manager = QueueManager.getInstance();
    const latestPositionId = (arr: string[]) => (manager as any).findLatestUniquePositionId(arr);

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
        { id: '1', church: '1', name: 'Z1.P1', code: '1', description: '1', sequence: 1, type: 'usher', isPpg: false, zone: '1' },
        { id: '2', church: '1', name: 'Z1.P2', code: '2', description: '2', sequence: 2, type: 'usher', isPpg: false, zone: '1' },
        { id: '3', church: '1', name: 'Z1.P3', code: '3', description: '3', sequence: 3, type: 'usher', isPpg: false, zone: '1' },
        { id: '4', church: '1', name: 'Z1.P4PPG', code: '4', description: '4', sequence: 4, type: 'usher', isPpg: true, zone: '1' },
        { id: '5', church: '1', name: 'Z2.P1', code: '5', description: '5', sequence: 1, type: 'usher', isPpg: false, zone: '2' },
        { id: '6', church: '1', name: 'Z2.P2', code: '6', description: '6', sequence: 2, type: 'usher', isPpg: false, zone: '2' },
        { id: '7', church: '1', name: 'Z2.P3', code: '7', description: '7', sequence: 3, type: 'usher', isPpg: false, zone: '2' },
        { id: '8', church: '1', name: 'Z2.P4PPG', code: '8', description: '8', sequence: 4, type: 'usher', isPpg: true, zone: '2' },
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
            isPpg: false,
            isKolekte: true,
            position: null,
            createdAt: 1
        },
        {
            id: '4',
            event: '1',
            name: 'A.4',
            wilayah: '1',
            lingkungan: '1A',
            isPpg: false,
            isKolekte: true,
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
            isPpg: false,
            isKolekte: true,
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
            isKolekte: true,
            position: null,
            createdAt: 2
        },
        {
            id: '8',
            event: '1',
            name: 'B.5',
            wilayah: '1',
            lingkungan: '1B',
            isPpg: false,
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
