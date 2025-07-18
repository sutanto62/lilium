import type { Mass } from '$core/entities/Schedule';
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

export function stringToDate(isoDate: string) {
	if (!isoDate) {
		return new Date();
	}
	return new Date(isoDate);
}

type DateFormat = 'short' | 'long' | 'datetime' | 'time' | 'date' | 'full' | 'iso';

export function formatDate(dateString: string, format: DateFormat = 'short', locale: string = 'id-ID'): string {
	const date = new Date(dateString);

	// Handle invalid dates
	if (isNaN(date.getTime())) {
		return 'Invalid Date';
	}

	const options: Intl.DateTimeFormatOptions = (() => {
		switch (format) {
			case 'long':
				return {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				};
			case 'datetime':
				return {
					weekday: 'long',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				};
			case 'time':
				return {
					hour: '2-digit',
					minute: '2-digit'
				};
			case 'date':
				return {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit'
				};
			case 'full':
				return {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				};
			case 'iso':
				return {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					timeZoneName: 'short'
				};
			default: // 'short'
				return {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				};
		}
	})();

	return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Get the week number of a given date.
 * 
 * If no date is provided, the current date is used.
 * 
 * @param date - The date to get the week number of.
 * @returns The week number of the given date.
 */
export function getWeekNumber(date?: string): number {
	const eventDate = date ? new Date(date) : new Date();
	const startOfYear = new Date(eventDate.getFullYear(), 0, 1);
	const days = Math.floor((eventDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
	const adjustedDay = (startOfYear.getDay() + 6) % 7;
	const weekNumber = Math.ceil((days + adjustedDay + 1) / 7);
	return weekNumber;
}

/**
 * Get current and specified number of upcoming week numbers.
 * 
 * If no parameters are provided, returns current and next week numbers.
 * 
 * @param weeks - Number of upcoming weeks to include (default: 1)
 * @param date - Optional date to get the week numbers of (default: current date)
 * @returns Array of week numbers starting from current week
 */
export function getWeekNumbers(weeks: number = 1, date?: string): number[] {
	const currentWeekNumber = getWeekNumber(date);
	return Array.from({ length: weeks + 1 }, (_, i) => currentWeekNumber + i);
}

/**
 * Get the Unix epoch time in seconds.
 * Sync with sqlite3 database unixepoch() function.
 * 
 * @returns The Unix epoch time in seconds.
 */
export function getUnixEpoch(): number {
	return new Date().getTime() / 1000;
}


/**
 * Convert Unix epoch time (in milliseconds) to ISO date string.
 * 
 * @param epoch - The Unix epoch time in milliseconds
 * @returns ISO 8601 formatted date string
 */
export function epochToDate(epoch: number): string {
	return new Date(epoch).toISOString();
}

