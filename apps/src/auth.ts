import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import MicrosoftEntraID from '@auth/sveltekit/providers/microsoft-entra-id';
import type { Provider } from '@auth/sveltekit/providers';
import { repo } from './lib/server/db';
import { logger } from './lib/utils/logger';

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

export const { handle: authHandle, signIn, signOut } = SvelteKitAuth({
	trustHost: true,
	providers: providers,
	secret: import.meta.env.AUTH_SECRET,
	pages: {
		signIn: '/signin'
	},
	callbacks: {
		async jwt({ token, user, account }) {
			// logger.debug(`jwt callback: ${JSON.stringify(token)}`);
			if (user && account) {
				logger.debug(`validating user ${user.email} and account ${account.provider}`);
				// Check if the user exists in the database
				const dbUser = await repo.getUserByEmail(user.email ?? '');

				if (!dbUser) {
					logger.debug(`unregistered user ${user.email} detected`);
					// Return token with unregistered flag
					logger.debug(`returning unregistered user token`);
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
		throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
	}
}
