// @vitest-environment node
/**
 * Integration test: RosterService orchestrating SQLiteDbRoster adapter
 * against a real in-memory SQLite database (via temp file).
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanupTempDir, createTestDb, seedMinistries, seedParishAndChurch, type TestDb } from '$lib/server/adapters/__tests__/testDb';
import {
	createRoster as adapterCreateRoster,
	loadRoster as adapterLoadRoster,
	submitEntry as adapterSubmitEntry,
	confirmEntry as adapterConfirmEntry,
	reopenEntry as adapterReopenEntry,
	listByCommunity as adapterListByCommunity
} from '$lib/server/adapters/SQLiteDbRoster';
import type { RosterRepository } from '$core/repositories/RosterRepository';
import { RosterService } from '../RosterService';
import { ServiceErrorType } from '$core/errors/ServiceError';

// ─── Adapter shim — wraps functional adapter as RosterRepository interface ────

function makeRepo(db: TestDb): RosterRepository {
	return {
		createRoster: (cmd) => adapterCreateRoster(db, cmd),
		loadRoster: (eventId) => adapterLoadRoster(db, eventId),
		findRosterById: (rosterId) => {
			const { findRosterById } = require('$lib/server/adapters/SQLiteDbRoster');
			return findRosterById(db, rosterId);
		},
		submitEntry: (cmd) => adapterSubmitEntry(db, cmd),
		confirmEntry: (cmd) => adapterConfirmEntry(db, cmd),
		reopenEntry: (rosterId, communityId) => adapterReopenEntry(db, rosterId, communityId),
		listByCommunity: (communityId) => adapterListByCommunity(db, communityId)
	};
}

describe('RosterService — integration', () => {
	afterAll(async () => {
		await cleanupTempDir();
	});

	let db: TestDb;
	let service: RosterService;
	let communityId: string;
	let community2Id: string;
	let eventId: string;
	let userId: string;

	beforeEach(async () => {
		db = await createTestDb();
		await seedMinistries(db);
		const { parishId, churchId } = await seedParishAndChurch(db);

		const { user: userTable, wilayah, community, mass, event: eventTable } = await import(
			'$lib/server/db/schema'
		);

		userId = 'user-peta-1';
		await db.insert(userTable).values({
			id: userId,
			name: 'PETA Member',
			email: 'peta@test.com',
			role: 'admin',
			cid: churchId,
			active: 1
		});

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

		communityId = 'test-comm-1';
		community2Id = 'test-comm-2';
		await db.insert(community).values([
			{ id: communityId, name: 'Test Community 1', wilayahId: 'test-wil-1', parishId, sequence: 1, active: 1 },
			{ id: community2Id, name: 'Test Community 2', wilayahId: 'test-wil-1', parishId, sequence: 2, active: 1 }
		]);

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

		service = new RosterService(makeRepo(db));
	});

	describe('createRoster', () => {
		it('creates a roster with entries for all requested communities', async () => {
			const roster = await service.createRoster({
				eventId,
				createdByUserId: userId,
				communityIds: [communityId, community2Id]
			});

			expect(roster.version).toBe(1);
			expect(roster.status).toBe('draft');
			expect(roster.entries).toHaveLength(2);
		});

		it('throws validation error when communityIds is empty', async () => {
			await expect(
				service.createRoster({ eventId, createdByUserId: userId, communityIds: [] })
			).rejects.toMatchObject({ type: ServiceErrorType.VALIDATION_ERROR });
		});
	});

	describe('loadRoster', () => {
		it('returns null when no roster exists', async () => {
			const result = await service.loadRoster('nonexistent-event');
			expect(result).toBeNull();
		});

		it('returns the full roster with all entries', async () => {
			await service.createRoster({ eventId, createdByUserId: userId, communityIds: [communityId] });
			const loaded = await service.loadRoster(eventId);
			expect(loaded).not.toBeNull();
			expect(loaded!.entries).toHaveLength(1);
		});
	});

	describe('submitEntry → confirmEntry flow', () => {
		it('submit transitions entry draft → submitted', async () => {
			const roster = await service.createRoster({
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			const submitted = await service.submitEntry({
				rosterId: roster.id,
				communityId,
				ushers: [{ name: 'Budi', ministryRoleCode: 'REGULAR' }]
			});

			expect(submitted.status).toBe('submitted');
			expect(submitted.ushers).toHaveLength(1);
		});

		it('confirm transitions entry submitted → confirmed', async () => {
			const roster = await service.createRoster({
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			await service.submitEntry({
				rosterId: roster.id,
				communityId,
				ushers: [{ name: 'Budi', ministryRoleCode: 'REGULAR' }]
			});

			const confirmed = await service.confirmEntry({
				rosterId: roster.id,
				communityId,
				confirmedByUserId: userId
			});

			expect(confirmed.status).toBe('confirmed');
			expect(confirmed.confirmedByUserId).toBe(userId);
		});
	});

	describe('reopenEntry', () => {
		it('reopens a submitted entry back to draft', async () => {
			const roster = await service.createRoster({
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			await service.submitEntry({
				rosterId: roster.id,
				communityId,
				ushers: [{ name: 'Maria', ministryRoleCode: 'REGULAR' }]
			});

			const reopened = await service.reopenEntry(roster.id, communityId);
			expect(reopened.status).toBe('draft');
			expect(reopened.ushers).toHaveLength(0);
		});
	});

	describe('guard: submitEntry with empty ushers', () => {
		it('throws validation before hitting the repo', async () => {
			const roster = await service.createRoster({
				eventId,
				createdByUserId: userId,
				communityIds: [communityId]
			});

			await expect(
				service.submitEntry({ rosterId: roster.id, communityId, ushers: [] })
			).rejects.toMatchObject({ type: ServiceErrorType.VALIDATION_ERROR });
		});
	});
});
