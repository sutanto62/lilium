import { expect, test, vi } from "vitest";
import { actions, load } from './+page.server';
import type { RequestEvent } from '@sveltejs/kit';
import type { RouteParams } from './$types';
import { featureFlags } from '$lib/utils/FeatureFlag';
import { repo } from '$lib/server/db';
import { QueueManager } from '$core/service/QueueManager';
import type { Church, Mass, Wilayah, Lingkungan, ChurchPosition } from '$core/entities/Schedule';
import type { Event as ChurchEvent } from '$core/entities/Event';
import { mass } from '$lib/server/db/schema';
import type { ActionFailure } from '@sveltejs/kit';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	repo: {
		findChurchById: vi.fn(),
		getMassById: vi.fn(),
		getPositionsByMass: vi.fn(),
		getLingkunganById: vi.fn(),
		getMasses: vi.fn(),
		getWilayahs: vi.fn(),
		getLingkungans: vi.fn(),
		getEventByChurch: vi.fn().mockResolvedValue(null),
		insertEvent: vi.fn().mockResolvedValue({ id: 'event1' })
	}
}));

vi.mock('$lib/utils/FeatureFlag', () => ({
	featureFlags: {
		isEnabled: vi.fn()
	}
}));

vi.mock('$core/service/QueueManager', () => ({
	QueueManager: {
		getInstance: vi.fn()
	}
}));

const createMockRequestEvent = (formData: FormData) => ({
	request: { formData: async () => formData },
	cookies: { get: () => 'church1' },
	fetch: vi.fn(),
	getClientAddress: vi.fn(),
	locals: {},
	params: {} as RouteParams,
	platform: undefined,
	route: { id: '/f/tatib' as const },
	setHeaders: vi.fn(),
	url: new URL('http://localhost/f/tatib'),
	isDataRequest: false,
	isSubRequest: false
} as unknown as RequestEvent<RouteParams, '/f/tatib'>);

test('should return 400 if massId is missing', async () => {
	const formData = new FormData();
	formData.append('wilayahId', 'wilayah1');
	formData.append('lingkunganId', 'lingkungan1');
	formData.append('ushers', JSON.stringify([{ name: 'John Doe' }]));

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 400, data: { error: 'Mohon lengkapi semua isian.' } });
});

test('should return 400 if wilayahId is missing', async () => {
	const formData = new FormData();
	formData.append('massId', 'mass1');
	formData.append('lingkunganId', 'lingkungan1');
	formData.append('ushers', JSON.stringify([{ name: 'John Doe' }]));

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 400, data: { error: 'Mohon lengkapi semua isian.' } });
});

test('should return 400 if lingkunganId is missing', async () => {
	const formData = new FormData();
	formData.append('massId', 'mass1');
	formData.append('wilayahId', 'wilayah1');
	formData.append('ushers', JSON.stringify([{ name: 'John Doe' }]));

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 400, data: { error: 'Mohon lengkapi semua isian.' } });
});

test('should return 400 if ushers is missing', async () => {
	const formData = new FormData();
	formData.append('massId', 'mass1');
	formData.append('wilayahId', 'wilayah1');
	formData.append('lingkunganId', 'lingkungan1');

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 400, data: { error: 'Mohon lengkapi semua isian.' } });
});

test('should return 400 if all fields are missing', async () => {
	const formData = new FormData();
	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 400, data: { error: 'Mohon lengkapi semua isian.' } });
});

// Tests for weekend restrictions
test('should reject submission on weekends when feature flag is enabled', async () => {
	vi.mocked(featureFlags.isEnabled).mockReturnValue(true);
	const mockDate = new Date('2024-04-20'); // Saturday
	vi.setSystemTime(mockDate);

	const formData = new FormData();
	formData.append('massId', 'mass1');
	formData.append('wilayahId', 'wilayah1');
	formData.append('lingkunganId', 'lingkungan1');
	formData.append('ushers', JSON.stringify([{ name: 'John Doe' }]));

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 400, data: { error: 'Batas konfirmasi tugas Senin s.d. Kamis' } });
});

// Tests for error handling
test('should handle queue processing errors', async () => {
	const mockMass: typeof mass.$inferSelect = {
		id: 'mass1',
		name: 'Sunday Mass',
		code: 'SM',
		sequence: 1,
		church: 'church1',
		day: 'sunday',
		time: '10:00',
		briefingTime: '09:30',
		active: 1,
		createdAt: Date.now()
	};
	const mockPosition: ChurchPosition = {
		id: 'pos1',
		name: 'Position 1',
		church: 'church1',
		code: 'P1',
		description: 'Test Position',
		isPpg: false,
		sequence: 1,
		type: 'usher'
	};
	const mockLingkungan: Lingkungan = {
		id: 'lingkungan1',
		name: 'Lingkungan 1',
		wilayah: 'wilayah1',
		sequence: 1,
		church: 'church1'
	};
	const mockQueueManager = {
		submitConfirmationQueue: vi.fn().mockResolvedValue(undefined),
		processConfirmationQueue: vi.fn().mockRejectedValue(new Error('Queue processing failed')),
		assignedUshers: [],
		ushers: [],
		positions: [],
		confirmationQueue: [],
		assignPositions: vi.fn(),
		reset: vi.fn()
	};

	vi.mocked(QueueManager.getInstance).mockReturnValue(mockQueueManager as unknown as QueueManager);
	vi.mocked(repo.getMassById).mockResolvedValue(mockMass);
	vi.mocked(repo.getPositionsByMass).mockResolvedValue([mockPosition]);
	vi.mocked(repo.getLingkunganById).mockResolvedValue(mockLingkungan);

	const formData = new FormData();
	formData.append('massId', 'mass1');
	formData.append('wilayahId', 'wilayah1');
	formData.append('lingkunganId', 'lingkungan1');
	formData.append('ushers', JSON.stringify([{ name: 'John Doe' }]));

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 400, data: { error: 'Batas konfirmasi tugas Senin s.d. Kamis' } });
});
