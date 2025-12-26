import { browser } from '$app/environment';
import { logger } from '../utils/logger';
import type { AnalyticsEvent } from './PostHogService';

/**
 * Queued event with metadata
 */
export interface QueuedEvent {
    id: string;
    event: AnalyticsEvent;
    queuedAt: Date;
    attempts: number;
    lastAttempt?: Date;
    nextRetry?: Date;
    priority: EventPriority;
}

/**
 * Event priority levels
 */
export enum EventPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    CRITICAL = 3
}

/**
 * Queue configuration
 */
export interface EventQueueConfig {
    maxQueueSize: number;
    maxRetries: number;
    baseRetryDelay: number; // milliseconds
    maxRetryDelay: number; // milliseconds
    batchSize: number;
    flushInterval: number; // milliseconds
    persistToStorage: boolean;
    storageKey: string;
}

/**
 * Queue statistics
 */
export interface QueueStats {
    totalEvents: number;
    pendingEvents: number;
    failedEvents: number;
    queueSize: number;
    isOnline: boolean;
    lastFlush?: Date;
    totalProcessed: number;
    totalFailed: number;
}

/**
 * Event flush handler function type
 */
export type EventFlushHandler = (events: AnalyticsEvent[]) => Promise<void>;

/**
 * Event Queue
 * 
 * Handles queuing of analytics events for offline scenarios and batch processing.
 * Provides persistent storage, retry logic with exponential backoff, and priority-based processing.
 * 
 * Features:
 * - Offline event queuing with persistent storage
 * - Priority-based event processing
 * - Exponential backoff retry logic
 * - Batch processing for improved performance
 * - Network status monitoring
 * - Queue size management and overflow protection
 * 
 * Usage:
 * ```typescript
 * const eventQueue = new EventQueue(flushHandler);
 * await eventQueue.enqueue(analyticsEvent, EventPriority.NORMAL);
 * ```
 */
export class EventQueue {
    private config: EventQueueConfig;
    private flushHandler: EventFlushHandler;
    private queue: QueuedEvent[] = [];
    private isOnline = true;
    private isProcessing = false;
    private flushInterval?: NodeJS.Timeout;
    private stats: QueueStats;

    /**
     * Default configuration for event queue
     */
    private static readonly DEFAULT_CONFIG: EventQueueConfig = {
        maxQueueSize: 1000,
        maxRetries: 5,
        baseRetryDelay: 2000, // 2 seconds
        maxRetryDelay: 60000, // 1 minute
        batchSize: 20,
        flushInterval: 5000, // 5 seconds
        persistToStorage: true,
        storageKey: 'lilium_analytics_queue'
    };

    constructor(flushHandler: EventFlushHandler, config?: Partial<EventQueueConfig>) {
        this.flushHandler = flushHandler;
        this.config = { ...EventQueue.DEFAULT_CONFIG, ...config };

        // Initialize stats
        this.stats = {
            totalEvents: 0,
            pendingEvents: 0,
            failedEvents: 0,
            queueSize: 0,
            isOnline: true,
            totalProcessed: 0,
            totalFailed: 0
        };

        if (browser) {
            this.initializeQueue();
        }
    }

    /**
     * Initialize the event queue
     */
    private initializeQueue(): void {
        // Load persisted events from storage
        if (this.config.persistToStorage) {
            this.loadFromStorage();
        }

        // Monitor network status
        this.setupNetworkMonitoring();

        // Start periodic flushing
        this.startPeriodicFlush();

        // Handle page unload to persist queue
        window.addEventListener('beforeunload', () => {
            this.persistToStorage();
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                // Page became visible and we're online, try to flush
                this.flush();
            }
        });
    }

    /**
     * Enqueue an analytics event
     * 
     * @param event - The analytics event to queue
     * @param priority - The priority level for the event
     * @returns Promise that resolves when event is queued
     */
    async enqueue(event: AnalyticsEvent, priority: EventPriority = EventPriority.NORMAL): Promise<void> {
        if (!browser) {
            logger.warn('EventQueue: Cannot enqueue events outside browser environment');
            return;
        }

        // Check queue size limit
        if (this.queue.length >= this.config.maxQueueSize) {
            // Remove oldest low-priority events to make room
            this.evictLowPriorityEvents();

            // If still at capacity, drop the event
            if (this.queue.length >= this.config.maxQueueSize) {
                logger.warn('EventQueue: Queue at capacity, dropping event', { eventName: event.name });
                return;
            }
        }

        // Create queued event
        const queuedEvent: QueuedEvent = {
            id: this.generateEventId(),
            event,
            queuedAt: new Date(),
            attempts: 0,
            priority
        };

        // Insert event based on priority
        this.insertByPriority(queuedEvent);

        // Update stats
        this.stats.totalEvents++;
        this.stats.pendingEvents++;
        this.stats.queueSize = this.queue.length;

        logger.info(`EventQueue: Event queued`, {
            eventId: queuedEvent.id,
            eventName: event.name,
            priority: EventPriority[priority],
            queueSize: this.queue.length
        });

        // Persist to storage if enabled
        if (this.config.persistToStorage) {
            this.persistToStorage();
        }

        // Try immediate flush if online and not already processing
        if (this.isOnline && !this.isProcessing) {
            setTimeout(() => this.flush(), 100);
        }
    }

    /**
     * Insert event into queue based on priority
     */
    private insertByPriority(queuedEvent: QueuedEvent): void {
        // Find insertion point based on priority
        let insertIndex = this.queue.length;

        for (let i = 0; i < this.queue.length; i++) {
            if (this.queue[i].priority < queuedEvent.priority) {
                insertIndex = i;
                break;
            }
        }

        this.queue.splice(insertIndex, 0, queuedEvent);
    }

    /**
     * Evict low-priority events to make room in queue
     */
    private evictLowPriorityEvents(): void {
        const lowPriorityEvents = this.queue.filter(event => event.priority === EventPriority.LOW);

        if (lowPriorityEvents.length > 0) {
            // Remove oldest low-priority events
            const evictCount = Math.min(lowPriorityEvents.length, Math.ceil(this.config.maxQueueSize * 0.1));

            for (let i = 0; i < evictCount; i++) {
                const eventIndex = this.queue.findIndex(event => event.priority === EventPriority.LOW);
                if (eventIndex !== -1) {
                    this.queue.splice(eventIndex, 1);
                }
            }

            logger.info(`EventQueue: Evicted ${evictCount} low-priority events to make room`);
        }
    }

    /**
     * Flush events from the queue
     */
    async flush(): Promise<void> {
        if (!browser || this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            // Get events ready for processing
            const readyEvents = this.getReadyEvents();

            if (readyEvents.length === 0) {
                return;
            }

            logger.info(`EventQueue: Flushing ${readyEvents.length} events`);

            // Process events in batches
            const batches = this.createBatches(readyEvents);

            for (const batch of batches) {
                await this.processBatch(batch);
            }

            // Update stats
            this.stats.lastFlush = new Date();
            this.stats.queueSize = this.queue.length;

            // Persist updated queue
            if (this.config.persistToStorage) {
                this.persistToStorage();
            }

        } catch (error) {
            logger.error('EventQueue: Error during flush', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get events that are ready for processing
     */
    private getReadyEvents(): QueuedEvent[] {
        const now = new Date();

        return this.queue.filter(event => {
            // Skip if exceeded max retries
            if (event.attempts >= this.config.maxRetries) {
                return false;
            }

            // Skip if waiting for retry delay
            if (event.nextRetry && event.nextRetry > now) {
                return false;
            }

            return true;
        });
    }

    /**
     * Create batches from ready events
     */
    private createBatches(events: QueuedEvent[]): QueuedEvent[][] {
        const batches: QueuedEvent[][] = [];

        for (let i = 0; i < events.length; i += this.config.batchSize) {
            batches.push(events.slice(i, i + this.config.batchSize));
        }

        return batches;
    }

    /**
     * Process a batch of events
     */
    private async processBatch(batch: QueuedEvent[]): Promise<void> {
        // Extract analytics events
        const analyticsEvents = batch.map(queuedEvent => queuedEvent.event);

        try {
            // Attempt to flush the batch
            await this.flushHandler(analyticsEvents);

            // Mark events as processed and remove from queue
            batch.forEach(queuedEvent => {
                const index = this.queue.findIndex(e => e.id === queuedEvent.id);
                if (index !== -1) {
                    this.queue.splice(index, 1);
                    this.stats.pendingEvents--;
                    this.stats.totalProcessed++;
                }
            });

            logger.info(`EventQueue: Successfully processed batch of ${batch.length} events`);

        } catch (error) {
            // Handle batch failure
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            batch.forEach(queuedEvent => {
                queuedEvent.attempts++;
                queuedEvent.lastAttempt = new Date();

                if (queuedEvent.attempts >= this.config.maxRetries) {
                    // Remove failed events that exceeded max retries
                    const index = this.queue.findIndex(e => e.id === queuedEvent.id);
                    if (index !== -1) {
                        this.queue.splice(index, 1);
                        this.stats.pendingEvents--;
                        this.stats.failedEvents++;
                        this.stats.totalFailed++;
                    }
                } else {
                    // Schedule retry with exponential backoff
                    queuedEvent.nextRetry = this.calculateNextRetry(queuedEvent.attempts);
                }
            });

            logger.warn(`EventQueue: Batch processing failed`, {
                batchSize: batch.length,
                error: errorMessage
            });
        }
    }

    /**
     * Calculate next retry time using exponential backoff
     */
    private calculateNextRetry(attempts: number): Date {
        // Exponential backoff: baseDelay * 2^(attempts-1) with jitter
        const exponentialDelay = this.config.baseRetryDelay * Math.pow(2, attempts - 1);

        // Add jitter (±25% of the delay)
        const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
        const delayWithJitter = exponentialDelay + jitter;

        // Cap at max retry delay
        const finalDelay = Math.min(delayWithJitter, this.config.maxRetryDelay);

        return new Date(Date.now() + finalDelay);
    }

    /**
     * Setup network status monitoring
     */
    private setupNetworkMonitoring(): void {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.stats.isOnline = true;
            logger.info('EventQueue: Network connection restored, attempting to flush queue');
            this.flush();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.stats.isOnline = false;
            logger.info('EventQueue: Network connection lost, events will be queued');
        });

        // Initial network status
        this.isOnline = navigator.onLine;
        this.stats.isOnline = this.isOnline;
    }

    /**
     * Start periodic flushing
     */
    private startPeriodicFlush(): void {
        this.flushInterval = setInterval(() => {
            if (this.isOnline && this.queue.length > 0) {
                this.flush();
            }
        }, this.config.flushInterval);
    }

    /**
     * Stop periodic flushing
     */
    private stopPeriodicFlush(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = undefined;
        }
    }

    /**
     * Persist queue to local storage
     */
    private persistToStorage(): void {
        if (!browser || !this.config.persistToStorage) {
            return;
        }

        try {
            const queueData = {
                queue: this.queue,
                stats: this.stats,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem(this.config.storageKey, JSON.stringify(queueData));
        } catch (error) {
            logger.warn('EventQueue: Failed to persist queue to storage', error);
        }
    }

    /**
     * Load queue from local storage
     */
    private loadFromStorage(): void {
        if (!browser || !this.config.persistToStorage) {
            return;
        }

        try {
            const storedData = localStorage.getItem(this.config.storageKey);

            if (storedData) {
                const queueData = JSON.parse(storedData);

                // Restore queue with date parsing
                this.queue = queueData.queue.map((item: any) => ({
                    ...item,
                    queuedAt: new Date(item.queuedAt),
                    lastAttempt: item.lastAttempt ? new Date(item.lastAttempt) : undefined,
                    nextRetry: item.nextRetry ? new Date(item.nextRetry) : undefined
                }));

                // Restore stats
                if (queueData.stats) {
                    this.stats = {
                        ...this.stats,
                        ...queueData.stats,
                        lastFlush: queueData.stats.lastFlush ? new Date(queueData.stats.lastFlush) : undefined
                    };
                }

                logger.info(`EventQueue: Loaded ${this.queue.length} events from storage`);
            }
        } catch (error) {
            logger.warn('EventQueue: Failed to load queue from storage', error);
            // Clear corrupted data
            localStorage.removeItem(this.config.storageKey);
        }
    }

    /**
     * Generate a unique event ID
     */
    private generateEventId(): string {
        return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Get queue statistics
     */
    getStats(): QueueStats {
        return {
            ...this.stats,
            queueSize: this.queue.length,
            pendingEvents: this.queue.length,
            isOnline: this.isOnline
        };
    }

    /**
     * Get events by priority
     */
    getEventsByPriority(priority: EventPriority): QueuedEvent[] {
        return this.queue.filter(event => event.priority === priority);
    }

    /**
     * Clear the queue
     */
    clear(): void {
        this.queue = [];
        this.stats.pendingEvents = 0;
        this.stats.queueSize = 0;

        if (this.config.persistToStorage) {
            localStorage.removeItem(this.config.storageKey);
        }

        logger.info('EventQueue: Queue cleared');
    }

    /**
     * Destroy the event queue and clean up resources
     */
    destroy(): void {
        this.stopPeriodicFlush();

        // Persist final state
        if (this.config.persistToStorage) {
            this.persistToStorage();
        }

        this.clear();
        logger.info('EventQueue: Destroyed');
    }
}