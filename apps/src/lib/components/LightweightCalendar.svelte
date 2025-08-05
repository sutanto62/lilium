<script lang="ts">
	import type { Event as ChurchEvent } from '$core/entities/Event';
	import {
		addMonths,
		eachDayOfInterval,
		endOfMonth,
		endOfWeek,
		format,
		isSameDay,
		isSameMonth,
		isToday,
		startOfMonth,
		startOfWeek,
		subMonths
	} from 'date-fns';
	import { id } from 'date-fns/locale';
	import { Button } from 'flowbite-svelte';
	import { ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';

	// Props
	let {
		events = [],
		selectedEventId = null,
		initialSelectedDate = null,
		onEventSelect = undefined,
		onDateSelect = undefined,
		compact = false
	} = $props<{
		events?: ChurchEvent[];
		selectedEventId?: string | null;
		initialSelectedDate?: Date | null;
		onEventSelect?: ((eventId: string) => void) | undefined;
		onDateSelect?: ((date: Date) => void) | undefined;
		compact?: boolean;
	}>();

	// Calendar state
	let currentDate = $state(new Date());
	let selectedDate = $state<Date | null>(null);
	let currentMonth = $derived(startOfMonth(currentDate));
	let calendarDays = $derived(generateCalendarDays());

	// Set initial selected date when component loads
	$effect(() => {
		if (initialSelectedDate && !selectedDate) {
			selectedDate = initialSelectedDate;
			// Also set current date to the month of the selected date
			currentDate = initialSelectedDate;
		}
	});

	// Generate calendar days using date-fns
	function generateCalendarDays() {
		const start = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Monday start
		const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

		return eachDayOfInterval({ start, end }).map((date) => ({
			date,
			isCurrentMonth: isSameMonth(date, currentMonth),
			isToday: isToday(date),
			isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
			events: getEventsForDate(date)
		}));
	}

	function getEventsForDate(date: Date): ChurchEvent[] {
		const dateString = format(date, 'yyyy-MM-dd');
		return events.filter((event: ChurchEvent) => event.date === dateString);
	}

	function previousMonth() {
		currentDate = subMonths(currentDate, 1);
	}

	function nextMonth() {
		currentDate = addMonths(currentDate, 1);
	}

	function goToToday() {
		currentDate = new Date();
	}

	function handleDayClick(day: { date: Date; events: ChurchEvent[] }) {
		selectedDate = day.date;
		if (onDateSelect) {
			onDateSelect(day.date);
		}
		if (day.events.length > 0 && onEventSelect) {
			onEventSelect(day.events[0].id);
		}
	}

	function handleEventClick(event: ChurchEvent, eventClick: Event) {
		eventClick.stopPropagation();
		if (onEventSelect) {
			onEventSelect(event.id);
		}
	}
</script>

<div class="calendar-container {compact ? 'compact' : ''} mb-4">
	<!-- Calendar Header -->
	{#if !compact}
		<div class="calendar-header mb-4 flex flex-col items-center justify-between">
			<div class="flex items-center space-x-2">
				<Button size="sm" color="alternative" onclick={previousMonth}>
					<ChevronLeftOutline class="h-4 w-4" />
				</Button>
				<span>
					<h3 class="text-sm font-light text-gray-900 dark:text-white">
						{format(currentMonth, 'MMMM yyyy', { locale: id })}
					</h3>
				</span>
				<Button size="sm" color="alternative" onclick={nextMonth}>
					<ChevronRightOutline class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}

	<!-- Calendar Grid -->
	<div class="calendar-grid">
		<!-- Weekday Headers -->
		<div class="calendar-weekdays mb-2 grid grid-cols-7 gap-1">
			{#each ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as weekday}
				<div
					class="calendar-weekday p-2 text-center text-sm font-light text-gray-500 dark:text-gray-400 {compact
						? 'p-1 text-xs'
						: ''}"
				>
					{weekday}
				</div>
			{/each}
		</div>

		<!-- Calendar Days -->
		<div class="calendar-days grid grid-cols-7">
			{#each calendarDays as day}
				<div
					class="calendar-day cursor-pointer p-2 transition-colors {day.isSelected
						? 'bg-amber-500 text-white'
						: day.isCurrentMonth
							? 'bg-white dark:bg-gray-800'
							: 'bg-gray-50 dark:bg-gray-900'} {day.events.length > 0 && !day.isSelected
						? 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
						: !day.isSelected
							? 'hover:bg-gray-50 dark:hover:bg-gray-700'
							: ''} {compact ? 'p-1' : ''}"
					onclick={() => handleDayClick(day)}
					onkeydown={(e) => e.key === 'Enter' && handleDayClick(day)}
					tabindex="0"
					role="button"
					aria-label="Select date {format(day.date, 'MMMM d, yyyy')}"
				>
					<div
						class="calendar-day-header mb-1 flex items-start justify-between dark:border-gray-700 {compact
							? 'mb-0.5'
							: ''}"
					>
						<span
							class="text-sm font-medium {day.isCurrentMonth
								? 'text-gray-900 dark:text-white'
								: 'text-gray-400 dark:text-gray-500'} {day.isSelected ? 'text-white' : ''} {compact
								? 'text-xs'
								: ''} {compact && day.isToday ? 'h-5 w-5' : ''}"
						>
							{format(day.date, 'd')}
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.calendar-container {
		@apply rounded-xl bg-white p-3 shadow-lg dark:bg-gray-800;
		max-height: none;
		overflow-y: visible;
	}

	.calendar-container.compact {
		@apply p-2;
		max-height: 400px;
	}

	.calendar-container.compact .calendar-days.grid > .calendar-day {
		min-height: 35px;
	}

	.calendar-container.compact .calendar-weekdays {
		@apply mb-1;
	}

	.calendar-grid {
		@apply w-full;
	}

	.calendar-weekdays {
		@apply border-b border-gray-200 dark:border-gray-700;
	}

	.calendar-day {
		@apply relative;
	}

	.calendar-days.grid > .calendar-day {
		border: none;
		border-left: 1px solid #e0e0e0;
		border-top: 1px solid #e0e0e0;
		min-height: 50px;
	}

	.calendar-days.grid > .calendar-day:nth-child(7n) {
		border-right: 1px solid #e0e0e0;
	}

	.calendar-days.grid > .calendar-day:nth-last-child(-n + 7) {
		border-bottom: 1px solid #e0e0e0;
	}

	.calendar-day:hover {
		@apply z-10;
	}

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.calendar-container {
			@apply p-2;
		}

		.calendar-day {
			@apply min-h-[50px] p-0.5;
		}
	}
</style>
