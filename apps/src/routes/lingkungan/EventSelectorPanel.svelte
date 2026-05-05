<script lang="ts">
	import type { ChurchEvent } from '$core/entities/Event';
	import LightweightCalendar from '$src/lib/components/LightweightCalendar.svelte';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import { Card } from 'flowbite-svelte';

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

	const heading = $derived(
		selectedDate ? `Misa ${formatDate(selectedDate.toISOString(), 'date')}` : 'Misa Minggu Ini'
	);
</script>

<!-- Mobile -->
<div class="rounded-xl bg-gray-100 p-4 lg:hidden">
	<h2 class="mb-4 text-xl font-light">{heading}</h2>

	<LightweightCalendar
		{events}
		{selectedEventId}
		initialSelectedDate={selectedDate}
		onEventSelect={onEventSelect}
		onDateSelect={onDateSelect}
	/>

	{#if filteredEvents.length > 0}
		<div class="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
			{#each filteredEvents as event}
				<button
					type="button"
					class="w-full rounded-lg border-2 bg-white px-4 py-3 text-left transition-colors {selectedEventId === event.id
						? 'border-amber-500'
						: 'border-transparent hover:border-gray-300'}"
					onclick={() => onEventSelect(event.id)}
				>
					<p class="text-sm font-medium text-gray-900">{event.description}</p>
					<p class="text-xs font-light text-gray-500">{formatDate(event.date, 'date')}</p>
				</button>
			{/each}
		</div>
	{:else}
		<p class="mt-2 text-sm font-light text-gray-500 dark:text-gray-400">
			{selectedDate ? 'Tidak ada jadwal untuk tanggal ini' : 'Jadwal tidak ditemukan'}
		</p>
	{/if}
</div>

<!-- Desktop -->
<div class="hidden rounded-xl bg-gray-100 p-4 sm:p-6 md:p-8 lg:col-span-2 lg:block">
	<h2 class="mb-4 text-xl font-light">{heading}</h2>
	<p class="mb-4 text-sm font-light text-gray-500 dark:text-gray-400">Pilih tanggal misa</p>

	<LightweightCalendar
		{events}
		{selectedEventId}
		initialSelectedDate={selectedDate}
		onEventSelect={onEventSelect}
		onDateSelect={onDateSelect}
	/>

	{#if filteredEvents.length > 0}
		{#each filteredEvents as event}
			<Card
				class={`mb-4 cursor-pointer border-4 bg-white p-4 sm:p-4 md:p-4 ${selectedEventId === event.id ? 'border-amber-500' : 'border-white'}`}
				shadow="lg"
				id={event.id}
				onclick={() => onEventSelect(event.id)}
				onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && onEventSelect(event.id)}
				tabindex={0}
				role="button"
				aria-label="Select event: {event.description}"
			>
				<h2 class="text-xl font-light tracking-tight text-gray-900 dark:text-white">
					{event.description}
				</h2>
				<p class="text-sm font-light text-gray-500 dark:text-gray-400">
					{formatDate(event.date, 'date')}
				</p>
			</Card>
		{/each}
	{:else}
		<div class="py-8 text-center">
			<p class="text-sm font-light text-gray-500 dark:text-gray-400">
				{selectedDate ? 'Jadwal sudah selesai/belum dibuka' : 'Jadwal tidak ditemukan'}
			</p>
		</div>
	{/if}
</div>
