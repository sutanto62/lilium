import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RosterRepository } from '$core/repositories/RosterRepository';
import type { Roster, RosterEntry } from '$core/entities/Roster';
import { applyTransition, RosterService } from '../RosterService';
import { ServiceError, ServiceErrorType } from '$core/errors/ServiceError';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Partial<RosterEntry> = {}): RosterEntry => ({
	id: 'entry-1',
	rosterId: 'roster-1',
	communityId: 'comm-1',
	communityName: 'Test Community',
	wilayahId: 'wil-1',
	wilayahName: 'Test Wilayah',
	status: 'draft',
	submittedAt: null,
	confirmedAt: null,
	confirmedByUserId: null,
	ushers: [],
	...overrides
});

const makeRoster = (overrides: Partial<Roster> = {}): Roster => ({
	id: 'roster-1',
	eventId: 'event-1',
	createdByUserId: 'user-1',
	version: 1,
	status: 'draft',
	createdAt: 1000000,
	updatedAt: 1000000,
	entries: [],
	...overrides
});

// ─── applyTransition — pure function ─────────────────────────────────────────

describe('applyTransition', () => {
	describe('valid transitions', () => {
		it('draft → submit → submitted', () => {
			const entry = makeEntry({ status: 'draft' });
			const result = applyTransition(entry, 'submit');
			expect(result.status).toBe('submitted');
			expect(result.submittedAt).not.toBeNull();
		});

		it('submitted → confirm → confirmed', () => {
			const entry = makeEntry({ status: 'submitted', submittedAt: 1000 });
			const result = applyTransition(entry, 'confirm');
			expect(result.status).toBe('confirmed');
			expect(result.confirmedAt).not.toBeNull();
		});

		it('submitted → reopen → draft (clears timestamps and ushers)', () => {
			const entry = makeEntry({
				status: 'submitted',
				submittedAt: 1000,
				ushers: [{ id: 'u-1', name: 'Budi', ministryRoleId: 'role-1', stationId: null, sequence: 1 }]
			});
			const result = applyTransition(entry, 'reopen');
			expect(result.status).toBe('draft');
			expect(result.submittedAt).toBeNull();
			expect(result.confirmedAt).toBeNull();
			expect(result.confirmedByUserId).toBeNull();
			expect(result.ushers).toHaveLength(0);
		});

		it('confirmed → reopen → draft (clears timestamps and ushers)', () => {
			const entry = makeEntry({
				status: 'confirmed',
				submittedAt: 1000,
				confirmedAt: 2000,
				confirmedByUserId: 'user-1',
				ushers: [{ id: 'u-1', name: 'Budi', ministryRoleId: 'role-1', stationId: null, sequence: 1 }]
			});
			const result = applyTransition(entry, 'reopen');
			expect(result.status).toBe('draft');
			expect(result.submittedAt).toBeNull();
			expect(result.confirmedAt).toBeNull();
			expect(result.confirmedByUserId).toBeNull();
			expect(result.ushers).toHaveLength(0);
		});
	});

	describe('invalid transitions — must throw ServiceError.validation', () => {
		it('cannot confirm a draft entry', () => {
			const entry = makeEntry({ status: 'draft' });
			expect(() => applyTransition(entry, 'confirm')).toThrow(ServiceError);
			expect(() => applyTransition(entry, 'confirm')).toThrowError(
				expect.objectContaining({ type: ServiceErrorType.VALIDATION_ERROR })
			);
		});

		it('cannot reopen a draft entry', () => {
			const entry = makeEntry({ status: 'draft' });
			expect(() => applyTransition(entry, 'reopen')).toThrowError(
				expect.objectContaining({ type: ServiceErrorType.VALIDATION_ERROR })
			);
		});

		it('cannot submit a submitted entry', () => {
			const entry = makeEntry({ status: 'submitted', submittedAt: 1000 });
			expect(() => applyTransition(entry, 'submit')).toThrowError(
				expect.objectContaining({ type: ServiceErrorType.VALIDATION_ERROR })
			);
		});

		it('cannot submit a confirmed entry', () => {
			const entry = makeEntry({ status: 'confirmed', submittedAt: 1000, confirmedAt: 2000 });
			expect(() => applyTransition(entry, 'submit')).toThrowError(
				expect.objectContaining({ type: ServiceErrorType.VALIDATION_ERROR })
			);
		});

		it('cannot confirm a confirmed entry', () => {
			const entry = makeEntry({ status: 'confirmed', submittedAt: 1000, confirmedAt: 2000 });
			expect(() => applyTransition(entry, 'confirm')).toThrowError(
				expect.objectContaining({ type: ServiceErrorType.VALIDATION_ERROR })
			);
		});
	});

	describe('immutability', () => {
		it('does not mutate the original entry', () => {
			const entry = makeEntry({ status: 'draft' });
			const original = { ...entry };
			applyTransition(entry, 'submit');
			expect(entry).toEqual(original);
		});
	});
});

// ─── RosterService — mock repository ─────────────────────────────────────────

describe('RosterService', () => {
	let mockRepo: RosterRepository;

	beforeEach(() => {
		mockRepo = {
			createRoster: vi.fn(),
			loadRoster: vi.fn(),
			findRosterById: vi.fn(),
			submitEntry: vi.fn(),
			confirmEntry: vi.fn(),
			reopenEntry: vi.fn(),
			listByCommunity: vi.fn()
		};
	});

	describe('createRoster', () => {
		it('delegates to repo with valid command', async () => {
			const roster = makeRoster();
			vi.mocked(mockRepo.createRoster).mockResolvedValue(roster);

			const service = new RosterService(mockRepo);
			const result = await service.createRoster({
				eventId: 'event-1',
				createdByUserId: 'user-1',
				communityIds: ['comm-1']
			});

			expect(mockRepo.createRoster).toHaveBeenCalledOnce();
			expect(result).toEqual(roster);
		});

		it('throws validation error when eventId is empty', async () => {
			const service = new RosterService(mockRepo);
			await expect(
				service.createRoster({ eventId: '', createdByUserId: 'user-1', communityIds: ['c-1'] })
			).rejects.toMatchObject({ type: ServiceErrorType.VALIDATION_ERROR });
			expect(mockRepo.createRoster).not.toHaveBeenCalled();
		});

		it('throws validation error when createdByUserId is empty', async () => {
			const service = new RosterService(mockRepo);
			await expect(
				service.createRoster({ eventId: 'event-1', createdByUserId: '', communityIds: ['c-1'] })
			).rejects.toMatchObject({ type: ServiceErrorType.VALIDATION_ERROR });
		});

		it('throws validation error when communityIds is empty', async () => {
			const service = new RosterService(mockRepo);
			await expect(
				service.createRoster({ eventId: 'event-1', createdByUserId: 'user-1', communityIds: [] })
			).rejects.toMatchObject({ type: ServiceErrorType.VALIDATION_ERROR });
		});
	});

	describe('loadRoster', () => {
		it('returns roster when found', async () => {
			const roster = makeRoster();
			vi.mocked(mockRepo.loadRoster).mockResolvedValue(roster);

			const service = new RosterService(mockRepo);
			const result = await service.loadRoster('event-1');

			expect(result).toEqual(roster);
		});

		it('returns null when no roster exists', async () => {
			vi.mocked(mockRepo.loadRoster).mockResolvedValue(null);

			const service = new RosterService(mockRepo);
			const result = await service.loadRoster('event-ghost');
			expect(result).toBeNull();
		});

		it('throws validation error when eventId is empty', async () => {
			const service = new RosterService(mockRepo);
			await expect(service.loadRoster('')).rejects.toMatchObject({
				type: ServiceErrorType.VALIDATION_ERROR
			});
		});
	});

	describe('submitEntry', () => {
		it('throws validation error when ushers list is empty', async () => {
			const service = new RosterService(mockRepo);
			await expect(
				service.submitEntry({ rosterId: 'r-1', communityId: 'c-1', ushers: [] })
			).rejects.toMatchObject({ type: ServiceErrorType.VALIDATION_ERROR });
			expect(mockRepo.submitEntry).not.toHaveBeenCalled();
		});

		it('delegates to repo with valid command', async () => {
			const entry = makeEntry({ status: 'submitted' });
			vi.mocked(mockRepo.submitEntry).mockResolvedValue(entry);

			const service = new RosterService(mockRepo);
			const result = await service.submitEntry({
				rosterId: 'r-1',
				communityId: 'c-1',
				ushers: [{ name: 'Budi', ministryRoleCode: 'REGULAR' }]
			});

			expect(result.status).toBe('submitted');
		});
	});

	describe('confirmEntry', () => {
		it('throws validation error when confirmedByUserId is empty', async () => {
			const service = new RosterService(mockRepo);
			await expect(
				service.confirmEntry({ rosterId: 'r-1', communityId: 'c-1', confirmedByUserId: '' })
			).rejects.toMatchObject({ type: ServiceErrorType.VALIDATION_ERROR });
			expect(mockRepo.confirmEntry).not.toHaveBeenCalled();
		});

		it('delegates to repo with valid command', async () => {
			const entry = makeEntry({ status: 'confirmed' });
			vi.mocked(mockRepo.confirmEntry).mockResolvedValue(entry);

			const service = new RosterService(mockRepo);
			const result = await service.confirmEntry({
				rosterId: 'r-1',
				communityId: 'c-1',
				confirmedByUserId: 'admin-1'
			});

			expect(result.status).toBe('confirmed');
		});
	});

	describe('reopenEntry', () => {
		it('throws validation error when rosterId is empty', async () => {
			const service = new RosterService(mockRepo);
			await expect(service.reopenEntry('', 'c-1')).rejects.toMatchObject({
				type: ServiceErrorType.VALIDATION_ERROR
			});
		});

		it('delegates to repo with valid args', async () => {
			const entry = makeEntry({ status: 'draft' });
			vi.mocked(mockRepo.reopenEntry).mockResolvedValue(entry);

			const service = new RosterService(mockRepo);
			const result = await service.reopenEntry('r-1', 'c-1');
			expect(result.status).toBe('draft');
		});
	});
});
