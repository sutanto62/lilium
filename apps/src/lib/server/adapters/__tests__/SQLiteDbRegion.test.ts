// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, seedParishAndChurch, type TestDb } from './testDb';
import {
	findCommunityById,
	findParishHierarchy,
	findParishById,
	updateParish,
	createWilayah,
	updateWilayah,
	deactivateWilayah,
	listCommunities,
	listCommunitiesByWilayah,
	listWilayahsByParish,
	createCommunity,
	updateCommunity,
	deactivateCommunity,
	getParishIdByChurch
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

	describe('findParishById', () => {
		it('returns the parish when found', async () => {
			const result = await findParishById(db, parishId);
			expect(result).not.toBeNull();
			expect(result!.id).toBe(parishId);
			expect(result!.name).toBe('Test Parish');
			expect(result!.code).toBe('TEST');
			expect(result!.active).toBe(true);
		});

		it('returns null for nonexistent parish', async () => {
			const result = await findParishById(db, 'ghost-parish');
			expect(result).toBeNull();
		});
	});

	describe('updateParish', () => {
		it('updates name and code, returns true', async () => {
			const ok = await updateParish(db, parishId, { name: 'Renamed Parish', code: 'REN' });
			expect(ok).toBe(true);

			const after = await findParishById(db, parishId);
			expect(after!.name).toBe('Renamed Parish');
			expect(after!.code).toBe('REN');
		});

		it('returns false for nonexistent parish', async () => {
			const ok = await updateParish(db, 'ghost', { name: 'X' });
			expect(ok).toBe(false);
		});
	});

	describe('createWilayah', () => {
		it('creates a wilayah and returns it with all fields', async () => {
			const result = await createWilayah(db, {
				name: 'Wilayah C',
				code: 'WC',
				sequence: 3,
				parishId,
				active: 1
			});

			expect(result.id).toBeDefined();
			expect(result.name).toBe('Wilayah C');
			expect(result.code).toBe('WC');
			expect(result.sequence).toBe(3);
			expect(result.parishId).toBe(parishId);
			expect(result.active).toBe(true);
		});

		it('creates a wilayah with null code and null sequence (defaults sequence to 0)', async () => {
			const result = await createWilayah(db, {
				name: 'Wilayah D',
				code: null,
				sequence: null,
				parishId,
				active: 1
			});

			expect(result.code).toBeNull();
			expect(result.sequence).toBe(0);
		});
	});

	describe('updateWilayah', () => {
		it('updates mutable fields and returns true', async () => {
			const ok = await updateWilayah(db, 'wil-1', { name: 'Wilayah Updated', code: 'WU', sequence: 10 });
			expect(ok).toBe(true);

			const list = await listWilayahsByParish(db, parishId);
			const updated = list.find((w) => w.id === 'wil-1');
			expect(updated!.name).toBe('Wilayah Updated');
			expect(updated!.code).toBe('WU');
			expect(updated!.sequence).toBe(10);
		});

		it('returns false for nonexistent wilayah', async () => {
			const ok = await updateWilayah(db, 'ghost-wil', { name: 'X' });
			expect(ok).toBe(false);
		});
	});

	describe('deactivateWilayah', () => {
		it('sets active to 0 and returns true', async () => {
			const ok = await deactivateWilayah(db, 'wil-1');
			expect(ok).toBe(true);

			const list = await listWilayahsByParish(db, parishId);
			const ids = list.map((w) => w.id);
			expect(ids).not.toContain('wil-1');
		});

		it('returns false for nonexistent wilayah', async () => {
			const ok = await deactivateWilayah(db, 'ghost-wil');
			expect(ok).toBe(false);
		});
	});

	describe('getParishIdByChurch', () => {
		it('returns parishId for a linked church', async () => {
			const result = await getParishIdByChurch(db, churchId);
			expect(result).toBe(parishId);
		});

		it('throws ServiceError.notFound for unknown church', async () => {
			await expect(getParishIdByChurch(db, 'ghost-church')).rejects.toMatchObject({
				type: 'NOT_FOUND_ERROR'
			});
		});
	});

	describe('createCommunity', () => {
		it('creates a community and returns it with wilayahName populated', async () => {
			const result = await createCommunity(db, {
				name: 'Komunitas Baru',
				wilayahId: 'wil-1',
				parishId,
				sequence: 5,
				active: 1
			});

			expect(result.id).toBeDefined();
			expect(result.name).toBe('Komunitas Baru');
			expect(result.wilayahId).toBe('wil-1');
			expect(result.wilayahName).toBe('Wilayah A');
			expect(result.sequence).toBe(5);
			expect(result.parishId).toBe(parishId);
			expect(result.active).toBe(true);
		});

		it('throws ServiceError.notFound for unknown wilayahId', async () => {
			await expect(
				createCommunity(db, {
					name: 'X',
					wilayahId: 'ghost-wil',
					parishId,
					sequence: null,
					active: 1
				})
			).rejects.toMatchObject({ type: 'NOT_FOUND_ERROR' });
		});
	});

	describe('updateCommunity', () => {
		it('updates name and wilayahId, returns true', async () => {
			const ok = await updateCommunity(db, 'comm-1', { name: 'Renamed', wilayahId: 'wil-2' });
			expect(ok).toBe(true);

			const after = await findCommunityById(db, 'comm-1');
			expect(after!.community.name).toBe('Renamed');
			expect(after!.community.wilayahId).toBe('wil-2');
		});

		it('returns false for nonexistent community', async () => {
			const ok = await updateCommunity(db, 'ghost-comm', { name: 'X' });
			expect(ok).toBe(false);
		});
	});

	describe('deactivateCommunity', () => {
		it('sets active to 0 and returns true', async () => {
			const ok = await deactivateCommunity(db, 'comm-1');
			expect(ok).toBe(true);

			const list = await listCommunities(db, parishId);
			const ids = list.map((c) => c.id);
			expect(ids).not.toContain('comm-1');
		});

		it('does not hard-delete — row still exists in DB', async () => {
			await deactivateCommunity(db, 'comm-1');

			const after = await findCommunityById(db, 'comm-1');
			expect(after).not.toBeNull();
			expect(after!.community.active).toBe(false);
		});

		it('returns false for nonexistent community', async () => {
			const ok = await deactivateCommunity(db, 'ghost-comm');
			expect(ok).toBe(false);
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
