// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanupTempDir, createTestDb, seedMinistries, seedParishAndChurch, type TestDb } from './testDb';
import {
	confirmEntry,
	createRoster,
	findRosterById,
	listByCommunity,
	loadRoster,
	reopenEntry,
	submitEntry
} from '../SQLiteDbRoster';
import { ServiceError, ServiceErrorType } from '$core/errors/ServiceError';

describe('SQLiteDbRoster — integration', () => {
	afterAll(async () => {
		await cleanupTempDir();
	});

	let db: TestDb;
	let communityId: string;
	let community2Id: string;
	let eventId: string;
	let userId: string;

	beforeEach(async () => {
		db = await createTestDb();
		await seedMinistries(db);
		const { parishId, churchId } = await seedParishAndChurch(db);

		// Seed user
		userId = 'user-peta-1';
		const { user: userTable, wilayah, community, mass, event: eventTable } = await import('$lib/server/db/schema');
		await db.insert(userTable).values({
			id: userId,
			name: 'PETA Member',
			email: 'peta@test.com',
			role: 'admin',
			cid: churchId,
			active: 1
		});

		// Seed wilayah
		await db.insert(wilayah).values({
			id: 'test-wil-1',
			name: 'Test Wilayah',
			code: 'TW',
			sequence: 1,
			church: churchId,
			parishId,
			active: 1,
			createdAt: null
		});

		// Seed communities
		communityId = 'test-comm-1';
		community2Id = 'test-comm-2';
		await db.insert(community).values([
			{ id: communityId, name: 'Test Community 1', wilayahId: 'test-wil-1', parishId, sequence: 1, active: 1 },
			{ id: community2Id, name: 'Test Community 2', wilayahId: 'test-wil-1', parishId, sequence: 2, active: 1 }
		]);

		// Seed mass + event
		await db.insert(mass).values({
			id: 'test-mass-1',
			name: 'Sunday Mass',
			code: null,
			sequence: 1,
			church: churchId,
			day: 'sunday',
			time: '07:00',
			briefingTime: null,
			active: 1,
			createdAt: null
		});

		eventId = 'test-event-1';
		await db.insert(eventTable).values({
			id: eventId,
			church_id: churchId,
			mass_id: 'test-mass-1',
			date: '2026-06-01',
			week_number: null,
			isComplete: 0,
			active: 1,
			type: 'mass',
			code: null,
			description: null
		});
	});

	// ── createRoster ─────────────────────────────────────────────────────────────

	describe('createRoster', () => {
		it('creates a roster with one entry stub per community', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId, community2Id]
			});

			expect(roster.id).toBeTruthy();
			expect(roster.eventId).toBe(eventId);
			expect(roster.createdByUserId).toBe(userId);
			expect(roster.version).toBe(1);
			expect(roster.status).toBe('draft');
			expect(roster.entries).toHaveLength(2);

			for (const entry of roster.entries) {
				expect(entry.status).toBe('draft');
				expect(entry.ushers).toHaveLength(0);
				expect(typeof entry.communityName).toBe('string');
				expect(typeof entry.wilayahName).toBe('string');
			}
		});

		it('throws when community does not exist', async () => {
			await expect(
				createRoster(db, {
					eventId,
					createdByUserId: userId,
					communityIds: ['ghost-community']
				})
			).rejects.toThrow();
		});
	});

	// ── loadRoster ────────────────────────────────────────────────────────────────

	describe('loadRoster', () => {
		it('returns null when no roster exists for the event', async () => {
			const result = await loadRoster(db, 'nonexistent-event');
			expect(result).toBeNull();
		});

		it('loads the full roster with entries and ushers', async () => {
			const created = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			const loaded = await loadRoster(db, eventId);
			expect(loaded).not.toBeNull();
			expect(loaded!.id).toBe(created.id);
			expect(loaded!.entries).toHaveLength(1);
		});
	});

	// ── findRosterById ────────────────────────────────────────────────────────────

	describe('findRosterById', () => {
		it('loads a roster by its id', async () => {
			const created = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			const loaded = await findRosterById(db, created.id);
			expect(loaded).not.toBeNull();
			expect(loaded!.id).toBe(created.id);
		});

		it('returns null for nonexistent roster id', async () => {
			const result = await findRosterById(db, 'ghost-roster');
			expect(result).toBeNull();
		});
	});

	// ── submitEntry (happy path) ──────────────────────────────────────────────────

	describe('submitEntry — happy path', () => {
		it('transitions entry from draft → submitted', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			const entry = await submitEntry(db, {
				rosterId: roster.id,
				communityId,
				ushers: [
					{ name: 'Budi Santoso', ministryRoleCode: 'REGULAR' },
					{ name: 'Siti Aminah', ministryRoleCode: 'KOLEKTE' }
				]
			});

			expect(entry.status).toBe('submitted');
			expect(entry.submittedAt).not.toBeNull();
			expect(entry.ushers).toHaveLength(2);
			expect(entry.ushers[0].name).toBe('Budi Santoso');
			expect(entry.ushers[1].name).toBe('Siti Aminah');
		});

		it('increments roster version after submit', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});
			expect(roster.version).toBe(1);

			await submitEntry(db, {
				rosterId: roster.id,
				communityId,
				ushers: [{ name: 'Agus', ministryRoleCode: 'REGULAR' }]
			});

			const updated = await findRosterById(db, roster.id);
			expect(updated!.version).toBe(2);
		});

		it('submit is transactional — reloaded data matches submitted state', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			await submitEntry(db, {
				rosterId: roster.id,
				communityId,
				ushers: [{ name: 'Maria', ministryRoleCode: 'REGULAR' }]
			});

			const reloaded = await loadRoster(db, eventId);
			const reloadedEntry = reloaded!.entries.find((e) => e.communityId === communityId);
			expect(reloadedEntry!.status).toBe('submitted');
			expect(reloadedEntry!.ushers).toHaveLength(1);
			expect(reloadedEntry!.ushers[0].name).toBe('Maria');
		});

		it('resolves ministry role code to role id', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			const entry = await submitEntry(db, {
				rosterId: roster.id,
				communityId,
				ushers: [{ name: 'Piter', ministryRoleCode: 'PPG' }]
			});

			// ministryRoleId should be the DB id, not the code string
			expect(entry.ushers[0].ministryRoleId).toBe('role-ppg');
		});
	});

	// ── submitEntry (conflict / validation paths) ─────────────────────────────────

	describe('submitEntry — validation and conflict', () => {
		it('throws ServiceError.validation when entry is already submitted', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			// First submit succeeds
			await submitEntry(db, {
				rosterId: roster.id,
				communityId,
				ushers: [{ name: 'Dewi', ministryRoleCode: 'REGULAR' }]
			});

			// Second submit must fail — entry is no longer 'draft'
			let caughtError: unknown;
			try {
				await submitEntry(db, {
					rosterId: roster.id,
					communityId,
					ushers: [{ name: 'Rini', ministryRoleCode: 'REGULAR' }]
				});
			} catch (e) {
				caughtError = e;
			}

			expect(caughtError).toBeInstanceOf(ServiceError);
			expect((caughtError as ServiceError).type).toBe(ServiceErrorType.VALIDATION_ERROR);
		});

		it('throws ServiceError.notFound for unknown ministry role code', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			await expect(
				submitEntry(db, {
					rosterId: roster.id,
					communityId,
					ushers: [{ name: 'Budi', ministryRoleCode: 'NONEXISTENT_ROLE' }]
				})
			).rejects.toMatchObject({ type: ServiceErrorType.NOT_FOUND_ERROR });
		});

		it('throws ServiceError.notFound when entry does not exist', async () => {
			await expect(
				submitEntry(db, {
					rosterId: 'ghost-roster',
					communityId: 'ghost-community',
					ushers: []
				})
			).rejects.toMatchObject({ type: ServiceErrorType.NOT_FOUND_ERROR });
		});
	});

	// ── confirmEntry ──────────────────────────────────────────────────────────────

	describe('confirmEntry', () => {
		it('transitions entry from submitted → confirmed', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			await submitEntry(db, {
				rosterId: roster.id,
				communityId,
				ushers: [{ name: 'Tono', ministryRoleCode: 'REGULAR' }]
			});

			const confirmed = await confirmEntry(db, {
				rosterId: roster.id,
				communityId,
				confirmedByUserId: userId
			});

			expect(confirmed.status).toBe('confirmed');
			expect(confirmed.confirmedAt).not.toBeNull();
			expect(confirmed.ushers).toHaveLength(1);
		});

		it('throws validation error when entry is still draft', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			await expect(
				confirmEntry(db, {
					rosterId: roster.id,
					communityId,
					confirmedByUserId: userId
				})
			).rejects.toMatchObject({ type: ServiceErrorType.VALIDATION_ERROR });
		});
	});

	// ── reopenEntry ───────────────────────────────────────────────────────────────

	describe('reopenEntry', () => {
		it('transitions entry from submitted back to draft', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			await submitEntry(db, {
				rosterId: roster.id,
				communityId,
				ushers: [{ name: 'Ani', ministryRoleCode: 'REGULAR' }]
			});

			const reopened = await reopenEntry(db, roster.id, communityId);
			expect(reopened.status).toBe('draft');
			expect(reopened.submittedAt).toBeNull();
			expect(reopened.ushers).toHaveLength(0);
		});

		it('throws validation error when entry is already draft', async () => {
			const roster = await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			await expect(reopenEntry(db, roster.id, communityId)).rejects.toMatchObject({
				type: ServiceErrorType.VALIDATION_ERROR
			});
		});
	});

	// ── listByCommunity ───────────────────────────────────────────────────────────

	describe('listByCommunity', () => {
		it('returns rosters containing the community', async () => {
			await createRoster(db, {
				eventId,
				createdByUserId: userId,
				communityIds: [communityId, community2Id]
			});

			const result = await listByCommunity(db, communityId);
			expect(result).toHaveLength(1);
			expect(result[0].eventId).toBe(eventId);
		});

		it('returns empty array when community has no roster assignments', async () => {
			const result = await listByCommunity(db, 'ghost-community');
			expect(result).toHaveLength(0);
		});
	});
});
