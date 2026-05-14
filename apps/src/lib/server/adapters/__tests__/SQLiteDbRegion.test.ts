// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, seedParishAndChurch, type TestDb } from './testDb';
import {
	findCommunityById,
	findParishHierarchy,
	listCommunities,
	listCommunitiesByWilayah,
	listWilayahsByParish
} from '../SQLiteDbRegion';

describe('SQLiteDbRegion — new ParishRepository methods — integration', () => {
	let db: TestDb;
	let parishId: string;
	let churchId: string;

	beforeEach(async () => {
		db = await createTestDb();
		({ parishId, churchId } = await seedParishAndChurch(db));

		// Seed wilayahs
		const { wilayah } = await import('$lib/server/db/schema');
		await db.insert(wilayah).values([
			{
				id: 'wil-1',
				name: 'Wilayah A',
				code: 'WA',
				sequence: 1,
				church: churchId,
				parishId,
				active: 1,
				createdAt: null
			},
			{
				id: 'wil-2',
				name: 'Wilayah B',
				code: 'WB',
				sequence: 2,
				church: churchId,
				parishId,
				active: 1,
				createdAt: null
			}
		]);

		// Seed communities
		const { community } = await import('$lib/server/db/schema');
		await db.insert(community).values([
			{ id: 'comm-1', name: 'Komunitas 1', wilayahId: 'wil-1', parishId, sequence: 1, active: 1 },
			{ id: 'comm-2', name: 'Komunitas 2', wilayahId: 'wil-1', parishId, sequence: 2, active: 1 },
			{ id: 'comm-3', name: 'Komunitas 3', wilayahId: 'wil-2', parishId, sequence: 1, active: 1 }
		]);
	});

	describe('listWilayahsByParish', () => {
		it('returns all active wilayahs for a parish', async () => {
			const result = await listWilayahsByParish(db, parishId);

			expect(result).toHaveLength(2);
			for (const w of result) {
				expect(typeof w.id).toBe('string');
				expect(typeof w.name).toBe('string');
				expect(w.parishId).toBe(parishId);
			}
		});

		it('returns wilayahs ordered by sequence', async () => {
			const result = await listWilayahsByParish(db, parishId);
			expect(result[0].sequence).toBeLessThanOrEqual(result[1].sequence!);
		});

		it('returns empty array for unknown parish', async () => {
			const result = await listWilayahsByParish(db, 'nonexistent-parish');
			expect(result).toHaveLength(0);
		});
	});

	describe('listCommunitiesByWilayah', () => {
		it('returns communities for a specific wilayah', async () => {
			const result = await listCommunitiesByWilayah(db, 'wil-1');

			expect(result).toHaveLength(2);
			for (const c of result) {
				expect(c.wilayahId).toBe('wil-1');
				expect(c.wilayahName).toBe('Wilayah A');
			}
		});

		it('returns empty array for wilayah with no communities', async () => {
			const { wilayah } = await import('$lib/server/db/schema');
			await db.insert(wilayah).values({
				id: 'wil-empty',
				name: 'Empty Wilayah',
				code: 'WE',
				sequence: 3,
				church: churchId,
				parishId,
				active: 1,
				createdAt: null
			});
			const result = await listCommunitiesByWilayah(db, 'wil-empty');
			expect(result).toHaveLength(0);
		});
	});

	describe('listCommunities', () => {
		it('returns all communities for a parish with wilayah names', async () => {
			const result = await listCommunities(db, parishId);

			expect(result).toHaveLength(3);
			for (const c of result) {
				expect(c.parishId).toBe(parishId);
				expect(typeof c.wilayahName).toBe('string');
				expect(c.wilayahName.length).toBeGreaterThan(0);
			}
		});
	});

	describe('findCommunityById', () => {
		it('returns community with full ancestry', async () => {
			const result = await findCommunityById(db, 'comm-1');

			expect(result).not.toBeNull();
			expect(result!.community.id).toBe('comm-1');
			expect(result!.community.wilayahId).toBe('wil-1');
			expect(result!.wilayah.id).toBe('wil-1');
			expect(result!.wilayah.name).toBe('Wilayah A');
			expect(result!.parish.id).toBe(parishId);
			expect(result!.parish.code).toBe('TEST');
		});

		it('returns null for nonexistent community', async () => {
			const result = await findCommunityById(db, 'nonexistent');
			expect(result).toBeNull();
		});
	});

	describe('findParishHierarchy', () => {
		it('returns ParishHierarchy with pre-built communitiesByWilayah Map', async () => {
			const result = await findParishHierarchy(db, parishId);

			// Parish
			expect(result.parish.id).toBe(parishId);
			expect(result.parish.code).toBe('TEST');

			// Wilayahs
			expect(result.wilayahs).toHaveLength(2);

			// communitiesByWilayah Map
			expect(result.communitiesByWilayah).toBeInstanceOf(Map);
			expect(result.communitiesByWilayah.size).toBe(2);
			expect(result.communitiesByWilayah.get('wil-1')).toHaveLength(2);
			expect(result.communitiesByWilayah.get('wil-2')).toHaveLength(1);

			// Churches
			expect(result.churches).toHaveLength(1);
			expect(result.churches[0].id).toBe(churchId);
			expect(result.churches[0].parishId).toBe(parishId);
		});

		it('throws when parish does not exist', async () => {
			await expect(findParishHierarchy(db, 'ghost-parish')).rejects.toThrow('Parish not found');
		});

		it('returns empty Maps when parish has no data', async () => {
			// Create a bare parish with no wilayahs, communities, or churches
			const { parish } = await import('$lib/server/db/schema');
			await db.insert(parish).values({ id: 'empty-parish', name: 'Empty', code: 'EMPTY', active: 1 });

			const result = await findParishHierarchy(db, 'empty-parish');
			expect(result.wilayahs).toHaveLength(0);
			expect(result.communitiesByWilayah.size).toBe(0);
			expect(result.churches).toHaveLength(0);
		});
	});
});
