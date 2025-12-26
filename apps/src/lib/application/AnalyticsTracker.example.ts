/**
 * Example usage of the AnalyticsTracker
 * 
 * This file demonstrates how to use the AnalyticsTracker in various scenarios
 * throughout the Lilium church management application.
 */

import type { ErrorEvent, PerformanceMetric } from './AnalyticsTracker';
import { analyticsTracker } from './AnalyticsTracker';
import { AdminAction, ChurchEventType, CommunityEngagementType } from './PostHogService';

// Example 1: Track page views
export async function trackPageView() {
    await analyticsTracker.trackPageView('/admin/dashboard', {
        section: 'admin',
        user_type: 'church_admin'
    });
}

// Example 2: Track user actions
export async function trackUserAction() {
    await analyticsTracker.trackUserAction('button_click', {
        button: 'save_schedule',
        form: 'schedule_creation',
        success: true
    });
}

// Example 3: Track conversion funnels
export async function trackConversion() {
    // Registration funnel
    await analyticsTracker.trackConversion('registration', 'started', {
        entry_point: 'homepage',
        user_type: 'new_member'
    });

    await analyticsTracker.trackConversion('registration', 'completed', {
        completion_time: 120, // seconds
        user_role: 'member'
    });
}

// Example 4: Track church-specific events
export async function trackChurchEvents() {
    // Schedule creation
    await analyticsTracker.trackChurchEvent(ChurchEventType.SCHEDULE_CREATE, {
        eventType: ChurchEventType.SCHEDULE_CREATE,
        entityId: 'schedule_123',
        entityName: 'Sunday Mass',
        massId: 'mass_456'
    });

    // Mass viewing
    await analyticsTracker.trackChurchEvent(ChurchEventType.MASS_VIEW, {
        eventType: ChurchEventType.MASS_VIEW,
        massId: 'mass_456',
        scheduleId: 'schedule_123'
    });
}

// Example 5: Track admin actions
export async function trackAdminActions() {
    await analyticsTracker.trackAdminAction(AdminAction.USER_MANAGEMENT, {
        action_target: 'user_list',
        users_affected: 5,
        operation: 'bulk_update'
    });
}

// Example 6: Track community engagement
export async function trackCommunityEngagement() {
    await analyticsTracker.trackCommunityEngagement(CommunityEngagementType.LINGKUNGAN_VIEW, {
        lingkungan_id: 'lingkungan_123',
        engagement_duration: 300,
        content_type: 'announcement'
    });
}

// Example 7: Track performance metrics
export async function trackPerformance() {
    const metric: PerformanceMetric = {
        name: 'page_load_time',
        value: 1250,
        unit: 'ms',
        context: {
            page: '/admin/dashboard',
            connection_type: 'wifi',
            device_type: 'desktop'
        }
    };

    await analyticsTracker.trackPerformance(metric);
}

// Example 8: Track errors
export async function trackError() {
    const error: ErrorEvent = {
        name: 'api_error',
        message: 'Failed to load schedule data',
        stack: 'Error: Failed to load schedule data\n    at loadSchedule...',
        severity: 'high',
        context: {
            endpoint: '/api/schedules',
            status_code: 500,
            user_action: 'view_schedule'
        }
    };

    await analyticsTracker.trackError(error);
}