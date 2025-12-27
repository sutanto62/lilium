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
 * Get the week number of a given date following ISO 8601 standard.
 * 
 * If no date is provided, the current date is used.
 * Week 1 is the first week that contains at least 4 days of the year.
 * If the last week of the year has fewer than 4 days, it belongs to the next year's week 1.
 * 
 * @param date - The date to get the week number of.
 * @returns The week number of the given date.
 */
export function getWeekNumber(date?: string): number {
	const eventDate = date ? new Date(date) : new Date();
	const year = eventDate.getFullYear();
	const startOfYear = new Date(year, 0, 1);
	const endOfYear = new Date(year, 11, 31);

	// Calculate days from start of year
	const days = Math.floor((eventDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
	const adjustedDay = (startOfYear.getDay() + 6) % 7; // Monday = 0, Sunday = 6

	// Calculate week number
	let weekNumber = Math.ceil((days + adjustedDay + 1) / 7);

	// Handle edge cases for year boundaries

	// If we're in the first week but it has fewer than 4 days of the current year,
	// it belongs to the previous year's last week
	if (weekNumber === 1 && adjustedDay > 3) {
		// This date belongs to the previous year's last week
		const prevYear = year - 1;
		const prevYearEnd = new Date(prevYear, 11, 31);
		return getWeekNumber(prevYearEnd.toISOString().split('T')[0]);
	}

	// Check if we're in the last week of the year
	const endOfYearDay = (endOfYear.getDay() + 6) % 7; // Monday = 0, Sunday = 6
	const daysInLastWeek = endOfYearDay + 1;

	// If the last week has fewer than 4 days, dates in that week belong to next year's week 1
	if (daysInLastWeek < 4) {
		const lastFullWeekStart = new Date(year, 11, 31 - endOfYearDay);
		if (eventDate >= lastFullWeekStart) {
			return 1; // This date belongs to next year's week 1
		}
	}

	return weekNumber;
}

/**
 * Get current and specified number of upcoming week numbers.
 * 
 * If no parameters are provided, returns current and next week numbers.
 * Properly handles year boundary cases by calculating actual dates for each week.
 * 
 * @param weeks - Number of upcoming weeks to include (default: 1)
 * @param date - Optional date to get the week numbers of (default: current date)
 * @returns Array of week numbers starting from current week
 */
export function getWeekNumbers(weeks: number = 1, date?: string): number[] {
	const startDate = date ? new Date(date) : new Date();
	const weekNumbers: number[] = [];

	// Generate week numbers by calculating actual dates for each week
	for (let i = 0; i <= weeks; i++) {
		const currentDate = new Date(startDate);
		currentDate.setDate(startDate.getDate() + (i * 7)); // Add 7 days for each week
		const weekNumber = getWeekNumber(currentDate.toISOString().split('T')[0]);
		weekNumbers.push(weekNumber);
	}

	return weekNumbers;
}

/**
 * Get upcoming week numbers for a given week number, handling year boundaries.
 * 
 * Returns an array containing the current week and next week number(s).
 * When the week is 52 or 53, includes week 1 to handle year boundary crossings.
 * 
 * @param weekNumber - The current week number (1-53)
 * @returns Array of week numbers including current week and next week(s), with duplicates removed
 * 
 * @example
 * getUpcomingWeekNumbers(52) // Returns [52, 53, 1]
 * getUpcomingWeekNumbers(53) // Returns [53, 1]
 * getUpcomingWeekNumbers(10) // Returns [10, 11]
 */
export function getUpcomingWeekNumbers(weekNumber: number): number[] {
	const nextWeekSequential = Math.min(weekNumber + 1, 53);

	// If we're in week 52 or 53, next week might be week 1 of next year
	// Include both to handle year boundary (date filter will ensure correct results)
	if (weekNumber >= 52) {
		return [...new Set([weekNumber, nextWeekSequential, 1])];
	}

	return [weekNumber, nextWeekSequential];
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

/**
 * Format date as YYYY-MM-DD string using local timezone.
 * This avoids timezone issues when converting dates to ISO strings.
 * 
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

