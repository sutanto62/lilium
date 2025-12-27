<script lang="ts">
	import { page } from '$app/state';
	import type { ChurchEvent } from '$core/entities/Event';
	import type { Lingkungan, Wilayah } from '$core/entities/Schedule';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import { Label, Select } from 'flowbite-svelte';
	import { onMount } from 'svelte';

	// Props
	let {
		events,
		eventsDate,
		wilayahs,
		lingkungans,
		selectedEventDate = $bindable<string | null>(),
		selectedEventId = $bindable<string | null>(),
		selectedWilayahId = $bindable<string | null>(),
		selectedLingkunganId = $bindable<string | null>()
	} = $props<{
		events: ChurchEvent[];
		eventsDate: string[];
		wilayahs: Wilayah[];
		lingkungans: Lingkungan[];
		selectedEventDate?: string | null;
		selectedEventId?: string | null;
		selectedWilayahId?: string | null;
		selectedLingkunganId?: string | null;
	}>();

	// Local variables
	let currentDate = $state<string>('');

	// Filter events by selected date
	const filteredEvents = $derived(
		selectedEventDate ? events.filter((event: ChurchEvent) => event.date === selectedEventDate) : []
	);

	// Filter lingkungan based on selected wilayah
	const filteredLingkungans = $derived(
		selectedWilayahId ? lingkungans.filter((l: Lingkungan) => l.wilayah === selectedWilayahId) : []
	);

	// Track date selection changes
	$effect(() => {
		if (selectedEventDate) {
			const selectedEvent = events.find((e: ChurchEvent) => e.date === selectedEventDate);
			const filteredCount = filteredEvents.length;

			const metadata = {
				selected_date: selectedEventDate,
				filtered_events_count: filteredCount,
				available_dates_count: eventsDate.length
			};

			Promise.all([
				statsigService.logEvent(
					'tatib_regional_date_select',
					'select',
					page.data.session || undefined,
					metadata
				),
				tracker.track(
					'tatib_regional_date_select',
					{
						event_type: 'date_selection',
						...metadata
					},
					page.data.session,
					page
				)
			]).catch(() => {
				// Silently handle tracking errors
			});
		}
	});

	// Track event/mass selection changes
	$effect(() => {
		if (selectedEventId) {
			const selectedEvent = events.find((e: ChurchEvent) => e.id === selectedEventId);
			const selectedDate = selectedEvent?.date;

			const metadata = {
				event_id: selectedEventId,
				event_date: selectedDate,
				mass: selectedEvent?.mass,
				available_events_count: filteredEvents.length
			};

			Promise.all([
				statsigService.logEvent(
					'tatib_regional_event_select',
					'select',
					page.data.session || undefined,
					metadata
				),
				tracker.track(
					'tatib_regional_event_select',
					{
						event_type: 'event_selection',
						...metadata
					},
					page.data.session,
					page
				)
			]).catch(() => {
				// Silently handle tracking errors
			});
		}
	});

	// Track wilayah selection changes
	$effect(() => {
		if (selectedWilayahId) {
			const selectedWilayah = wilayahs.find((w: Wilayah) => w.id === selectedWilayahId);
			const filteredCount = filteredLingkungans.length;

			const metadata = {
				wilayah_id: selectedWilayahId,
				wilayah_name: selectedWilayah?.name,
				filtered_lingkungans_count: filteredCount,
				total_wilayahs_count: wilayahs.length
			};

			Promise.all([
				statsigService.logEvent(
					'tatib_regional_wilayah_select',
					'select',
					page.data.session || undefined,
					metadata
				),
				tracker.track(
					'tatib_regional_wilayah_select',
					{
						event_type: 'wilayah_selection',
						...metadata
					},
					page.data.session,
					page
				)
			]).catch(() => {
				// Silently handle tracking errors
			});
		}
	});

	// Track lingkungan selection changes
	$effect(() => {
		if (selectedLingkunganId) {
			const selectedLingkungan = lingkungans.find((l: Lingkungan) => l.id === selectedLingkunganId);

			const metadata = {
				lingkungan_id: selectedLingkunganId,
				lingkungan_name: selectedLingkungan?.name,
				wilayah_id: selectedWilayahId,
				available_lingkungans_count: filteredLingkungans.length
			};

			Promise.all([
				statsigService.logEvent(
					'tatib_regional_lingkungan_select',
					'select',
					page.data.session || undefined,
					metadata
				),
				tracker.track(
					'tatib_regional_lingkungan_select',
					{
						event_type: 'lingkungan_selection',
						...metadata
					},
					page.data.session,
					page
				)
			]).catch(() => {
				// Silently handle tracking errors
			});
		}
	});

	onMount(() => {
		const now = new Date();
		currentDate = now.toLocaleDateString('id-ID', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	});
</script>

<div class="mb-6 grid gap-6 md:grid-cols-1">
	<div class="text-left text-lg font-semibold">
		Pilih Jadwal
		<p class="mt-1 text-sm font-normal">Hari ini: {currentDate}</p>
	</div>

	<Label class="text-md font-normal">
		Tanggal
		<Select
			class="mt-2"
			id="select-date"
			items={eventsDate.map((date: string) => ({
				value: date,
				name: new Date(date).toLocaleDateString('id-ID', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			}))}
			bind:value={selectedEventDate}
			placeholder="Pilih tanggal tugas"
		/>
	</Label>

	<Label class="text-md font-normal">
		Misa
		<Select
			class="mt-0"
			id="select-feast"
			items={filteredEvents.map((e: ChurchEvent) => ({ value: e.id, name: `${e.description}` }))}
			bind:value={selectedEventId}
		/>
	</Label>

	{#if events && events.length > 0}
		<Label class="text-md font-normal">
			Wilayah
			<Select
				class="mt-2"
				id="select-wilayah"
				items={wilayahs.map((e: Wilayah) => ({ value: e.id, name: e.name }))}
				bind:value={selectedWilayahId}
			/>
		</Label>

		<Label class="text-md font-normal">
			Lingkungan
			<Select
				class="mt-2"
				id="select-lingkungan"
				items={filteredLingkungans.map((e: Lingkungan) => ({ value: e.id, name: e.name }))}
				bind:value={selectedLingkunganId}
			/>
		</Label>
	{/if}
</div>
