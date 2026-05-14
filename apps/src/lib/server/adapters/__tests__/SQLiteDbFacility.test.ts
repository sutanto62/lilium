// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, seedMinistries, seedParishAndChurch, type TestDb } from './testDb';
import {
	findChurchFacility,
	listSectionsByChurch,
	listStationsByZone,
	listZonesByChurch
} from '../SQLiteDbFacility';

describe('SQLiteDbFacility — new FacilityRepository methods — integration', () => {
	let db: TestDb;
	let churchId: string;
	let sectionId: string;
	let zoneId: string;
	let ministryId: string;

	beforeEach(async () => {
		db = await createTestDb();
		await seedMinistries(db);
		({ churchId } = await seedParishAndChurch(db));

		// Seed sections
		const { section, zone: zoneTable, station: stationTable } = await import('$lib/server/db/schema');

		sectionId = 'sec-1';
		await db.insert(section).values([
			{ id: sectionId, churchId, name: 'Main Nave', code: 'MN', description: null, sequence: 1, active: 1 },
			{ id: 'sec-2', churchId, name: 'Basement', code: 'BS', description: null, sequence: 2, active: 1 }
		]);

		// Seed zones
		zoneId = 'zone-1';
		await db.insert(zoneTable).values([
			{ id: zoneId, churchId, sectionId, name: 'Left Aisle', code: 'LA', description: null, sequence: 1, active: 1 },
			{ id: 'zone-2', churchId, sectionId: 'sec-2', name: 'Entrance', code: 'EN', description: null, sequence: 1, active: 1 }
		]);

		// Seed stations
		ministryId = 'min-usher';
		await db.insert(stationTable).values([
			{
				id: 'sta-1',
				churchId,
				zoneId,
				ministryId,
				defaultRoleId: 'role-regular',
				name: 'Door 1',
				code: 'D1',
				description: null,
				sequence: 1,
				active: 1
			},
			{
				id: 'sta-2',
				churchId,
				zoneId,
				ministryId,
				defaultRoleId: null,
				name: 'Door 2',
				code: 'D2',
				description: null,
				sequence: 2,
				active: 1
			}
		]);
	});

	describe('listSectionsByChurch', () => {
		it('returns all active sections for a church', async () => {
			const result = await listSectionsByChurch(db, churchId);

			expect(result).toHaveLength(2);
			for (const s of result) {
				expect(s.churchId).toBe(churchId);
				expect(typeof s.name).toBe('string');
			}
		});

		it('returns sections ordered by sequence', async () => {
			const result = await listSectionsByChurch(db, churchId);
			expect(result[0].name).toBe('Main Nave');
			expect(result[1].name).toBe('Basement');
		});
	});

	describe('listZonesByChurch', () => {
		it('returns all active zones for a church', async () => {
			const result = await listZonesByChurch(db, churchId);
			expect(result).toHaveLength(2);
		});

		it('filters zones by sectionId when provided', async () => {
			const result = await listZonesByChurch(db, churchId, sectionId);

			expect(result).toHaveLength(1);
			expect(result[0].sectionId).toBe(sectionId);
			expect(result[0].name).toBe('Left Aisle');
		});

		it('returns correct Zone shape', async () => {
			const result = await listZonesByChurch(db, churchId);
			for (const z of result) {
				expect(typeof z.id).toBe('string');
				expect(typeof z.name).toBe('string');
				expect(typeof z.churchId).toBe('string');
			}
		});
	});

	describe('listStationsByZone', () => {
		it('returns all active stations for a zone', async () => {
			const result = await listStationsByZone(db, zoneId);

			expect(result).toHaveLength(2);
			for (const s of result) {
				expect(s.zoneId).toBe(zoneId);
				expect(s.ministryId).toBe(ministryId);
			}
		});

		it('returns correct Station shape with ministryId', async () => {
			const result = await listStationsByZone(db, zoneId);
			const sta = result[0];
			expect(typeof sta.id).toBe('string');
			expect(typeof sta.ministryId).toBe('string');
			// No boolean isPpg on new Station interface
			expect((sta as unknown as { isPpg?: unknown }).isPpg).toBeUndefined();
		});

		it('returns empty array for zone with no stations', async () => {
			const result = await listStationsByZone(db, 'zone-2');
			expect(result).toHaveLength(0);
		});
	});

	describe('findChurchFacility', () => {
		it('returns ChurchFacility with pre-built Maps', async () => {
			const result = await findChurchFacility(db, churchId);

			expect(result.church.id).toBe(churchId);
			expect(result.sections).toHaveLength(2);

			// zonesBySection Map
			expect(result.zonesBySection).toBeInstanceOf(Map);
			expect(result.zonesBySection.get(sectionId)).toHaveLength(1);
			expect(result.zonesBySection.get('sec-2')).toHaveLength(1);

			// stationsByZone Map
			expect(result.stationsByZone).toBeInstanceOf(Map);
			expect(result.stationsByZone.get(zoneId)).toHaveLength(2);
		});

		it('throws when church does not exist', async () => {
			await expect(findChurchFacility(db, 'ghost-church')).rejects.toThrow('Church not found');
		});

		it('stations have ministryId not boolean isPpg', async () => {
			const result = await findChurchFacility(db, churchId);
			const stations = result.stationsByZone.get(zoneId)!;
			expect(typeof stations[0].ministryId).toBe('string');
		});
	});
});
