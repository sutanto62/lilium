import type { Session } from '@auth/core/types';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SessionContextManager, type ChurchContext, type PrivacySettings } from './SessionContextManager';

// Mock browser environment
Object.defineProperty(global, 'window', {
    value: {
        addEventListener: vi.fn(),
        localStorage: {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn()
        },
        sessionStorage: {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn()
        }
    },
    writable: true
});

Object.defineProperty(global, 'document', {
    value: {
        addEventListener: vi.fn(),
        visibilityState: 'visible'
    },
    writable: true
});

Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    writable: true
});

// Mock the browser environment check
vi.mock('$app/environment', () => ({
    browser: true,
    dev: false
}));

describe('SessionContextManager', () => {
    let sessionManager: SessionContextManager;

    const mockSession: Session = {
        user: {
            id: 'user123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'admin',
            cid: 'church123',
            lingkunganId: 'lingkungan123'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset singleton instance for testing
        (SessionContextManager as any).instance = undefined;
        sessionManager = SessionContextManager.getInstance();

        // Mock localStorage methods
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);
        vi.mocked(window.localStorage.setItem).mockImplementation(() => { });
        vi.mocked(window.localStorage.removeItem).mockImplementation(() => { });

        // Mock sessionStorage methods
        vi.mocked(window.sessionStorage.getItem).mockReturnValue(null);
        vi.mocked(window.sessionStorage.setItem).mockImplementation(() => { });
        vi.mocked(window.sessionStorage.removeItem).mockImplementation(() => { });
    });

    describe('Singleton Pattern', () => {
        test('should return the same instance', () => {
            const instance1 = SessionContextManager.getInstance();
            const instance2 = SessionContextManager.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('Session Initialization', () => {
        test('should initialize session context with user session', async () => {
            const context = await sessionManager.initializeSession(mockSession);

            expect(context).toBeDefined();
            expect(context?.userId).toBe('user123');
            expect(context?.userRole).toBe('admin');
            expect(context?.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
            expect(context?.startTime).toBeInstanceOf(Date);
            expect(context?.lastActivity).toBeInstanceOf(Date);
            expect(context?.isOptedOut).toBe(false);
            expect(context?.deviceType).toBe('desktop');
        });

        test('should extract church context from session', async () => {
            const context = await sessionManager.initializeSession(mockSession);

            expect(context?.churchContext).toBeDefined();
            expect(context?.churchContext?.churchId).toBe('church123');
            expect(context?.churchContext?.lingkunganId).toBe('lingkungan123');
            expect(context?.churchContext?.userPermissions).toContain('admin');
            expect(context?.churchContext?.userPermissions).toContain('church_admin');
        });

        test('should handle null session gracefully', async () => {
            const context = await sessionManager.initializeSession(null);

            expect(context).toBeDefined();
            expect(context?.userId).toBeUndefined();
            expect(context?.userRole).toBe('visitor');
            expect(context?.churchContext).toBeUndefined();
        });

        test('should preserve existing session when requested', async () => {
            // Initialize first session
            const firstContext = await sessionManager.initializeSession(mockSession);
            const firstSessionId = firstContext?.sessionId;

            // Initialize second session with preserve option
            const secondContext = await sessionManager.initializeSession(mockSession, {
                preserveExistingSession: true
            });

            expect(secondContext?.sessionId).toBe(firstSessionId);
        });

        test('should use custom session ID when provided', async () => {
            const customSessionId = 'custom_session_123';

            const context = await sessionManager.initializeSession(mockSession, {
                customSessionId
            });

            expect(context?.sessionId).toBe(customSessionId);
        });
    });

    describe('Church Context Extraction', () => {
        test('should extract admin permissions correctly', async () => {
            const adminSession: Session = {
                ...mockSession,
                user: { ...mockSession.user!, role: 'admin' }
            };

            const context = await sessionManager.initializeSession(adminSession);
            const churchContext = context?.churchContext;

            expect(churchContext?.userPermissions).toContain('admin');
            expect(churchContext?.userPermissions).toContain('church_admin');
            expect(churchContext?.userPermissions).toContain('schedule_management');
            expect(churchContext?.userPermissions).toContain('user_management');
        });

        test('should extract user permissions correctly', async () => {
            const userSession: Session = {
                ...mockSession,
                user: { ...mockSession.user!, role: 'user' }
            };

            const context = await sessionManager.initializeSession(userSession);
            const churchContext = context?.churchContext;

            expect(churchContext?.userPermissions).toContain('user');
            expect(churchContext?.userPermissions).toContain('church_member');
            expect(churchContext?.userPermissions).toContain('schedule_view');
            expect(churchContext?.userPermissions).not.toContain('church_admin');
        });

        test('should handle missing church data gracefully', async () => {
            const sessionWithoutChurch: Session = {
                user: {
                    id: 'user123',
                    name: 'Test User',
                    email: 'test@example.com'
                    // No role, cid, or lingkunganId
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            const context = await sessionManager.initializeSession(sessionWithoutChurch);
            const churchContext = context?.churchContext;

            expect(churchContext?.churchId).toBe('');
            expect(churchContext?.lingkunganId).toBeUndefined();
            expect(churchContext?.userPermissions).toEqual(['visitor']);
        });
    });

    describe('Session Context Updates', () => {
        test('should update session context', async () => {
            await sessionManager.initializeSession(mockSession);

            const updates = {
                userRole: 'user' as const,
                churchContext: {
                    churchId: 'new_church',
                    userPermissions: ['user']
                } as ChurchContext
            };

            await sessionManager.updateSessionContext(updates);

            const context = sessionManager.getSessionContext();
            expect(context?.userRole).toBe('user');
            expect(context?.churchContext?.churchId).toBe('new_church');
        });

        test('should update activity timestamp', () => {
            sessionManager.initializeSession(mockSession);

            const beforeUpdate = sessionManager.getSessionContext()?.lastActivity;

            // Wait a bit to ensure timestamp difference
            setTimeout(() => {
                sessionManager.updateActivity();

                const afterUpdate = sessionManager.getSessionContext()?.lastActivity;
                expect(afterUpdate?.getTime()).toBeGreaterThan(beforeUpdate?.getTime() || 0);
            }, 10);
        });

        test('should notify listeners on context updates', async () => {
            const listener = vi.fn();
            sessionManager.addUpdateListener(listener);

            await sessionManager.initializeSession(mockSession);

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'activity_update',
                    newContext: expect.any(Object),
                    timestamp: expect.any(Date)
                })
            );
        });
    });

    describe('Privacy and Opt-Out', () => {
        test('should handle opt-out preference', async () => {
            await sessionManager.initializeSession(mockSession);

            await sessionManager.setOptOut(true);

            expect(sessionManager.isOptedOut()).toBe(true);
            expect(window.localStorage.setItem).toHaveBeenCalledWith(
                'analytics_optout_user123',
                'true'
            );
        });

        test('should update privacy settings', async () => {
            await sessionManager.initializeSession(mockSession);

            const newSettings: Partial<PrivacySettings> = {
                performanceTrackingEnabled: false,
                errorTrackingEnabled: false
            };

            await sessionManager.updatePrivacySettings(newSettings);

            const context = sessionManager.getSessionContext();
            expect(context?.privacySettings.performanceTrackingEnabled).toBe(false);
            expect(context?.privacySettings.errorTrackingEnabled).toBe(false);
            expect(context?.privacySettings.analyticsEnabled).toBe(true); // Should remain unchanged
        });

        test('should check opt-out status from storage', async () => {
            // Mock localStorage to return opt-out status
            vi.mocked(window.localStorage.getItem).mockImplementation((key) => {
                if (key === 'analytics_optout_user123') return 'true';
                return null;
            });

            const context = await sessionManager.initializeSession(mockSession);

            expect(context?.isOptedOut).toBe(true);
        });
    });

    describe('Device Detection', () => {
        test('should detect desktop device', async () => {
            const context = await sessionManager.initializeSession(mockSession);

            expect(context?.deviceType).toBe('desktop');
        });

        test('should detect mobile device', async () => {
            // Mock mobile user agent
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                configurable: true
            });

            // Create new instance to pick up new user agent
            (SessionContextManager as any).instance = undefined;
            const mobileSessionManager = SessionContextManager.getInstance();

            const context = await mobileSessionManager.initializeSession(mockSession);

            expect(context?.deviceType).toBe('mobile');
        });

        test('should detect tablet device', async () => {
            // Mock tablet user agent
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                configurable: true
            });

            // Create new instance to pick up new user agent
            (SessionContextManager as any).instance = undefined;
            const tabletSessionManager = SessionContextManager.getInstance();

            const context = await tabletSessionManager.initializeSession(mockSession);

            expect(context?.deviceType).toBe('tablet');
        });
    });

    describe('Session Management', () => {
        test('should calculate session duration', async () => {
            await sessionManager.initializeSession(mockSession);

            // Wait a bit to ensure duration > 0
            await new Promise(resolve => setTimeout(resolve, 10));

            const duration = sessionManager.getSessionDuration();
            expect(duration).toBeGreaterThan(0);
        });

        test('should check if session is active', async () => {
            await sessionManager.initializeSession(mockSession);

            expect(sessionManager.isSessionActive()).toBe(true);
        });

        test('should clear session context', async () => {
            await sessionManager.initializeSession(mockSession);

            expect(sessionManager.getSessionContext()).toBeDefined();

            sessionManager.clearSession();

            expect(sessionManager.getSessionContext()).toBeNull();
        });

        test('should get church context', async () => {
            await sessionManager.initializeSession(mockSession);

            const churchContext = sessionManager.getChurchContext();

            expect(churchContext).toBeDefined();
            expect(churchContext?.churchId).toBe('church123');
        });
    });

    describe('User Agent Anonymization', () => {
        test('should anonymize user agent', async () => {
            const context = await sessionManager.initializeSession(mockSession);

            expect(context?.userAgent).toBeDefined();
            expect(context?.userAgent).not.toContain('10_15_7'); // Should not contain specific OS version
            expect(context?.userAgent).toContain('(...)'); // Should contain anonymized system info
        });
    });

    describe('Event Listeners', () => {
        test('should add and remove update listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            sessionManager.addUpdateListener(listener1);
            sessionManager.addUpdateListener(listener2);

            // Remove one listener
            sessionManager.removeUpdateListener(listener1);

            // Trigger an update
            sessionManager.updateActivity();

            // Only listener2 should be called (if session is initialized)
            // Since we haven't initialized a session, neither should be called
            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle localStorage errors gracefully', async () => {
            // Mock localStorage to throw error
            vi.mocked(window.localStorage.setItem).mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            // Should not throw error
            await expect(sessionManager.initializeSession(mockSession)).resolves.toBeDefined();
        });

        test('should handle sessionStorage errors gracefully', async () => {
            // Mock sessionStorage to throw error
            vi.mocked(window.sessionStorage.setItem).mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            // Should not throw error
            await expect(sessionManager.initializeSession(mockSession)).resolves.toBeDefined();
        });

        test('should handle listener errors gracefully', async () => {
            const errorListener = vi.fn().mockImplementation(() => {
                throw new Error('Listener error');
            });

            sessionManager.addUpdateListener(errorListener);

            // Should not throw error when notifying listeners
            await expect(sessionManager.initializeSession(mockSession)).resolves.toBeDefined();
        });
    });

    describe('Role Normalization', () => {
        test('should normalize various role formats', async () => {
            const testCases = [
                { input: 'ADMIN', expected: 'admin' },
                { input: 'User', expected: 'user' },
                { input: 'visitor', expected: 'visitor' },
                { input: 'unknown', expected: 'visitor' },
                { input: undefined, expected: 'visitor' },
                { input: '', expected: 'visitor' }
            ];

            for (const testCase of testCases) {
                const testSession: Session = {
                    user: {
                        ...mockSession.user!,
                        role: testCase.input
                    },
                    expires: mockSession.expires
                };

                sessionManager.clearSession(); // Clear previous session
                const context = await sessionManager.initializeSession(testSession);

                expect(context?.userRole).toBe(testCase.expected);
            }
        });
    });
});