import { expect, describe, it } from 'vitest';
import { calculateEventDate } from './dateUtils';

describe('calculateEventDate', () => {
	it('should return saturday if submitting event on monday and selected mass day is saturday', () => {
		const createdAt = new Date('2024-09-09');
		const mass = {
			id: 'E1',
			name: 'Event 1',
			church: 'Church 1',
			sequence: 1,
			code: 'E1',
			day: 'saturday'
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
			sequence: 1,
			code: 'E1',
			day: 'saturday'
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
			sequence: 1,
			code: 'E1',
			day: 'sunday'
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
			sequence: 1,
			code: 'E1',
			day: 'sunday'
		};
		const result = calculateEventDate(createdAt, mass);
		expect(result).toBe('2024-09-15');
	});
});
