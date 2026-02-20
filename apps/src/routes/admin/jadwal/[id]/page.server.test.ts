import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteParams } from './$types';
import { actions } from './+page.server';

const mockAssignEventPic = vi.fn().mockResolvedValue(true);
const mockUpdateEventPic = vi.fn().mockResolvedValue(true);

vi.mock('$core/service/EventService', () => ({
	EventService: vi.fn().mockImplementation(() => ({
		assignEventPic: mockAssignEventPic,
		updateEventPic: mockUpdateEventPic
	}))
}));

vi.mock('$src/lib/application/StatsigService', () => ({
	statsigService: { logEvent: vi.fn() }
}));

function createMockRequestEvent(formData: FormData, params: { id: string }): RequestEvent<RouteParams, '/admin/jadwal/[id]'> {
	return {
		request: { formData: async () => formData },
		params: params as RouteParams,
		locals: {
			auth: vi.fn().mockResolvedValue({
				user: { cid: 'church-1', name: 'Test User' }
			})
		},
		cookies: { get: vi.fn() },
		fetch: vi.fn(),
		getClientAddress: vi.fn(),
		platform: undefined,
		route: { id: '/admin/jadwal/[id]' as const },
		setHeaders: vi.fn(),
		url: new URL(`http://localhost/admin/jadwal/${params.id}`),
		isDataRequest: false,
		isSubRequest: false
	} as unknown as RequestEvent<RouteParams, '/admin/jadwal/[id]'>;
}

describe('jadwal [id] +page.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAssignEventPic.mockResolvedValue(true);
		mockUpdateEventPic.mockResolvedValue(true);
	});

	describe('updatePic', () => {
		it('when mode=edit calls updateEventPic with eventId, zoneId, name and does not call assignEventPic', async () => {
			const formData = new FormData();
			formData.append('mode', 'edit');
			formData.append('zone', 'zone-1');
			formData.append('pic', 'New Name');

			const eventId = 'event-1';
			const result = await actions.updatePic(createMockRequestEvent(formData, { id: eventId }));

			expect(mockUpdateEventPic).toHaveBeenCalledWith(eventId, 'zone-1', 'New Name');
			expect(mockUpdateEventPic).toHaveBeenCalledTimes(1);
			expect(mockAssignEventPic).not.toHaveBeenCalled();
			expect(result).toEqual({ success: true });
		});
	});
});
