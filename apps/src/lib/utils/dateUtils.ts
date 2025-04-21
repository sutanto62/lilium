import type { Mass } from '$core/entities/Schedule';
import { featureFlags } from '$lib/utils/FeatureFlag';
import { logger } from './logger';

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

/**
 * Get the week number of a given date.
 * If no date is provided, the current date is used.
 * @param date - The date to get the week number of.
 * @returns The week number of the given date.
 */
export function getWeekNumber(date?: string): number {
	const eventDate = date ? new Date(date) : new Date();
	const startOfYear = new Date(eventDate.getFullYear(), 0, 1);
	const days = Math.floor((eventDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
	const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
	return weekNumber;
}
