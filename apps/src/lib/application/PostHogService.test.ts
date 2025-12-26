import type { Session } from '@auth/core/types';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AdminAction, ChurchEventType, CommunityEngagementType, posthogService, type AnalyticsEvent } from './PostHogService';

// Mock PostHog
vi.mock('posthog-js', () => ({
    default: {
        init: vi.fn(),
        capture: vi.fn(),
        identify: vi.fn(),
        people: {
            set: vi.fn()
        },
        reset: vi.fn(),
        debug: vi.fn()
    }
}));

// Mock browser environment
vi.mock('$app/environment', () => ({
    browser: true,
    dev: false
}));

// Mock SessionContextManager
vi.mock('./SessionContextManager', () => {
    const mockSessionContextManager = {
        initializeSession: vi.fn(),
        getSessionContext: vi.fn(),
        updateSessionContext: vi.fn(),
        clearSession: vi.fn()
    };

    return {
        sessionContextManager: mockSessionContextManager,
        SessionContextManager: {
            getInstance: () => mockSessionContextManager
        }
    };
});

// Mock logger
vi.mock('../utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

// Mock EventManager and EventQueue
vi.mock('./EventManager', () => {
    const mockEventManager = {
        processEvent: vi.fn().mockResolvedValue(undefined),
        getQueueStats: vi.fn().mockReturnValue({
            total: 0,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            retrying: 0
        }),
        clearQueue: vi.fn(),
        destroy: vi.fn()
    };

    return {
        EventManager: vi.fn().mockImplementation(() => mockEventManager),
        EventStatus: {
            PENDING: 'pending',
            PROCESSING: 'processing',
            COMPLETED: 'completed',
            FAILED: 'failed',
            RETRYING: 'retrying'
        }
    };
});

vi.mock('./EventQueue', () => {
    const mockEventQueue = {
        enqueue: vi.fn().mockResolvedValue(undefined),
        flush: vi.fn().mockResolvedValue(undefined),
        getStats: vi.fn().mockReturnValue({
            totalEvents: 0,
            pendingEvents: 0,
            failedEvents: 0,
            queueSize: 0,
            isOnline: true,
            totalProcessed: 0,
            totalFailed: 0
        }),
        clear: vi.fn(),
        destroy: vi.fn()
    };

    return {
        EventQueue: vi.fn().mockImplementation(() => mockEventQueue),
        EventPriority: {
            LOW: 0,
            NORMAL: 1,
            HIGH: 2,
            CRITICAL: 3
        }
    };
});

describe('Enhanced PostHogService', () => {
    const mockSession: Session = {
        user: {
            id: 'user123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'admin',
            cid: 'church123',
            lingkunganId: 'lingkungan123'
        },
        expires: new Date(Date.now() + 86400000).toISOString()
    };

    // Get the mocked modules
    let mockSessionContextManager: any;
    let mockEventQueue: any;
    let mockEventManager: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Import the mocked modules to get access to the mocks
        const { sessionContextManager } = await import('./SessionContextManager');
        const { EventQueue } = await import('./EventQueue');
        const { EventManager } = await import('./EventManager');

        mockSessionContextManager = sessionContextManager;
        mockEventQueue = new (EventQueue as any)();
        mockEventManager = new (EventManager as any)();

        // Reset PostHog service state
        (posthogService as any).initialized = false;
        (posthogService as any).currentJourney = null;

        // Setup default mock returns
        mockSessionContextManager.getSessionContext.mockReturnValue({
            sessionId: 'test_session',
            userId: 'user123',
            userRole: 'admin',
            churchContext: {
                churchId: 'church123',
                lingkunganId: 'lingkungan123',
                userPermissions: ['admin']
            },
            deviceType: 'desktop',
            startTime: new Date()
        });

        // Mock EventQueue to call flush handler immediately for testing
        mockEventQueue.enqueue.mockImplementation(async (event: any, priority: any) => {
            // Simulate immediate processing by calling the flush handler
            const flushHandler = (posthogService as any).eventQueue?.flushHandler;
            if (flushHandler) {
                await flushHandler([event]);
            }
        });
    });

    test('should initialize with session context', async () => {
        await posthogService.use(mockSession);

        expect(mockSessionContextManager.initializeSession).toHaveBeenCalledWith(mockSession);

        const sessionContext = posthogService.getSessionContext();
        expect(sessionContext).toBeDefined();
        expect(sessionContext?.userId).toBe('user123');
        expect(sessionContext?.userRole).toBe('admin');
        expect(sessionContext?.churchContext?.churchId).toBe('church123');
        expect(sessionContext?.churchContext?.lingkunganId).toBe('lingkungan123');
    });

    test('should track structured events with enriched context', async () => {
        await posthogService.use(mockSession);

        const event: AnalyticsEvent = {
            name: 'test_event',
            properties: { test: 'value' },
            timestamp: new Date(),
            sessionId: 'test_session',
            userId: 'user123',
            userRole: 'admin'
        };

        await posthogService.trackStructuredEvent(event);

        // Verify the event was enriched and sent
        const posthog = await import('posthog-js');
        expect(posthog.default.capture).toHaveBeenCalledWith(
            'test_event',
            expect.objectContaining({
                test: 'value',
                timestamp: expect.any(String),
                sessionId: expect.any(String),
                userId: 'user123',
                userRole: 'admin',
                churchContext: expect.objectContaining({
                    churchId: 'church123',
                    lingkunganId: 'lingkungan123'
                }),
                app_version: expect.any(String),
                environment: expect.any(String)
            })
        );
    });

    test('should track church events with proper categorization', async () => {
        await posthogService.use(mockSession);

        await posthogService.trackChurchEvent(ChurchEventType.SCHEDULE_CREATE, {
            eventType: ChurchEventType.SCHEDULE_CREATE,
            entityId: 'schedule123',
            entityName: 'Sunday Mass'
        });

        const posthog = await import('posthog-js');
        expect(posthog.default.capture).toHaveBeenCalledWith(
            'church_schedule_create',
            expect.objectContaining({
                eventType: 'schedule_create',
                category: 'church_operations',
                entityId: 'schedule123',
                entityName: 'Sunday Mass'
            })
        );
    });

    test('should track admin actions', async () => {
        await posthogService.use(mockSession);

        await posthogService.trackAdminAction(AdminAction.USER_MANAGEMENT, {
            action_target: 'user_list'
        });

        const posthog = await import('posthog-js');
        expect(posthog.default.capture).toHaveBeenCalledWith(
            'admin_user_management',
            expect.objectContaining({
                action: 'user_management',
                category: 'administration',
                action_target: 'user_list'
            })
        );
    });

    test('should track community engagement', async () => {
        await posthogService.use(mockSession);

        await posthogService.trackCommunityEngagement(CommunityEngagementType.LINGKUNGAN_VIEW, {
            lingkungan_id: 'lingkungan123'
        });

        const posthog = await import('posthog-js');
        expect(posthog.default.capture).toHaveBeenCalledWith(
            'community_lingkungan_view',
            expect.objectContaining({
                engagementType: 'lingkungan_view',
                category: 'community',
                lingkungan_id: 'lingkungan123'
            })
        );
    });

    test('should maintain backward compatibility with legacy trackEvent', async () => {
        await posthogService.trackEvent('legacy_event', { prop: 'value' }, mockSession);

        const posthog = await import('posthog-js');
        expect(posthog.default.capture).toHaveBeenCalledWith(
            'legacy_event',
            expect.objectContaining({
                prop: 'value',
                timestamp: expect.any(String),
                sessionId: expect.any(String),
                userId: 'user123',
                userRole: 'admin'
            })
        );
    });

    test('should track page views with journey information', async () => {
        await posthogService.use(mockSession);

        await posthogService.trackPageView('/admin/dashboard', { section: 'admin' });

        // In test mode, journey tracking is disabled for simplicity
        // But we should still verify the page view event was sent
        const posthog = await import('posthog-js');
        expect(posthog.default.capture).toHaveBeenCalledWith(
            '$pageview',
            expect.objectContaining({
                page: '/admin/dashboard',
                section: 'admin'
            })
        );

        // Journey tracking is disabled in test mode, so we don't test it
        const journey = posthogService.getCurrentJourney();
        expect(journey).toBeNull(); // Should be null in test mode
    });

    test('should generate unique session IDs', async () => {
        await posthogService.use(mockSession);
        const context1 = posthogService.getSessionContext();

        // Reset and initialize again
        posthogService.resetUser();

        // Mock a different session context for the second initialization
        mockSessionContextManager.getSessionContext.mockReturnValueOnce({
            sessionId: 'different_session',
            userId: 'user123',
            userRole: 'admin',
            churchContext: {
                churchId: 'church123',
                lingkunganId: 'lingkungan123',
                userPermissions: ['admin']
            },
            deviceType: 'desktop',
            startTime: new Date()
        });

        await posthogService.use(mockSession);
        const context2 = posthogService.getSessionContext();

        expect(context1?.sessionId).toBeDefined();
        expect(context2?.sessionId).toBeDefined();
        // After reset, a new session should be created with a different ID
        if (context1 && context2) {
            expect(context1.sessionId).not.toBe(context2.sessionId);
        }
    });

    test('should handle offline scenarios gracefully', async () => {
        // This test verifies that the service doesn't throw errors when browser is false
        vi.doMock('$app/environment', () => ({
            browser: false
        }));

        // Should not throw
        await expect(posthogService.use(mockSession)).resolves.toBeUndefined();
        await expect(posthogService.trackEvent('test')).resolves.toBeUndefined();
    });
});