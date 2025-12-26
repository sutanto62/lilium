import { browser } from '$app/environment';
import type { Session } from "@auth/core/types";
import posthog from 'posthog-js';
import { logger } from '../utils/logger';
import { EventManager } from './EventManager';
import { EventPriority, EventQueue } from './EventQueue';
import { sessionContextManager, type ChurchContext, type SessionContext } from './SessionContextManager';

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
    private currentJourney: UserJourney | null = null;
    private eventManager: EventManager | null = null;
    private eventQueue: EventQueue | null = null;
    private testMode = false; // Add test mode flag
    private currentPageStartTime: Date | null = null;
    private currentPage: string | null = null;
    private sessionStartPage: string | null = null;
    private sessionStartReferrer: string | null = null;

    /**
     * Create a new instance of the PostHogService.
     * 
     * This constructor initializes the PostHog client with the provided configuration.
     * It sets up the client with the necessary options for development and production environments.
     */
    private constructor() {
        // Check if we're in test mode
        this.testMode = import.meta.env.MODE === 'test' || import.meta.env.VITEST === 'true';

        if (browser) {
            posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
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

            // Initialize EventManager and EventQueue only if not in test mode
            if (!this.testMode) {
                this.initializeEventProcessing();
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

        logger.info('PostHog event processing components initialized');
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

        // Initialize session context using SessionContextManager
        if (session) {
            await sessionContextManager.initializeSession(session);
        }

        // Initialize user journey tracking
        this.initializeUserJourney();

        // Set up page navigation tracking
        this.setupPageNavigationTracking();

        logger.info('PostHog client initialized with enhanced analytics');
    }

    /**
     * Initialize user journey tracking for the current session
     */
    private initializeUserJourney(): void {
        if (!browser || this.testMode) return;

        const sessionContext = sessionContextManager.getSessionContext();
        if (!sessionContext) {
            logger.warn('PostHog: Cannot initialize user journey - no session context');
            return;
        }

        // Create new user journey
        this.currentJourney = {
            sessionId: sessionContext.sessionId,
            startTime: sessionContext.startTime,
            pages: [],
            actions: [],
            conversionEvents: []
        };

        // Capture entry point information
        this.captureEntryPoint();

        logger.info('PostHog: User journey tracking initialized', {
            sessionId: sessionContext.sessionId
        });
    }

    /**
     * Capture entry point and referrer information for the session
     */
    private captureEntryPoint(): void {
        if (!browser || this.testMode) return;

        const currentUrl = window.location.href;
        const referrer = document.referrer;
        const isHomepage = this.isHomepage(currentUrl);

        // Store session start information
        this.sessionStartPage = currentUrl;
        this.sessionStartReferrer = referrer;

        // Track entry point event
        const entryPointEvent: AnalyticsEvent = {
            name: 'session_entry_point',
            properties: {
                entry_page: currentUrl,
                referrer: referrer || 'direct',
                is_homepage: isHomepage,
                entry_source: this.categorizeReferrer(referrer),
                category: 'user_journey'
            },
            timestamp: new Date(),
            sessionId: this.currentJourney?.sessionId || '',
            userId: sessionContextManager.getSessionContext()?.userId,
            userRole: sessionContextManager.getSessionContext()?.userRole,
            churchContext: sessionContextManager.getSessionContext()?.churchContext
        };

        this.trackStructuredEvent(entryPointEvent);

        logger.info('PostHog: Entry point captured', {
            entryPage: currentUrl,
            referrer: referrer || 'direct',
            isHomepage
        });
    }

    /**
     * Check if the given URL is the homepage
     */
    private isHomepage(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            return pathname === '/' || pathname === '/index.html' || pathname === '';
        } catch {
            return false;
        }
    }

    /**
     * Categorize referrer source for analytics
     */
    private categorizeReferrer(referrer: string): string {
        if (!referrer) return 'direct';

        try {
            const referrerUrl = new URL(referrer);
            const domain = referrerUrl.hostname.toLowerCase();

            // Search engines
            if (domain.includes('google')) return 'google';
            if (domain.includes('bing')) return 'bing';
            if (domain.includes('yahoo')) return 'yahoo';
            if (domain.includes('duckduckgo')) return 'duckduckgo';

            // Social media
            if (domain.includes('facebook')) return 'facebook';
            if (domain.includes('twitter') || domain.includes('t.co')) return 'twitter';
            if (domain.includes('instagram')) return 'instagram';
            if (domain.includes('linkedin')) return 'linkedin';
            if (domain.includes('whatsapp')) return 'whatsapp';

            // Email
            if (domain.includes('gmail') || domain.includes('outlook') || domain.includes('mail')) return 'email';

            // Same domain (internal)
            if (domain === window.location.hostname) return 'internal';

            // External website
            return 'external';
        } catch {
            return 'unknown';
        }
    }

    /**
     * Set up page navigation tracking with time spent calculation
     */
    private setupPageNavigationTracking(): void {
        if (!browser || this.testMode) return;

        // Track initial page load
        this.trackPageNavigation(window.location.href, document.referrer);

        // Set up beforeunload handler for session termination
        window.addEventListener('beforeunload', () => {
            this.handleSessionTermination();
        });

        // Set up visibility change handler for accurate time tracking
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.handlePageLeave();
            } else if (document.visibilityState === 'visible') {
                this.handlePageReturn();
            }
        });

        // Set up popstate handler for SPA navigation
        window.addEventListener('popstate', () => {
            this.trackPageNavigation(window.location.href, this.currentPage || '');
        });

        logger.info('PostHog: Page navigation tracking set up');
    }

    /**
     * Track page navigation with time spent calculation
     */
    private trackPageNavigation(newPage: string, referrer: string): void {
        if (!browser || !this.currentJourney || this.testMode) return;

        const now = new Date();

        // Calculate time spent on previous page
        let timeSpent: number | undefined;
        if (this.currentPageStartTime && this.currentPage) {
            timeSpent = now.getTime() - this.currentPageStartTime.getTime();

            // Update the previous page visit with time spent
            const lastPageVisit = this.currentJourney.pages[this.currentJourney.pages.length - 1];
            if (lastPageVisit && lastPageVisit.page === this.currentPage) {
                lastPageVisit.timeSpent = timeSpent;
            }

            // Track page leave event for the previous page
            this.trackPageLeaveEvent(this.currentPage, timeSpent);
        }

        // Create new page visit record
        const pageVisit: PageVisit = {
            page: newPage,
            timestamp: now,
            referrer: referrer || undefined
        };

        // Add to journey
        this.currentJourney.pages.push(pageVisit);

        // Update current page tracking
        this.currentPage = newPage;
        this.currentPageStartTime = now;

        // Track page view event
        this.trackPageViewEvent(newPage, referrer, timeSpent);

        logger.info('PostHog: Page navigation tracked', {
            newPage,
            timeSpentOnPrevious: timeSpent,
            totalPages: this.currentJourney.pages.length
        });
    }

    /**
     * Track page view event with navigation context
     */
    private trackPageViewEvent(page: string, referrer: string, timeSpentOnPrevious?: number): void {
        const pageViewEvent: AnalyticsEvent = {
            name: 'page_navigation',
            properties: {
                page,
                referrer: referrer || 'direct',
                time_spent_on_previous: timeSpentOnPrevious,
                page_sequence: this.currentJourney?.pages.length || 1,
                session_duration: this.getSessionDuration(),
                category: 'user_journey'
            },
            timestamp: new Date(),
            sessionId: this.currentJourney?.sessionId || '',
            userId: sessionContextManager.getSessionContext()?.userId,
            userRole: sessionContextManager.getSessionContext()?.userRole,
            churchContext: sessionContextManager.getSessionContext()?.churchContext
        };

        this.trackStructuredEvent(pageViewEvent);
    }

    /**
     * Track page leave event with time spent
     */
    private trackPageLeaveEvent(page: string, timeSpent: number): void {
        const pageLeaveEvent: AnalyticsEvent = {
            name: 'page_leave',
            properties: {
                page,
                time_spent: timeSpent,
                engagement_level: this.calculateEngagementLevel(timeSpent),
                category: 'user_journey'
            },
            timestamp: new Date(),
            sessionId: this.currentJourney?.sessionId || '',
            userId: sessionContextManager.getSessionContext()?.userId,
            userRole: sessionContextManager.getSessionContext()?.userRole,
            churchContext: sessionContextManager.getSessionContext()?.churchContext
        };

        this.trackStructuredEvent(pageLeaveEvent);
    }

    /**
     * Calculate engagement level based on time spent
     */
    private calculateEngagementLevel(timeSpent: number): string {
        if (timeSpent < 5000) return 'bounce'; // Less than 5 seconds
        if (timeSpent < 30000) return 'low'; // Less than 30 seconds
        if (timeSpent < 120000) return 'medium'; // Less than 2 minutes
        if (timeSpent < 300000) return 'high'; // Less than 5 minutes
        return 'very_high'; // 5+ minutes
    }

    /**
     * Handle page leave (when tab becomes hidden)
     */
    private handlePageLeave(): void {
        if (!this.currentPageStartTime || !this.currentPage) return;

        // Don't end the page session, just pause timing
        // We'll resume when the page becomes visible again
        logger.info('PostHog: Page hidden, pausing time tracking');
    }

    /**
     * Handle page return (when tab becomes visible again)
     */
    private handlePageReturn(): void {
        if (!this.currentPage) return;

        // Resume timing from current moment
        this.currentPageStartTime = new Date();
        logger.info('PostHog: Page visible, resuming time tracking');
    }

    /**
     * Handle session termination and record final metrics
     */
    private handleSessionTermination(): void {
        if (!this.currentJourney) return;

        const now = new Date();
        const sessionDuration = now.getTime() - this.currentJourney.startTime.getTime();

        // Calculate final time spent on current page
        let finalTimeSpent: number | undefined;
        if (this.currentPageStartTime && this.currentPage) {
            finalTimeSpent = now.getTime() - this.currentPageStartTime.getTime();

            // Update the current page visit with final time spent
            const lastPageVisit = this.currentJourney.pages[this.currentJourney.pages.length - 1];
            if (lastPageVisit && lastPageVisit.page === this.currentPage) {
                lastPageVisit.timeSpent = finalTimeSpent;
            }
        }

        // Track session termination event
        const sessionTerminationEvent: AnalyticsEvent = {
            name: 'session_termination',
            properties: {
                session_duration: sessionDuration,
                pages_visited: this.currentJourney.pages.length,
                actions_performed: this.currentJourney.actions.length,
                conversions_completed: this.currentJourney.conversionEvents.length,
                entry_page: this.sessionStartPage,
                exit_page: this.currentPage,
                entry_referrer: this.sessionStartReferrer,
                final_time_on_page: finalTimeSpent,
                total_engagement_time: this.calculateTotalEngagementTime(),
                bounce_rate: this.currentJourney.pages.length === 1 ? 1 : 0,
                category: 'user_journey'
            },
            timestamp: now,
            sessionId: this.currentJourney.sessionId,
            userId: sessionContextManager.getSessionContext()?.userId,
            userRole: sessionContextManager.getSessionContext()?.userRole,
            churchContext: sessionContextManager.getSessionContext()?.churchContext
        };

        // Send immediately (synchronous) since page is unloading
        if (browser && navigator.sendBeacon) {
            // Use sendBeacon for reliable delivery during page unload
            const payload = JSON.stringify({
                event: sessionTerminationEvent.name,
                properties: {
                    ...sessionTerminationEvent.properties,
                    timestamp: sessionTerminationEvent.timestamp.toISOString(),
                    sessionId: sessionTerminationEvent.sessionId,
                    userId: sessionTerminationEvent.userId,
                    userRole: sessionTerminationEvent.userRole,
                    churchContext: sessionTerminationEvent.churchContext
                }
            });

            const posthogUrl = `${import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'}/capture/`;
            navigator.sendBeacon(posthogUrl, payload);
        } else {
            // Fallback to regular tracking
            this.trackStructuredEvent(sessionTerminationEvent);
        }

        logger.info('PostHog: Session termination recorded', {
            sessionDuration,
            pagesVisited: this.currentJourney.pages.length,
            actionsPerformed: this.currentJourney.actions.length,
            conversions: this.currentJourney.conversionEvents.length
        });
    }

    /**
     * Calculate total engagement time (sum of time spent on all pages)
     */
    private calculateTotalEngagementTime(): number {
        if (!this.currentJourney) return 0;

        return this.currentJourney.pages.reduce((total, page) => {
            return total + (page.timeSpent || 0);
        }, 0);
    }

    /**
     * Get current session duration in milliseconds
     */
    private getSessionDuration(): number {
        if (!this.currentJourney) return 0;
        return Date.now() - this.currentJourney.startTime.getTime();
    }

    /**
     * Manually track page navigation (for SPA routing)
     * 
     * @param newPage - The new page URL or path
     * @param referrer - The previous page (optional)
     */
    trackPageChange(newPage: string, referrer?: string): void {
        if (!browser) return;

        const previousPage = this.currentPage || referrer || '';
        this.trackPageNavigation(newPage, previousPage);
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
    async trackStructuredEvent(event: AnalyticsEvent) {
        if (!browser) return;

        if (!this.initialized) {
            await this.use();
        }

        // Enrich event with session context
        const enrichedEvent = this.enrichEventWithContext(event);

        try {
            if (this.testMode) {
                // In test mode, send directly to PostHog for immediate testing
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
            } else {
                // Production mode: use EventQueue for resilient processing
                const priority = this.determineEventPriority(enrichedEvent);

                if (this.eventQueue) {
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
                        // Add technical context
                        app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
                        environment: import.meta.env.DEV ? 'development' : 'production'
                    });
                }
            }

            logger.info(`PostHog structured event ${this.testMode ? 'sent' : 'queued'}: ${enrichedEvent.name}`, enrichedEvent.properties);
        } catch (error) {
            logger.error('PostHog structured event tracking failed', error);
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
    async trackChurchEvent(eventType: ChurchEventType, properties: ChurchEventProperties) {
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
    async trackCommunityEngagement(type: CommunityEngagementType, properties?: Record<string, any>) {
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
    async trackPageView(pageName: string, properties?: Record<string, any>, session?: Session) {
        // Update session context if provided
        if (session && !sessionContextManager.getSessionContext()) {
            await sessionContextManager.initializeSession(session);
        }

        const sessionContext = sessionContextManager.getSessionContext();

        // Handle user journey tracking for page navigation (only in non-test mode)
        if (!this.testMode) {
            if (this.currentJourney && browser) {
                // If this is a different page than current, track navigation
                if (this.currentPage !== pageName) {
                    this.trackPageNavigation(pageName, this.currentPage || '');
                }
            } else if (browser) {
                // Initialize journey if not already done
                this.initializeUserJourney();
                this.trackPageNavigation(pageName, document.referrer || '');
            }
        }

        const pageVisit: PageVisit = {
            page: pageName,
            timestamp: new Date(),
            referrer: browser ? document.referrer || undefined : undefined
        };

        // Add to user journey (only in non-test mode to avoid complexity)
        if (!this.testMode && this.currentJourney) {
            // Check if this page is already the last page in journey (avoid duplicates)
            const lastPage = this.currentJourney.pages[this.currentJourney.pages.length - 1];
            if (!lastPage || lastPage.page !== pageName) {
                this.currentJourney.pages.push(pageVisit);
            }
        }

        const event: AnalyticsEvent = {
            name: '$pageview',
            properties: {
                page: pageName,
                referrer: browser ? document.referrer : undefined,
                page_sequence: this.currentJourney?.pages.length || 1,
                session_duration: this.getSessionDuration(),
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
    updateSessionContext(updates: Partial<SessionContext>) {
        sessionContextManager.updateSessionContext(updates);
    }

    /**
     * Get current user journey
     */
    getCurrentJourney(): UserJourney | null {
        return this.currentJourney;
    }

    /**
     * Get user journey statistics
     */
    getJourneyStats(): {
        sessionDuration: number;
        pagesVisited: number;
        actionsPerformed: number;
        conversionsCompleted: number;
        totalEngagementTime: number;
        averageTimePerPage: number;
        entryPage: string | null;
        currentPage: string | null;
    } | null {
        if (!this.currentJourney) return null;

        const totalEngagementTime = this.calculateTotalEngagementTime();
        const pagesVisited = this.currentJourney.pages.length;

        return {
            sessionDuration: this.getSessionDuration(),
            pagesVisited,
            actionsPerformed: this.currentJourney.actions.length,
            conversionsCompleted: this.currentJourney.conversionEvents.length,
            totalEngagementTime,
            averageTimePerPage: pagesVisited > 0 ? totalEngagementTime / pagesVisited : 0,
            entryPage: this.sessionStartPage,
            currentPage: this.currentPage
        };
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

        // Record session termination before reset
        if (this.currentJourney) {
            this.handleSessionTermination();
        }

        posthog.reset();

        // Clear session context and journey using SessionContextManager
        sessionContextManager.clearSession();
        this.currentJourney = null;

        // Clear page tracking state
        this.currentPage = null;
        this.currentPageStartTime = null;
        this.sessionStartPage = null;
        this.sessionStartReferrer = null;

        // Clear event queues for privacy
        this.clearEventQueues();

        // Reset initialization flag to allow re-initialization with new session
        this.initialized = false;

        logger.info('PostHog user reset');
    }

    /**
     * Get event processing statistics
     */
    getEventProcessingStats() {
        return {
            eventManager: this.eventManager?.getQueueStats(),
            eventQueue: this.eventQueue?.getStats()
        };
    }

    /**
     * Get the EventManager instance for advanced usage
     */
    getEventManager(): EventManager | null {
        return this.eventManager;
    }

    /**
     * Get the EventQueue instance for advanced usage
     */
    getEventQueue(): EventQueue | null {
        return this.eventQueue;
    }

    /**
     * Flush all pending events immediately
     */
    async flushEvents(): Promise<void> {
        if (this.eventQueue) {
            await this.eventQueue.flush();
        }
    }

    /**
     * Clear all queued events (useful for testing or privacy compliance)
     */
    clearEventQueues(): void {
        if (this.eventManager) {
            this.eventManager.clearQueue();
        }
        if (this.eventQueue) {
            this.eventQueue.clear();
        }
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
