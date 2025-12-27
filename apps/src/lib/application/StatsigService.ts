import { browser } from '$app/environment';
import type { Session } from "@auth/core/types";
import { StatsigClient } from '@statsig/js-client';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';
import { logger } from '../utils/logger';

/**
 * Metadata type for event tracking.
 * Uses snake_case keys per project naming conventions.
 */
export type StatsigMetadata = Record<string, string | number | boolean | null | undefined>;

/**
 * Custom user properties for Statsig user updates.
 */
export interface StatsigUserCustom {
    email?: string;
    role?: string;
    cid?: string;
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * StatsigService - A singleton service for managing feature flags and analytics via Statsig
 * 
 * This service provides a centralized way to interact with Statsig's feature flagging
 * and analytics capabilities throughout the application. It implements the singleton pattern
 * to ensure only one instance exists at runtime.
 * 
 * Features:
 * - Lazy initialization of Statsig client
 * - Feature flag checking via gates
 * - Session replay and auto-capture analytics
 * 
 * Usage:
 * - Import the singleton: import { statsigService } from '$lib/application/StatsigService'
 * - Initialize: await statsigService.use()
 * - Check feature flags: await statsigService.checkGate('flag_name')
 */
class StatsigService {
    private static instance: StatsigService;
    private client: StatsigClient | null = null;
    private initialized = false;
    private initializationPromise: Promise<void> | null = null;

    /**
     * Create a new instance of the StatsigService.
     * 
     * This constructor initializes the Statsig client with the provided configuration.
     * It sets up the client with the necessary plugins for session replay and auto-capture analytics.
     * 
     * @throws Error if VITE_STATSIG_CLIENT_KEY is not configured
     */
    private constructor() {
        const clientKey = import.meta.env.VITE_STATSIG_CLIENT_KEY;
        if (!clientKey) {
            const error = new Error('VITE_STATSIG_CLIENT_KEY is not configured');
            logger.error('StatsigService.constructor: Missing Statsig client key', { error });
            throw error;
        }

        try {
            const plugins = browser ? [
                new StatsigSessionReplayPlugin(),
                new StatsigAutoCapturePlugin()
            ] : [];
            const environment = {
                tier: import.meta.env.DEV ? 'development' : 'production'
            };
            this.client = new StatsigClient(clientKey, {
                userID: 'anonymous',
            }, {
                plugins,
                environment
            });
        } catch (error) {
            logger.error('StatsigService.constructor: Failed to create Statsig client', { error });
            throw error;
        }
    }

    /**
     * Get the singleton instance of the StatsigService.
     * 
     * This method ensures that only one instance of the StatsigService exists throughout the application.
     * It creates the instance if it doesn't exist and returns the existing instance.
     * 
     * @returns The singleton instance of the StatsigService
     */
    static getInstance(): StatsigService {
        if (!StatsigService.instance) {
            StatsigService.instance = new StatsigService();
        }
        return StatsigService.instance;
    }

    /**
     * Initialize the Statsig client.
     * 
     * This method initializes the Statsig client if it hasn't been initialized yet.
     * It ensures that the client is initialized before any feature flag checks or analytics are performed.
     * Uses a promise to prevent concurrent initialization attempts.
     * 
     * @throws Error if initialization fails
     */
    async use(): Promise<void> {
        if (this.initialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        if (!this.client) {
            const error = new Error('Statsig client not initialized');
            logger.error('StatsigService.use: Client not available', { error });
            throw error;
        }

        this.initializationPromise = (async () => {
            try {
                await this.client!.initializeAsync();
                await this.client!.flush();
                this.initialized = true;
                logger.info('StatsigService.use: Statsig client initialized successfully');
            } catch (error) {
                logger.error('StatsigService.use: Failed to initialize Statsig client', { error });
                this.initializationPromise = null;
                throw error;
            }
        })();

        return this.initializationPromise;
    }

    /**
     * Check if a feature gate is enabled.
     * 
     * @param gateName - The name of the feature gate to check
     * @returns A Promise that resolves to true if the gate is enabled, false otherwise
     * 
     * Example:
     * ```ts
     * const isFeatureEnabled = await statsigService.checkGate('my_feature_flag');
     * if (isFeatureEnabled) {
     *   // Execute feature-specific code
     * }
     * ```
     */
    async checkGate(gateName: string): Promise<boolean> {
        if (!gateName || typeof gateName !== 'string') {
            logger.warn('StatsigService.checkGate: Invalid gate name', { gateName });
            return false;
        }

        try {
            if (!this.initialized) {
                await this.use();
            }

            if (!this.client) {
                logger.error('StatsigService.checkGate: Client not available', { gateName });
                return false;
            }

            const result = await this.client.checkGate(gateName);
            return result;
        } catch (error) {
            logger.error('StatsigService.checkGate: Failed to check gate', { gateName, error });
            return false;
        }
    }

    /**
     * Update the current user context for Statsig.
     * 
     * @param userID - The unique identifier for the user
     * @param custom - Optional custom user properties (email, role, cid, etc.)
     * @throws Error if update fails
     */
    async updateUser(userID: string, custom?: StatsigUserCustom): Promise<void> {
        if (!userID || typeof userID !== 'string') {
            logger.warn('StatsigService.updateUser: Invalid userID', { userID });
            return;
        }

        try {
            if (!this.initialized) {
                await this.use();
            }

            if (!this.client) {
                logger.error('StatsigService.updateUser: Client not available', { userID });
                return;
            }

            await this.client.updateUserAsync({
                userID,
                email: custom?.email,
                custom: custom ? {
                    ...custom,
                    email: undefined // Remove email from custom as it's a top-level property
                } : undefined
            });
        } catch (error) {
            logger.error('StatsigService.updateUser: Failed to update user', { userID, error });
            throw error;
        }
    }

    /**
     * Log an event to Statsig with optional metadata.
     * 
     * @param event - The event name (should follow snake_case naming convention)
     * @param eventValue - Optional event value (string or number)
     * @param session - Optional session object for user context
     * @param metadata - Optional metadata object (should use snake_case keys)
     * @throws Error if logging fails
     */
    async logEvent(
        event: string,
        eventValue?: string | number,
        session?: Session,
        metadata?: StatsigMetadata
    ): Promise<void> {
        if (!event || typeof event !== 'string') {
            logger.warn('StatsigService.logEvent: Invalid event name', { event });
            return;
        }

        try {
            if (!this.initialized) {
                await this.use();
            }

            if (!this.client) {
                logger.error('StatsigService.logEvent: Client not available', { event });
                return;
            }

            // Update user context if session is provided
            if (session?.user) {
                await this.client.updateUserAsync({
                    userID: session.user.name || 'anonymous',
                    email: session.user.email || undefined,
                    custom: {
                        role: session.user.role,
                        cid: session.user.cid
                    }
                });
            }

            // Convert metadata to string values as Statsig expects Record<string, string>
            const stringMetadata: Record<string, string> | undefined = metadata
                ? Object.entries(metadata).reduce((acc, [key, value]) => {
                    if (value !== null && value !== undefined) {
                        acc[key] = String(value);
                    }
                    return acc;
                }, {} as Record<string, string>)
                : undefined;

            await this.client.logEvent(event, eventValue, stringMetadata);
            await this.client.flush();
        } catch (error) {
            logger.error('StatsigService.logEvent: Failed to log event', { event, eventValue, error });
            // Don't throw - event logging failures shouldn't break the application
        }
    }
}

export const statsigService = StatsigService.getInstance(); 