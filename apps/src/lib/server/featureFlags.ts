import { statsigService } from '$src/lib/application/StatsigService';
import { logger } from '$src/lib/utils/logger';

/**
 * Server-side feature gate check for use in `+page.server.ts` load functions.
 *
 * Initialises the Statsig client (if not already running), syncs the current
 * user context from `locals`, then evaluates the named gate.  Falls back to
 * `false` on any error so that missing config in dev never crashes a route.
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
			await statsigService.updateUser(session.user.name, {
				role: session.user.role ?? undefined,
				cid: session.user.cid ?? undefined
			});
		}

		return await statsigService.checkGate(gate);
	} catch (error) {
		logger.warn('checkServerGate: gate check failed, defaulting to false', { gate, error });
		return false;
	}
}
