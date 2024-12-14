declare module '$lib/utils/featureFlags' {
	export const featureFlags: {
		isEnabled(flagName: string): boolean;
		getValue(flagName: string): boolean | string | number;
	};
}
