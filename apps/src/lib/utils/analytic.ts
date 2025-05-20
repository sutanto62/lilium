import { browser } from '$app/environment';
import posthog from 'posthog-js';
import { PostHog } from 'posthog-node';

/**
 * Analytics utility functions for PostHog integration, Client setup. Call these functions in your server actions or routes.
 * 
 * This module provides functions to:
 * - Capture events and send to PostHog
 * - Identify users and set their properties
 * 
 * The analytics flow:
 * 1. Events are captured with user ID and event name
 * 2. Users are identified with properties like email, role, etc.
 * 3. PostHog client is properly shutdown after each operation
 */

export function initPostHog() {
    if (browser) {
        posthog.init(
            import.meta.env.VITE_POSTHOG_KEY,
            {
                api_host: import.meta.env.VITE_POSTHOG_HOST,
                person_profiles: 'always',
                capture_pageview: true, // prevent double count pageviews and pageleaves
                capture_pageleave: true, // prevent double count pageviews and pageleaves
                persistence: 'localStorage'
            }
        );
    }
}

/**
 * Captures an analytics event and sends it to PostHog Server setup
 * @param event - The SvelteKit server load event containing session info
 * @param identityId - Optional unique identifier for the user
 * @param eventName - Name of the event to capture
 * @param properties - Additional properties for the event
 */
export const capture = async (identityId: string, eventName: string, properties?: Record<string, any>) => {

    const posthog = new PostHog(import.meta.env.VITE_POSTHOG_KEY, { host: import.meta.env.VITE_POSTHOG_HOST });
    posthog.capture({
        distinctId: identityId ?? 'visitor',
        event: eventName ?? 'page_view',
        properties
    });

    await posthog.shutdown();
}

export const captureEventClient = async (identityId: string, eventName: string, properties?: Record<string, any>) => {

    if (!browser) {
        return;
    }

    initPostHog();
    posthog.identify(identityId ?? 'visitor');

    posthog.capture(
        eventName ?? 'page_view',
        properties
    );
}


/**
 * Identifies a user in PostHog and sets their properties
 * @param userId - Unique identifier for the user
 * @param properties - Object containing user properties like email, role, etc.
 */
export const identifyUser = async (userId: string, properties: Record<string, any>) => {
    const posthogInstance = new PostHog(import.meta.env.VITE_POSTHOG_KEY, { host: import.meta.env.VITE_POSTHOG_HOST });
    posthogInstance.identify({
        distinctId: userId,
        properties
    });
    await posthogInstance.shutdown();
}
