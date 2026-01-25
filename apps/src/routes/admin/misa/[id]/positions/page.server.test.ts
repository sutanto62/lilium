import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import type { RouteParams } from './$types';
import { load, actions } from './+page.server';
import { PositionService } from '$core/service/PositionService';
import { ServiceError } from '$core/errors/ServiceError';
import { hasRole } from '$src/auth';
import type { Mass, MassPositionView, ChurchPosition } from '$core/entities/Schedule';
import { mass } from '$src/lib/server/db/schema';
import { repo } from '$src/lib/server/db';

// Mock dependencies
vi.mock('$core/service/PositionService');
vi.mock('$src/auth');
vi.mock('$src/lib/server/db', () => ({
	repo: {
		getMassById: vi.fn(),
		findChurchById: vi.fn().mockResolvedValue({
			id: churchId,
			name: 'Test Church',
			code: 'TC',
			parish: null,
			requirePpg: 0,
			active: 1
		})
	}
}));
vi.mock('$src/lib/application/StatsigService', () => ({
	statsigService: {
		use: vi.fn(),
		logEvent: vi.fn(),
		checkGate: vi.fn().mockResolvedValue(false)
	}
}));
vi.mock('$src/lib/application/PostHogService', () => ({
	posthogService: {
		trackEvent: vi.fn()
	}
}));

const churchId = 'church-1';
const massId = 'mass-1';
const positionId = 'position-1';
const zoneId = 'zone-1';

const mockSession = {
	user: {
		id: 'user-1',
		cid: churchId,
		role: 'admin',
		email: 'admin@example.com'
	}
};

const mockMass: typeof mass.$inferSelect = {
	id: massId,
	church: churchId,
	name: 'Misa Minggu Pagi',
	code: 'MMP',
	day: 'sunday',
	time: '08:00',
	briefingTime: '07:30',
	sequence: 1,
	active: 1,
	createdAt: Date.now()
};

const mockPositions: MassPositionView[] = [
	{
		massId,
		zoneId,
		zoneName: 'Zone A',
		zoneGroupId: 'group-1',
		zoneGroupName: 'Group 1',
		zoneGroupSequence: 1,
		positionId,
		positionName: 'Usher Pintu Utama',
		positionType: 'usher',
		isPpg: false,
		positionSequence: 1,
		positionActive: 1
	}
];

type LoadEvent = Parameters<typeof load>[0];

const createMockLoadEvent = (overrides?: Partial<LoadEvent>): LoadEvent =>
	({
		params: { id: massId },
		locals: {
			auth: vi.fn().mockResolvedValue(mockSession),
			getSession: vi.fn().mockResolvedValue(mockSession),
			signIn: vi.fn(),
			signOut: vi.fn()
		},
		url: new URL(`http://localhost/admin/misa/${massId}/positions`),
		parent: vi.fn().mockResolvedValue({}),
		depends: vi.fn(),
		untrack: vi.fn(<T>(fn: () => T) => fn()),
		...overrides
	}) as LoadEvent;

type MockActionEvent = RequestEvent<RouteParams, '/admin/misa/[id]/positions'>;

const mockRequest = (formData: FormData): Request =>
	({ formData: vi.fn().mockResolvedValue(formData) }) as unknown as Request;

const createMockActionEvent = (overrides?: Partial<MockActionEvent>): MockActionEvent =>
	({
		params: { id: massId },
		request: mockRequest(new FormData()),
		locals: {
			auth: vi.fn().mockResolvedValue(mockSession),
			getSession: vi.fn().mockResolvedValue(mockSession),
			signIn: vi.fn(),
			signOut: vi.fn()
		},
		url: new URL(`http://localhost/admin/misa/${massId}/positions`),
		...overrides
	}) as MockActionEvent;

describe('load function', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should redirect to signin if not authenticated', async () => {
		const event = createMockLoadEvent({
			locals: {
				auth: vi.fn().mockResolvedValue(null),
				getSession: vi.fn().mockResolvedValue(null),
				signIn: vi.fn(),
				signOut: vi.fn()
			}
		});

		await expect(load(event)).rejects.toThrow();
	});

	it('should redirect if user does not have admin role', async () => {
		vi.mocked(hasRole).mockReturnValue(false);
		const event = createMockLoadEvent();

		await expect(load(event)).rejects.toThrow();
		expect(hasRole).toHaveBeenCalledWith(mockSession, 'admin');
	});

	it('should return error if churchId is missing from session', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const event = createMockLoadEvent({
			locals: {
				auth: vi.fn().mockResolvedValue({
					user: { id: 'user-1', role: 'admin' }
				}),
				getSession: vi.fn().mockResolvedValue({
					user: { id: 'user-1', role: 'admin' }
				}),
				signIn: vi.fn(),
				signOut: vi.fn()
			}
		});

		await expect(load(event)).rejects.toThrow();
	});

	it('should return error if massId is missing from params', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const event = createMockLoadEvent({
			params: { id: '' }
		});

		await expect(load(event)).rejects.toThrow();
	});

	it('should return error if mass is not found', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		vi.mocked(repo.getMassById).mockResolvedValue(null);
		const event = createMockLoadEvent();

		await expect(load(event)).rejects.toThrow();
		expect(repo.getMassById).toHaveBeenCalledWith(massId);
	});

	it('should return error if mass does not belong to church', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		vi.mocked(repo.getMassById).mockResolvedValue({
			...mockMass,
			church: 'different-church'
		});
		const event = createMockLoadEvent();

		await expect(load(event)).rejects.toThrow();
	});

	it('should load mass details and positions successfully', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		vi.mocked(repo.getMassById).mockResolvedValue(mockMass);

		const mockPositionService = {
			retrievePositionsByMass: vi.fn().mockResolvedValue(mockPositions)
		};
		vi.mocked(PositionService).mockImplementation(() => mockPositionService as unknown as PositionService);

		const event = createMockLoadEvent();
		const result = await load(event);

		expect(result).toBeDefined();
		expect(result).toHaveProperty('mass');
		expect(result).toHaveProperty('positionsByMass');
		expect(result!.mass).toEqual(mockMass);
		expect(result!.positionsByMass).toEqual(mockPositions);
		expect(mockPositionService.retrievePositionsByMass).toHaveBeenCalledWith(massId);
		expect(PositionService).toHaveBeenCalledWith(churchId);
	});
});

describe('actions.create_position', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return error if not authenticated', async () => {
		const event = createMockActionEvent({
			request: mockRequest(new FormData()),
			locals: {
				auth: vi.fn().mockResolvedValue(null),
				getSession: vi.fn().mockResolvedValue(null),
				signIn: vi.fn(),
				signOut: vi.fn()
			}
		});

		const result = await actions.create_position(event);
		expect(result).toEqual(fail(401, { error: 'Anda harus login untuk mengelola posisi' }));
	});

	it('should return error if user does not have admin role', async () => {
		vi.mocked(hasRole).mockReturnValue(false);
		const event = createMockActionEvent({
			request: mockRequest(new FormData())
		});

		const result = await actions.create_position(event);
		expect(result).toEqual(fail(403, { error: 'Anda tidak memiliki izin untuk mengelola posisi' }));
	});

	it('should return error if churchId is missing', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const event = createMockActionEvent({
			request: mockRequest(new FormData()),
			locals: {
				auth: vi.fn().mockResolvedValue({
					user: { id: 'user-1', role: 'admin' }
				}),
				getSession: vi.fn().mockResolvedValue({
					user: { id: 'user-1', role: 'admin' }
				}),
				signIn: vi.fn(),
				signOut: vi.fn()
			}
		});

		const result = await actions.create_position(event);
		expect(result).toEqual(fail(404, { error: 'Tidak ada gereja yang terdaftar' }));
	});

	it('should return error if required fields are missing', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.create_position(event);
		expect(result).toEqual(fail(400, { error: 'Nama posisi wajib diisi' }));
	});

	it('should create position successfully', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		formData.append('zoneId', zoneId);
		formData.append('name', 'Usher Pintu Utama');
		formData.append('type', 'usher');
		formData.append('code', 'UPU');
		formData.append('isPpg', 'false');

		const mockPosition: ChurchPosition = {
			id: positionId,
			church: churchId,
			zone: 'Zone A',
			name: 'Usher Pintu Utama',
			code: 'UPU',
			description: null,
			type: 'usher',
			isPpg: false,
			sequence: 1,
			active: 1
		};

		const mockPositionService = {
			createPositionForMass: vi.fn().mockResolvedValue(mockPosition)
		};
		vi.mocked(PositionService).mockImplementation(() => mockPositionService as unknown as PositionService);

		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.create_position(event);

		expect(result).toEqual({ success: true });
		expect(mockPositionService.createPositionForMass).toHaveBeenCalledWith(massId, zoneId, {
			name: 'Usher Pintu Utama',
			type: 'usher',
			code: 'UPU',
			description: null,
			isPpg: false,
			sequence: null
		});
	});

	it('should handle ServiceError and return appropriate error message', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		formData.append('zoneId', zoneId);
		formData.append('name', 'Usher Pintu Utama');
		formData.append('type', 'usher');

		const mockPositionService = {
			createPositionForMass: vi.fn().mockRejectedValue(
				ServiceError.validation('Nama posisi wajib diisi', { field: 'name' })
			)
		};
		vi.mocked(PositionService).mockImplementation(() => mockPositionService as unknown as PositionService);

		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.create_position(event);

		expect(result).toEqual(fail(400, { error: 'Nama posisi wajib diisi' }));
	});
});

describe('actions.edit_position', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return error if not authenticated', async () => {
		const event = createMockActionEvent({
			request: mockRequest(new FormData()),
			locals: {
				auth: vi.fn().mockResolvedValue(null),
				getSession: vi.fn().mockResolvedValue(null),
				signIn: vi.fn(),
				signOut: vi.fn()
			}
		});

		const result = await actions.edit_position(event);
		expect(result).toEqual(fail(401, { error: 'Anda harus login untuk mengelola posisi' }));
	});

	it('should return error if positionId is missing', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.edit_position(event);
		expect(result).toEqual(fail(400, { error: 'ID posisi tidak ditemukan' }));
	});

	it('should edit position successfully', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		formData.append('positionId', positionId);
		formData.append('name', 'Usher Pintu Utama (Updated)');
		formData.append('isPpg', 'true');

		const mockUpdatedPosition: ChurchPosition = {
			id: positionId,
			church: churchId,
			zone: 'Zone A',
			name: 'Usher Pintu Utama (Updated)',
			code: 'UPU',
			description: null,
			type: 'usher',
			isPpg: true,
			sequence: 1,
			active: 1
		};

		const mockPositionService = {
			editPosition: vi.fn().mockResolvedValue(mockUpdatedPosition)
		};
		vi.mocked(PositionService).mockImplementation(() => mockPositionService as unknown as PositionService);

		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.edit_position(event);

		expect(result).toEqual({ success: true });
		expect(mockPositionService.editPosition).toHaveBeenCalledWith(positionId, {
			name: 'Usher Pintu Utama (Updated)',
			isPpg: true
		});
	});
});

describe('actions.delete_position', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return error if not authenticated', async () => {
		const event = createMockActionEvent({
			request: mockRequest(new FormData()),
			locals: {
				auth: vi.fn().mockResolvedValue(null),
				getSession: vi.fn().mockResolvedValue(null),
				signIn: vi.fn(),
				signOut: vi.fn()
			}
		});

		const result = await actions.delete_position(event);
		expect(result).toEqual(fail(401, { error: 'Anda harus login untuk mengelola posisi' }));
	});

	it('should return error if positionId is missing', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.delete_position(event);
		expect(result).toEqual(fail(400, { error: 'ID posisi tidak ditemukan' }));
	});

	it('should delete position successfully', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		formData.append('positionId', positionId);

		const mockPositionService = {
			deactivatePosition: vi.fn().mockResolvedValue(undefined)
		};
		vi.mocked(PositionService).mockImplementation(() => mockPositionService as unknown as PositionService);

		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.delete_position(event);

		expect(result).toEqual({ success: true });
		expect(mockPositionService.deactivatePosition).toHaveBeenCalledWith(positionId);
	});
});

describe('actions.reorder_positions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return error if not authenticated', async () => {
		const event = createMockActionEvent({
			request: mockRequest(new FormData()),
			locals: {
				auth: vi.fn().mockResolvedValue(null),
				getSession: vi.fn().mockResolvedValue(null),
				signIn: vi.fn(),
				signOut: vi.fn()
			}
		});

		const result = await actions.reorder_positions(event);
		expect(result).toEqual(fail(401, { error: 'Anda harus login untuk mengelola posisi' }));
	});

	it('should return error if zoneId is missing', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.reorder_positions(event);
		expect(result).toEqual(fail(400, { error: 'ID zona tidak ditemukan' }));
	});

	it('should return error if items is missing or invalid', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		formData.append('zoneId', zoneId);
		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.reorder_positions(event);
		expect(result).toEqual(fail(400, { error: 'Daftar urutan posisi tidak boleh kosong' }));
	});

	it('should reorder positions successfully', async () => {
		vi.mocked(hasRole).mockReturnValue(true);
		const formData = new FormData();
		formData.append('zoneId', zoneId);
		formData.append('items', JSON.stringify([
			{ id: 'pos-1', sequence: 1 },
			{ id: 'pos-2', sequence: 2 }
		]));

		const mockPositionService = {
			reorderZonePositions: vi.fn().mockResolvedValue(undefined)
		};
		vi.mocked(PositionService).mockImplementation(() => mockPositionService as unknown as PositionService);

		const event = createMockActionEvent({
			request: mockRequest(formData)
		});

		const result = await actions.reorder_positions(event);

		expect(result).toEqual({ success: true });
		expect(mockPositionService.reorderZonePositions).toHaveBeenCalledWith(zoneId, [
			{ id: 'pos-1', sequence: 1 },
			{ id: 'pos-2', sequence: 2 }
		]);
	});
});
