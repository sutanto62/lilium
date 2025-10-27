import { browser } from '$app/environment';
import type { Session } from "@auth/core/types";
import posthog from 'posthog-js';
import { logger } from '../utils/logger';

/**
 * PostHogService - A singleton service for managing analytics via PostHog
 * 
 * This service provides a centralized way to interact with PostHog's analytics
 * capabilities throughout the application. It implements the singleton pattern
 * to ensure only one instance exists at runtime.
 * 
 * Features:
 * - Lazy initialization of PostHog client
 * - Event tracking with user context
 * - Session management and user identification
 * - Automatic page view tracking
 * 
 * Usage:
 * - Import the singleton: import { posthogService } from '$lib/application/PostHogService'
 * - Initialize: await posthogService.use()
 * - Track events: await posthogService.trackEvent('event_name', properties)
 */

class PostHogService {
    private static instance: PostHogService;
    private initialized = false;

    /**
     * Create a new instance of the PostHogService.
     * 
     * This constructor initializes the PostHog client with the provided configuration.
     * It sets up the client with the necessary options for development and production environments.
     */
    private constructor() {
        if (browser) {
            posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
                api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
                person_profiles: 'identified_only',
                capture_pageview: false, // We'll handle this manually
                capture_pageleave: true,
                loaded: (posthog) => {
                    if (import.meta.env.DEV) {
                        posthog.debug();
                    }
                }
            });
        }
    }

    /**
     * Get the singleton instance of the PostHogService.
     * 
     * This method ensures that only one instance of the PostHogService exists throughout the application.
     * It creates the instance if it doesn't exist and returns the existing instance.
     * 
     * @returns The singleton instance of the PostHogService
     */
    static getInstance() {
        if (!PostHogService.instance) {
            PostHogService.instance = new PostHogService();
        }
        return PostHogService.instance;
    }

    /**
     * Initialize the PostHog client.
     * 
     * This method initializes the PostHog client if it hasn't been initialized yet.
     * It ensures that the client is initialized before any analytics are performed.
     */
    async use() {
        if (this.initialized || !browser) {
            logger.info('PostHog client already initialized or not in browser');
            return;
        }

        this.initialized = true;
        logger.info('PostHog client initialized');
    }

    /**
     * Track a custom event.
     * 
     * @param event - The name of the event to track
     * @param properties - Additional properties to include with the event
     * @param session - Optional session object for user context
     * 
     * Example:
     * ```ts
     * await posthogService.trackEvent('button_clicked', { button_name: 'signup' });
     * ```
     */
    async trackEvent(event: string, properties?: Record<string, any>, session?: Session) {
        if (!browser) return;

        if (!this.initialized) {
            await this.use();
        }

        // Update user context if session is provided
        if (session?.user) {
            this.identifyUser(session.user.name || 'anonymous', {
                email: session.user.email,
                role: session.user.role,
                cid: session.user.cid
            });
        }

        posthog.capture(event, properties);
        logger.info(`PostHog event tracked: ${event}`, properties);
    }

    /**
     * Identify a user with PostHog.
     * 
     * @param userId - The unique identifier for the user
     * @param properties - Additional user properties
     */
    identifyUser(userId: string, properties?: Record<string, any>) {
        if (!browser) return;

        posthog.identify(userId, properties);
        logger.info(`PostHog user identified: ${userId}`, properties);
    }

    /**
     * Track a page view.
     * 
     * @param pageName - The name of the page being viewed
     * @param properties - Additional properties for the page view
     * @param session - Optional session object for user context
     */
    async trackPageView(pageName: string, properties?: Record<string, any>, session?: Session) {
        await this.trackEvent('$pageview', {
            page: pageName,
            ...properties
        }, session);
    }

    /**
     * Set user properties.
     * 
     * @param properties - Properties to set for the current user
     */
    setUserProperties(properties: Record<string, any>) {
        if (!browser) return;

        posthog.people.set(properties);
        logger.info('PostHog user properties set', properties);
    }

    /**
     * Reset the user (useful for logout).
     */
    resetUser() {
        if (!browser) return;

        posthog.reset();
        logger.info('PostHog user reset');
    }

    /**
     * Get the PostHog instance for advanced usage.
     * 
     * @returns The PostHog instance
     */
    getInstance() {
        return posthog;
    }
}

export const posthogService = PostHogService.getInstance();
