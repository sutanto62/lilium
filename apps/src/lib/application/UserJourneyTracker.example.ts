/**
 * User Journey Tracking Example
 * 
 * This example demonstrates how to use the enhanced PostHog service
 * for comprehensive user journey tracking in the Lilium application.
 */

import type { Session } from '@auth/core/types';
import { analyticsTracker } from './AnalyticsTracker';
import { ChurchEventType, CommunityEngagementType, posthogService } from './PostHogService';

/**
 * Example: Initialize user journey tracking
 */
export async function initializeUserJourney(session: Session) {
    // Initialize PostHog with session context
    await posthogService.use(session);

    console.log('User journey tracking initialized');

    // Get initial journey stats
    const stats = posthogService.getJourneyStats();
    console.log('Initial journey stats:', stats);
}

/**
 * Example: Track page navigation with time spent
 */
export async function trackPageNavigation() {
    // Track homepage visit (entry point)
    await analyticsTracker.trackPageView('/', {
        section: 'homepage',
        campaign: 'organic'
    });

    // Simulate user spending time on homepage
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Track navigation to admin dashboard
    await analyticsTracker.trackPageView('/admin/dashboard', {
        section: 'admin',
        feature: 'dashboard'
    });

    // Simulate user spending time on dashboard
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Track navigation to schedule management
    await analyticsTracker.trackPageView('/admin/jadwal', {
        section: 'admin',
        feature: 'schedule_management'
    });

    console.log('Page navigation tracked with time spent calculations');
}

/**
 * Example: Track user actions and conversions
 */
export async function trackUserActions() {
    // Track user action
    await analyticsTracker.trackUserAction('button_click', {
        button_name: 'create_schedule',
        location: 'admin_dashboard'
    });

    // Track conversion funnel
    await analyticsTracker.trackConversion('schedule_creation', 'started', {
        schedule_type: 'mass_service',
        user_role: 'admin'
    });

    // Simulate form completion
    await new Promise(resolve => setTimeout(resolve, 1000));

    await analyticsTracker.trackConversion('schedule_creation', 'completed', {
        schedule_type: 'mass_service',
        schedule_id: 'schedule_123',
        completion_time: 1000
    });

    console.log('User actions and conversions tracked');
}

/**
 * Example: Get comprehensive journey statistics
 */
export function getJourneyInsights() {
    const journey = posthogService.getCurrentJourney();
    const stats = posthogService.getJourneyStats();

    if (journey && stats) {
        console.log('=== User Journey Insights ===');
        console.log(`Session ID: ${journey.sessionId}`);
        console.log(`Session Duration: ${stats.sessionDuration}ms`);
        console.log(`Pages Visited: ${stats.pagesVisited}`);
        console.log(`Actions Performed: ${stats.actionsPerformed}`);
        console.log(`Conversions Completed: ${stats.conversionsCompleted}`);
        console.log(`Total Engagement Time: ${stats.totalEngagementTime}ms`);
        console.log(`Average Time Per Page: ${stats.averageTimePerPage}ms`);
        console.log(`Entry Page: ${stats.entryPage}`);
        console.log(`Current Page: ${stats.currentPage}`);

        console.log('\n=== Page Visit Details ===');
        journey.pages.forEach((page, index) => {
            console.log(`${index + 1}. ${page.page}`);
            console.log(`   Time: ${page.timestamp.toISOString()}`);
            console.log(`   Time Spent: ${page.timeSpent || 0}ms`);
            console.log(`   Referrer: ${page.referrer || 'direct'}`);
        });

        console.log('\n=== User Actions ===');
        journey.actions.forEach((action, index) => {
            console.log(`${index + 1}. ${action.action} on ${action.target}`);
            console.log(`   Result: ${action.result}`);
            console.log(`   Duration: ${action.duration || 0}ms`);
        });

        console.log('\n=== Conversion Events ===');
        journey.conversionEvents.forEach((conversion, index) => {
            console.log(`${index + 1}. ${conversion.funnelName} - ${conversion.step}`);
            console.log(`   Step Order: ${conversion.stepOrder}`);
            console.log(`   Value: ${conversion.conversionValue || 'N/A'}`);
        });
    } else {
        console.log('No active user journey found');
    }
}

/**
 * Example: Handle session termination
 */
export function handleSessionEnd() {
    // Get final journey stats before termination
    const finalStats = posthogService.getJourneyStats();
    console.log('Final journey stats before termination:', finalStats);

    // Reset user (this will trigger session termination tracking)
    posthogService.resetUser();

    console.log('Session terminated and user journey recorded');
}

/**
 * Example: Complete user journey workflow
 */
export async function completeUserJourneyExample() {
    console.log('=== Starting User Journey Example ===');

    // Mock session for example
    const mockSession: Session = {
        user: {
            id: 'user_123',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'admin',
            cid: 'church_123'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    try {
        // 1. Initialize journey
        await initializeUserJourney(mockSession);

        // 2. Track page navigation
        await trackPageNavigation();

        // 3. Track user actions
        await trackUserActions();

        // 4. Get insights
        getJourneyInsights();

        // 5. Handle session end
        handleSessionEnd();

        console.log('=== User Journey Example Completed ===');

    } catch (error) {
        console.error('Error in user journey example:', error);
    }
}

/**
 * Example: Track church-specific user journey
 */
export async function trackChurchUserJourney() {
    console.log('=== Church-Specific User Journey ===');

    // Track church member viewing mass schedules
    await analyticsTracker.trackPageView('/misa', {
        section: 'public',
        feature: 'mass_schedules'
    });

    // Track interest in specific mass
    await analyticsTracker.trackChurchEvent(ChurchEventType.MASS_VIEW, {
        eventType: ChurchEventType.MASS_VIEW,
        massId: 'mass_sunday_morning',
        entityName: 'Sunday Morning Mass'
    });

    // Track community engagement
    await analyticsTracker.trackCommunityEngagement(CommunityEngagementType.LINGKUNGAN_VIEW, {
        lingkunganId: 'lingkungan_123',
        wilayahId: 'wilayah_456'
    });

    // Track conversion to registration
    await analyticsTracker.trackConversion('mass_registration', 'started', {
        mass_id: 'mass_sunday_morning',
        registration_type: 'online'
    });

    console.log('Church-specific user journey tracked');
}

// Export for use in other parts of the application
export {
    analyticsTracker, posthogService
};
