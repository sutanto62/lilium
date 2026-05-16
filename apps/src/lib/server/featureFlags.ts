import { statsigService } from '$src/lib/application/StatsigService';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';

/**
 * Server-side feature gate check for use in `+page.server.ts` load functions.
 *
 * Initialises the Statsig client (if not already running), syncs the full
 * user context from `locals` (including featurePreference from DB), then
 * evaluates the named gate.  Falls back to `false` on any error so that
 * missing config in dev never crashes a route.
 *
 * NOTE: updateUserAsync is a full replace on the Statsig JS client — not a
 * merge. featurePreference must be included on every call or it gets wiped.
 *
 * Usage:
 * ```ts
 * import { checkServerGate } from '$lib/server/featureFlags';
 *
 * export const load: PageServerLoad = async ({ locals }) => {
 *   const isNewUX = await checkServerGate(locals, 'new_settings_pages');
 *   return { isNewUX };
 * };
 * ```
 *
 * @param locals - SvelteKit `App.Locals` (provides `locals.auth()`)
 * @param gate   - Statsig gate name, e.g. `'new_domain_model'`
 * @returns `true` if the gate is open for this user, `false` otherwise
 */
export async function checkServerGate(locals: App.Locals, gate: string): Promise<boolean> {
	try {
		await statsigService.use();

		const session = await locals.auth();

		if (session?.user?.name) {
			// Fetch featurePreference from DB so the full user context is forwarded.
			// updateUserAsync is a full replace — omitting it here would wipe what
			// the parent layout set, causing gate rules on featurePreference to never fire.
			const dbUser = await repo.getUserByEmail(session.user.email ?? '');
			const featurePreference = dbUser?.featurePreference ?? undefined;


			await statsigService.updateUser(session.user.name, {
				role: session.user.role ?? undefined,
				cid: session.user.cid ?? undefined,
				featurePreference
			});
		}

		return await statsigService.checkGate(gate);
	} catch (error) {
		logger.warn('checkServerGate: gate check failed, defaulting to false', { gate, error });
		return false;
	}
}
