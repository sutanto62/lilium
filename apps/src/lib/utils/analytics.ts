import { browser } from '$app/environment';
import type { Session } from '@auth/core/types';
import { posthogService } from '../application/PostHogService';

/**
 * Page context type for analytics tracking
 */
type PageContext = {
	route?: { id: string | null };
	url?: { href: string; pathname: string };
	data?: { session?: Session | null };
};

/**
 * Analytics tracker utility with standard parameter pattern
 * Similar to logger utility, provides a simple API for tracking events
 * 
 * Usage pattern (similar to logger):
 * - tracker.track('event_name', { prop: 'value' }, session, page)
 * 
 * Parameters:
 * - eventName: string - Name of the event
 * - properties: Record<string, any> - Event properties
 * - session?: Session - Optional session (auto-extracted from page if not provided)
 * - page?: PageContext - Optional page object for context (auto-enriched if provided)
 * 
 * @example
 * // Client-side with page
 * tracker.track('button_clicked', { button_name: 'submit' }, undefined, page);
 * 
 * @example
 * // Client-side with session from page
 * tracker.track('user_action', { action: 'create' }, page.data.session, page);
 * 
 * @example
 * // Server-side
 * tracker.track('server_event', { data: 'value' }, session);
 */
class AnalyticsTracker {
	/**
	 * Track an event with PostHog
	 * 
	 * @param eventName - Name of the event to track
	 * @param properties - Additional properties for the event
	 * @param session - Optional session object (extracted from page if not provided)
	 * @param page - Optional page object for automatic context enrichment
	 */
	async track(
		eventName: string,
		properties: Record<string, any> = {},
		session?: Session | null,
		page?: PageContext
	): Promise<void> {
		// Only track in browser environment
		if (!browser) {
			return;
		}

		try {
			// Extract session from page if not provided
			const sessionToUse = session ?? page?.data?.session ?? undefined;

			// Enrich properties with page context if available
			const enrichedProperties: Record<string, any> = {
				...properties
			};

			if (page) {
				enrichedProperties.page = page.route?.id || 'unknown';
				enrichedProperties.url = page.url?.href || '';
				enrichedProperties.path = page.url?.pathname || '';
			}

			// Add user context if session is available
			if (sessionToUse?.user) {
				enrichedProperties.user_role = sessionToUse.user.role;
				enrichedProperties.user_name = sessionToUse.user.name;
				enrichedProperties.user_email = sessionToUse.user.email;
				enrichedProperties.church_id = sessionToUse.user.cid;
			}

			await posthogService.trackEvent(eventName, enrichedProperties, sessionToUse || undefined);
		} catch (error) {
			// Silently fail in production, log in development
			if (import.meta.env.DEV) {
				console.warn('Analytics tracking failed:', error);
			}
		}
	}
}

// Export singleton instance
export const tracker = new AnalyticsTracker();

