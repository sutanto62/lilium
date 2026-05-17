import type { ChurchEvent, EventUsher } from '$core/entities/Event';
import type { Church, ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueueManager } from '../QueueManager';

// Lightweight mock repo — avoids importing the real DB module (which requires WebSocket)
const repo = {
    findEventUshers: vi.fn(),
    listPositionByMass: vi.fn(),
    editEventUshers: vi.fn(),
    findChurchById: vi.fn(),
} as unknown as ScheduleRepository;

const repoGetEventUshers = vi.mocked(repo.findEventUshers);
const repoMassPositions = vi.mocked(repo.listPositionByMass);
const repoEditEventUshers = vi.mocked(repo.editEventUshers);
const repoFindChurch = vi.mocked(repo.findChurchById);

/** Creates a fresh QueueManager per test to avoid shared state. */
function createManager(
    isPpgEnabled: boolean,
    isRoundRobinEnabled = false,
    requirePpg = true
): QueueManager {
    return QueueManager.createInstance(
        repo,
        isPpgEnabled,
        isRoundRobinEnabled,
        async (_church: Church) => requirePpg
    );
}

describe('QueueManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        repoFindChurch.mockResolvedValue({ id: '1', code: 'CH1', requirePpg: 1 } as any);
        repoEditEventUshers.mockResolvedValue({ success: true, updatedCount: 1 } as any);
    });

    it('should filter out PPG positions when ppg is disabled', async () => {
        const manager = createManager(/* isPpgEnabled */ false);
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();

        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();

        // When isPpgEnabled is false, all assigned positions should be non-PPG
        expect(manager.assignedUshers.every(u => {
            const pos = positions.find(p => p.id === u.position);
            return pos && !pos.isPpg;
        })).toBe(true);
    });

    it('should include PPG positions when ppg is enabled', async () => {
        const manager = createManager(/* isPpgEnabled */ true);
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();

        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();

        // PPG usher (A.1) should have a PPG position
        const ppgUsher = manager.assignedUshers.find(u => u.name === 'A.1');
        expect(ppgUsher).toBeDefined();
        const ppgPos = positions.find(p => p.id === ppgUsher!.position);
        expect(ppgPos?.isPpg).toBe(true);
    });

    it('should assign positions with zone and positionName', async () => {
        const manager = createManager(/* isPpgEnabled */ true);
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();

        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();

        expect(manager.assignedUshers[0]).toHaveProperty('zone');
        expect(manager.assignedUshers[0]).toHaveProperty('positionName');
    });

    it('should distribute positions by role if ppg is enabled', async () => {
        const manager = createManager(/* isPpgEnabled */ true);
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();

        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();

        const assignedPositions = manager.assignedUshers.map(usher => usher.positionName);
        // PPG usher → Z1.P4PPG; non-PPG ushers assigned in sequence order (seq=1 first across zones,
        // then seq=2, …) so zone interleaving: Z1.P1(seq=1), Z2.P1(seq=1), Z1.P2(seq=2)
        expect(assignedPositions).toEqual(['Z1.P4PPG', 'Z1.P1', 'Z2.P1', 'Z1.P2']);
    });

    it('should distribute positions to non-ppg positions only if ppg is disabled', async () => {
        const manager = createManager(/* isPpgEnabled */ false);
        const event = createTestEvent();
        const lingkungan = createTestLingkungan()[0];
        const positions = createTestPositions();
        const ushers = createUshersLingkunganA();

        repoGetEventUshers.mockResolvedValue(ushers);
        repoMassPositions.mockResolvedValue(positions);

        manager.submitConfirmationQueue(event, lingkungan);
        await manager.processQueue();

        const assignedPositions = manager.assignedUshers.map(usher => usher.positionName);
        // All ushers (including PPG) assigned to non-PPG pool, sorted by sequence across zones:
        // Z1.P1(seq=1), Z2.P1(seq=1), Z1.P2(seq=2), Z2.P2(seq=2), …
        expect(assignedPositions).toEqual(['Z1.P1', 'Z2.P1', 'Z1.P2', 'Z2.P2']);
    });

    it('should submit confirmation queue', () => {
        const manager = createManager(false);
        const event: ChurchEvent = createTestEvent();
        const lingkungan: Lingkungan[] = createTestLingkungan();

        // 1st Lingkungan submit their ushers
        manager.submitConfirmationQueue(event, lingkungan[0]);
        expect((manager as any).confirmationQueue).toHaveLength(1);

        // 2nd Lingkungan submit their ushers
        manager.submitConfirmationQueue(event, lingkungan[1]);
        expect((manager as any).confirmationQueue).toHaveLength(2);
    });

    it('should throw error if no positions found', async () => {
        const manager = createManager(false);
        const event: ChurchEvent = createTestEvent();
        const lingkungan: Lingkungan[] = createTestLingkungan();
        const eventUshersA: EventUsher[] = createUshersLingkunganA();

        repoGetEventUshers.mockResolvedValue(eventUshersA);
        repoMassPositions.mockResolvedValue([]);

        manager.submitConfirmationQueue(event, lingkungan[0]);
        await expect(manager.processQueue()).rejects.toThrow(
            expect.objectContaining({ cause: 404 })
        );
    });
});



describe('latestPositionId', () => {
    // Access private method via any cast — acceptable for unit-testing internals
    const manager = createManager(false);
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
        { id: '1', church: '1', name: 'Z1.P1', code: '1', description: '1', sequence: 1, type: 'usher', isPpg: false, zone: '1', active: 1 },
        { id: '2', church: '1', name: 'Z1.P2', code: '2', description: '2', sequence: 2, type: 'usher', isPpg: false, zone: '1', active: 1 },
        { id: '3', church: '1', name: 'Z1.P3', code: '3', description: '3', sequence: 3, type: 'usher', isPpg: false, zone: '1', active: 1 },
        { id: '4', church: '1', name: 'Z1.P4PPG', code: '4', description: '4', sequence: 4, type: 'usher', isPpg: true, zone: '1', active: 1 },
        { id: '5', church: '1', name: 'Z2.P1', code: '5', description: '5', sequence: 1, type: 'usher', isPpg: false, zone: '2', active: 1 },
        { id: '6', church: '1', name: 'Z2.P2', code: '6', description: '6', sequence: 2, type: 'usher', isPpg: false, zone: '2', active: 1 },
        { id: '7', church: '1', name: 'Z2.P3', code: '7', description: '7', sequence: 3, type: 'usher', isPpg: false, zone: '2', active: 1 },
        { id: '8', church: '1', name: 'Z2.P4PPG', code: '8', description: '8', sequence: 4, type: 'usher', isPpg: true, zone: '2', active: 1 },
    ];
}

function createUshersLingkunganA(): EventUsher[] {
    return [
        { id: '1', event: '1', name: 'A.1', wilayah: '1', lingkungan: '1A', isPpg: true,  isKolekte: false, position: null, createdAt: 1 },
        { id: '2', event: '1', name: 'A.2', wilayah: '1', lingkungan: '1A', isPpg: false, isKolekte: true,  position: null, createdAt: 1 },
        { id: '3', event: '1', name: 'A.3', wilayah: '1', lingkungan: '1A', isPpg: false, isKolekte: true,  position: null, createdAt: 1 },
        { id: '4', event: '1', name: 'A.4', wilayah: '1', lingkungan: '1A', isPpg: false, isKolekte: true,  position: null, createdAt: 1 },
    ];
}

function createUshersLingkunganB(): EventUsher[] {
    return [
        { id: '4',  event: '1', name: 'B.1', wilayah: '1', lingkungan: '1B', isPpg: true,  isKolekte: false, position: null, createdAt: 2 },
        { id: '5',  event: '1', name: 'B.2', wilayah: '1', lingkungan: '1B', isPpg: false, isKolekte: true,  position: null, createdAt: 2 },
        { id: '6',  event: '1', name: 'B.3', wilayah: '1', lingkungan: '1B', isPpg: false, isKolekte: true,  position: null, createdAt: 2 },
        { id: '7',  event: '1', name: 'B.4', wilayah: '1', lingkungan: '1B', isPpg: false, isKolekte: true,  position: null, createdAt: 2 },
        { id: '8',  event: '1', name: 'B.5', wilayah: '1', lingkungan: '1B', isPpg: false, isKolekte: true,  position: null, createdAt: 2 },
    ];
}

function createUshersLingkunganC(): EventUsher[] {
    return [
        { id: '9',  event: '1', name: 'B.1', wilayah: '1', lingkungan: '1C', isPpg: true,  isKolekte: false, position: null, createdAt: 2 },
        { id: '10', event: '1', name: 'B.2', wilayah: '1', lingkungan: '1C', isPpg: false, isKolekte: true,  position: null, createdAt: 2 },
        { id: '11', event: '1', name: 'B.3', wilayah: '1', lingkungan: '1C', isPpg: true,  isKolekte: false, position: null, createdAt: 2 },
        { id: '12', event: '1', name: 'B.4', wilayah: '1', lingkungan: '1C', isPpg: false, isKolekte: false, position: null, createdAt: 2 },
        { id: '13', event: '1', name: 'B.5', wilayah: '1', lingkungan: '1C', isPpg: true,  isKolekte: true,  position: null, createdAt: 2 },
        { id: '14', event: '1', name: 'B.6', wilayah: '1', lingkungan: '1C', isPpg: true,  isKolekte: true,  position: null, createdAt: 2 },
        { id: '15', event: '1', name: 'B.7', wilayah: '1', lingkungan: '1C', isPpg: true,  isKolekte: true,  position: null, createdAt: 2 },
    ];
}

function createTestLingkungan(): Lingkungan[] {
    return [
        { id: '1A', name: '1A', wilayah: '1', wilayahName: 'Wilayah 1', sequence: 1, church: '1', active: 1 },
        { id: '1B', name: '1B', wilayah: '1', wilayahName: 'Wilayah 1', sequence: 1, church: '1', active: 1 },
        { id: '1C', name: '1C', wilayah: '1', wilayahName: 'Wilayah 1', sequence: 1, church: '1', active: 1 },
    ];
}

function createTestEvent(): ChurchEvent {
    return { id: '1', church: 'Church A', mass: 'S1', date: '2024-01-01', createdAt: 1, isComplete: 0, active: 1, weekNumber: 1 };
}
