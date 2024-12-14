import { describe, it, expect, vi } from 'vitest';
import { ChurchService } from './ChurchService';
import { repo } from '$src/lib/server/db';
import type { ChurchZone, Mass } from '$core/entities/schedule';

describe('ChurchService', () => {
	it('should initialize zones and masses', async () => {
		const churchId = 'test-church-id';
		const service = new ChurchService(churchId);

		const expectedZones: ChurchZone[] = [
			{
				id: '1',
				church: 'test-church-id',
				name: 'Zone A',
				code: 'A',
				description: 'Zone A Description',
				sequence: 1,
				pic: 'test-pic-url'
			}
		];

		const expectedMasses: Mass[] = [
			{
				id: '1',
				code: 'A',
				name: 'Mass A',
				sequence: 1,
				church: churchId,
				day: 'sunday' as const
			}
		];
		vi.spyOn(repo, 'getZones').mockResolvedValue(expectedZones);
		vi.spyOn(repo, 'getMasses').mockResolvedValue(expectedMasses as any);

		await service.initialize();

		expect(service.zones).toEqual(expectedZones);
		expect(service.masses).toEqual(expectedMasses);
	});
});
