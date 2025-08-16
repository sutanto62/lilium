import { describe, expect, it } from 'vitest';
import {
	calculateEventDate,
	formatDate,
	formatDateRange,
	formatDateWithPattern,
	formatRelativeTime,
	getWeekNumber
} from '../dateUtils';

describe('getWeekNumber', () => {
	it('should return correct week number for a known date', () => {
		// January 1, 2024 (Monday) - Week 1
		expect(getWeekNumber('2024-01-01')).toBe(1);

		// January 7, 2024 (Sunday) - Week 1
		expect(getWeekNumber('2024-01-07')).toBe(1);

		// January 8, 2024 (Monday) - Week 2
		expect(getWeekNumber('2024-01-08')).toBe(2);
	});

	it('should handle year transitions correctly', () => {
		// December 31, 2023 (Sunday) - Week 53
		expect(getWeekNumber('2023-12-31')).toBe(53);

		// January 1, 2024 (Monday) - Week 1
		expect(getWeekNumber('2024-01-01')).toBe(1);
	});

	it('should return current week number when no date is provided', () => {
		const currentWeek = getWeekNumber();
		expect(typeof currentWeek).toBe('number');
		expect(currentWeek).toBeGreaterThan(0);
		expect(currentWeek).toBeLessThanOrEqual(53);
	});

	it('should handle leap years correctly', () => {
		// February 29, 2024 (Thursday) - Week 9
		expect(getWeekNumber('2024-02-29')).toBe(9);
	});

	it('should handle dates in the middle of the year', () => {
		// July 1, 2024 (Monday) - Week 27
		expect(getWeekNumber('2024-07-01')).toBe(27);

		// July 7, 2024 (Sunday) - Week 27
		expect(getWeekNumber('2024-07-07')).toBe(27);

		// July 8, 2024 (Monday) - Week 28
		expect(getWeekNumber('2024-07-08')).toBe(28);
	});
});

describe('calculateEventDate', () => {
	it('should return saturday if submitting event on monday and selected mass day is saturday', () => {
		const createdAt = new Date('2024-09-09');
		const mass = {
			id: 'E1',
			name: 'Event 1',
			church: 'Church 1',
			time: '10:00',
			briefingTime: '08:45',
			sequence: 1,
			code: 'E1',
			day: 'saturday',
			active: 1
		};
		const result = calculateEventDate(createdAt, mass);
		expect(result).toBe('2024-09-14');
	});

	it('should return saturday if submitting event on wednesday and selected mass day is saturday', () => {
		const createdAt = new Date('2024-09-11');
		const mass = {
			id: 'E1',
			name: 'Event 1',
			church: 'Church 1',
			time: '10:00',
			briefingTime: '08:45',
			sequence: 1,
			code: 'E1',
			day: 'saturday',
			active: 1
		};
		const result = calculateEventDate(createdAt, mass);
		expect(result).toBe('2024-09-14');
	});

	it('should return sunday if submitting event on monday and selected mass day is sunday', () => {
		const createdAt = new Date('2024-09-09');
		const mass = {
			id: 'E1',
			name: 'Event 1',
			church: 'Church 1',
			time: '10:00',
			briefingTime: '08:45',
			sequence: 1,
			code: 'E1',
			day: 'sunday',
			active: 1
		};
		const result = calculateEventDate(createdAt, mass);
		expect(result).toBe('2024-09-15');
	});

	it('should return saturday if submitting event on wednesday and selected mass day is sunday', () => {
		const createdAt = new Date('2024-09-11');
		const mass = {
			id: 'E1',
			name: 'Event 1',
			church: 'Church 1',
			time: '10:00',
			briefingTime: '08:45',
			sequence: 1,
			code: 'E1',
			day: 'sunday',
			active: 1
		};
		const result = calculateEventDate(createdAt, mass);
		expect(result).toBe('2024-09-15');
	});
});

describe('formatDate', () => {
	it('should format date with short format', () => {
		const result = formatDate('2024-01-15');
		expect(result).toMatch(/Jan 15/);
	});

	it('should format date with long format', () => {
		const result = formatDate('2024-01-15', 'long');
		expect(result).toMatch(/January 15, 2024/);
	});

	it('should format date with datetime format', () => {
		const result = formatDate('2024-01-15T10:30:00', 'datetime');
		expect(result).toMatch(/Jan 15/);
		expect(result).toMatch(/10:30/);
	});

	it('should format date with time format', () => {
		const result = formatDate('2024-01-15T10:30:00', 'time');
		expect(result).toBe('10:30');
	});

	it('should format date with date format', () => {
		const result = formatDate('2024-01-15', 'date');
		expect(result).toMatch(/Jan 15, 2024/);
	});

	it('should format date with full format', () => {
		const result = formatDate('2024-01-15T10:30:45', 'full');
		expect(result).toMatch(/January 15, 2024/);
		expect(result).toMatch(/10:30:45/);
	});

	it('should format date with iso format', () => {
		const result = formatDate('2024-01-15T10:30:45', 'iso');
		expect(result).toMatch(/01\/15\/2024/);
		expect(result).toMatch(/10:30:45/);
	});

	it('should handle invalid date', () => {
		const result = formatDate('invalid-date');
		expect(result).toBe('Invalid Date');
	});

	it('should format date with custom locale', () => {
		const result = formatDate('2024-01-15', 'long', 'id-ID');
		expect(result).toMatch(/Januari 15, 2024/);
	});
});

describe('formatRelativeTime', () => {
	it('should format recent time correctly', () => {
		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
		const result = formatRelativeTime(oneHourAgo);
		expect(result).toMatch(/hour/);
	});

	it('should format future time correctly', () => {
		const now = new Date();
		const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
		const result = formatRelativeTime(oneDayLater);
		expect(result).toMatch(/day/);
	});

	it('should handle string dates', () => {
		const result = formatRelativeTime('2024-01-01');
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});
});

describe('formatDateRange', () => {
	it('should format date range correctly', () => {
		const result = formatDateRange('2024-01-01', '2024-01-15');
		expect(result).toMatch(/Jan 1/);
		expect(result).toMatch(/Jan 15/);
		expect(result).toContain(' - ');
	});

	it('should handle Date objects', () => {
		const start = new Date('2024-01-01');
		const end = new Date('2024-01-15');
		const result = formatDateRange(start, end);
		expect(result).toMatch(/Jan 1/);
		expect(result).toMatch(/Jan 15/);
	});
});

describe('formatDateWithPattern', () => {
	it('should format with MM/dd/yyyy pattern', () => {
		const result = formatDateWithPattern('2024-01-15', 'MM/dd/yyyy');
		expect(result).toBe('01/15/2024');
	});

	it('should format with dd/MM/yyyy pattern', () => {
		const result = formatDateWithPattern('2024-01-15', 'dd/MM/yyyy');
		expect(result).toBe('15/01/2024');
	});

	it('should format with yyyy-MM-dd pattern', () => {
		const result = formatDateWithPattern('2024-01-15', 'yyyy-MM-dd');
		expect(result).toBe('2024-01-15');
	});

	it('should format with dd MMM yyyy pattern', () => {
		const result = formatDateWithPattern('2024-01-15', 'dd MMM yyyy');
		expect(result).toMatch(/15 Jan 2024/);
	});

	it('should format with dd MMMM yyyy pattern', () => {
		const result = formatDateWithPattern('2024-01-15', 'dd MMMM yyyy');
		expect(result).toMatch(/15 January 2024/);
	});

	it('should handle unknown pattern with default format', () => {
		const result = formatDateWithPattern('2024-01-15', 'unknown-pattern');
		expect(result).toMatch(/01\/15\/2024/);
	});
});
