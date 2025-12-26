import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventPriority, EventQueue } from './EventQueue';
import type { AnalyticsEvent } from './PostHogService';

// Mock browser environment
Object.defineProperty(global, 'window', {
    value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
    },
    writable: true
});

Object.defineProperty(global, 'document', {
    value: {
        addEventListener: vi.fn(),
        hidden: false
    },
    writable: true
});

Object.defineProperty(global, 'navigator', {
    value: {
        onLine: true
    },
    writable: true
});

Object.defineProperty(global, 'localStorage', {
    value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
    },
    writable: true
});

// Mock browser environment flag
vi.mock('$app/environment', () => ({
    browser: true,
    dev: false
}));

describe('EventQueue', () => {
    let eventQueue: EventQueue;
    let mockFlushHandler: vi.MockedFunction<(events: AnalyticsEvent[]) => Promise<void>>;

    beforeEach(() => {
        mockFlushHandler = vi.fn().mockResolvedValue(undefined);
        eventQueue = new EventQueue(mockFlushHandler, {
            maxQueueSize: 100,
            maxRetries: 2,
            baseRetryDelay: 100,
            maxRetryDelay: 1000,
            batchSize: 5,
            flushInterval: 200,
            persistToStorage: false, // Disable for tests
            storageKey: 'test_queue'
        });
    });

    afterEach(() => {
        eventQueue.destroy();
        vi.clearAllMocks();
    });

    it('should enqueue events with priority', async () => {
        const testEvent: AnalyticsEvent = {
            name: 'test_event',
            properties: { test: 'value' },
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        await eventQueue.enqueue(testEvent, EventPriority.HIGH);

        const stats = eventQueue.getStats();
        expect(stats.totalEvents).toBe(1);
        expect(stats.pendingEvents).toBe(1);
    });

    it('should flush events in batches', async () => {
        const events: AnalyticsEvent[] = [];
        for (let i = 0; i < 10; i++) {
            events.push({
                name: `test_event_${i}`,
                properties: { index: i },
                timestamp: new Date(),
                sessionId: 'test-session'
            });
        }

        // Enqueue all events
        for (const event of events) {
            await eventQueue.enqueue(event, EventPriority.NORMAL);
        }

        // Trigger flush
        await eventQueue.flush();

        // Should be called with batches of 5 (batchSize)
        expect(mockFlushHandler).toHaveBeenCalledTimes(2);
        expect(mockFlushHandler).toHaveBeenNthCalledWith(1, expect.arrayContaining([
            expect.objectContaining({ name: 'test_event_0' })
        ]));
    });

    it('should prioritize high-priority events', async () => {
        const lowPriorityEvent: AnalyticsEvent = {
            name: 'low_priority',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        const highPriorityEvent: AnalyticsEvent = {
            name: 'high_priority',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        // Enqueue low priority first, then high priority
        await eventQueue.enqueue(lowPriorityEvent, EventPriority.LOW);
        await eventQueue.enqueue(highPriorityEvent, EventPriority.HIGH);

        await eventQueue.flush();

        // High priority should be processed first
        expect(mockFlushHandler).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ name: 'high_priority' })
            ])
        );
    });

    it('should retry failed events with exponential backoff', async () => {
        mockFlushHandler.mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce(undefined);

        const testEvent: AnalyticsEvent = {
            name: 'test_event',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        await eventQueue.enqueue(testEvent, EventPriority.NORMAL);

        // Trigger multiple flushes to test retry logic
        await eventQueue.flush();
        await new Promise(resolve => setTimeout(resolve, 150)); // Wait for retry delay
        await eventQueue.flush();
        await new Promise(resolve => setTimeout(resolve, 150));
        await eventQueue.flush();

        expect(mockFlushHandler).toHaveBeenCalledTimes(3);
    });

    it('should evict low-priority events when queue is full', async () => {
        // Fill queue with low-priority events
        for (let i = 0; i < 100; i++) {
            await eventQueue.enqueue({
                name: `low_event_${i}`,
                properties: {},
                timestamp: new Date(),
                sessionId: 'test-session'
            }, EventPriority.LOW);
        }

        // Add a high-priority event that should cause eviction
        await eventQueue.enqueue({
            name: 'high_priority_event',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        }, EventPriority.HIGH);

        const stats = eventQueue.getStats();
        expect(stats.queueSize).toBeLessThanOrEqual(100);
    });

    it('should provide accurate queue statistics', async () => {
        const testEvent: AnalyticsEvent = {
            name: 'test_event',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        };

        await eventQueue.enqueue(testEvent, EventPriority.NORMAL);

        const stats = eventQueue.getStats();
        expect(stats.totalEvents).toBe(1);
        expect(stats.pendingEvents).toBe(1);
        expect(stats.queueSize).toBe(1);
        expect(typeof stats.isOnline).toBe('boolean');
        expect(typeof stats.totalProcessed).toBe('number');
        expect(typeof stats.totalFailed).toBe('number');
    });

    it('should filter events by priority', async () => {
        await eventQueue.enqueue({
            name: 'low_event',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        }, EventPriority.LOW);

        await eventQueue.enqueue({
            name: 'high_event',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        }, EventPriority.HIGH);

        const highPriorityEvents = eventQueue.getEventsByPriority(EventPriority.HIGH);
        const lowPriorityEvents = eventQueue.getEventsByPriority(EventPriority.LOW);

        expect(highPriorityEvents).toHaveLength(1);
        expect(lowPriorityEvents).toHaveLength(1);
        expect(highPriorityEvents[0].event.name).toBe('high_event');
        expect(lowPriorityEvents[0].event.name).toBe('low_event');
    });

    it('should clear the queue', async () => {
        await eventQueue.enqueue({
            name: 'test_event',
            properties: {},
            timestamp: new Date(),
            sessionId: 'test-session'
        }, EventPriority.NORMAL);

        expect(eventQueue.getStats().queueSize).toBe(1);

        eventQueue.clear();

        expect(eventQueue.getStats().queueSize).toBe(0);
        expect(eventQueue.getStats().pendingEvents).toBe(0);
    });
});