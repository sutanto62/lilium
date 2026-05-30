<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { ChurchEvent } from '$core/entities/Event';
	import type { UsherResponse } from '$core/entities/Usher';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import EventSelectorPanel from './EventSelectorPanel.svelte';
	import PetunjukModal from './PetunjukModal.svelte';
	import UsherDutyTable from './UsherDutyTable.svelte';

	let { data, form } = $props();
	let isLoading = $state(false);
	let formElement: HTMLFormElement;
	let showPetunjukModal = $state(false);
	let events = $derived<ChurchEvent[]>(data.events ?? []);
	let filterValue = $state<string>('');

	// Calendar state — pre-seed from first event so filteredEvents is scoped on first render
	let selectedDate = $state<Date | null>(
		data.events?.[0]?.date ? new Date(data.events[0].date) : null
	);
	let filteredEvents = $derived(
		selectedDate
			? events.filter((e) => new Date(e.date).toDateString() === selectedDate!.toDateString())
			: []
	);
	let selectedEventId = $state<string | null>(null);
	let selectedEvent = $derived(
		events.length > 0
			? events.find((e: ChurchEvent) => e.id === selectedEventId) || events[0] || null
			: null
	);

	// Ushers — only show after a form submission completes for the current selection
	let shouldShowUshers = $state(false);
	let ushers = $derived(shouldShowUshers ? (form?.ushers ?? []) : []);
	let lingkungans: string[] = $derived(
		Array.from(
			new Set(
				ushers
					.map((u: UsherResponse) => u.lingkungan)
					.filter((l: string | null | undefined): l is string => !!l)
			)
		)
	);
	let groupedUshers = $derived.by(() => {
		if (ushers.length === 0) return [];

		const groups = new Map<
			string,
			{ lingkungan: string; wilayah: string; ushers: UsherResponse[]; isOpen: boolean }
		>();

		ushers.forEach((usher: UsherResponse) => {
			const key = `${usher.wilayah}-${usher.lingkungan}`;
			if (!groups.has(key)) {
				groups.set(key, {
					lingkungan: usher.lingkungan || '',
					wilayah: usher.wilayah || '',
					ushers: [],
					isOpen: true
				});
			}
			groups.get(key)!.ushers.push(usher);
		});

		const sorted = Array.from(groups.values()).sort(
			(a, b) => a.wilayah.localeCompare(b.wilayah) || a.lingkungan.localeCompare(b.lingkungan)
		);

		return filterValue === '' ? sorted : sorted.filter((g) => g.lingkungan.includes(filterValue));
	});

	$effect(() => {
		if (events.length > 0 && !selectedEventId) {
			selectedEventId = events[0].id;
			selectedDate = new Date(events[0].date);
			handleEventSelect(selectedEventId);
		}
	});

	// Track empty states
	$effect(() => {
		if (events.length === 0) {
			tracker.track('lingkungan_titik_tugas_empty_events', { has_selected_date: !!selectedDate }, page.data.session, page);
		}
		if (selectedDate && filteredEvents.length === 0 && events.length > 0) {
			tracker.track('lingkungan_titik_tugas_empty_filtered', { selected_date: selectedDate.toISOString(), total_events: events.length }, page.data.session, page);
		}
		if (selectedEventId && ushers.length === 0 && !isLoading && form?.success !== false) {
			tracker.track('lingkungan_titik_tugas_empty_ushers', { event_id: selectedEventId, has_events: events.length > 0 }, page.data.session, page);
		}
		if (filterValue && groupedUshers.length === 0 && ushers.length > 0) {
			tracker.track('lingkungan_titik_tugas_empty_filter', {
				filter: filterValue,
				total_ushers: ushers.length,
				total_groups: Array.from(new Set(ushers.map((u: UsherResponse) => `${u.wilayah}-${u.lingkungan}`))).length
			}, page.data.session, page);
		}
	});

	async function handleEventSelect(eventId: string) {
		const previousEventId = selectedEventId;
		selectedEventId = eventId;

		const selected = events.find((e) => e.id === eventId);
		await Promise.all([
			statsigService.logEvent('lingkungan_titik_tugas_event_select', 'event', data.session || undefined, {
				event_id: eventId,
				previous_event_id: previousEventId || null,
				event_date: selected?.date || null,
				event_description: selected?.description || null
			}),
			tracker.track('lingkungan_titik_tugas_event_select', { event_id: eventId, previous_event_id: previousEventId || null }, page.data.session, page)
		]);

		if (formElement && selectedEventId) {
			const input = formElement.querySelector('input[name="eventId"]') as HTMLInputElement;
			if (input) input.value = selectedEventId;
			formElement.requestSubmit();
		}
	}

	async function handleDateSelect(date: Date) {
		const previousDate = selectedDate;
		selectedDate = date;
		shouldShowUshers = false;
		await Promise.all([
			statsigService.logEvent('lingkungan_titik_tugas_date_select', 'date', data.session || undefined, {
				date: date.toISOString(),
				previous_date: previousDate?.toISOString() || null,
				filtered_events_count: filteredEvents.length,
				total_events: events.length
			}),
			tracker.track('lingkungan_titik_tugas_date_select', { date: date.toISOString(), filtered_events_count: filteredEvents.length }, page.data.session, page)
		]);
	}

	async function handleFilterChange(filter: string) {
		const previousFilter = filterValue;
		filterValue = filter;
		await Promise.all([
			statsigService.logEvent('lingkungan_titik_tugas_filter', 'change', data.session || undefined, {
				previous_filter: previousFilter || 'all',
				new_filter: filter || 'all',
				filtered_groups_count: groupedUshers.length,
				total_ushers: ushers.length,
				lingkungans_count: lingkungans.length
			}),
			tracker.track('lingkungan_titik_tugas_filter_change', { previous_filter: previousFilter || 'all', new_filter: filter || 'all' }, page.data.session, page)
		]);
	}

	async function handlePetunjukOpen() {
		showPetunjukModal = true;
		await tracker.track('lingkungan_titik_tugas_petunjuk_open', { event_id: selectedEventId || null, has_selected_event: !!selectedEventId }, page.data.session, page);
	}
</script>

<form
	method="POST"
	bind:this={formElement}
	use:enhance={() => {
		isLoading = true;
		return async ({ update }) => {
			await update();
			isLoading = false;
			shouldShowUshers = true;
		};
	}}
>
	<input type="hidden" name="eventId" bind:value={selectedEventId} />
</form>

<div class="grid w-full gap-4 lg:gap-6 lg:grid-cols-[280px_1fr]">
	<aside aria-label="Pilih jadwal misa">
		<EventSelectorPanel
			{events}
			{selectedEventId}
			{selectedDate}
			{filteredEvents}
			onEventSelect={handleEventSelect}
			onDateSelect={handleDateSelect}
		/>
	</aside>

	<main aria-label="Daftar titik tugas">
		<UsherDutyTable
			{selectedEvent}
			{lingkungans}
			{groupedUshers}
			{filterValue}
			{ushers}
			{isLoading}
			formSuccess={form?.success}
			formError={form?.error}
			onFilterChange={handleFilterChange}
			onPetunjukOpen={handlePetunjukOpen}
		/>
	</main>
</div>

<PetunjukModal bind:open={showPetunjukModal} briefingTime={selectedEvent?.briefingTime} />
