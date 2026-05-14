// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, seedMinistries, type TestDb } from './testDb';
import {
	findMinistryByCode,
	findRoleByCode,
	listMinistries,
	listRolesByMinistry
} from '../SQLiteDbMinistry';

describe('SQLiteDbMinistry — integration', () => {
	let db: TestDb;

	beforeEach(async () => {
		db = await createTestDb();
		await seedMinistries(db);
	});

	describe('listMinistries', () => {
		it('returns all active ministries ordered by name', async () => {
			const result = await listMinistries(db);

			expect(result.length).toBe(4);
			// Verify typed Ministry[] shape
			for (const m of result) {
				expect(typeof m.id).toBe('string');
				expect(typeof m.name).toBe('string');
				expect(typeof m.code).toBe('string');
				expect(typeof m.requiresStation).toBe('boolean');
				expect(typeof m.active).toBe('number');
			}
		});

		it('returns Ministry with correct boolean mapping for requiresStation', async () => {
			const result = await listMinistries(db);

			const peta = result.find((m) => m.code === 'PETA');
			expect(peta).toBeDefined();
			expect(peta!.requiresStation).toBe(false); // PETA does not require a station

			const usher = result.find((m) => m.code === 'USHER');
			expect(usher).toBeDefined();
			expect(usher!.requiresStation).toBe(true);
		});

		it('does not return inactive ministries', async () => {
			// Insert an inactive ministry
			const { ministry } = await import('$lib/server/db/schema');
			await db.insert(ministry).values({
				id: 'min-inactive',
				name: 'Inactive Ministry',
				code: 'INACTIVE',
				description: null,
				requiresStation: 1,
				active: 0
			});

			const result = await listMinistries(db);
			expect(result.find((m) => m.code === 'INACTIVE')).toBeUndefined();
		});
	});

	describe('listRolesByMinistry', () => {
		it('returns all active roles for USHER ministry', async () => {
			const result = await listRolesByMinistry(db, 'min-usher');

			expect(result.length).toBe(4); // REGULAR, KOLEKTE, PPG, PPKG
			for (const r of result) {
				expect(typeof r.id).toBe('string');
				expect(typeof r.ministryId).toBe('string');
				expect(typeof r.name).toBe('string');
				expect(typeof r.code).toBe('string');
				expect(typeof r.isSpecialCollection).toBe('boolean');
			}
		});

		it('correctly maps isSpecialCollection boolean', async () => {
			const result = await listRolesByMinistry(db, 'min-usher');

			const regular = result.find((r) => r.code === 'REGULAR');
			expect(regular!.isSpecialCollection).toBe(false);

			const ppg = result.find((r) => r.code === 'PPG');
			expect(ppg!.isSpecialCollection).toBe(true);
		});

		it('returns empty array for a ministry with no roles', async () => {
			const result = await listRolesByMinistry(db, 'min-prodiakon');
			expect(result).toHaveLength(0);
		});
	});

	describe('findRoleByCode', () => {
		it('finds a role by ministry code + role code', async () => {
			const result = await findRoleByCode(db, 'USHER', 'REGULAR');

			expect(result).not.toBeNull();
			expect(result!.code).toBe('REGULAR');
			expect(result!.ministryId).toBe('min-usher');
			expect(result!.isSpecialCollection).toBe(false);
		});

		it('finds PPG role correctly', async () => {
			const result = await findRoleByCode(db, 'USHER', 'PPG');

			expect(result).not.toBeNull();
			expect(result!.isSpecialCollection).toBe(true);
		});

		it('returns null for unknown ministry code', async () => {
			const result = await findRoleByCode(db, 'UNKNOWN', 'REGULAR');
			expect(result).toBeNull();
		});

		it('returns null for unknown role code', async () => {
			const result = await findRoleByCode(db, 'USHER', 'NONEXISTENT');
			expect(result).toBeNull();
		});
	});

	describe('findMinistryByCode', () => {
		it('finds a ministry by code', async () => {
			const result = await findMinistryByCode(db, 'USHER');

			expect(result).not.toBeNull();
			expect(result!.id).toBe('min-usher');
			expect(result!.code).toBe('USHER');
		});

		it('returns null for unknown code', async () => {
			const result = await findMinistryByCode(db, 'DOESNOTEXIST');
			expect(result).toBeNull();
		});
	});
});
