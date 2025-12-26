import { browser } from '$app/environment';
import type { Session } from "@auth/core/types";
import posthog from 'posthog-js';
import { logger } from '../utils/logger';

// Enhanced Analytics Interfaces

/**
 * Core analytics event structure with enriched context
 */
export interface AnalyticsEvent {
    name: string;
    properties: Record<string, any>;
    timestamp: Date;
    sessionId: string;
    userId?: string;
    userRole?: 'admin' | 'user' | 'visitor';
    churchContext?: ChurchContext;
}

/**
 * Church-specific context information
 */
export interface ChurchContext {
    churchId: string;
    region?: string;
    userPermissions: string[];
    lingkunganId?: string;
    wilayahId?: string;
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
    properties?: Record<string, any>;
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
    properties?: Record<string, any>;
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
    [key: string]: any;
}

/**
 * Session context for analytics enrichment
 */
export interface SessionContext {
    sessionId: string;
    userId?: string;
    userRole?: 'admin' | 'user' | 'visitor';
    churchContext?: ChurchContext;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    userAgent?: string;
    startTime: Date;
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
    private sessionContext: SessionContext | null = null;
    private currentJourney: UserJourney | null = null;

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
     * Initialize the PostHog client and session context.
     * 
     * This method initializes the PostHog client if it hasn't been initialized yet.
     * It ensures that the client is initialized before any analytics are performed.
     * 
     * @param session - Optional session object for initial context setup
     */
    async use(session?: Session) {
        if (this.initialized || !browser) {
            logger.info('PostHog client already initialized or not in browser');
            return;
        }

        this.initialized = true;

        // Initialize session context
        if (session) {
            await this.initializeSessionContext(session);
        }

        logger.info('PostHog client initialized with enhanced analytics');
    }

    /**
     * Initialize session context from user session
     * 
     * @param session - The user session object
     */
    private async initializeSessionContext(session: Session) {
        if (!browser) return;

        const sessionId = this.generateSessionId();

        // Extract church context from session
        const churchContext: ChurchContext | undefined = session.user ? {
            churchId: session.user.cid || '',
            userPermissions: [session.user.role || 'visitor'],
            lingkunganId: session.user.lingkunganId,
            region: undefined // Can be enhanced later with region data
        } : undefined;

        this.sessionContext = {
            sessionId,
            userId: session.user?.id,
            userRole: session.user?.role as 'admin' | 'user' | 'visitor',
            churchContext,
            deviceType: this.detectDeviceType(),
            userAgent: navigator.userAgent,
            startTime: new Date()
        };

        // Initialize user journey tracking
        this.currentJourney = {
            sessionId,
            startTime: new Date(),
            pages: [],
            actions: [],
            conversionEvents: []
        };

        // Identify user with enriched context
        if (session.user) {
            this.identifyUser(session.user.name || session.user.id || 'anonymous', {
                email: session.user.email,
                role: session.user.role,
                cid: session.user.cid,
                lingkunganId: session.user.lingkunganId,
                sessionId: sessionId
            });
        }
    }

    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Detect device type from user agent
     */
    private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
        if (!browser) return 'desktop';

        const userAgent = navigator.userAgent.toLowerCase();
        if (/tablet|ipad|playbook|silk/.test(userAgent)) {
            return 'tablet';
        }
        if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }

    /**
     * Track a structured analytics event with enriched context
     * 
     * @param event - The structured analytics event
     */
    async trackStructuredEvent(event: AnalyticsEvent) {
        if (!browser) return;

        if (!this.initialized) {
            await this.use();
        }

        // Enrich event with session context
        const enrichedEvent = this.enrichEventWithContext(event);

        // Send to PostHog
        posthog.capture(enrichedEvent.name, {
            ...enrichedEvent.properties,
            timestamp: enrichedEvent.timestamp.toISOString(),
            sessionId: enrichedEvent.sessionId,
            userId: enrichedEvent.userId,
            userRole: enrichedEvent.userRole,
            churchContext: enrichedEvent.churchContext,
            // Add technical context
            app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
            environment: import.meta.env.DEV ? 'development' : 'production'
        });

        logger.info(`PostHog structured event tracked: ${enrichedEvent.name}`, enrichedEvent.properties);
    }

    /**
     * Enrich event with current session context and metadata
     * 
     * @param event - The base analytics event
     * @returns Enriched analytics event
     */
    private enrichEventWithContext(event: AnalyticsEvent): AnalyticsEvent {
        const enriched: AnalyticsEvent = {
            ...event,
            timestamp: event.timestamp || new Date(),
            sessionId: event.sessionId || this.sessionContext?.sessionId || this.generateSessionId(),
            userId: event.userId || this.sessionContext?.userId,
            userRole: event.userRole || this.sessionContext?.userRole,
            churchContext: event.churchContext || this.sessionContext?.churchContext
        };

        // Add session metadata to properties
        if (this.sessionContext) {
            enriched.properties = {
                ...enriched.properties,
                deviceType: this.sessionContext.deviceType,
                userAgent: this.sessionContext.userAgent,
                sessionStartTime: this.sessionContext.startTime.toISOString()
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
    async trackChurchEvent(eventType: ChurchEventType, properties: ChurchEventProperties) {
        const event: AnalyticsEvent = {
            name: `church_${eventType}`,
            properties: {
                ...properties,
                eventType,
                category: 'church_operations'
            },
            timestamp: new Date(),
            sessionId: this.sessionContext?.sessionId || this.generateSessionId(),
            userId: this.sessionContext?.userId,
            userRole: this.sessionContext?.userRole,
            churchContext: this.sessionContext?.churchContext
        };

        await this.trackStructuredEvent(event);

        // Add to user journey if tracking
        if (this.currentJourney) {
            this.currentJourney.actions.push({
                action: eventType,
                target: properties.entityId || 'unknown',
                timestamp: new Date(),
                result: 'success',
                properties: properties
            });
        }
    }

    /**
     * Track an administrative action
     * 
     * @param action - The administrative action type
     * @param properties - Additional properties
     */
    async trackAdminAction(action: AdminAction, properties?: Record<string, any>) {
        const event: AnalyticsEvent = {
            name: `admin_${action}`,
            properties: {
                ...properties,
                action,
                category: 'administration'
            },
            timestamp: new Date(),
            sessionId: this.sessionContext?.sessionId || this.generateSessionId(),
            userId: this.sessionContext?.userId,
            userRole: this.sessionContext?.userRole,
            churchContext: this.sessionContext?.churchContext
        };

        await this.trackStructuredEvent(event);
    }

    /**
     * Track community engagement
     * 
     * @param type - The engagement type
     * @param properties - Additional properties
     */
    async trackCommunityEngagement(type: CommunityEngagementType, properties?: Record<string, any>) {
        const event: AnalyticsEvent = {
            name: `community_${type}`,
            properties: {
                ...properties,
                engagementType: type,
                category: 'community'
            },
            timestamp: new Date(),
            sessionId: this.sessionContext?.sessionId || this.generateSessionId(),
            userId: this.sessionContext?.userId,
            userRole: this.sessionContext?.userRole,
            churchContext: this.sessionContext?.churchContext
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
    async trackPageView(pageName: string, properties?: Record<string, any>, session?: Session) {
        // Update session context if provided
        if (session && !this.sessionContext) {
            await this.initializeSessionContext(session);
        }

        const pageVisit: PageVisit = {
            page: pageName,
            timestamp: new Date(),
            referrer: document.referrer || undefined
        };

        // Add to user journey
        if (this.currentJourney) {
            this.currentJourney.pages.push(pageVisit);
        }

        const event: AnalyticsEvent = {
            name: '$pageview',
            properties: {
                page: pageName,
                referrer: document.referrer,
                ...properties
            },
            timestamp: new Date(),
            sessionId: this.sessionContext?.sessionId || this.generateSessionId(),
            userId: this.sessionContext?.userId,
            userRole: this.sessionContext?.userRole,
            churchContext: this.sessionContext?.churchContext
        };

        await this.trackStructuredEvent(event);
    }

    /**
     * Get current session context
     */
    getSessionContext(): SessionContext | null {
        return this.sessionContext;
    }

    /**
     * Get current user journey
     */
    getCurrentJourney(): UserJourney | null {
        return this.currentJourney;
    }

    /**
     * Update session context (useful for role changes, etc.)
     */
    updateSessionContext(updates: Partial<SessionContext>) {
        if (this.sessionContext) {
            this.sessionContext = { ...this.sessionContext, ...updates };
        }
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
    async trackEvent(event: string, properties?: Record<string, any>, session?: Session) {
        if (!browser) return;

        if (!this.initialized) {
            await this.use(session);
        }

        // Update user context if session is provided
        if (session?.user) {
            this.identifyUser(session.user.name || 'anonymous', {
                email: session.user.email,
                role: session.user.role,
                cid: session.user.cid
            });
        }

        // Convert to structured event for consistency
        const structuredEvent: AnalyticsEvent = {
            name: event,
            properties: properties || {},
            timestamp: new Date(),
            sessionId: this.sessionContext?.sessionId || this.generateSessionId(),
            userId: session?.user?.id || this.sessionContext?.userId,
            userRole: (session?.user?.role as 'admin' | 'user' | 'visitor') || this.sessionContext?.userRole,
            churchContext: this.sessionContext?.churchContext
        };

        await this.trackStructuredEvent(structuredEvent);
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

        // Clear session context and journey
        this.sessionContext = null;
        this.currentJourney = null;

        // Reset initialization flag to allow re-initialization with new session
        this.initialized = false;

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
