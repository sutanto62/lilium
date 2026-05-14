import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkServerGate } from '../featureFlags';

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('$src/lib/application/StatsigService', () => ({
	statsigService: {
		use: vi.fn().mockResolvedValue(undefined),
		updateUser: vi.fn().mockResolvedValue(undefined),
		checkGate: vi.fn().mockResolvedValue(false)
	}
}));

vi.mock('$src/lib/utils/logger', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

// Required because StatsigService references $app/environment at module level
vi.mock('$app/environment', () => ({
	browser: false,
	dev: true
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLocals(user?: { name: string; role?: string; cid?: string } | null): App.Locals {
	const session = user
		? {
				user: { name: user.name, role: user.role ?? 'user', cid: user.cid ?? '' },
				expires: new Date(Date.now() + 86_400_000).toISOString()
			}
		: null;

	return { auth: vi.fn().mockResolvedValue(session) } as unknown as App.Locals;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('checkServerGate', () => {
	let mockStatsig: { use: ReturnType<typeof vi.fn>; updateUser: ReturnType<typeof vi.fn>; checkGate: ReturnType<typeof vi.fn> };

	beforeEach(async () => {
		vi.clearAllMocks();
		const { statsigService } = await import('$src/lib/application/StatsigService');
		mockStatsig = statsigService as unknown as typeof mockStatsig;
	});

	it('returns true when the gate is open for an authenticated user', async () => {
		mockStatsig.checkGate.mockResolvedValue(true);
		const locals = makeLocals({ name: 'user-123', role: 'admin', cid: 'church-1' });

		const result = await checkServerGate(locals, 'new_domain_model');

		expect(result).toBe(true);
		expect(mockStatsig.use).toHaveBeenCalledOnce();
		expect(mockStatsig.updateUser).toHaveBeenCalledWith('user-123', {
			role: 'admin',
			cid: 'church-1'
		});
		expect(mockStatsig.checkGate).toHaveBeenCalledWith('new_domain_model');
	});

	it('returns false when the gate is closed for an authenticated user', async () => {
		mockStatsig.checkGate.mockResolvedValue(false);
		const locals = makeLocals({ name: 'user-456', role: 'user' });

		const result = await checkServerGate(locals, 'new_settings_pages');

		expect(result).toBe(false);
		expect(mockStatsig.checkGate).toHaveBeenCalledWith('new_settings_pages');
	});

	it('skips updateUser and still checks gate when there is no session', async () => {
		mockStatsig.checkGate.mockResolvedValue(false);
		const locals = makeLocals(null);

		const result = await checkServerGate(locals, 'new_domain_model');

		expect(result).toBe(false);
		expect(mockStatsig.updateUser).not.toHaveBeenCalled();
		expect(mockStatsig.checkGate).toHaveBeenCalledWith('new_domain_model');
	});

	it('falls back to false when statsigService.use() throws', async () => {
		mockStatsig.use.mockRejectedValue(new Error('Statsig init failed'));
		const locals = makeLocals({ name: 'user-789' });

		const result = await checkServerGate(locals, 'new_domain_model');

		expect(result).toBe(false);
	});

	it('falls back to false when statsigService.checkGate() throws', async () => {
		mockStatsig.checkGate.mockRejectedValue(new Error('Network error'));
		const locals = makeLocals({ name: 'user-789' });

		const result = await checkServerGate(locals, 'new_domain_model');

		expect(result).toBe(false);
	});

	it('logs a warning on failure', async () => {
		const { logger } = await import('$src/lib/utils/logger');
		mockStatsig.use.mockRejectedValue(new Error('boom'));
		const locals = makeLocals({ name: 'user-000' });

		await checkServerGate(locals, 'some_gate');

		expect(logger.warn).toHaveBeenCalledWith(
			'checkServerGate: gate check failed, defaulting to false',
			expect.objectContaining({ gate: 'some_gate' })
		);
	});
});
