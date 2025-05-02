import { describe, it, expect } from 'vitest';
import { getWeekNumber } from '../dateUtils';

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