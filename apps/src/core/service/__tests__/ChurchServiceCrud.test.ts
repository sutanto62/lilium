import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChurchService } from '../ChurchService';
import { repo } from '$src/lib/server/db';
import type { ChurchZone, Mass, MassZone } from '$core/entities/Schedule';

const CHURCH_ID = 'church-1';

const mockMass: Mass = {
	id: 'mass-1',
	code: 'SUN08',
	name: 'Misa Minggu 08:00',
	sequence: 1,
	church: CHURCH_ID,
	day: 'sunday',
	time: '08:00',
	briefingTime: '07:30',
	active: 1
};

const mockZone: ChurchZone = {
	id: 'zone-1',
	church: CHURCH_ID,
	group: null,
	name: 'Zona A',
	code: 'A',
	description: null,
	sequence: 1,
	active: 1
};

const mockMassZone: MassZone = {
	id: 'mz-1',
	mass: 'mass-1',
	zone: 'zone-1',
	sequence: 0,
	active: 1
};

describe('ChurchService - Mass CRUD', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('createMass delegates to repo.createMass and returns created mass', async () => {
		vi.spyOn(repo, 'createMass').mockResolvedValue(mockMass);

		const service = new ChurchService(CHURCH_ID);
		const input = {
			code: 'SUN08',
			name: 'Misa Minggu 08:00',
			sequence: 1,
			church: CHURCH_ID,
			day: 'sunday' as const,
			time: '08:00',
			briefingTime: '07:30',
			active: 1
		};
		const result = await service.createMass(input);

		expect(repo.createMass).toHaveBeenCalledWith(input);
		expect(result).toEqual(mockMass);
	});

	it('updateMass delegates to repo.updateMass and returns updated mass', async () => {
		const updated = { ...mockMass, name: 'Misa Minggu 09:00' };
		vi.spyOn(repo, 'updateMass').mockResolvedValue(updated);

		const service = new ChurchService(CHURCH_ID);
		const patch = { name: 'Misa Minggu 09:00' };
		const result = await service.updateMass('mass-1', patch);

		expect(repo.updateMass).toHaveBeenCalledWith('mass-1', patch);
		expect(result.name).toBe('Misa Minggu 09:00');
	});
});

describe('ChurchService - Zone CRUD', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('createZone delegates to repo.createZone and returns created zone', async () => {
		vi.spyOn(repo, 'createZone').mockResolvedValue(mockZone);

		const service = new ChurchService(CHURCH_ID);
		const input = {
			church: CHURCH_ID,
			group: null,
			name: 'Zona A',
			code: 'A',
			description: null,
			sequence: 1,
			active: 1
		};
		const result = await service.createZone(input);

		expect(repo.createZone).toHaveBeenCalledWith(input);
		expect(result).toEqual(mockZone);
	});

	it('updateZone delegates to repo.updateZone and returns updated zone', async () => {
		const updated = { ...mockZone, name: 'Zona B' };
		vi.spyOn(repo, 'updateZone').mockResolvedValue(updated);

		const service = new ChurchService(CHURCH_ID);
		const result = await service.updateZone('zone-1', { name: 'Zona B' });

		expect(repo.updateZone).toHaveBeenCalledWith('zone-1', { name: 'Zona B' });
		expect(result.name).toBe('Zona B');
	});

	it('deactivateZone delegates to repo.deactivateZone and returns boolean', async () => {
		vi.spyOn(repo, 'deactivateZone').mockResolvedValue(true);

		const service = new ChurchService(CHURCH_ID);
		const result = await service.deactivateZone('zone-1');

		expect(repo.deactivateZone).toHaveBeenCalledWith('zone-1');
		expect(result).toBe(true);
	});
});

describe('ChurchService - MassZone CRUD', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('retrieveMassZones delegates to repo.getMassZones', async () => {
		vi.spyOn(repo, 'getMassZones').mockResolvedValue([mockMassZone]);

		const service = new ChurchService(CHURCH_ID);
		const result = await service.retrieveMassZones();

		expect(repo.getMassZones).toHaveBeenCalledWith(CHURCH_ID);
		expect(result).toEqual([mockMassZone]);
	});

	it('createMassZone delegates to repo.createMassZone', async () => {
		vi.spyOn(repo, 'createMassZone').mockResolvedValue(mockMassZone);

		const service = new ChurchService(CHURCH_ID);
		const result = await service.createMassZone('mass-1', 'zone-1');

		expect(repo.createMassZone).toHaveBeenCalledWith('mass-1', 'zone-1');
		expect(result).toEqual(mockMassZone);
	});

	it('deactivateMassZone delegates to repo.deactivateMassZone', async () => {
		vi.spyOn(repo, 'deactivateMassZone').mockResolvedValue(true);

		const service = new ChurchService(CHURCH_ID);
		const result = await service.deactivateMassZone('mz-1');

		expect(repo.deactivateMassZone).toHaveBeenCalledWith('mz-1');
		expect(result).toBe(true);
	});
});
