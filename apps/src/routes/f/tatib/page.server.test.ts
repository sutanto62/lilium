import type { EventUsher } from '$core/entities/Event';
import type { ChurchPosition, Lingkungan } from '$core/entities/Schedule';
import { QueueManager } from '$core/service/QueueManager';
import { repo } from '$lib/server/db';
import { mass } from '$lib/server/db/schema';
import { validateUsherNames } from '$lib/utils/usherValidation';
import { statsigService } from '$src/lib/application/StatsigService';
import { featureFlags } from '$src/lib/utils/localFeatureFlag';
import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, test, vi } from "vitest";
import type { PageData, RouteParams } from './$types';
import { actions, load } from './+page.server';

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

vi.mock('$src/lib/application/StatsigService', () => ({
	statsigService: {
		use: vi.fn(),
		checkGate: vi.fn(),
		logEvent: vi.fn(),
		flush: vi.fn()
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

test('should return 422 if massId is missing', async () => {
	const formData = new FormData();
	formData.append('wilayahId', 'wilayah1');
	formData.append('lingkunganId', 'lingkungan1');
	formData.append('ushers', JSON.stringify([{ name: 'John Doe' }]));

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 422, data: { error: 'Mohon lengkapi semua isian.' } });
});

test('should return 422 if wilayahId is missing', async () => {
	const formData = new FormData();
	formData.append('massId', 'mass1');
	formData.append('lingkunganId', 'lingkungan1');
	formData.append('ushers', JSON.stringify([{ name: 'John Doe' }]));

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 422, data: { error: 'Mohon lengkapi semua isian.' } });
});

test('should return 422 if lingkunganId is missing', async () => {
	const formData = new FormData();
	formData.append('massId', 'mass1');
	formData.append('wilayahId', 'wilayah1');
	formData.append('ushers', JSON.stringify([{ name: 'John Doe' }]));

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 422, data: { error: 'Mohon lengkapi semua isian.' } });
});

test('should return 422 if ushers is missing', async () => {
	const formData = new FormData();
	formData.append('massId', 'mass1');
	formData.append('wilayahId', 'wilayah1');
	formData.append('lingkunganId', 'lingkungan1');

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 422, data: { error: 'Mohon lengkapi semua isian.' } });
});

test('should return 422 if all fields are missing', async () => {
	const formData = new FormData();
	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 422, data: { error: 'Mohon lengkapi semua isian.' } });
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
	expect(result).toEqual({ status: 422, data: { error: 'Batas konfirmasi tugas Senin s.d. Kamis' } });
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
		type: 'usher',
		zone: 'Zone 1',
		active: 1
	};
	const mockLingkungan: Lingkungan = {
		id: 'lingkungan1',
		name: 'Lingkungan 1',
		wilayah: 'wilayah1',
		sequence: 1,
		church: 'church1',
		active: 1
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
	vi.mocked(repo.listPositionByMass).mockResolvedValue([mockPosition]);
	vi.mocked(repo.findLingkunganById).mockResolvedValue(mockLingkungan);

	const formData = new FormData();
	formData.append('massId', 'mass1');
	formData.append('wilayahId', 'wilayah1');
	formData.append('lingkunganId', 'lingkungan1');
	formData.append('ushers', JSON.stringify([{ name: 'John Doe' }]));

	const result = await actions.default(createMockRequestEvent(formData));
	expect(result).toEqual({ status: 422, data: { error: 'Batas konfirmasi tugas Senin s.d. Kamis' } });
});

describe('validateUsherNames', () => {
	const createMockUsher = (name: string): EventUsher => ({
		id: '1',
		name,
		event: 'event1',
		wilayah: 'wilayah1',
		lingkungan: 'lingkungan1',
		position: null,
		isPpg: false,
		isKolekte: false,
		createdAt: Date.now()
	});

	test('should return valid for unique, properly formatted names', () => {
		const ushers = [
			createMockUsher('John Doe'),
			createMockUsher('Jane Smith')
		];
		const result = validateUsherNames(ushers);

		expect(result).toEqual({ isValid: true });
	});

	test('should reject duplicate names', () => {
		const ushers = [
			createMockUsher('John Doe'),
			createMockUsher('John Doe')
		];
		const result = validateUsherNames(ushers);

		expect(result).toEqual({
			isValid: false,
			error: 'Nama petugas tidak boleh duplikat: John Doe'
		});
	});

	test('should reject names shorter than 3 characters', () => {
		const ushers = [createMockUsher('Jo')];
		const result = validateUsherNames(ushers);

		expect(result).toEqual({
			isValid: false,
			error: 'Panjang nama petugas minimum 3/maksimum 50 karakter: Jo'
		});
	});

	test('should reject names with excessive character repetition', () => {
		const ushers = [createMockUsher('Jooohn')];
		const result = validateUsherNames(ushers);

		expect(result).toEqual({
			isValid: false,
			error: 'Mohon ketik nama petugas dengan benar: Jooohn'
		});
	});

	test('should reject names with non-alphabetic characters', () => {
		const ushers = [createMockUsher('John123')];
		const result = validateUsherNames(ushers);

		expect(result).toEqual({
			isValid: false,
			error: 'Nama petugas hanya boleh mengandung huruf: John123'
		});
	});

	test('should reject names with dots', () => {
		const ushers = [createMockUsher('John S. Doe')];
		const result = validateUsherNames(ushers);

		expect(result).toEqual({
			isValid: false,
			error: 'Nama petugas tidak boleh mengandung titik: John S. Doe'
		});
	});

	// Additional test cases
	test('should reject names longer than 50 characters', () => {
		const longName = 'A'.repeat(51);
		const ushers = [createMockUsher(longName)];
		const result = validateUsherNames(ushers);

		expect(result).toEqual({
			isValid: false,
			error: `Panjang nama petugas minimum 3/maksimum 50 karakter: ${longName}`
		});
	});

	test('should handle names with multiple spaces', () => {
		const ushers = [createMockUsher('John   Doe')];
		const result = validateUsherNames(ushers);

		expect(result).toEqual({ isValid: true });
	});

	test('should handle names with leading/trailing spaces', () => {
		const ushers = [createMockUsher('  John Doe  ')];
		const result = validateUsherNames(ushers);

		expect(result).toEqual({ isValid: true });
	});
});

describe('load function', () => {
	test('should return showForm true when Statsig gate is enabled and it is weekday', async () => {
		vi.mocked(statsigService.checkGate).mockResolvedValue(true);

		// Mock a weekday
		const mockDate = new Date('2024-04-17'); // Wednesday
		vi.setSystemTime(mockDate);

		const result = await load({
			cookies: { get: () => 'church1' }
		} as any) as PageData;

		expect(result.showForm).toBe(true);
		expect(statsigService.checkGate).toHaveBeenCalledWith('show_tatib_form');
	});

	test('should return showForm false when Statsig gate is disabled', async () => {
		vi.mocked(statsigService.checkGate).mockResolvedValue(false);

		const result = await load({
			cookies: { get: () => 'church1' }
		} as any) as PageData;

		expect(result.showForm).toBe(false);
	});

	test('should return showForm false on weekends even when Statsig gate is enabled', async () => {
		vi.mocked(statsigService.checkGate).mockResolvedValue(true);

		// Mock a weekend
		const mockDate = new Date('2024-04-20'); // Saturday
		vi.setSystemTime(mockDate);

		const result = await load({
			cookies: { get: () => 'church1' }
		} as any) as PageData;

		expect(result.showForm).toBe(false);
	});
});
