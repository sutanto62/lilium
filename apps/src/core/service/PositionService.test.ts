import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import type { ChurchPosition, MassPositionView } from '$core/entities/Schedule';
import { PositionService, type CreatePositionInput } from './PositionService';
import { ServiceError } from '$core/errors/ServiceError';

describe('PositionService', () => {
	let mockRepo: ScheduleRepository;
	const churchId = 'church-1';
	const massId = 'mass-1';

	beforeEach(() => {
		mockRepo = {
			// Mass
			getMasses: vi.fn(),
			getMassById: vi.fn(),

			// Region
			listWilayahByChurch: vi.fn(),
			listLingkunganByChurch: vi.fn(),
			findLingkunganById: vi.fn(),

			// Event
			insertEvent: vi.fn(),
			createEventPic: vi.fn(),
			getEventByChurch: vi.fn(),
			listEvents: vi.fn(),
			listEventsByWeekNumber: vi.fn(),
			listEventsByDateRange: vi.fn(),
			listEventsByLingkungan: vi.fn(),
			getEventById: vi.fn(),
			updateEventById: vi.fn(),
			findEventSchedule: vi.fn(),
			deactivateEvent: vi.fn(),
			findEvent: vi.fn(),
			findEventById: vi.fn(),
			findEventByIdResponse: vi.fn(),
			editEventUshers: vi.fn(),
			findCetakJadwal: vi.fn(),
			removeEventUsher: vi.fn(),

			// Ushers
			listUsherByEvent: vi.fn(),
			findEventUshers: vi.fn(),
			listUsherByLingkungan: vi.fn(),
			getEventUshersPosition: vi.fn(),
			persistEventUshers: vi.fn(),

			// Facility
			getChurches: vi.fn(),
			findChurchById: vi.fn(),
			getZones: vi.fn(),
			getZonesByEvent: vi.fn(),
			findZoneGroupsByEvent: vi.fn(),
			findPositionByChurch: vi.fn(),
			listPositionByMass: vi.fn(),
			createPosition: vi.fn(),
			updatePosition: vi.fn(),
			softDeletePosition: vi.fn(),
			reorderZonePositions: vi.fn(),

			// Authentication
			getUserByEmail: vi.fn(),
			findUsersByChurch: vi.fn()
		};
	});

	describe('retrievePositionsByMass', () => {
		it('throws validation error when massId is empty', async () => {
			const service = new PositionService(churchId, mockRepo);

			await expect(service.retrievePositionsByMass('')).rejects.toBeInstanceOf(ServiceError);
		});

		it('delegates to repository.listPositionByMass with correct parameters', async () => {
			const service = new PositionService(churchId, mockRepo);

			const repoResult: ChurchPosition[] = [];
			vi.mocked(mockRepo.listPositionByMass).mockResolvedValue(repoResult);

			const result = await service.retrievePositionsByMass(massId);

			expect(mockRepo.listPositionByMass).toHaveBeenCalledWith(churchId, massId);
			expect(result).toEqual([]);
		});

		it('maps ChurchPosition[] to MassPositionView[] correctly', async () => {
			const service = new PositionService(churchId, mockRepo);

			const mockPositions: (ChurchPosition & {
				_zoneId?: string;
				_zoneName?: string;
				_zoneGroupId?: string | null;
				_zoneGroupName?: string | null;
			})[] = [
				{
					id: 'pos-1',
					church: churchId,
					zone: 'Zone A',
					name: 'Usher Pintu Utama',
					code: 'UPU',
					description: null,
					isPpg: false,
					sequence: 1,
					type: 'usher',
					active: 1,
					_zoneId: 'zone-1',
					_zoneName: 'Zone A',
					_zoneGroupId: 'group-1',
					_zoneGroupName: 'Group 1'
				}
			];

			vi.mocked(mockRepo.listPositionByMass).mockResolvedValue(mockPositions as ChurchPosition[]);

			const result = await service.retrievePositionsByMass(massId);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				massId,
				zoneId: 'zone-1',
				zoneName: 'Zone A',
				zoneGroupId: 'group-1',
				zoneGroupName: 'Group 1',
				positionId: 'pos-1',
				positionName: 'Usher Pintu Utama',
				positionType: 'usher',
				isPpg: false,
				positionSequence: 1,
				positionActive: 1
			});
		});
	});

	describe('createPositionForMass', () => {
		const zoneId = 'zone-1';

		it('throws validation error when required fields are missing', async () => {
			const service = new PositionService(churchId, mockRepo);

			await expect(
				service.createPositionForMass('', zoneId, {
					name: 'Usher Pintu Utama',
					type: 'usher'
				})
			).rejects.toBeInstanceOf(ServiceError);

			await expect(
				service.createPositionForMass(massId, '', {
					name: 'Usher Pintu Utama',
					type: 'usher'
				})
			).rejects.toBeInstanceOf(ServiceError);

			await expect(
				service.createPositionForMass(massId, zoneId, { type: 'usher' } as CreatePositionInput)
			).rejects.toBeInstanceOf(ServiceError);

			await expect(
				service.createPositionForMass(massId, zoneId, {
					name: 'Usher Pintu Utama'
				} as CreatePositionInput)
			).rejects.toBeInstanceOf(ServiceError);
		});

		it('creates position and returns ChurchPosition', async () => {
			const service = new PositionService(churchId, mockRepo);

			const input = {
				name: 'Usher Pintu Utama',
				type: 'usher' as const,
				code: 'UPU',
				description: 'Usher di pintu utama',
				isPpg: false,
				sequence: 1
			};

			const expectedPosition: ChurchPosition = {
				id: 'pos-1',
				church: churchId,
				zone: 'Zone A',
				name: input.name,
				code: input.code,
				description: input.description,
				isPpg: input.isPpg,
				sequence: input.sequence,
				type: input.type,
				active: 1
			};

			vi.mocked(mockRepo.createPosition).mockResolvedValue(expectedPosition);

			const result = await service.createPositionForMass(massId, zoneId, input);

			expect(mockRepo.createPosition).toHaveBeenCalledWith({
				zone: zoneId,
				name: input.name,
				type: input.type,
				code: input.code,
				description: input.description,
				isPpg: input.isPpg,
				sequence: input.sequence
			});
			expect(result).toEqual(expectedPosition);
		});
	});

	describe('editPosition', () => {
		it('throws validation error when positionId is empty', async () => {
			const service = new PositionService(churchId, mockRepo);

			await expect(service.editPosition('', { name: 'Updated' })).rejects.toBeInstanceOf(ServiceError);
		});

		it('throws validation error when patch is empty', async () => {
			const service = new PositionService(churchId, mockRepo);

			await expect(service.editPosition('pos-1', {})).rejects.toBeInstanceOf(ServiceError);
		});

		it('updates position and returns ChurchPosition', async () => {
			const service = new PositionService(churchId, mockRepo);
			const patch = { name: 'Usher Pintu Utama (Updated)', isPpg: true };
			const updated: ChurchPosition = {
				id: 'pos-1',
				church: churchId,
				zone: 'Zone A',
				name: patch.name,
				code: 'UPU',
				description: null,
				isPpg: patch.isPpg!,
				sequence: 1,
				type: 'usher',
				active: 1
			};

			vi.mocked(mockRepo.updatePosition).mockResolvedValue(updated);

			const result = await service.editPosition('pos-1', patch);

			expect(mockRepo.updatePosition).toHaveBeenCalledWith('pos-1', patch);
			expect(result).toEqual(updated);
		});
	});

	describe('deactivatePosition', () => {
		it('throws validation error when positionId is empty', async () => {
			const service = new PositionService(churchId, mockRepo);

			await expect(service.deactivatePosition('')).rejects.toBeInstanceOf(ServiceError);
		});

		it('delegates to repository.softDeletePosition', async () => {
			const service = new PositionService(churchId, mockRepo);
			const positionId = 'pos-1';

			vi.mocked(mockRepo.softDeletePosition).mockResolvedValue(undefined);

			await service.deactivatePosition(positionId);

			expect(mockRepo.softDeletePosition).toHaveBeenCalledWith(positionId);
		});
	});

	describe('reorderZonePositions', () => {
		it('throws validation error when zoneId is empty', async () => {
			const service = new PositionService(churchId, mockRepo);

			await expect(
				service.reorderZonePositions('', [{ id: 'pos-1', sequence: 1 }])
			).rejects.toBeInstanceOf(ServiceError);
		});

		it('throws validation error when items is empty', async () => {
			const service = new PositionService(churchId, mockRepo);

			await expect(service.reorderZonePositions('zone-1', [])).rejects.toBeInstanceOf(ServiceError);
		});

		it('delegates to repository.reorderZonePositions with correct parameters', async () => {
			const service = new PositionService(churchId, mockRepo);
			const zoneId = 'zone-1';
			const items = [
				{ id: 'pos-1', sequence: 1 },
				{ id: 'pos-2', sequence: 2 }
			];

			vi.mocked(mockRepo.reorderZonePositions).mockResolvedValue(undefined);

			await service.reorderZonePositions(zoneId, items);

			expect(mockRepo.reorderZonePositions).toHaveBeenCalledWith(zoneId, items);
		});
	});
});

