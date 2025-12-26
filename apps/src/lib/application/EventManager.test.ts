import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventManager } from './EventManager';
import type { AnalyticsEvent } from './PostHogService';

// Mock browser environment
Object.defineProperty(global, 'window', {
    value: {
        location: { href: 'http://localhost:3000/test' },
        innerWidth: 1920,
        innerHeight: 1080
    },
    writable: true
});

Object.defineProperty(global, 'screen', {
    value: { width: 1920, height: 1080 },
    writable: true
});

Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'test-agent',
        language: 'en-US'
    },
    writable: true
});

Object.defineProperty(global, 'Intl', {
    value: {
        DateTimeFormat: () => ({
            resolvedOptions: () => ({ timeZone: 'UTC' })
        })
    },
    writable: true
});

// Mock browser environment flag
vi.mock('$app/environment', () => ({
    browser: true,
    dev: false
}));

describe('EventManager', () => {
    let eventManager: EventManager;
    let mockProcessor: vi.MockedFunction<(event: AnalyticsEvent) => Promise<void>>;

    beforeEach(() => {
        mockProcessor = vi.fn().mockResolvedValue(undefined);
        eventManager = new EventManager(mockProcessor, {
            maxRetries: 2,
            baseRetryDelay: 100,
            maxRetryDelay: 1000,
            batchSize: 5,
            processingTimeout: 1000
        });
    });

    afterEach(() => {
        eventManager.destroy();
        vi.clearAllMocks();
    });

    it('should process events successfully', async () => {
        const testEvent: AnalyticsEvent = {
            name: 'test_event',
            properties: { test: 'value' },
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        await eventManager.processEvent(testEvent);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 200));

        expect(mockProcessor).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'test_event',
                properties: expect.objectContaining({
                    test: 'value',
                    page_url: 'http://localhost:3000/test',
                    user_agent: 'test-agent'
                })
            })
        );
    });

    it('should enrich events with metadata', async () => {
        const testEvent: AnalyticsEvent = {
            name: 'test_event',
            properties: { original: 'data' },
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        await eventManager.processEvent(testEvent);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 200));

        expect(mockProcessor).toHaveBeenCalledWith(
            expect.objectContaining({
                properties: expect.objectContaining({
                    original: 'data',
                    page_url: 'http://localhost:3000/test',
                    user_agent: 'test-agent',
                    screen_resolution: '1920x1080',
                    viewport_size: '1920x1080',
                    timezone: 'UTC',
                    language: 'en-US'
                })
            })
        );
    });

    it('should retry failed events with exponential backoff', async () => {
        mockProcessor.mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce(undefined);

        const testEvent: AnalyticsEvent = {
            name: 'test_event',
            properties: { test: 'retry' },
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        await eventManager.processEvent(testEvent);

        // Wait for retries
        await new Promise(resolve => setTimeout(resolve, 1000));

        expect(mockProcessor).toHaveBeenCalledTimes(3);
    });

    it('should provide queue statistics', async () => {
        const testEvent: AnalyticsEvent = {
            name: 'test_event',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        await eventManager.processEvent(testEvent);

        const stats = eventManager.getQueueStats();
        expect(stats.total).toBeGreaterThan(0);
        expect(typeof stats.pending).toBe('number');
        expect(typeof stats.processing).toBe('number');
        expect(typeof stats.completed).toBe('number');
        expect(typeof stats.failed).toBe('number');
        expect(typeof stats.retrying).toBe('number');
    });

    it('should handle processing timeout', async () => {
        mockProcessor.mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 2000))
        );

        const testEvent: AnalyticsEvent = {
            name: 'test_event',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        await eventManager.processEvent(testEvent);

        // Wait for timeout
        await new Promise(resolve => setTimeout(resolve, 1500));

        const stats = eventManager.getQueueStats();
        expect(stats.failed + stats.retrying).toBeGreaterThan(0);
    });

    it('should clean up processed events', async () => {
        const testEvent: AnalyticsEvent = {
            name: 'test_event',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        await eventManager.processEvent(testEvent);

        // Wait for processing and cleanup
        await new Promise(resolve => setTimeout(resolve, 300));

        const stats = eventManager.getQueueStats();
        expect(stats.completed).toBeGreaterThan(0);
    });
});