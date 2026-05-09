import { browser } from '$app/environment';
import { calculateEngagementLevel, categorizeReferrer, isHomepage } from '../utils/analyticsUtils';
import { logger } from '../utils/logger';
import type { AnalyticsEvent, PageVisit, UserAction, UserJourney } from './PostHogService';
import { sessionContextManager } from './SessionContextManager';

/**
 * Statistics summary for a user journey.
 */
export interface UserJourneyStats {
	sessionDuration: number;
	pagesVisited: number;
	actionsPerformed: number;
	conversionsCompleted: number;
	totalEngagementTime: number;
	averageTimePerPage: number;
	entryPage: string | null;
	currentPage: string | null;
}

/**
 * Callback type for delivering analytics events. Async for normal sends;
 * the optional beacon variant is used for synchronous send-on-unload.
 */
export type SendEvent = (event: AnalyticsEvent) => Promise<void> | void;
export type SendBeacon = (event: AnalyticsEvent) => void;

/**
 * UserJourneyTracker — owns per-session journey state (pages visited,
 * entry/exit info, time on page) and emits journey-related analytics events.
 *
 * Extracted from PostHogService to keep that class focused on initialization
 * and event delivery. The tracker is collaborator-agnostic: callers inject
 * `sendEvent` / `sendBeacon` callbacks for delivery.
 */
export class UserJourneyTracker {
	private journey: UserJourney | null = null;
	private currentPage: string | null = null;
	private currentPageStartTime: Date | null = null;
	private sessionStartPage: string | null = null;
	private sessionStartReferrer: string | null = null;

	constructor(
		private readonly sendEvent: SendEvent,
		private readonly sendBeacon: SendBeacon
	) {}

	/**
	 * Initialize a new user journey from the current session context.
	 * Captures entry-point info (URL, referrer, source category).
	 */
	initialize(): void {
		if (!browser) return;

		const sessionContext = sessionContextManager.getSessionContext();
		if (!sessionContext) {
			logger.warn('UserJourneyTracker.initialize: no session context');
			return;
		}

		this.journey = {
			sessionId: sessionContext.sessionId,
			startTime: sessionContext.startTime,
			pages: [],
			actions: [],
			conversionEvents: []
		};

		this.captureEntryPoint();

		logger.info('UserJourneyTracker.initialize: journey started', {
			sessionId: sessionContext.sessionId
		});
	}

	/**
	 * Track navigation to a new page, computing time-on-previous-page if applicable.
	 */
	trackPageNavigation(newPage: string, referrer: string): void {
		if (!browser || !this.journey) return;

		const now = new Date();

		// Calculate time spent on previous page
		let timeSpent: number | undefined;
		if (this.currentPageStartTime && this.currentPage) {
			timeSpent = now.getTime() - this.currentPageStartTime.getTime();

			const lastPageVisit = this.journey.pages[this.journey.pages.length - 1];
			if (lastPageVisit && lastPageVisit.page === this.currentPage) {
				lastPageVisit.timeSpent = timeSpent;
			}

			this.trackPageLeaveEvent(this.currentPage, timeSpent);
		}

		const pageVisit: PageVisit = {
			page: newPage,
			timestamp: now,
			referrer: referrer || undefined
		};

		this.journey.pages.push(pageVisit);
		this.currentPage = newPage;
		this.currentPageStartTime = now;

		this.trackPageViewEvent(newPage, referrer, timeSpent);

		logger.info('UserJourneyTracker.trackPageNavigation: page tracked', {
			newPage,
			timeSpentOnPrevious: timeSpent,
			totalPages: this.journey.pages.length
		});
	}

	/**
	 * Pause time tracking when the tab becomes hidden.
	 */
	handlePageLeave(): void {
		if (!this.currentPageStartTime || !this.currentPage) return;
		logger.info('UserJourneyTracker.handlePageLeave: page hidden, pausing timing');
	}

	/**
	 * Resume time tracking when the tab becomes visible again.
	 */
	handlePageReturn(): void {
		if (!this.currentPage) return;
		this.currentPageStartTime = new Date();
		logger.info('UserJourneyTracker.handlePageReturn: page visible, resuming timing');
	}

	/**
	 * Send a final journey-summary event when the session is terminating
	 * (page unload). Uses the beacon callback for reliable delivery.
	 */
	handleSessionTermination(): void {
		if (!this.journey) return;

		const now = new Date();
		const sessionDuration = now.getTime() - this.journey.startTime.getTime();

		// Calculate final time on the current page
		let finalTimeSpent: number | undefined;
		if (this.currentPageStartTime && this.currentPage) {
			finalTimeSpent = now.getTime() - this.currentPageStartTime.getTime();
			const lastPageVisit = this.journey.pages[this.journey.pages.length - 1];
			if (lastPageVisit && lastPageVisit.page === this.currentPage) {
				lastPageVisit.timeSpent = finalTimeSpent;
			}
		}

		const sessionContext = sessionContextManager.getSessionContext();
		const sessionTerminationEvent: AnalyticsEvent = {
			name: 'session_termination',
			properties: {
				session_duration: sessionDuration,
				pages_visited: this.journey.pages.length,
				actions_performed: this.journey.actions.length,
				conversions_completed: this.journey.conversionEvents.length,
				entry_page: this.sessionStartPage,
				exit_page: this.currentPage,
				entry_referrer: this.sessionStartReferrer,
				final_time_on_page: finalTimeSpent,
				total_engagement_time: this.calculateTotalEngagementTime(),
				bounce_rate: this.journey.pages.length === 1 ? 1 : 0,
				category: 'user_journey'
			},
			timestamp: now,
			sessionId: this.journey.sessionId,
			userId: sessionContext?.userId,
			userRole: sessionContext?.userRole,
			churchContext: sessionContext?.churchContext
		};

		// Synchronous delivery during page unload
		this.sendBeacon(sessionTerminationEvent);

		logger.info('UserJourneyTracker.handleSessionTermination: session ended', {
			sessionDuration,
			pagesVisited: this.journey.pages.length
		});
	}

	/**
	 * Append a user action to the journey (e.g. a tracked church/admin/community event).
	 */
	recordAction(action: UserAction): void {
		if (!this.journey) return;
		this.journey.actions.push(action);
	}

	/**
	 * Add a page visit to the journey, deduping consecutive duplicates.
	 * Used by trackPageView in PostHogService.
	 */
	recordPageVisit(pageName: string): void {
		if (!this.journey) return;
		const lastPage = this.journey.pages[this.journey.pages.length - 1];
		if (!lastPage || lastPage.page !== pageName) {
			this.journey.pages.push({
				page: pageName,
				timestamp: new Date(),
				referrer: browser ? document.referrer || undefined : undefined
			});
		}
	}

	/**
	 * Reset all journey state (e.g. on user logout).
	 */
	reset(): void {
		this.journey = null;
		this.currentPage = null;
		this.currentPageStartTime = null;
		this.sessionStartPage = null;
		this.sessionStartReferrer = null;
	}

	getJourney(): UserJourney | null {
		return this.journey;
	}

	getCurrentPage(): string | null {
		return this.currentPage;
	}

	getSessionDuration(): number {
		if (!this.journey) return 0;
		return Date.now() - this.journey.startTime.getTime();
	}

	getStats(): UserJourneyStats | null {
		if (!this.journey) return null;

		const totalEngagementTime = this.calculateTotalEngagementTime();
		const pagesVisited = this.journey.pages.length;

		return {
			sessionDuration: this.getSessionDuration(),
			pagesVisited,
			actionsPerformed: this.journey.actions.length,
			conversionsCompleted: this.journey.conversionEvents.length,
			totalEngagementTime,
			averageTimePerPage: pagesVisited > 0 ? totalEngagementTime / pagesVisited : 0,
			entryPage: this.sessionStartPage,
			currentPage: this.currentPage
		};
	}

	// ─── private ──────────────────────────────────────────────────────────

	private captureEntryPoint(): void {
		if (!browser) return;

		const currentUrl = window.location.href;
		const referrer = document.referrer;
		const isOnHomepage = isHomepage(currentUrl);

		this.sessionStartPage = currentUrl;
		this.sessionStartReferrer = referrer;

		const sessionContext = sessionContextManager.getSessionContext();
		const entryPointEvent: AnalyticsEvent = {
			name: 'session_entry_point',
			properties: {
				entry_page: currentUrl,
				referrer: referrer || 'direct',
				is_homepage: isOnHomepage,
				entry_source: categorizeReferrer(referrer, window.location.hostname),
				category: 'user_journey'
			},
			timestamp: new Date(),
			sessionId: this.journey?.sessionId || '',
			userId: sessionContext?.userId,
			userRole: sessionContext?.userRole,
			churchContext: sessionContext?.churchContext
		};

		this.sendEvent(entryPointEvent);

		logger.info('UserJourneyTracker.captureEntryPoint: entry captured', {
			entryPage: currentUrl,
			referrer: referrer || 'direct',
			isHomepage: isOnHomepage
		});
	}

	private trackPageViewEvent(page: string, referrer: string, timeSpentOnPrevious?: number): void {
		const sessionContext = sessionContextManager.getSessionContext();
		const pageViewEvent: AnalyticsEvent = {
			name: 'page_navigation',
			properties: {
				page,
				referrer: referrer || 'direct',
				time_spent_on_previous: timeSpentOnPrevious,
				page_sequence: this.journey?.pages.length || 1,
				session_duration: this.getSessionDuration(),
				category: 'user_journey'
			},
			timestamp: new Date(),
			sessionId: this.journey?.sessionId || '',
			userId: sessionContext?.userId,
			userRole: sessionContext?.userRole,
			churchContext: sessionContext?.churchContext
		};

		this.sendEvent(pageViewEvent);
	}

	private trackPageLeaveEvent(page: string, timeSpent: number): void {
		const sessionContext = sessionContextManager.getSessionContext();
		const pageLeaveEvent: AnalyticsEvent = {
			name: 'page_leave',
			properties: {
				page,
				time_spent: timeSpent,
				engagement_level: calculateEngagementLevel(timeSpent),
				category: 'user_journey'
			},
			timestamp: new Date(),
			sessionId: this.journey?.sessionId || '',
			userId: sessionContext?.userId,
			userRole: sessionContext?.userRole,
			churchContext: sessionContext?.churchContext
		};

		this.sendEvent(pageLeaveEvent);
	}

	private calculateTotalEngagementTime(): number {
		if (!this.journey) return 0;
		return this.journey.pages.reduce((total, page) => total + (page.timeSpent || 0), 0);
	}
}
