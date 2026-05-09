import { browser } from '$app/environment';
import type { Session } from "@auth/core/types";
import posthog from 'posthog-js';
import { logger } from '../utils/logger';
import { EventManager } from './EventManager';
import { EventPriority, EventQueue } from './EventQueue';
import { sessionContextManager, type ChurchContext, type SessionContext } from './SessionContextManager';
import { UserJourneyTracker, type UserJourneyStats } from './UserJourneyTracker';

// Enhanced Analytics Interfaces

/**
 * Event property value types supported by PostHog.
 * Uses snake_case keys per project naming conventions.
 */
export type PostHogPropertyValue = string | number | boolean | null | undefined | Date;

/**
 * Event properties for analytics events.
 * Uses snake_case keys per project naming conventions.
 */
export type PostHogProperties = Record<string, PostHogPropertyValue>;

/**
 * User properties for PostHog user identification.
 */
export interface PostHogUserProperties {
    email?: string;
    role?: string;
    cid?: string;
    [key: string]: PostHogPropertyValue;
}

/**
 * Core analytics event structure with enriched context
 */
export interface AnalyticsEvent {
    name: string;
    properties: PostHogProperties;
    timestamp: Date;
    sessionId: string;
    userId?: string;
    userRole?: 'admin' | 'user' | 'visitor';
    churchContext?: ChurchContext;
}


/**
 * User journey tracking structure
 */
export interface UserJourney {
    sessionId: string;
    startTime: Date;
    pages: PageVisit[];
    actions: UserAction[];
    conversionEvents: ConversionEvent[];
}

/**
 * Page visit information
 */
export interface PageVisit {
    page: string;
    timestamp: Date;
    timeSpent?: number;
    referrer?: string;
    scrollDepth?: number;
}

/**
 * User action tracking
 */
export interface UserAction {
    action: string;
    target: string;
    timestamp: Date;
    result: 'success' | 'failure' | 'cancelled';
    duration?: number;
    properties?: PostHogProperties;
}

/**
 * Conversion event tracking
 */
export interface ConversionEvent {
    funnelName: string;
    step: string;
    stepOrder: number;
    timestamp: Date;
    conversionValue?: number;
    properties?: PostHogProperties;
}

/**
 * Church-specific event types
 */
export enum ChurchEventType {
    SCHEDULE_VIEW = 'schedule_view',
    SCHEDULE_CREATE = 'schedule_create',
    SCHEDULE_EDIT = 'schedule_edit',
    MASS_VIEW = 'mass_view',
    MASS_CREATE = 'mass_create',
    MASS_EDIT = 'mass_edit',
    COMMUNITY_VIEW = 'community_view',
    COMMUNITY_INTERACT = 'community_interact'
}

/**
 * Administrative action types
 */
export enum AdminAction {
    USER_MANAGEMENT = 'user_management',
    SCHEDULE_MANAGEMENT = 'schedule_management',
    MASS_MANAGEMENT = 'mass_management',
    REPORT_GENERATION = 'report_generation',
    SYSTEM_CONFIGURATION = 'system_configuration'
}

/**
 * Community engagement types
 */
export enum CommunityEngagementType {
    LINGKUNGAN_VIEW = 'lingkungan_view',
    LINGKUNGAN_PARTICIPATE = 'lingkungan_participate',
    COMMUNITY_POST = 'community_post',
    COMMUNITY_COMMENT = 'community_comment'
}

/**
 * Church event properties
 */
export interface ChurchEventProperties {
    eventType: ChurchEventType;
    entityId?: string;
    entityName?: string;
    massId?: string;
    scheduleId?: string;
    lingkunganId?: string;
    wilayahId?: string;
    [key: string]: PostHogPropertyValue;
}



/**
 * PostHogService - A singleton service for managing analytics via PostHog
 * 
 * This service provides a centralized way to interact with PostHog's analytics
 * capabilities throughout the application. It implements the singleton pattern
 * to ensure only one instance exists at runtime.
 * 
 * Features:
 * - Lazy initialization of PostHog client
 * - Structured event tracking with enriched context
 * - Session management and user identification
 * - Automatic page view tracking
 * - Church-specific analytics capabilities
 * - User journey tracking
 * - Event enrichment with session context and user metadata
 * 
 * Usage:
 * - Import the singleton: import { posthogService } from '$lib/application/PostHogService'
 * - Initialize: await posthogService.use()
 * - Track events: await posthogService.trackEvent('event_name', properties)
 * - Track structured events: await posthogService.trackStructuredEvent(analyticsEvent)
 */

class PostHogService {
    private static instance: PostHogService;
    private initialized = false;
    private journeyTracker: UserJourneyTracker | null = null;
    private eventManager: EventManager | null = null;
    private eventQueue: EventQueue | null = null;

    /**
     * Create a new instance of the PostHogService.
     * 
     * This constructor initializes the PostHog client with the provided configuration.
     * It sets up the client with the necessary options for development and production environments.
     * 
     * @throws Error if VITE_POSTHOG_KEY is not configured
     */
    private constructor() {
        if (browser) {
            const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
            if (!posthogKey) {
                const error = new Error('VITE_POSTHOG_KEY is not configured');
                logger.error('PostHogService.constructor: Missing PostHog key', { error });
                // Don't throw in browser - allow graceful degradation
                return;
            }

            try {
                posthog.init(posthogKey, {
                    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
                    person_profiles: 'identified_only',
                    capture_pageview: false, // We'll handle this manually
                    capture_pageleave: true,
                    loaded: (posthog) => {
                        if (import.meta.env.DEV) {
                            posthog.debug();
                        }
                    }
                });

                this.initializeEventProcessing();
            } catch (error) {
                logger.error('PostHogService.constructor: Failed to initialize PostHog', { error });
                // Don't throw - allow graceful degradation
            }
        }
    }

    /**
     * Initialize event processing components
     */
    private initializeEventProcessing(): void {
        if (!browser) return;

        // Create event processor function for EventManager
        const eventProcessor = async (event: AnalyticsEvent) => {
            // Send directly to PostHog
            posthog.capture(event.name, {
                ...event.properties,
                timestamp: event.timestamp.toISOString(),
                sessionId: event.sessionId,
                userId: event.userId,
                userRole: event.userRole,
                churchContext: event.churchContext,
                // Add technical context
                app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
                environment: import.meta.env.DEV ? 'development' : 'production'
            });
        };

        // Create event flush handler for EventQueue
        const flushHandler = async (events: AnalyticsEvent[]) => {
            // Process events through EventManager
            if (this.eventManager) {
                for (const event of events) {
                    await this.eventManager.processEvent(event);
                }
            } else {
                // Fallback: send directly to PostHog
                for (const event of events) {
                    await eventProcessor(event);
                }
            }
        };

        // Initialize EventManager
        this.eventManager = new EventManager(eventProcessor, {
            maxRetries: 3,
            baseRetryDelay: 1000,
            maxRetryDelay: 30000,
            batchSize: 10,
            processingTimeout: 5000
        });

        // Initialize EventQueue
        this.eventQueue = new EventQueue(flushHandler, {
            maxQueueSize: 1000,
            maxRetries: 5,
            baseRetryDelay: 2000,
            maxRetryDelay: 60000,
            batchSize: 20,
            flushInterval: 5000,
            persistToStorage: true,
            storageKey: 'lilium_analytics_queue'
        });

        logger.info('PostHogService.initializeEventProcessing: Event processing components initialized');
    }

    /**
     * Get the singleton instance of the PostHogService.
     * 
     * This method ensures that only one instance of the PostHogService exists throughout the application.
     * It creates the instance if it doesn't exist and returns the existing instance.
     * 
     * @returns The singleton instance of the PostHogService
     */
    static getInstance(): PostHogService {
        if (!PostHogService.instance) {
            PostHogService.instance = new PostHogService();
        }
        return PostHogService.instance;
    }

    /**
     * Initialize the PostHog client and session context.
     * 
     * This method initializes the PostHog client if it hasn't been initialized yet.
     * It ensures that the client is initialized before any analytics are performed.
     * 
     * @param session - Optional session object for initial context setup
     */
    async use(session?: Session): Promise<void> {
        if (this.initialized || !browser) {
            return;
        }

        try {
            this.initialized = true;

            // Initialize session context using SessionContextManager
            if (session) {
                await sessionContextManager.initializeSession(session);
            }

            // Initialize user journey tracking
            await this.initializeUserJourney();

            // Set up page navigation tracking
            this.setupPageNavigationTracking();

            logger.info('PostHogService.use: PostHog client initialized with enhanced analytics');
        } catch (error) {
            logger.error('PostHogService.use: Failed to initialize PostHog client', { error });
            this.initialized = false;
            throw error;
        }
    }

    /**
     * Initialize user journey tracking for the current session.
     * Lazily creates the UserJourneyTracker on first call.
     */
    private async initializeUserJourney(): Promise<void> {
        if (!browser) return;

        if (!this.journeyTracker) {
            this.journeyTracker = new UserJourneyTracker(
                (event) => this.trackStructuredEvent(event),
                (event) => this.sendBeaconEvent(event)
            );
        }

        await this.journeyTracker.initialize();
    }

    /**
     * Send an event synchronously via navigator.sendBeacon (used during page unload).
     * Falls back to regular tracking if sendBeacon is unavailable.
     */
    private sendBeaconEvent(event: AnalyticsEvent): void {
        if (browser && navigator.sendBeacon) {
            const payload = JSON.stringify({
                event: event.name,
                properties: {
                    ...event.properties,
                    timestamp: event.timestamp.toISOString(),
                    sessionId: event.sessionId,
                    userId: event.userId,
                    userRole: event.userRole,
                    churchContext: event.churchContext
                }
            });
            const posthogUrl = `${import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'}/capture/`;
            navigator.sendBeacon(posthogUrl, payload);
        } else {
            this.trackStructuredEvent(event);
        }
    }

    /**
     * Set up page navigation tracking with time spent calculation.
     *
     * Lifecycle events (`beforeunload`, `visibilitychange`) are owned by
     * `SessionContextManager` — we subscribe to its broadcast instead of
     * attaching duplicate DOM listeners. `popstate` is PostHog-specific
     * (SPA navigation) and stays attached directly here.
     */
    private setupPageNavigationTracking(): void {
        if (!browser || !this.journeyTracker) return;

        // Track initial page load
        this.journeyTracker.trackPageNavigation(window.location.href, document.referrer);

        // Subscribe to SessionContextManager lifecycle events
        sessionContextManager.addLifecycleListener((event) => {
            if (!this.journeyTracker) return;
            switch (event) {
                case 'session_terminating':
                    this.journeyTracker.handleSessionTermination();
                    break;
                case 'page_hidden':
                    this.journeyTracker.handlePageLeave();
                    break;
                case 'page_visible':
                    this.journeyTracker.handlePageReturn();
                    break;
            }
        });

        // Set up popstate handler for SPA navigation
        window.addEventListener('popstate', () => {
            if (!this.journeyTracker) return;
            this.journeyTracker.trackPageNavigation(
                window.location.href,
                this.journeyTracker.getCurrentPage() || ''
            );
        });

        logger.info('PostHogService.setupPageNavigationTracking: Page navigation tracking set up');
    }

    /**
     * Get current session context
     */
    getSessionContext(): SessionContext | null {
        return sessionContextManager.getSessionContext();
    }

    /**
     * Track a structured analytics event with enriched context
     * 
     * @param event - The structured analytics event
     */
    async trackStructuredEvent(event: AnalyticsEvent): Promise<void> {
        if (!browser) return;

        if (!event || !event.name || typeof event.name !== 'string') {
            logger.warn('PostHogService.trackStructuredEvent: Invalid event', { event });
            return;
        }

        try {
            if (!this.initialized) {
                await this.use();
            }

            // Enrich event with session context
            const enrichedEvent = this.enrichEventWithContext(event);

            if (this.eventQueue) {
                // Use EventQueue for resilient processing
                const priority = this.determineEventPriority(enrichedEvent);
                await this.eventQueue.enqueue(enrichedEvent, priority);
            } else {
                // Fallback: send directly to PostHog
                posthog.capture(enrichedEvent.name, {
                    ...enrichedEvent.properties,
                    timestamp: enrichedEvent.timestamp.toISOString(),
                    sessionId: enrichedEvent.sessionId,
                    userId: enrichedEvent.userId,
                    userRole: enrichedEvent.userRole,
                    churchContext: enrichedEvent.churchContext,
                    app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
                    environment: import.meta.env.DEV ? 'development' : 'production'
                });
            }

            logger.info('PostHogService.trackStructuredEvent: Event dispatched', {
                eventName: enrichedEvent.name,
                properties: enrichedEvent.properties
            });
        } catch (error) {
            logger.error('PostHogService.trackStructuredEvent: Failed to track event', { event: event.name, error });
            // Don't throw error to avoid breaking user experience
        }
    }

    /**
     * Determine event priority based on event characteristics
     * 
     * @param event - The analytics event
     * @returns Event priority level
     */
    private determineEventPriority(event: AnalyticsEvent): EventPriority {
        // Critical events (errors, security, payments)
        if (event.name.includes('error') ||
            event.name.includes('security') ||
            event.name.includes('payment') ||
            event.properties.category === 'error') {
            return EventPriority.CRITICAL;
        }

        // High priority events (conversions, admin actions)
        if (event.name.includes('conversion') ||
            event.name.includes('admin_') ||
            event.properties.category === 'conversion' ||
            event.properties.category === 'administration') {
            return EventPriority.HIGH;
        }

        // Normal priority events (user actions, church events)
        if (event.name.includes('user_action') ||
            event.name.includes('church_') ||
            event.properties.category === 'church_operations' ||
            event.properties.category === 'user_interaction') {
            return EventPriority.NORMAL;
        }

        // Low priority events (page views, performance metrics)
        return EventPriority.LOW;
    }

    /**
     * Enrich event with current session context and metadata
     * 
     * @param event - The base analytics event
     * @returns Enriched analytics event
     */
    private enrichEventWithContext(event: AnalyticsEvent): AnalyticsEvent {
        const sessionContext = sessionContextManager.getSessionContext();

        const enriched: AnalyticsEvent = {
            ...event,
            timestamp: event.timestamp || new Date(),
            sessionId: event.sessionId || sessionContext?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: event.userId || sessionContext?.userId,
            userRole: event.userRole || sessionContext?.userRole,
            churchContext: event.churchContext || sessionContext?.churchContext
        };

        // Add session metadata to properties
        if (sessionContext) {
            enriched.properties = {
                ...enriched.properties,
                deviceType: sessionContext.deviceType,
                userAgent: sessionContext.userAgent,
                sessionStartTime: sessionContext.startTime.toISOString()
            };
        }

        return enriched;
    }

    /**
     * Track a church-specific event
     * 
     * @param eventType - The type of church event
     * @param properties - Church event properties
     */
    async trackChurchEvent(eventType: ChurchEventType, properties: ChurchEventProperties): Promise<void> {
        const sessionContext = sessionContextManager.getSessionContext();

        const event: AnalyticsEvent = {
            name: `church_${eventType}`,
            properties: {
                ...properties,
                eventType,
                category: 'church_operations'
            },
            timestamp: new Date(),
            sessionId: sessionContext?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: sessionContext?.userId,
            userRole: sessionContext?.userRole,
            churchContext: sessionContext?.churchContext
        };

        await this.trackStructuredEvent(event);

        // Add to user journey if tracking
        this.journeyTracker?.recordAction({
            action: eventType,
            target: properties.entityId || 'unknown',
            timestamp: new Date(),
            result: 'success',
            properties: properties
        });
    }

    /**
     * Track an administrative action
     * 
     * @param action - The administrative action type
     * @param properties - Additional properties
     */
    async trackAdminAction(action: AdminAction, properties?: PostHogProperties): Promise<void> {
        const sessionContext = sessionContextManager.getSessionContext();

        const event: AnalyticsEvent = {
            name: `admin_${action}`,
            properties: {
                ...properties,
                action,
                category: 'administration'
            },
            timestamp: new Date(),
            sessionId: sessionContext?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: sessionContext?.userId,
            userRole: sessionContext?.userRole,
            churchContext: sessionContext?.churchContext
        };

        await this.trackStructuredEvent(event);
    }

    /**
     * Track community engagement
     * 
     * @param type - The engagement type
     * @param properties - Additional properties
     */
    async trackCommunityEngagement(type: CommunityEngagementType, properties?: PostHogProperties): Promise<void> {
        const sessionContext = sessionContextManager.getSessionContext();

        const event: AnalyticsEvent = {
            name: `community_${type}`,
            properties: {
                ...properties,
                engagementType: type,
                category: 'community'
            },
            timestamp: new Date(),
            sessionId: sessionContext?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: sessionContext?.userId,
            userRole: sessionContext?.userRole,
            churchContext: sessionContext?.churchContext
        };

        await this.trackStructuredEvent(event);
    }

    /**
     * Track page view with enhanced context
     * 
     * @param pageName - The name of the page being viewed
     * @param properties - Additional properties for the page view
     * @param session - Optional session object for user context
     */
    async trackPageView(pageName: string, properties?: PostHogProperties, session?: Session): Promise<void> {
        if (!pageName || typeof pageName !== 'string') {
            logger.warn('PostHogService.trackPageView: Invalid page name', { pageName });
            return;
        }
        // Update session context if provided
        if (session && !sessionContextManager.getSessionContext()) {
            await sessionContextManager.initializeSession(session);
        }

        const sessionContext = sessionContextManager.getSessionContext();

        // Handle user journey tracking for page navigation
        if (browser) {
            if (this.journeyTracker?.getJourney()) {
                // If this is a different page than current, track navigation
                if (this.journeyTracker.getCurrentPage() !== pageName) {
                    await this.journeyTracker.trackPageNavigation(pageName, this.journeyTracker.getCurrentPage() || '');
                }
            } else {
                // Initialize journey if not already done
                await this.initializeUserJourney();
                await this.journeyTracker?.trackPageNavigation(pageName, document.referrer || '');
            }

            // Add to user journey (dedupe handled by recordPageVisit)
            this.journeyTracker?.recordPageVisit(pageName);
        }

        const event: AnalyticsEvent = {
            name: '$pageview',
            properties: {
                page: pageName,
                referrer: browser ? document.referrer : undefined,
                page_sequence: this.journeyTracker?.getJourney()?.pages.length || 1,
                session_duration: this.journeyTracker?.getSessionDuration() || 0,
                ...properties
            },
            timestamp: new Date(),
            sessionId: sessionContext?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: sessionContext?.userId,
            userRole: sessionContext?.userRole,
            churchContext: sessionContext?.churchContext
        };

        await this.trackStructuredEvent(event);
    }

    /**
     * Update session context (useful for role changes, etc.)
     */
    updateSessionContext(updates: Partial<SessionContext>): void {
        sessionContextManager.updateSessionContext(updates);
    }

    /**
     * Get current user journey
     */
    getCurrentJourney(): UserJourney | null {
        return this.journeyTracker?.getJourney() ?? null;
    }

    /**
     * Get user journey statistics
     */
    getJourneyStats(): UserJourneyStats | null {
        return this.journeyTracker?.getStats() ?? null;
    }

    /**
     * Track a custom event (legacy method - maintained for backward compatibility).
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
    async trackEvent(event: string, properties?: PostHogProperties, session?: Session): Promise<void> {
        if (!browser) return;

        if (!event || typeof event !== 'string') {
            logger.warn('PostHogService.trackEvent: Invalid event name', { event });
            return;
        }

        try {
            if (!this.initialized) {
                await this.use(session);
            }

            // Update user context if session is provided
            if (session?.user) {
                const userId = session.user.name || 'anonymous';
                try {
                    posthog.identify(userId, {
                        email: session.user.email || undefined,
                        role: session.user.role || undefined,
                        cid: session.user.cid || undefined
                    });
                } catch (error) {
                    logger.error('PostHogService.trackEvent: Failed to identify user', { userId, error });
                }
            }

            // Convert to structured event for consistency
            const sessionContext = sessionContextManager.getSessionContext();

            const structuredEvent: AnalyticsEvent = {
                name: event,
                properties: properties || {},
                timestamp: new Date(),
                sessionId: sessionContext?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                userId: session?.user?.id || sessionContext?.userId,
                userRole: (session?.user?.role as 'admin' | 'user' | 'visitor') || sessionContext?.userRole,
                churchContext: sessionContext?.churchContext
            };

            await this.trackStructuredEvent(structuredEvent);
        } catch (error) {
            logger.error('PostHogService.trackEvent: Failed to track event', { event, error });
            // Don't throw - event tracking failures shouldn't break the application
        }
    }

    /**
     * Reset the user (useful for logout).
     */
    resetUser(): void {
        if (!browser) return;

        try {
            // Record session termination before reset
            if (this.journeyTracker?.getJourney()) {
                this.journeyTracker.handleSessionTermination();
            }

            posthog.reset();

            // Clear session context and journey state
            sessionContextManager.clearSession();
            this.journeyTracker?.reset();

            // Clear event queues for privacy
            if (this.eventManager) {
                this.eventManager.clearQueue();
            }
            if (this.eventQueue) {
                this.eventQueue.clear();
            }

            // Reset initialization flag to allow re-initialization with new session
            this.initialized = false;

            logger.info('PostHogService.resetUser: User reset');
        } catch (error) {
            logger.error('PostHogService.resetUser: Failed to reset user', { error });
        }
    }
}

export const posthogService = PostHogService.getInstance();
