import type { Mass } from '$core/entities/Schedule';
import { featureFlags } from '$src/lib/utils/localFeatureFlag';

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

export function formatDate(dateString: string, format: DateFormat = 'short', locale: string = 'id-ID', timezone: string = 'Asia/Jakarta'): string {
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
					day: 'numeric',
					timeZone: timezone
				};
			case 'datetime':
				return {
					weekday: 'long',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					timeZone: timezone
				};
			case 'time':
				return {
					hour: '2-digit',
					minute: '2-digit',
					timeZone: timezone
				};
			case 'date':
				return {
					year: 'numeric',
					month: 'short',
					day: '2-digit',
					timeZone: timezone
				};
			case 'full':
				return {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					timeZone: timezone
				};
			case 'iso':
				return {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					timeZoneName: 'short',
					timeZone: timezone
				};
			default: // 'short'
				return {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					timeZone: timezone
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

/**
 * Get server timezone information
 * 
 * @returns Object containing timezone details
 */
export function getServerTimezoneInfo() {
	const now = new Date();
	const timezoneOffset = now.getTimezoneOffset();
	const timezoneOffsetHours = Math.abs(Math.floor(timezoneOffset / 60));
	const timezoneOffsetMinutes = Math.abs(timezoneOffset % 60);
	const timezoneSign = timezoneOffset <= 0 ? '+' : '-';

	return {
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		timezoneOffset: timezoneOffset,
		timezoneOffsetFormatted: `${timezoneSign}${timezoneOffsetHours.toString().padStart(2, '0')}:${timezoneOffsetMinutes.toString().padStart(2, '0')}`,
		utcTime: now.toISOString(),
		localTime: now.toString(),
		timezoneName: Intl.DateTimeFormat('id-ID', { timeZoneName: 'long' }).format(now),
		timezoneAbbr: Intl.DateTimeFormat('id-ID', { timeZoneName: 'short' }).format(now)
	};
}

/**
 * Check if server is running in a specific timezone
 * 
 * @param expectedTimezone - Expected timezone (default: 'Asia/Jakarta')
 * @returns Boolean indicating if server is in expected timezone
 */
export function isServerInTimezone(expectedTimezone: string = 'Asia/Jakarta'): boolean {
	const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	return serverTimezone === expectedTimezone;
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * 
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string, locale: string = 'id-ID'): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

	if (Math.abs(diffInSeconds) < 60) {
		return rtf.format(-diffInSeconds, 'second');
	}

	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (Math.abs(diffInMinutes) < 60) {
		return rtf.format(-diffInMinutes, 'minute');
	}

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (Math.abs(diffInHours) < 24) {
		return rtf.format(-diffInHours, 'hour');
	}

	const diffInDays = Math.floor(diffInHours / 24);
	if (Math.abs(diffInDays) < 30) {
		return rtf.format(-diffInDays, 'day');
	}

	const diffInMonths = Math.floor(diffInDays / 30);
	if (Math.abs(diffInMonths) < 12) {
		return rtf.format(-diffInMonths, 'month');
	}

	const diffInYears = Math.floor(diffInMonths / 12);
	return rtf.format(-diffInYears, 'year');
}

/**
 * Format date range between two dates
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - Locale for formatting (default: 'en-US')
 * @param options - DateTimeFormat options
 * @returns Formatted date range string
 */
export function formatDateRange(
	startDate: Date | string,
	endDate: Date | string,
	locale: string = 'id-ID',
	timezone: string = 'Asia/Jakarta',
	options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}
): string {
	const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
	const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

	const formatter = new Intl.DateTimeFormat(locale, {
		...options,
		timeZone: timezone
	});
	return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/**
 * Get available locales for DateTimeFormat
 * 
 * @returns Array of available locale strings
 */
export function getAvailableLocales(): string[] {
	return Intl.DateTimeFormat.supportedLocalesOf(['en', 'id', 'ja', 'zh', 'ko']);
}

/**
 * Format date with custom pattern using Intl.DateTimeFormat
 * 
 * @param date - Date to format
 * @param pattern - Custom pattern (e.g., 'MM/dd/yyyy', 'dd MMM yyyy')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDateWithPattern(
	date: Date | string,
	pattern: string,
	locale: string = 'id-ID',
	timezone: string = 'Asia/Jakarta'
): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;

	// Map common patterns to DateTimeFormat options
	const patternMap: Record<string, Intl.DateTimeFormatOptions> = {
		'MM/dd/yyyy': { month: '2-digit', day: '2-digit', year: 'numeric' },
		'dd/MM/yyyy': { day: '2-digit', month: '2-digit', year: 'numeric' },
		'yyyy-MM-dd': { year: 'numeric', month: '2-digit', day: '2-digit' },
		'dd MMM yyyy': { day: '2-digit', month: 'short', year: 'numeric' },
		'dd MMMM yyyy': { day: '2-digit', month: 'long', year: 'numeric' },
		'MMM dd, yyyy': { month: 'short', day: '2-digit', year: 'numeric' },
		'MMMM dd, yyyy': { month: 'long', day: '2-digit', year: 'numeric' }
	};

	const options = patternMap[pattern] || {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	};

	return new Intl.DateTimeFormat(locale, {
		...options,
		timeZone: timezone
	}).format(dateObj);
}

