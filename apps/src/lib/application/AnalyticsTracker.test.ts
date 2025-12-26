import { beforeEach, describe, expect, test, vi } from 'vitest';
import { analyticsTracker, type ErrorEvent, type PerformanceMetric } from './AnalyticsTracker';
import type { ChurchEventProperties } from './PostHogService';
import { AdminAction, ChurchEventType, CommunityEngagementType } from './PostHogService';

// Mock the PostHogService
vi.mock('./PostHogService', () => ({
    posthogService: {
        trackPageView: vi.fn(),
        trackStructuredEvent: vi.fn(),
        trackChurchEvent: vi.fn(),
        trackAdminAction: vi.fn(),
        trackCommunityEngagement: vi.fn(),
        getSessionContext: vi.fn(() => ({
            sessionId: 'test_session_123',
            userId: 'user123',
            userRole: 'admin',
            churchContext: {
                churchId: 'church123',
                userPermissions: ['admin'],
                lingkunganId: 'lingkungan123'
            }
        })),
        getCurrentJourney: vi.fn(() => ({
            sessionId: 'test_session_123',
            startTime: new Date(),
            pages: [],
            actions: [],
            conversionEvents: []
        }))
    },
    ChurchEventType: {
        SCHEDULE_VIEW: 'schedule_view',
        SCHEDULE_CREATE: 'schedule_create',
        SCHEDULE_EDIT: 'schedule_edit',
        MASS_VIEW: 'mass_view',
        MASS_CREATE: 'mass_create',
        MASS_EDIT: 'mass_edit',
        COMMUNITY_VIEW: 'community_view',
        COMMUNITY_INTERACT: 'community_interact'
    },
    AdminAction: {
        USER_MANAGEMENT: 'user_management',
        SCHEDULE_MANAGEMENT: 'schedule_management',
        MASS_MANAGEMENT: 'mass_management',
        REPORT_GENERATION: 'report_generation',
        SYSTEM_CONFIGURATION: 'system_configuration'
    },
    CommunityEngagementType: {
        LINGKUNGAN_VIEW: 'lingkungan_view',
        LINGKUNGAN_PARTICIPATE: 'lingkungan_participate',
        COMMUNITY_POST: 'community_post',
        COMMUNITY_COMMENT: 'community_comment'
    }
}));

describe('AnalyticsTracker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Core Tracking Methods', () => {
        test('should track page views', async () => {
            const { posthogService } = await import('./PostHogService');

            await analyticsTracker.trackPageView('/admin/dashboard', { section: 'admin' });

            expect(posthogService.trackPageView).toHaveBeenCalledWith('/admin/dashboard', { section: 'admin' });
        });

        test('should track user actions with structured events', async () => {
            const { posthogService } = await import('./PostHogService');

            await analyticsTracker.trackUserAction('button_click', { button: 'save', target: 'schedule' });

            expect(posthogService.trackStructuredEvent).toHaveBeenCalledWith({
                name: 'user_action_button_click',
                properties: {
                    button: 'save',
                    target: 'schedule',
                    action: 'button_click',
                    category: 'user_interaction'
                },
                timestamp: expect.any(Date),
                sessionId: 'test_session_123',
                userId: 'user123',
                userRole: 'admin',
                churchContext: {
                    churchId: 'church123',
                    userPermissions: ['admin'],
                    lingkunganId: 'lingkungan123'
                }
            });
        });

        test('should track conversion events with funnel information', async () => {
            const { posthogService } = await import('./PostHogService');

            await analyticsTracker.trackConversion('registration', 'completed', {
                user_type: 'admin',
                completion_time: 120
            });

            expect(posthogService.trackStructuredEvent).toHaveBeenCalledWith({
                name: 'conversion_registration_completed',
                properties: {
                    user_type: 'admin',
                    completion_time: 120,
                    funnel: 'registration',
                    step: 'completed',
                    category: 'conversion'
                },
                timestamp: expect.any(Date),
                sessionId: 'test_session_123',
                userId: 'user123',
                userRole: 'admin',
                churchContext: {
                    churchId: 'church123',
                    userPermissions: ['admin'],
                    lingkunganId: 'lingkungan123'
                }
            });
        });
    });

    describe('Church-Specific Tracking', () => {
        test('should track church events', async () => {
            const { posthogService } = await import('./PostHogService');

            const properties: ChurchEventProperties = {
                eventType: ChurchEventType.SCHEDULE_CREATE,
                entityId: 'schedule123',
                entityName: 'Sunday Mass'
            };

            await analyticsTracker.trackChurchEvent(ChurchEventType.SCHEDULE_CREATE, properties);

            expect(posthogService.trackChurchEvent).toHaveBeenCalledWith(ChurchEventType.SCHEDULE_CREATE, properties);
        });

        test('should track admin actions', async () => {
            const { posthogService } = await import('./PostHogService');

            await analyticsTracker.trackAdminAction(AdminAction.USER_MANAGEMENT, {
                action_target: 'user_list',
                users_affected: 5
            });

            expect(posthogService.trackAdminAction).toHaveBeenCalledWith(AdminAction.USER_MANAGEMENT, {
                action_target: 'user_list',
                users_affected: 5
            });
        });

        test('should track community engagement', async () => {
            const { posthogService } = await import('./PostHogService');

            await analyticsTracker.trackCommunityEngagement(CommunityEngagementType.LINGKUNGAN_VIEW, {
                lingkungan_id: 'lingkungan123',
                engagement_duration: 300
            });

            expect(posthogService.trackCommunityEngagement).toHaveBeenCalledWith(
                CommunityEngagementType.LINGKUNGAN_VIEW,
                {
                    lingkungan_id: 'lingkungan123',
                    engagement_duration: 300
                }
            );
        });
    });

    describe('Performance and Error Tracking', () => {
        test('should track performance metrics', async () => {
            const { posthogService } = await import('./PostHogService');

            const metric: PerformanceMetric = {
                name: 'page_load_time',
                value: 1250,
                unit: 'ms',
                context: {
                    page: '/admin/dashboard',
                    connection_type: 'wifi'
                }
            };

            await analyticsTracker.trackPerformance(metric);

            expect(posthogService.trackStructuredEvent).toHaveBeenCalledWith({
                name: 'performance_page_load_time',
                properties: {
                    metric_name: 'page_load_time',
                    metric_value: 1250,
                    metric_unit: 'ms',
                    page: '/admin/dashboard',
                    connection_type: 'wifi',
                    category: 'performance'
                },
                timestamp: expect.any(Date),
                sessionId: 'test_session_123',
                userId: 'user123',
                userRole: 'admin',
                churchContext: {
                    churchId: 'church123',
                    userPermissions: ['admin'],
                    lingkunganId: 'lingkungan123'
                }
            });
        });

        test('should track error events', async () => {
            const { posthogService } = await import('./PostHogService');

            const error: ErrorEvent = {
                name: 'api_error',
                message: 'Failed to load schedule data',
                stack: 'Error: Failed to load schedule data\n    at loadSchedule...',
                severity: 'high',
                context: {
                    endpoint: '/api/schedules',
                    status_code: 500
                }
            };

            await analyticsTracker.trackError(error);

            expect(posthogService.trackStructuredEvent).toHaveBeenCalledWith({
                name: 'error_api_error',
                properties: {
                    error_name: 'api_error',
                    error_message: 'Failed to load schedule data',
                    error_stack: 'Error: Failed to load schedule data\n    at loadSchedule...',
                    error_severity: 'high',
                    endpoint: '/api/schedules',
                    status_code: 500,
                    category: 'error'
                },
                timestamp: expect.any(Date),
                sessionId: 'test_session_123',
                userId: 'user123',
                userRole: 'admin',
                churchContext: {
                    churchId: 'church123',
                    userPermissions: ['admin'],
                    lingkunganId: 'lingkungan123'
                }
            });
        });

        test('should use default severity for errors when not specified', async () => {
            const { posthogService } = await import('./PostHogService');

            const error: ErrorEvent = {
                name: 'validation_error',
                message: 'Invalid input format'
            };

            await analyticsTracker.trackError(error);

            expect(posthogService.trackStructuredEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        error_severity: 'medium'
                    })
                })
            );
        });
    });

    describe('Singleton Pattern', () => {
        test('should return the same instance', async () => {
            const module1 = await import('./AnalyticsTracker');
            const module2 = await import('./AnalyticsTracker');

            expect(module1.analyticsTracker).toBe(module2.analyticsTracker);
        });
    });

    describe('Session Context Integration', () => {
        test('should handle missing session context gracefully', async () => {
            const { posthogService } = await import('./PostHogService');

            // Mock no session context
            vi.mocked(posthogService.getSessionContext).mockReturnValue(null);

            await analyticsTracker.trackUserAction('test_action');

            expect(posthogService.trackStructuredEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionId: '',
                    userId: undefined,
                    userRole: undefined,
                    churchContext: undefined
                })
            );
        });

        test('should add conversion events to user journey', async () => {
            const { posthogService } = await import('./PostHogService');

            const mockJourney = {
                sessionId: 'test_session_123',
                startTime: new Date(),
                pages: [],
                actions: [],
                conversionEvents: []
            };

            vi.mocked(posthogService.getCurrentJourney).mockReturnValue(mockJourney);

            await analyticsTracker.trackConversion('event_creation', 'started', { event_type: 'mass' });

            expect(mockJourney.conversionEvents).toHaveLength(1);
            expect(mockJourney.conversionEvents[0]).toEqual({
                funnelName: 'event_creation',
                step: 'started',
                stepOrder: 1,
                timestamp: expect.any(Date),
                properties: { event_type: 'mass' }
            });
        });
    });
});