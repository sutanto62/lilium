import type { EventType } from '$core/entities/Event';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Regional from './Regional.svelte';

describe('Regional', () => {
	const mockMasses = [
		{
			id: 'E1',
			name: 'Event 1',
			church: 'Church 1',
			sequence: 1,
			code: 'E1',
			day: 'saturday',
			mass: 'Mass 1',
			date: '2023-04-15',
			weekNumber: 1,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			type: 'mass' as EventType,
			isComplete: 0,
			active: 1
		},
		{
			id: 'E2',
			name: 'Event 2',
			church: 'Church 2',
			sequence: 2,
			code: 'E2',
			day: 'sunday',
			mass: 'Mass 2',
			date: '2023-04-16',
			weekNumber: 1,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			type: 'mass' as EventType,
			isComplete: 0,
			active: 1
		}
	];
	const mockWilayahs = [
		{ id: 'W1', name: 'Wilayah 1', code: 'W1', sequence: 1, church: 'Church 1' },
		{ id: 'W2', name: 'Wilayah 2', code: 'W2', sequence: 2, church: 'Church 2' }
	];
	const mockLingkungans = [
		{ id: 'L1', name: 'Lingkungan 1', wilayah: 'W1', sequence: 1, church: 'Church 1' },
		{ id: 'L2', name: 'Lingkungan 2', wilayah: 'W1', sequence: 2, church: 'Church 2' },
		{ id: 'L3', name: 'Lingkungan 3', wilayah: 'W2', sequence: 3, church: 'Church 3' }
	];

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2023-04-15'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders correctly with initial state', () => {
		render(Regional, {
			props: {
				events: mockMasses,
				eventsDate: mockMasses.map(m => m.day),
				wilayahs: mockWilayahs,
				lingkungans: mockLingkungans
			}
		});

		expect(screen.getByLabelText('Jadwal Misa')).toBeInTheDocument();
		expect(screen.getByLabelText('Wilayah')).toBeInTheDocument();
		expect(screen.getByLabelText('Lingkungan')).toBeInTheDocument();
	});

	it('updates lingkungan options when wilayah is selected', async () => {
		render(Regional, {
			props: {
				events: mockMasses,
				eventsDate: mockMasses.map(m => m.day),
				wilayahs: mockWilayahs,
				lingkungans: mockLingkungans
			}
		});

		const wilayahSelect = screen.getByLabelText('Wilayah');
		await fireEvent.change(wilayahSelect, { target: { value: 'W1' } });

		const lingkunganSelect = screen.getByLabelText('Lingkungan');
		expect(lingkunganSelect.children.length).toBe(3); // 2 options + default
		expect(screen.getByText('Lingkungan 1')).toBeInTheDocument();
		expect(screen.getByText('Lingkungan 2')).toBeInTheDocument();
		expect(screen.queryByText('Lingkungan 3')).not.toBeInTheDocument();
	});

	it('resets wilayah and lingkungan when event is changed', async () => {
		render(Regional, {
			props: {
				events: mockMasses,
				eventsDate: mockMasses.map(m => m.day),
				wilayahs: mockWilayahs,
				lingkungans: mockLingkungans
			}
		});

		const eventSelect = screen.getByLabelText('Jadwal Misa');
		const wilayahSelect = screen.getByLabelText('Wilayah');
		const lingkunganSelect = screen.getByLabelText('Lingkungan');

		// Select a wilayah and lingkungan
		await fireEvent.change(wilayahSelect, { target: { value: 'W1' } });
		await fireEvent.change(lingkunganSelect, { target: { value: 'L1' } });

		// Change the event
		await fireEvent.change(eventSelect, { target: { value: 'E2' } });

		// Check if wilayah and lingkungan are reset
		expect((wilayahSelect as HTMLSelectElement).value).toBe('');
		expect((lingkunganSelect as HTMLSelectElement).value).toBe('');
	});
});
