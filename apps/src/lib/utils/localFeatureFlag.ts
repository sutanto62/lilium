// TODO: Remove
type FeatureFlag = boolean | string | number;

/**
 * @deprecated Use statsig's feature flag instead
 * The FeatureFlags class is designed to manage feature flags in a Vite-based application.
 * It reads environment variables prefixed with VITE_FEATURE_ and provides methods to check
 * if a feature is enabled or to retrieve the value of a feature flag.
 */
class FeatureFlags {
	private flags: Record<string, FeatureFlag> = {};

	/**
	 * Initializes the FeatureFlags instance by loading flags from environment variables
	 * that start with 'VITE_FEATURE_'.
	 */
	constructor() {
		Object.entries(import.meta.env).forEach(([key, value]) => {
			if (key.startsWith('VITE_FEATURE_')) {
				const flagName = key.replace('VITE_FEATURE_', '').toLowerCase();
				this.flags[flagName] = this.parseValue(value as string);
			}
		});
	}

	/**
	 * Parses a string value into a FeatureFlag type.
	 * @param value - The string value to parse.
	 * @returns The parsed FeatureFlag value.
	 */
	private parseValue(value: string): FeatureFlag {
		if (value === 'true') return true;
		if (value === 'false') return false;
		if (!isNaN(Number(value))) return Number(value);
		return value;
	}

	/**
	 * Checks if a feature flag is enabled.
	 * @param flagName - The name of the feature flag in lower case.
	 * @returns True if the flag is enabled, otherwise false.
	 */
	isEnabled(flagName: string): boolean {
		const value = this.flags[flagName.toLowerCase()];
		return typeof value === 'boolean' ? value : !!value;
	}

	/**
	 * Retrieves the value of a feature flag.
	 * @param flagName - The name of the feature flag.
	 * @returns The value of the feature flag.
	 */
	getFlag(flagName: string): FeatureFlag {
		return this.flags[flagName.toLowerCase()];
	}
}

export const featureFlags = new FeatureFlags();
