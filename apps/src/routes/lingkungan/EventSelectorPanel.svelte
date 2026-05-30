<script lang="ts">
	import type { ChurchEvent } from '$core/entities/Event';
	import {
		addWeeks,
		eachDayOfInterval,
		endOfWeek,
		format,
		isSameDay,
		startOfMonth,
		startOfWeek,
		subWeeks
	} from 'date-fns';

	import { id } from 'date-fns/locale';

	const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

	let {
		events,
		selectedEventId,
		selectedDate,
		filteredEvents,
		onEventSelect,
		onDateSelect
	}: {
		events: ChurchEvent[];
		selectedEventId: string | null;
		selectedDate: Date | null;
		filteredEvents: ChurchEvent[];
		onEventSelect: (id: string) => void;
		onDateSelect: (date: Date) => void;
	} = $props();

	let weekDays = $derived.by(() => {
		const anchor = selectedDate ?? new Date();
		const ws = startOfWeek(anchor, { weekStartsOn: 1 });
		return eachDayOfInterval({ start: ws, end: endOfWeek(ws, { weekStartsOn: 1 }) });
	});

	let selectedEvent = $derived(
		filteredEvents.find((e) => e.id === selectedEventId) ?? filteredEvents[0] ?? null
	);

	let monthLabel = $derived(
		format(startOfMonth(selectedDate ?? new Date()), 'MMM yyyy', { locale: id })
			.replace(/^\w/, (c) => c.toUpperCase())
	);

	function eventsOnDay(day: Date): ChurchEvent[] {
		const dateStr = format(day, 'yyyy-MM-dd');
		return events.filter((e) => e.date === dateStr);
	}

	function handleDayClick(day: Date) {
		onDateSelect(day);
		const dayEvents = eventsOnDay(day);
		if (dayEvents.length > 0) onEventSelect(dayEvents[0].id);
	}

	function goPrevWeek() {
		const anchor = selectedDate ?? new Date();
		const prevWeekStart = startOfWeek(subWeeks(anchor, 1), { weekStartsOn: 1 });
		onDateSelect(prevWeekStart);
		const dateStr = format(prevWeekStart, 'yyyy-MM-dd');
		const first = events.find((e) => e.date === dateStr);
		if (first) onEventSelect(first.id);
	}

	function goNextWeek() {
		const anchor = selectedDate ?? new Date();
		const nextWeekStart = startOfWeek(addWeeks(anchor, 1), { weekStartsOn: 1 });
		onDateSelect(nextWeekStart);
		const dateStr = format(nextWeekStart, 'yyyy-MM-dd');
		const first = events.find((e) => e.date === dateStr);
		if (first) onEventSelect(first.id);
	}
</script>

{#if selectedEvent}
<h2 class="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Titik Tugas, {selectedEvent.description}</h2>
{/if}

<!-- Mobile: horizontal scrollable event chips — one tap to select a mass -->
<div class="lg:hidden">
	{#if events.length > 0}
		<div class="overflow-x-auto pb-1">
			<div class="flex gap-2" role="listbox" aria-label="Pilih jadwal misa">
				{#each events as event}
					{@const eventDate = new Date(event.date)}
					{@const isSelected = selectedEventId === event.id}
					<button
						type="button"
						role="option"
						aria-selected={isSelected}
						onclick={() => { onDateSelect(eventDate); onEventSelect(event.id); }}
						class="flex-shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-400
							{isSelected
								? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
								: 'border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-gray-400 dark:hover:bg-gray-600'}"
					>
						{format(eventDate, 'EEE d/M', { locale: id })}{event.code ? ` · ${event.code}` : ''}
					</button>
				{/each}
			</div>
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada jadwal tersedia</p>
	{/if}
</div>

<!-- Desktop: full week calendar sidebar -->
<div class="hidden lg:block">
	<div class="rounded-xl bg-gray-100 p-4 dark:bg-gray-800">
		<!-- Month navigation -->
		<div class="mb-4 flex items-center justify-center gap-1">
			<button
				type="button"
				onclick={goPrevWeek}
				aria-label="Minggu sebelumnya"
				class="rounded p-1 text-gray-500 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus-visible:ring-gray-400"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<h3 class="text-base font-semibold text-gray-900 dark:text-white">{monthLabel}</h3>
			<button
				type="button"
				onclick={goNextWeek}
				aria-label="Minggu berikutnya"
				class="rounded p-1 text-gray-500 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus-visible:ring-gray-400"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>

		<!-- Week day grid -->
		<div class="mb-5 grid grid-cols-7 gap-1" role="group" aria-label="Pilih tanggal">
			{#each weekDays as day, i}
				{@const dayEvents = eventsOnDay(day)}
				{@const isSelected = selectedDate ? isSameDay(day, selectedDate) : false}
				<button
					type="button"
					onclick={() => handleDayClick(day)}
					aria-pressed={isSelected}
					aria-label="{format(day, 'EEEE d MMMM yyyy', { locale: id })}"
					class="flex flex-col items-center rounded-lg py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-400
						{isSelected
							? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
							: 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'}"
				>
					<span class="text-[10px] font-semibold uppercase tracking-wide
						{isSelected ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}">
						{DAY_LABELS[i]}
					</span>
					<span class="mt-1 text-base font-semibold leading-none">{format(day, 'd')}</span>
					{#if dayEvents.length > 0}
						<span
							class="mt-1.5 h-1.5 w-1.5 rounded-full {isSelected ? 'bg-white dark:bg-gray-900' : 'bg-gray-400 dark:bg-gray-500'}"
							aria-hidden="true"
						></span>
					{:else}
						<span class="mt-1.5 h-1.5 w-1.5" aria-hidden="true"></span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Event pills -->
		{#if filteredEvents.length > 0}
			<div class="mb-3 flex flex-wrap gap-2" role="listbox" aria-label="Pilih jadwal misa">
				{#each filteredEvents as event}
					<button
						type="button"
						role="option"
						aria-selected={selectedEventId === event.id}
						onclick={() => onEventSelect(event.id)}
						class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-400
							{selectedEventId === event.id
								? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
								: 'border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-gray-400 dark:hover:bg-gray-600'}"
					>
						{event.code ?? event.description ?? '—'}
					</button>
				{/each}
			</div>
		{:else if selectedDate}
			<p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada jadwal untuk tanggal ini</p>
		{:else}
			<p class="text-sm text-gray-500 dark:text-gray-400">Pilih tanggal untuk melihat jadwal</p>
		{/if}
	</div>
</div>
