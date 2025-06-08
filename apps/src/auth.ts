import { statsigService } from '$src/lib/application/StatsigService';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { SvelteKitAuth } from '@auth/sveltekit';
import type { Provider } from '@auth/sveltekit/providers';
import Google from '@auth/sveltekit/providers/google';
import MicrosoftEntraID from '@auth/sveltekit/providers/microsoft-entra-id';

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
	secret: import.meta.env.VITE_AUTH_SECRET,
	pages: {
		signIn: '/signin'
	},
	callbacks: {
		async jwt({ token, user, account }) {
			if (user && account) {
				// Check if the user exists in the database
				const dbUser = await repo.getUserByEmail(user.email ?? '');

				if (!dbUser) {
					// Return token with unregistered flag
					return {
						...token,
						cid: '',
						role: 'visitor',
						lingkunganId: '',
						unregistered: true
					};
				}

				token.id = user.id;
				token.cid = import.meta.env.VITE_CHURCH_ID;
				token.role = dbUser?.role ?? 'user';
				token.lingkunganId = dbUser?.lingkunganId ?? '';

				// Identify user in Statsig
				if (user.id) {
					await statsigService.updateUser(user.id, {
						email: user.email,
						role: dbUser?.role,
						lingkunganId: dbUser?.lingkunganId,
						cid: import.meta.env.VITE_CHURCH_ID
					});
				}
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
					role: token.role as string,
					lingkunganId: token.lingkunganId as string
				}
			};
		}
	}
});

/**
 * Checks if a user has a specific role or higher in the role hierarchy.
 * 
 * @param session - The user's session object that contains role information
 * @param requiredRole - The minimum role required (admin, user, or visitor)
 * @returns boolean - True if the user has the required role or higher, false otherwise
 */

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

/**
 * Enforces role-based access control by checking if a session has the required role
 *
 * This function builds on hasRole() to provide a way to throw an error if the user
 * doesn't have the necessary permissions, making it useful for guarding protected routes
 * or operations.
 *
 * @param session - The user's session object, which contains role information
 * @param requiredRole - The minimum role required to access the feature
 * @throws Error if the user lacks the required role
 */
export function requireRole(session: { user?: { role?: string } } | null, requiredRole: UserRole): void {
	if (!hasRole(session, requiredRole)) {
		logger.error(`Insufficient permissions. Required role: ${requiredRole}`);
		throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
	}
}
