import { browser } from '$app/environment';
import type { Session } from "@auth/core/types";
import { StatsigClient } from '@statsig/js-client';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';
import { logger } from '../utils/logger';

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
    private client: StatsigClient;
    private initialized = false;

    /**
     * Create a new instance of the StatsigService.
     * 
     * This constructor initializes the Statsig client with the provided configuration.
     * It sets up the client with the necessary plugins for session replay and auto-capture analytics.
     */
    private constructor() {
        const plugins = browser ? [
            new StatsigSessionReplayPlugin(),
            new StatsigAutoCapturePlugin()
        ] : [];
        const environment = {
            tier: import.meta.env.DEV ? 'development' : 'production'
        };
        this.client = new StatsigClient(import.meta.env.VITE_STATSIG_CLIENT_KEY, {
            userID: 'anonymous',
        }, {
            plugins,
            environment
        });
    }

    /**
     * Get the singleton instance of the StatsigService.
     * 
     * This method ensures that only one instance of the StatsigService exists throughout the application.
     * It creates the instance if it doesn't exist and returns the existing instance.
     * 
     * @returns The singleton instance of the StatsigService
     */
    static getInstance() {
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
     */
    async use() {
        if (this.initialized) {
            logger.info('Statsig client already initialized');
            return;
        }
        await this.client.initializeAsync();
        await this.client.flush();
        this.initialized = true;
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
    async checkGate(gateName: string) {
        if (!this.initialized) {
            await this.use();
        }
        const result = await this.client.checkGate(gateName);
        return result;
    }

    async updateUser(userID: string, custom?: Record<string, any>) {
        if (!this.initialized) {
            await this.use();
        }
        await this.client.updateUserAsync({ userID, email: custom?.email });
    }

    async logEvent(event: string, eventValue?: string | number, session?: Session, metadata?: Record<string, any>) {
        if (!this.initialized) {
            await this.use();
        }

        if (session?.user) {
            await this.client.updateUserAsync({
                userID: session.user.name || 'anonymous',
                email: session?.user.email || undefined,
                custom: {
                    role: session?.user.role,
                    cid: session?.user.cid
                }
            });
        }

        await this.client.logEvent(event, eventValue, metadata);
        await this.client.flush();
    }
}

export const statsigService = StatsigService.getInstance(); 