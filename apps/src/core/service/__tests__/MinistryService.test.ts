import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MinistryRepository } from '$core/repositories/MinistryRepository';
import type { Ministry, MinistryRole } from '$core/entities/Ministry';
import { MinistryService } from '../MinistryService';
import { ServiceError, ServiceErrorType } from '$core/errors/ServiceError';

const makeMinistry = (overrides: Partial<Ministry> = {}): Ministry => ({
	id: 'min-usher',
	name: 'Penerima Tamu',
	code: 'USHER',
	description: null,
	requiresStation: true,
	active: true,
	...overrides
});

const makeRole = (overrides: Partial<MinistryRole> = {}): MinistryRole => ({
	id: 'role-regular',
	ministryId: 'min-usher',
	name: 'Regular',
	code: 'REGULAR',
	isSpecialCollection: false,
	active: true,
	...overrides
});

describe('MinistryService', () => {
	let mockRepo: MinistryRepository;

	beforeEach(() => {
		mockRepo = {
			listMinistries: vi.fn(),
			listRolesByMinistry: vi.fn(),
			findRoleByCode: vi.fn(),
			findMinistryByCode: vi.fn()
		};
	});

	describe('listMinistries', () => {
		it('delegates to repository and returns ministry list', async () => {
			const ministries = [makeMinistry(), makeMinistry({ id: 'min-peta', code: 'PETA', name: 'PETA' })];
			vi.mocked(mockRepo.listMinistries).mockResolvedValue(ministries);

			const service = new MinistryService(mockRepo);
			const result = await service.listMinistries();

			expect(mockRepo.listMinistries).toHaveBeenCalledOnce();
			expect(result).toEqual(ministries);
		});

		it('returns empty array when no ministries exist', async () => {
			vi.mocked(mockRepo.listMinistries).mockResolvedValue([]);

			const service = new MinistryService(mockRepo);
			const result = await service.listMinistries();

			expect(result).toHaveLength(0);
		});
	});

	describe('resolveRoleByCode', () => {
		it('returns a MinistryRole when codes are found', async () => {
			const role = makeRole();
			vi.mocked(mockRepo.findRoleByCode).mockResolvedValue(role);

			const service = new MinistryService(mockRepo);
			const result = await service.resolveRoleByCode('USHER', 'REGULAR');

			expect(mockRepo.findRoleByCode).toHaveBeenCalledWith('USHER', 'REGULAR');
			expect(result).toEqual(role);
		});

		it('throws notFound when code pair does not exist', async () => {
			vi.mocked(mockRepo.findRoleByCode).mockResolvedValue(null);

			const service = new MinistryService(mockRepo);
			await expect(service.resolveRoleByCode('USHER', 'GHOST')).rejects.toMatchObject({
				type: ServiceErrorType.NOT_FOUND_ERROR
			});
		});

		it('throws validation error when ministryCode is empty', async () => {
			const service = new MinistryService(mockRepo);
			await expect(service.resolveRoleByCode('', 'REGULAR')).rejects.toMatchObject({
				type: ServiceErrorType.VALIDATION_ERROR
			});
			expect(mockRepo.findRoleByCode).not.toHaveBeenCalled();
		});

		it('throws validation error when roleCode is empty', async () => {
			const service = new MinistryService(mockRepo);
			await expect(service.resolveRoleByCode('USHER', '')).rejects.toMatchObject({
				type: ServiceErrorType.VALIDATION_ERROR
			});
			expect(mockRepo.findRoleByCode).not.toHaveBeenCalled();
		});

		it('returns special collection role correctly', async () => {
			const ppgRole = makeRole({ id: 'role-ppg', code: 'PPG', name: 'PPG', isSpecialCollection: true });
			vi.mocked(mockRepo.findRoleByCode).mockResolvedValue(ppgRole);

			const service = new MinistryService(mockRepo);
			const result = await service.resolveRoleByCode('USHER', 'PPG');

			expect(result.isSpecialCollection).toBe(true);
		});
	});
});
