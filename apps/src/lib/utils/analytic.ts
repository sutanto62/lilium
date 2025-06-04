import { browser } from '$app/environment';
import { StatsigClient } from '@statsig/js-client';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';
import { logger } from './logger';

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
export const initStatsig = async () => {
    if (!browser) return;

    try {
        logger.debug(`initStatsig`);
        if (!import.meta.env.VITE_STATSIG_CLIENT_KEY) {
            console.error('Statsig SDK key is not configured');
            return;
        }

        const statsigClient = new StatsigClient(
            import.meta.env.VITE_STATSIG_CLIENT_KEY,
            {
                userID: import.meta.env.VITE_STATSIG_USER_ID || 'anonymous',
            },
            {
                plugins: [
                    new StatsigSessionReplayPlugin(),
                    new StatsigAutoCapturePlugin(),
                ],
            }
        );

        await statsigClient.initializeAsync();
        return statsigClient;
    } catch (error) {
        console.error('Failed to initialize Statsig:', error);
        return null;
    }
}

export const identifyStatsigUser = async (userId: string, properties?: Record<string, any>) => {
    if (!browser) return;

    try {
        const statsigClient = await initStatsig();
        if (!statsigClient) return;

        await statsigClient.updateUser({
            userID: userId,
            custom: {
                ...properties,
                environment: import.meta.env.MODE,
                version: import.meta.env.VITE_APP_VERSION || '1.0.0'
            }
        });
    } catch (error) {
        console.error('Failed to identify user in Statsig:', error);
    }
}
