import type { Church } from '$core/entities/Schedule';
import { statsigService } from '$src/lib/application/StatsigService';
import { logger } from '$src/lib/utils/logger';

/**
 * Determines if PPG (Panitia Pembangunan Gereja) is required for this church.
 * Priority logic:
 * 1. If database church.requirePpg = 1, always return true (database takes priority)
 * 2. Otherwise, check Statsig gate 'ppg' for override capability
 *
 * @param church - Church entity with requirePpg configuration
 * @returns {Promise<boolean>} True if PPG is required, false otherwise
 */
export async function shouldRequirePpg(church: Church): Promise<boolean> {
	// Check database configuration first
	const dbRequiresPpg = church.requirePpg === 1;

	// If database requires PPG, that takes priority
	if (dbRequiresPpg) {
		logger.debug(
			`PPG requirement check: Database config=true (takes priority) for church ${church.code}`
		);
		return true;
	}

	// Otherwise check Statsig gate for override
	const statsigRequiresPpg = await statsigService.checkGate('ppg');
	logger.debug(
		`PPG requirement check: Database config=false, Statsig gate=${statsigRequiresPpg} for church ${church.code}`
	);
	return statsigRequiresPpg;
}

