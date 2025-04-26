import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import MicrosoftEntraID from '@auth/sveltekit/providers/microsoft-entra-id';
import type { Provider } from '@auth/sveltekit/providers';
import { repo } from './lib/server/db';
import { logger } from './lib/utils/logger';
import posthog from 'posthog-js';
import { identifyUser } from './lib/utils/analytic';
import { maskEmail } from './lib/utils/maskUtils';

const providers: Provider[] = [
	MicrosoftEntraID({
		clientId: import.meta.env.VITE_AUTH_MICROSOFT_APP_ID,
		clientSecret: import.meta.env.VITE_AUTH_MICROSOFT_APP_SECRET,
		issuer: import.meta.env.VITE_AUTH_MICROSOFT_ENTRA_APP_ISSUER
	}),
	Google({
		clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
		clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET
	})
];

export const providerMap = providers.map((provider) => {
	if (typeof provider === 'function') {
		const providerData = provider();
		return { id: providerData.id, name: providerData.name };
	} else {
		return { id: provider.id, name: provider.name };
	}
});

export type UserRole = 'admin' | 'user' | 'visitor';

/**
 * Authentication configuration and handlers for the application.
 * 
 * This module sets up authentication using SvelteKit Auth with multiple providers:
 * - Microsoft Entra ID (Azure AD)
 * - Google OAuth
 * 
 * It handles:
 * - Provider configuration and initialization
 * - JWT token management and validation
 * - User role assignment and verification
 * - Session management
 * - Unregistered user handling
 * 
 * The authentication flow:
 * 1. User signs in via provider
 * 2. JWT callback validates user and checks registration status
 * 3. Session is created with user details and role
 * 4. Unregistered users are flagged and limited to visitor role
 */

export const { handle: authHandle, signIn, signOut } = SvelteKitAuth({
	trustHost: true,
	providers: providers,
	secret: import.meta.env.AUTH_SECRET,
	pages: {
		signIn: '/signin'
	},
	callbacks: {
		async jwt({ token, user, account }) {
			if (user && account) {
				// Check if the user exists in the database
				const dbUser = await repo.getUserByEmail(user.email ?? '');

				if (!dbUser) {
					logger.debug(`unregistered ${account.provider} ${maskEmail(user.email)} user`)
					// Return token with unregistered flag
					return {
						...token,
						cid: '',
						role: 'visitor',
						unregistered: true
					};
				}

				token.id = user.id;
				token.cid = import.meta.env.VITE_CHURCH_ID;
				token.role = dbUser?.role ?? 'user';
				logger.debug(`registered ${account.provider} ${maskEmail(user.email)} user`);
			}

			return token;
		},
		session({ session, token }) {
			// Catch unregistered users
			if (token.unregistered) {
				return {
					...session,
					user: {
						...session.user,
						cid: '',
						role: 'visitor',
						unregistered: 'y'
					}
				};
			}

			return {
				...session,
				user: {
					...session.user,
					cid: token.cid as string,
					role: token.role as string
				}
			};
		}
	}
});

export function hasRole(session: { user?: { role?: string } } | null, requiredRole: UserRole): boolean {
	if (!session?.user?.role) return false;

	const roleHierarchy: Record<UserRole, number> = {
		'admin': 3,
		'user': 2,
		'visitor': 1
	};

	const userRole = session.user.role as UserRole;
	return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function requireRole(session: { user?: { role?: string } } | null, requiredRole: UserRole): void {
	if (!hasRole(session, requiredRole)) {
		logger.error(`Insufficient permissions. Required role: ${requiredRole}`);
		throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
	}
}
