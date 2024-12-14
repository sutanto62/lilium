import type { Mass } from '$core/entities/schedule';
import { featureFlags } from '$lib/utils/FeatureFlag';

/**
 * Calculates the next event date based on the created date and mass day.
 *
 * @param {Date} createdAt - The date the event was created.
 * @param {Mass} mass - The mass object containing the day and name of the event.
 * @returns {string} - The next event date in YYYY-MM-DD format or the mass name if not on a weekend.
 */
export function calculateEventDate(createdAt: Date, mass: Mass): string {
	const dayOfWeek = createdAt.getDay();
	let daysUntilEvent = 0;

	// Validate if submitting event on saturday or sunday
	if (featureFlags.isEnabled('no_saturday_sunday')) {
		if (dayOfWeek === 6 || dayOfWeek === 0) {
			return 'n/a';
		}
	}

	if (mass.day === 'saturday') {
		daysUntilEvent = (6 - dayOfWeek + 7) % 7;
	} else if (mass.day === 'sunday') {
		daysUntilEvent = (0 - dayOfWeek + 7) % 7;
	} else {
		return mass.name;
	}

	const nextEventDate = new Date(createdAt);
	nextEventDate.setDate(createdAt.getDate() + daysUntilEvent);

	return nextEventDate.toISOString().split('T')[0];
}

export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return new Intl.DateTimeFormat('id-ID', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(date);
}
