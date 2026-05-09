/**
 * Pure analytics helpers — no class state, deterministic.
 *
 * Extracted from PostHogService for reuse and testability.
 * These functions are stateless; pass any browser globals (e.g. hostname)
 * as arguments rather than reading them inside the helper.
 */

/**
 * Check if a URL points to the site's homepage.
 *
 * @param url - Absolute or path URL
 * @returns true if the URL's pathname is `/`, `/index.html`, or empty
 */
export function isHomepage(url: string): boolean {
	try {
		const pathname = new URL(url).pathname;
		return pathname === '/' || pathname === '/index.html' || pathname === '';
	} catch {
		return false;
	}
}

/**
 * Categorize an HTTP referrer URL by traffic source.
 *
 * @param referrer - The HTTP referrer URL (may be empty for direct visits)
 * @param currentHostname - The site's own hostname, used to detect internal referrers
 * @returns A short source category: `direct`, `google`, `facebook`, `internal`, `external`, etc.
 */
export function categorizeReferrer(referrer: string, currentHostname?: string): string {
	if (!referrer) return 'direct';

	try {
		const domain = new URL(referrer).hostname.toLowerCase();

		// Search engines
		if (domain.includes('google')) return 'google';
		if (domain.includes('bing')) return 'bing';
		if (domain.includes('yahoo')) return 'yahoo';
		if (domain.includes('duckduckgo')) return 'duckduckgo';

		// Social media
		if (domain.includes('facebook')) return 'facebook';
		if (domain.includes('twitter') || domain.includes('t.co')) return 'twitter';
		if (domain.includes('instagram')) return 'instagram';
		if (domain.includes('linkedin')) return 'linkedin';
		if (domain.includes('whatsapp')) return 'whatsapp';

		// Email
		if (domain.includes('gmail') || domain.includes('outlook') || domain.includes('mail')) return 'email';

		// Same domain (internal)
		if (currentHostname && domain === currentHostname) return 'internal';

		// External website
		return 'external';
	} catch {
		return 'unknown';
	}
}

/**
 * Bucket time-on-page into an engagement level.
 *
 * @param timeSpentMs - milliseconds spent on the page
 * @returns One of: `bounce`, `low`, `medium`, `high`, `very_high`
 */
export function calculateEngagementLevel(timeSpentMs: number): string {
	if (timeSpentMs < 5_000) return 'bounce';     // < 5s
	if (timeSpentMs < 30_000) return 'low';       // < 30s
	if (timeSpentMs < 120_000) return 'medium';   // < 2m
	if (timeSpentMs < 300_000) return 'high';     // < 5m
	return 'very_high';                            // 5m+
}
