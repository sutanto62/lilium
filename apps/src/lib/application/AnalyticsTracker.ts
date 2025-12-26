import type {
    AdminAction,
    ChurchEventProperties,
    ChurchEventType,
    CommunityEngagementType
} from './PostHogService';
import { posthogService } from './PostHogService';

/**
 * Performance metric for tracking application performance
 */
export interface PerformanceMetric {
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count' | 'percentage';
    context?: Record<string, any>;
    timestamp?: Date;
}

/**
 * Error event for tracking application errors
 */
export interface ErrorEvent {
    name: string;
    message: string;
    stack?: string;
    context?: Record<string, any>;
    timestamp?: Date;
    severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Analytics Tracker Interface
 * 
 * Defines the contract for tracking analytics events throughout the application.
 * This interface provides a clean abstraction over the underlying analytics service.
 */
export interface AnalyticsTracker {
    // Core tracking methods
    trackPageView(page: string, properties?: Record<string, any>): Promise<void>;
    trackUserAction(action: string, properties?: Record<string, any>): Promise<void>;
    trackConversion(funnel: string, step: string, properties?: Record<string, any>): Promise<void>;

    // Church-specific tracking
    trackChurchEvent(eventType: ChurchEventType, properties: ChurchEventProperties): Promise<void>;
    trackAdminAction(action: AdminAction, properties?: Record<string, any>): Promise<void>;
    trackCommunityEngagement(type: CommunityEngagementType, properties?: Record<string, any>): Promise<void>;

    // Performance tracking
    trackPerformance(metric: PerformanceMetric): Promise<void>;
    trackError(error: ErrorEvent): Promise<void>;
}

/**
 * PostHog Analytics Tracker Implementation
 * 
 * This class implements the AnalyticsTracker interface using PostHog as the underlying
 * analytics service. It provides a clean, structured way to track analytics events
 * while leveraging the existing PostHogService singleton pattern.
 * 
 * Features:
 * - Implements the complete AnalyticsTracker interface
 * - Integrates seamlessly with existing PostHogService
 * - Provides church-specific tracking capabilities
 * - Handles performance and error tracking
 * - Maintains backward compatibility with existing analytics
 * 
 * Usage:
 * ```typescript
 * import { analyticsTracker } from '$lib/application/AnalyticsTracker';
 * 
 * // Track page view
 * await analyticsTracker.trackPageView('/admin/dashboard', { section: 'admin' });
 * 
 * // Track user action
 * await analyticsTracker.trackUserAction('button_click', { button: 'save' });
 * 
 * // Track church event
 * await analyticsTracker.trackChurchEvent(ChurchEventType.SCHEDULE_CREATE, {
 *     eventType: ChurchEventType.SCHEDULE_CREATE,
 *     entityId: 'schedule123'
 * });
 * ```
 */
class PostHogAnalyticsTracker implements AnalyticsTracker {
    private static instance: PostHogAnalyticsTracker;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() { }

    /**
     * Get the singleton instance of the AnalyticsTracker
     */
    static getInstance(): PostHogAnalyticsTracker {
        if (!PostHogAnalyticsTracker.instance) {
            PostHogAnalyticsTracker.instance = new PostHogAnalyticsTracker();
        }
        return PostHogAnalyticsTracker.instance;
    }

    /**
     * Track a page view with enhanced context
     * 
     * @param page - The page being viewed (e.g., '/admin/dashboard')
     * @param properties - Additional properties for the page view
     */
    async trackPageView(page: string, properties?: Record<string, any>): Promise<void> {
        await posthogService.trackPageView(page, properties);
    }

    /**
     * Track a user action with context
     * 
     * @param action - The action being performed (e.g., 'button_click', 'form_submit')
     * @param properties - Additional properties for the action
     */
    async trackUserAction(action: string, properties?: Record<string, any>): Promise<void> {
        await posthogService.trackStructuredEvent({
            name: `user_action_${action}`,
            properties: {
                ...properties,
                action,
                category: 'user_interaction'
            },
            timestamp: new Date(),
            sessionId: posthogService.getSessionContext()?.sessionId || '',
            userId: posthogService.getSessionContext()?.userId,
            userRole: posthogService.getSessionContext()?.userRole,
            churchContext: posthogService.getSessionContext()?.churchContext
        });
    }

    /**
     * Track a conversion event in a funnel
     * 
     * @param funnel - The name of the conversion funnel (e.g., 'registration', 'event_creation')
     * @param step - The step in the funnel (e.g., 'started', 'completed', 'abandoned')
     * @param properties - Additional properties for the conversion
     */
    async trackConversion(funnel: string, step: string, properties?: Record<string, any>): Promise<void> {
        await posthogService.trackStructuredEvent({
            name: `conversion_${funnel}_${step}`,
            properties: {
                ...properties,
                funnel,
                step,
                category: 'conversion'
            },
            timestamp: new Date(),
            sessionId: posthogService.getSessionContext()?.sessionId || '',
            userId: posthogService.getSessionContext()?.userId,
            userRole: posthogService.getSessionContext()?.userRole,
            churchContext: posthogService.getSessionContext()?.churchContext
        });

        // Add to user journey as conversion event
        const journey = posthogService.getCurrentJourney();
        if (journey) {
            journey.conversionEvents.push({
                funnelName: funnel,
                step,
                stepOrder: journey.conversionEvents.length + 1,
                timestamp: new Date(),
                properties
            });
        }
    }

    /**
     * Track a church-specific event
     * 
     * @param eventType - The type of church event
     * @param properties - Church event properties
     */
    async trackChurchEvent(eventType: ChurchEventType, properties: ChurchEventProperties): Promise<void> {
        await posthogService.trackChurchEvent(eventType, properties);
    }

    /**
     * Track an administrative action
     * 
     * @param action - The administrative action type
     * @param properties - Additional properties
     */
    async trackAdminAction(action: AdminAction, properties?: Record<string, any>): Promise<void> {
        await posthogService.trackAdminAction(action, properties);
    }

    /**
     * Track community engagement
     * 
     * @param type - The engagement type
     * @param properties - Additional properties
     */
    async trackCommunityEngagement(type: CommunityEngagementType, properties?: Record<string, any>): Promise<void> {
        await posthogService.trackCommunityEngagement(type, properties);
    }

    /**
     * Track performance metrics
     * 
     * @param metric - The performance metric to track
     */
    async trackPerformance(metric: PerformanceMetric): Promise<void> {
        await posthogService.trackStructuredEvent({
            name: `performance_${metric.name}`,
            properties: {
                metric_name: metric.name,
                metric_value: metric.value,
                metric_unit: metric.unit,
                ...metric.context,
                category: 'performance'
            },
            timestamp: metric.timestamp || new Date(),
            sessionId: posthogService.getSessionContext()?.sessionId || '',
            userId: posthogService.getSessionContext()?.userId,
            userRole: posthogService.getSessionContext()?.userRole,
            churchContext: posthogService.getSessionContext()?.churchContext
        });
    }

    /**
     * Track error events
     * 
     * @param error - The error event to track
     */
    async trackError(error: ErrorEvent): Promise<void> {
        await posthogService.trackStructuredEvent({
            name: `error_${error.name}`,
            properties: {
                error_name: error.name,
                error_message: error.message,
                error_stack: error.stack,
                error_severity: error.severity || 'medium',
                ...error.context,
                category: 'error'
            },
            timestamp: error.timestamp || new Date(),
            sessionId: posthogService.getSessionContext()?.sessionId || '',
            userId: posthogService.getSessionContext()?.userId,
            userRole: posthogService.getSessionContext()?.userRole,
            churchContext: posthogService.getSessionContext()?.churchContext
        });
    }
}

/**
 * Singleton instance of the Analytics Tracker
 * 
 * Use this instance throughout the application for consistent analytics tracking.
 * 
 * @example
 * ```typescript
 * import { analyticsTracker } from '$lib/application/AnalyticsTracker';
 * 
 * await analyticsTracker.trackPageView('/admin');
 * ```
 */
export const analyticsTracker = PostHogAnalyticsTracker.getInstance();

// Re-export types for convenience
export type { AdminAction, ChurchEventProperties, ChurchEventType, CommunityEngagementType };
