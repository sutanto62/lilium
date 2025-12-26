import { browser } from '$app/environment';
import type { Session } from '@auth/core/types';
import { logger } from '../utils/logger';

/**
 * Church-specific context information for analytics
 */
export interface ChurchContext {
    churchId: string;
    region?: string;
    userPermissions: string[];
    lingkunganId?: string;
    wilayahId?: string;
}

/**
 * Complete session context for analytics enrichment
 */
export interface SessionContext {
    sessionId: string;
    userId?: string;
    userRole?: 'admin' | 'user' | 'visitor';
    churchContext?: ChurchContext;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    userAgent?: string;
    startTime: Date;
    lastActivity: Date;
    isOptedOut: boolean;
    privacySettings: PrivacySettings;
}

/**
 * Privacy settings for data collection compliance
 */
export interface PrivacySettings {
    analyticsEnabled: boolean;
    performanceTrackingEnabled: boolean;
    errorTrackingEnabled: boolean;
    personalizedExperienceEnabled: boolean;
}

/**
 * Session update event data
 */
export interface SessionUpdateEvent {
    type: 'role_change' | 'permission_change' | 'privacy_change' | 'activity_update';
    previousContext?: Partial<SessionContext>;
    newContext: Partial<SessionContext>;
    timestamp: Date;
}

/**
 * SessionContextManager - Manages user session state and church context for analytics
 * 
 * This class provides centralized session management for the analytics system,
 * maintaining user context, church information, and privacy settings throughout
 * the user's session. It integrates with the existing auth system and provides
 * privacy-compliant data collection capabilities.
 * 
 * Features:
 * - Session lifecycle management
 * - Church context tracking (churchId, region, permissions)
 * - Privacy compliance and opt-out functionality
 * - Device and browser detection
 * - Session activity tracking
 * - Event-driven context updates
 * 
 * Privacy Compliance:
 * - Respects user opt-out preferences
 * - Anonymizes PII automatically
 * - Provides granular privacy controls
 * - Implements data minimization principles
 */
export class SessionContextManager {
    private static instance: SessionContextManager;
    private sessionContext: SessionContext | null = null;
    private sessionStartTime: Date | null = null;
    private activityTimer: NodeJS.Timeout | null = null;
    private updateListeners: ((event: SessionUpdateEvent) => void)[] = [];
    private readonly ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    private readonly STORAGE_KEY = 'lilium_session_context';

    /**
     * Private constructor for singleton pattern
     */
    private constructor() {
        if (browser) {
            this.initializeBrowserFeatures();
        }
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): SessionContextManager {
        if (!SessionContextManager.instance) {
            SessionContextManager.instance = new SessionContextManager();
        }
        return SessionContextManager.instance;
    }

    /**
     * Initialize browser-specific features
     */
    private initializeBrowserFeatures(): void {
        // Set up activity tracking
        this.setupActivityTracking();

        // Load persisted privacy settings
        this.loadPrivacySettings();

        // Set up beforeunload handler for session cleanup
        window.addEventListener('beforeunload', () => {
            this.handleSessionEnd();
        });

        // Set up visibility change handler for activity tracking
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.updateActivity();
            }
        });
    }

    /**
     * Initialize session context from user session
     * 
     * @param session - The user session object from auth system
     * @param options - Optional configuration for session initialization
     */
    async initializeSession(
        session: Session | null,
        options?: {
            preserveExistingSession?: boolean;
            customSessionId?: string;
        }
    ): Promise<SessionContext | null> {
        if (!browser) {
            logger.warn('SessionContextManager: Cannot initialize session outside browser environment');
            return null;
        }

        // Check if we should preserve existing session
        if (options?.preserveExistingSession && this.sessionContext) {
            logger.info('SessionContextManager: Preserving existing session context');
            return this.sessionContext;
        }

        // Generate or use provided session ID
        const sessionId = options?.customSessionId || this.generateSessionId();
        const now = new Date();

        // Extract church context from session
        const churchContext = this.extractChurchContext(session);

        // Get default privacy settings
        const privacySettings = this.getPrivacySettings();

        // Create new session context
        const newSessionContext: SessionContext = {
            sessionId,
            userId: session?.user?.id,
            userRole: this.normalizeUserRole(session?.user?.role),
            churchContext,
            deviceType: this.detectDeviceType(),
            userAgent: this.getAnonymizedUserAgent(),
            startTime: now,
            lastActivity: now,
            isOptedOut: this.checkOptOutStatus(session?.user?.id),
            privacySettings
        };

        // Store previous context for event notification
        const previousContext = this.sessionContext;

        // Update session context
        this.sessionContext = newSessionContext;
        this.sessionStartTime = now;

        // Persist session context (privacy-compliant)
        this.persistSessionContext();

        // Start activity tracking
        this.startActivityTracking();

        // Notify listeners of session initialization
        this.notifyListeners({
            type: 'activity_update',
            previousContext: previousContext || undefined,
            newContext: newSessionContext,
            timestamp: now
        });

        logger.info('SessionContextManager: Session initialized', {
            sessionId,
            userId: session?.user?.id ? '[REDACTED]' : undefined,
            userRole: newSessionContext.userRole,
            churchId: churchContext?.churchId ? '[REDACTED]' : undefined,
            deviceType: newSessionContext.deviceType
        });

        return newSessionContext;
    }

    /**
     * Extract church context from session
     */
    private extractChurchContext(session: Session | null): ChurchContext | undefined {
        if (!session?.user) {
            return undefined;
        }

        const user = session.user;

        // Build permissions array based on role and available data
        const permissions: string[] = [];
        if (user.role) {
            permissions.push(user.role);
        } else {
            // Default to visitor if no role is provided
            permissions.push('visitor');
        }

        // Add church-specific permissions if available
        if (user.role === 'admin') {
            permissions.push('church_admin', 'schedule_management', 'user_management');
        } else if (user.role === 'user') {
            permissions.push('church_member', 'schedule_view');
        }

        return {
            churchId: user.cid || '',
            userPermissions: permissions,
            lingkunganId: user.lingkunganId,
            // Region can be derived from church data if needed
            region: undefined
        };
    }

    /**
     * Normalize user role to expected analytics format
     */
    private normalizeUserRole(role?: string): 'admin' | 'user' | 'visitor' {
        if (!role) return 'visitor';

        switch (role.toLowerCase()) {
            case 'admin':
                return 'admin';
            case 'user':
                return 'user';
            default:
                return 'visitor';
        }
    }

    /**
     * Update session context with new information
     * 
     * @param updates - Partial session context updates
     */
    async updateSessionContext(updates: Partial<SessionContext>): Promise<void> {
        if (!this.sessionContext) {
            logger.warn('SessionContextManager: Cannot update context - no active session');
            return;
        }

        const previousContext = { ...this.sessionContext };
        const now = new Date();

        // Apply updates
        this.sessionContext = {
            ...this.sessionContext,
            ...updates,
            lastActivity: now
        };

        // Persist updated context
        this.persistSessionContext();

        // Determine update type
        let updateType: SessionUpdateEvent['type'] = 'activity_update';
        if (updates.userRole !== undefined) {
            updateType = 'role_change';
        } else if (updates.churchContext !== undefined) {
            updateType = 'permission_change';
        } else if (updates.privacySettings !== undefined || updates.isOptedOut !== undefined) {
            updateType = 'privacy_change';
        }

        // Notify listeners
        this.notifyListeners({
            type: updateType,
            previousContext,
            newContext: this.sessionContext,
            timestamp: now
        });

        logger.info('SessionContextManager: Session context updated', {
            updateType,
            sessionId: this.sessionContext.sessionId
        });
    }

    /**
     * Update user activity timestamp
     */
    updateActivity(): void {
        if (!this.sessionContext) return;

        const now = new Date();
        this.sessionContext.lastActivity = now;

        // Reset activity timer
        this.resetActivityTimer();

        // Persist updated activity
        this.persistSessionContext();
    }

    /**
     * Get current session context
     */
    getSessionContext(): SessionContext | null {
        return this.sessionContext;
    }

    /**
     * Get church context from current session
     */
    getChurchContext(): ChurchContext | null {
        return this.sessionContext?.churchContext || null;
    }

    /**
     * Check if user has opted out of analytics
     */
    isOptedOut(): boolean {
        return this.sessionContext?.isOptedOut || false;
    }

    /**
     * Set user opt-out preference
     * 
     * @param optedOut - Whether user has opted out
     */
    async setOptOut(optedOut: boolean): Promise<void> {
        if (!this.sessionContext) {
            logger.warn('SessionContextManager: Cannot set opt-out - no active session');
            return;
        }

        await this.updateSessionContext({
            isOptedOut: optedOut,
            privacySettings: {
                ...this.sessionContext.privacySettings,
                analyticsEnabled: !optedOut
            }
        });

        // Persist opt-out preference
        this.persistOptOutPreference(optedOut);

        logger.info('SessionContextManager: Opt-out preference updated', { optedOut });
    }

    /**
     * Update privacy settings
     * 
     * @param settings - New privacy settings
     */
    async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
        if (!this.sessionContext) {
            logger.warn('SessionContextManager: Cannot update privacy settings - no active session');
            return;
        }

        const newPrivacySettings = {
            ...this.sessionContext.privacySettings,
            ...settings
        };

        await this.updateSessionContext({
            privacySettings: newPrivacySettings
        });

        // Persist privacy settings
        this.persistPrivacySettings(newPrivacySettings);

        logger.info('SessionContextManager: Privacy settings updated', settings);
    }

    /**
     * Get session duration in milliseconds
     */
    getSessionDuration(): number {
        if (!this.sessionStartTime) return 0;
        return Date.now() - this.sessionStartTime.getTime();
    }

    /**
     * Check if session is active (within activity timeout)
     */
    isSessionActive(): boolean {
        if (!this.sessionContext) return false;

        const timeSinceActivity = Date.now() - this.sessionContext.lastActivity.getTime();
        return timeSinceActivity < this.ACTIVITY_TIMEOUT;
    }

    /**
     * Add listener for session context updates
     * 
     * @param listener - Function to call when context updates
     */
    addUpdateListener(listener: (event: SessionUpdateEvent) => void): void {
        this.updateListeners.push(listener);
    }

    /**
     * Remove update listener
     * 
     * @param listener - Listener function to remove
     */
    removeUpdateListener(listener: (event: SessionUpdateEvent) => void): void {
        const index = this.updateListeners.indexOf(listener);
        if (index > -1) {
            this.updateListeners.splice(index, 1);
        }
    }

    /**
     * Clear session context (for logout or privacy compliance)
     */
    clearSession(): void {
        const previousContext = this.sessionContext;

        // Clear session data
        this.sessionContext = null;
        this.sessionStartTime = null;

        // Stop activity tracking
        this.stopActivityTracking();

        // Clear persisted data
        this.clearPersistedData();

        // Notify listeners
        if (previousContext) {
            this.notifyListeners({
                type: 'activity_update',
                previousContext,
                newContext: {},
                timestamp: new Date()
            });
        }

        logger.info('SessionContextManager: Session cleared');
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `session_${timestamp}_${random}`;
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
     * Get anonymized user agent (remove identifying information)
     */
    private getAnonymizedUserAgent(): string {
        if (!browser) return 'server';

        const userAgent = navigator.userAgent;

        // Remove potentially identifying information while keeping useful data
        return userAgent
            .replace(/\([^)]*\)/g, '(...)') // Remove detailed system info
            .replace(/Version\/[\d.]+/g, 'Version/X.X') // Anonymize version numbers
            .replace(/Chrome\/[\d.]+/g, 'Chrome/X.X')
            .replace(/Safari\/[\d.]+/g, 'Safari/X.X')
            .replace(/Firefox\/[\d.]+/g, 'Firefox/X.X');
    }

    /**
     * Check opt-out status from storage
     */
    private checkOptOutStatus(userId?: string): boolean {
        if (!browser) return false;

        try {
            const optOutKey = userId ? `analytics_optout_${userId}` : 'analytics_optout_global';
            const optOutValue = window.localStorage.getItem(optOutKey);
            return optOutValue === 'true';
        } catch (error) {
            logger.warn('SessionContextManager: Could not check opt-out status', error);
            return false; // Default to opted-in if we can't determine
        }
    }

    /**
     * Get privacy settings from storage or defaults
     */
    private getPrivacySettings(): PrivacySettings {
        if (!browser) {
            return this.getDefaultPrivacySettings();
        }

        try {
            const stored = window.localStorage.getItem('privacy_settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...this.getDefaultPrivacySettings(), ...parsed };
            }
        } catch (error) {
            logger.warn('SessionContextManager: Could not load privacy settings', error);
        }

        return this.getDefaultPrivacySettings();
    }

    /**
     * Get default privacy settings
     */
    private getDefaultPrivacySettings(): PrivacySettings {
        return {
            analyticsEnabled: true,
            performanceTrackingEnabled: true,
            errorTrackingEnabled: true,
            personalizedExperienceEnabled: true
        };
    }

    /**
     * Set up activity tracking
     */
    private setupActivityTracking(): void {
        if (!browser) return;

        // Track user interactions
        const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];

        const activityHandler = () => {
            this.updateActivity();
        };

        events.forEach(event => {
            document.addEventListener(event, activityHandler, { passive: true });
        });
    }

    /**
     * Start activity tracking timer
     */
    private startActivityTracking(): void {
        this.resetActivityTimer();
    }

    /**
     * Reset activity timer
     */
    private resetActivityTimer(): void {
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
        }

        this.activityTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, this.ACTIVITY_TIMEOUT);
    }

    /**
     * Stop activity tracking
     */
    private stopActivityTracking(): void {
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
            this.activityTimer = null;
        }
    }

    /**
     * Handle session timeout
     */
    private handleSessionTimeout(): void {
        logger.info('SessionContextManager: Session timed out due to inactivity');

        // Notify listeners before clearing
        if (this.sessionContext) {
            this.notifyListeners({
                type: 'activity_update',
                previousContext: this.sessionContext,
                newContext: { lastActivity: new Date() },
                timestamp: new Date()
            });
        }

        // Don't clear session completely, just mark as inactive
        // The session can be reactivated when user becomes active again
    }

    /**
     * Handle session end (page unload)
     */
    private handleSessionEnd(): void {
        if (this.sessionContext) {
            // Update final activity time
            this.sessionContext.lastActivity = new Date();
            this.persistSessionContext();
        }
    }

    /**
     * Persist session context to storage (privacy-compliant)
     */
    private persistSessionContext(): void {
        if (!browser || !this.sessionContext) return;

        try {
            // Only persist non-sensitive data
            const persistData = {
                sessionId: this.sessionContext.sessionId,
                deviceType: this.sessionContext.deviceType,
                startTime: this.sessionContext.startTime.toISOString(),
                lastActivity: this.sessionContext.lastActivity.toISOString(),
                privacySettings: this.sessionContext.privacySettings
            };

            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(persistData));
        } catch (error) {
            logger.warn('SessionContextManager: Could not persist session context', error);
        }
    }

    /**
     * Load privacy settings from storage
     */
    private loadPrivacySettings(): void {
        // Privacy settings are loaded in getPrivacySettings()
        // This method can be used for additional privacy setup if needed
    }

    /**
     * Persist opt-out preference
     */
    private persistOptOutPreference(optedOut: boolean): void {
        if (!browser) return;

        try {
            const userId = this.sessionContext?.userId;
            const optOutKey = userId ? `analytics_optout_${userId}` : 'analytics_optout_global';

            if (optedOut) {
                window.localStorage.setItem(optOutKey, 'true');
            } else {
                window.localStorage.removeItem(optOutKey);
            }
        } catch (error) {
            logger.warn('SessionContextManager: Could not persist opt-out preference', error);
        }
    }

    /**
     * Persist privacy settings
     */
    private persistPrivacySettings(settings: PrivacySettings): void {
        if (!browser) return;

        try {
            window.localStorage.setItem('privacy_settings', JSON.stringify(settings));
        } catch (error) {
            logger.warn('SessionContextManager: Could not persist privacy settings', error);
        }
    }

    /**
     * Clear all persisted data
     */
    private clearPersistedData(): void {
        if (!browser) return;

        try {
            sessionStorage.removeItem(this.STORAGE_KEY);
            // Note: We don't clear privacy settings and opt-out preferences
            // as these should persist across sessions
        } catch (error) {
            logger.warn('SessionContextManager: Could not clear persisted data', error);
        }
    }

    /**
     * Notify all update listeners
     */
    private notifyListeners(event: SessionUpdateEvent): void {
        this.updateListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                logger.error('SessionContextManager: Error in update listener', error);
            }
        });
    }
}

// Export singleton instance
export const sessionContextManager = SessionContextManager.getInstance();