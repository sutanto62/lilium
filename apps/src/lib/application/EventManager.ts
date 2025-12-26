import { browser } from '$app/environment';
import { logger } from '../utils/logger';
import type { AnalyticsEvent } from './PostHogService';

/**
 * Event processing status
 */
export enum EventStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    RETRYING = 'retrying'
}

/**
 * Processed event with metadata
 */
export interface ProcessedEvent {
    id: string;
    event: AnalyticsEvent;
    status: EventStatus;
    attempts: number;
    lastAttempt?: Date;
    nextRetry?: Date;
    error?: string;
    createdAt: Date;
    processedAt?: Date;
}

/**
 * Event processing configuration
 */
export interface EventProcessingConfig {
    maxRetries: number;
    baseRetryDelay: number; // milliseconds
    maxRetryDelay: number; // milliseconds
    batchSize: number;
    processingTimeout: number; // milliseconds
}

/**
 * Event processor function type
 */
export type EventProcessor = (event: AnalyticsEvent) => Promise<void>;

/**
 * Event Manager
 * 
 * Handles processing and enriching analytics events before they are sent to the analytics service.
 * Provides event queuing, retry logic, and batch processing capabilities for resilient analytics.
 * 
 * Features:
 * - Event enrichment with session context and metadata
 * - Retry logic with exponential backoff for failed events
 * - Batch processing for improved performance
 * - Event status tracking and monitoring
 * - Graceful handling of offline scenarios
 * 
 * Usage:
 * ```typescript
 * const eventManager = new EventManager(eventProcessor);
 * await eventManager.processEvent(analyticsEvent);
 * ```
 */
export class EventManager {
    private config: EventProcessingConfig;
    private processor: EventProcessor;
    private processingQueue: Map<string, ProcessedEvent> = new Map();
    private isProcessing = false;
    private processingInterval?: NodeJS.Timeout;

    /**
     * Default configuration for event processing
     */
    private static readonly DEFAULT_CONFIG: EventProcessingConfig = {
        maxRetries: 3,
        baseRetryDelay: 1000, // 1 second
        maxRetryDelay: 30000, // 30 seconds
        batchSize: 10,
        processingTimeout: 5000 // 5 seconds
    };

    constructor(processor: EventProcessor, config?: Partial<EventProcessingConfig>) {
        this.processor = processor;
        this.config = { ...EventManager.DEFAULT_CONFIG, ...config };

        // Start processing queue in browser environment
        if (browser) {
            this.startProcessing();
        }
    }

    /**
     * Process a single analytics event
     * 
     * @param event - The analytics event to process
     * @returns Promise that resolves when event is queued for processing
     */
    async processEvent(event: AnalyticsEvent): Promise<void> {
        if (!browser) {
            logger.warn('EventManager: Cannot process events outside browser environment');
            return;
        }

        // Enrich event with additional metadata
        const enrichedEvent = this.enrichEvent(event);

        // Create processed event record
        const processedEvent: ProcessedEvent = {
            id: this.generateEventId(),
            event: enrichedEvent,
            status: EventStatus.PENDING,
            attempts: 0,
            createdAt: new Date()
        };

        // Add to processing queue
        this.processingQueue.set(processedEvent.id, processedEvent);

        logger.info(`EventManager: Event queued for processing`, {
            eventId: processedEvent.id,
            eventName: event.name
        });

        // Trigger immediate processing if not already running
        if (!this.isProcessing) {
            this.processQueueBatch();
        }
    }

    /**
     * Enrich event with additional context and metadata
     * 
     * @param event - The base analytics event
     * @returns Enriched analytics event
     */
    private enrichEvent(event: AnalyticsEvent): AnalyticsEvent {
        const enriched: AnalyticsEvent = {
            ...event,
            timestamp: event.timestamp || new Date(),
            properties: {
                ...event.properties,
                // Add technical metadata
                page_url: browser ? window.location.href : undefined,
                user_agent: browser ? navigator.userAgent : undefined,
                screen_resolution: browser ? `${screen.width}x${screen.height}` : undefined,
                viewport_size: browser ? `${window.innerWidth}x${window.innerHeight}` : undefined,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: browser ? navigator.language : undefined,
                // Add performance metadata
                connection_type: browser && 'connection' in navigator ?
                    (navigator as any).connection?.effectiveType : undefined,
                // Add timestamp metadata
                client_timestamp: new Date().toISOString(),
                processing_timestamp: new Date().toISOString()
            }
        };

        return enriched;
    }

    /**
     * Generate a unique event ID
     */
    private generateEventId(): string {
        return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Start the processing queue
     */
    private startProcessing(): void {
        // Process queue every 2 seconds
        this.processingInterval = setInterval(() => {
            this.processQueueBatch();
        }, 2000);

        // Process immediately on startup
        setTimeout(() => this.processQueueBatch(), 100);
    }

    /**
     * Stop the processing queue
     */
    stopProcessing(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = undefined;
        }
    }

    /**
     * Process a batch of events from the queue
     */
    private async processQueueBatch(): Promise<void> {
        if (this.isProcessing || this.processingQueue.size === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            // Get events ready for processing
            const readyEvents = Array.from(this.processingQueue.values())
                .filter(event => this.isEventReadyForProcessing(event))
                .slice(0, this.config.batchSize);

            if (readyEvents.length === 0) {
                return;
            }

            logger.info(`EventManager: Processing batch of ${readyEvents.length} events`);

            // Process events concurrently
            const processingPromises = readyEvents.map(event => this.processSingleEvent(event));
            await Promise.allSettled(processingPromises);

            // Clean up completed and failed events that exceeded max retries
            this.cleanupProcessedEvents();

        } catch (error) {
            logger.error('EventManager: Error processing event batch', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Check if an event is ready for processing
     * 
     * @param event - The processed event to check
     * @returns True if the event is ready for processing
     */
    private isEventReadyForProcessing(event: ProcessedEvent): boolean {
        // Skip if already completed
        if (event.status === EventStatus.COMPLETED) {
            return false;
        }

        // Skip if exceeded max retries
        if (event.attempts >= this.config.maxRetries) {
            return false;
        }

        // Skip if waiting for retry delay
        if (event.nextRetry && event.nextRetry > new Date()) {
            return false;
        }

        return true;
    }

    /**
     * Process a single event
     * 
     * @param processedEvent - The processed event to handle
     */
    private async processSingleEvent(processedEvent: ProcessedEvent): Promise<void> {
        // Update status to processing
        processedEvent.status = EventStatus.PROCESSING;
        processedEvent.attempts++;
        processedEvent.lastAttempt = new Date();

        try {
            // Set processing timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Processing timeout')), this.config.processingTimeout);
            });

            // Process the event with timeout
            await Promise.race([
                this.processor(processedEvent.event),
                timeoutPromise
            ]);

            // Mark as completed
            processedEvent.status = EventStatus.COMPLETED;
            processedEvent.processedAt = new Date();
            processedEvent.error = undefined;

            logger.info(`EventManager: Event processed successfully`, {
                eventId: processedEvent.id,
                attempts: processedEvent.attempts
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            processedEvent.error = errorMessage;

            if (processedEvent.attempts >= this.config.maxRetries) {
                // Mark as failed after max retries
                processedEvent.status = EventStatus.FAILED;
                logger.error(`EventManager: Event failed after ${this.config.maxRetries} attempts`, {
                    eventId: processedEvent.id,
                    error: errorMessage
                });
            } else {
                // Schedule retry with exponential backoff
                processedEvent.status = EventStatus.RETRYING;
                processedEvent.nextRetry = this.calculateNextRetry(processedEvent.attempts);

                logger.warn(`EventManager: Event failed, scheduling retry`, {
                    eventId: processedEvent.id,
                    attempt: processedEvent.attempts,
                    nextRetry: processedEvent.nextRetry,
                    error: errorMessage
                });
            }
        }
    }

    /**
     * Calculate next retry time using exponential backoff
     * 
     * @param attempts - Number of attempts made
     * @returns Date for next retry
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
     * Clean up processed events from the queue
     */
    private cleanupProcessedEvents(): void {
        const eventsToRemove: string[] = [];
        const cutoffTime = new Date(Date.now() - 60000); // Remove events older than 1 minute

        for (const [id, event] of this.processingQueue) {
            // Remove completed events
            if (event.status === EventStatus.COMPLETED) {
                eventsToRemove.push(id);
            }
            // Remove failed events that exceeded max retries
            else if (event.status === EventStatus.FAILED) {
                eventsToRemove.push(id);
            }
            // Remove old events to prevent memory leaks
            else if (event.createdAt < cutoffTime) {
                eventsToRemove.push(id);
            }
        }

        eventsToRemove.forEach(id => {
            this.processingQueue.delete(id);
        });

        if (eventsToRemove.length > 0) {
            logger.info(`EventManager: Cleaned up ${eventsToRemove.length} processed events`);
        }
    }

    /**
     * Get queue statistics
     */
    getQueueStats(): {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        retrying: number;
    } {
        const stats = {
            total: this.processingQueue.size,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            retrying: 0
        };

        for (const event of this.processingQueue.values()) {
            switch (event.status) {
                case EventStatus.PENDING:
                    stats.pending++;
                    break;
                case EventStatus.PROCESSING:
                    stats.processing++;
                    break;
                case EventStatus.COMPLETED:
                    stats.completed++;
                    break;
                case EventStatus.FAILED:
                    stats.failed++;
                    break;
                case EventStatus.RETRYING:
                    stats.retrying++;
                    break;
            }
        }

        return stats;
    }

    /**
     * Get events by status
     */
    getEventsByStatus(status: EventStatus): ProcessedEvent[] {
        return Array.from(this.processingQueue.values())
            .filter(event => event.status === status);
    }

    /**
     * Clear all events from the queue
     */
    clearQueue(): void {
        this.processingQueue.clear();
        logger.info('EventManager: Queue cleared');
    }

    /**
     * Destroy the event manager and clean up resources
     */
    destroy(): void {
        this.stopProcessing();
        this.clearQueue();
        logger.info('EventManager: Destroyed');
    }
}