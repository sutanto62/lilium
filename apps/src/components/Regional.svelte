<script lang="ts">
	import type { ChurchEvent } from '$core/entities/Event';
	import type { Lingkungan, Wilayah } from '$core/entities/Schedule';
	import { Label, Select } from 'flowbite-svelte';
	import { onMount } from 'svelte';

	// Props
	export let events: ChurchEvent[];
	export let eventsDate: string[];
	export let wilayahs: Wilayah[];
	export let lingkungans: Lingkungan[];

	export let selectedEventDate: string | null = null;
	export let selectedEventId: string | null = null;
	export let selectedWilayahId: string | null = null;
	export let selectedLingkunganId: string | null = null;

	// Local variables
	let currentDate: string;

	// Filter events by selected date
	$: filteredEvents = selectedEventDate
		? events.filter((events) => events.date === selectedEventDate)
		: [];

	// Filter lingkungan based on selected wilayah
	$: filteredLingkungans = selectedWilayahId
		? lingkungans.filter((l) => l.wilayah === selectedWilayahId)
		: [];

	// Reset selectedLingkungan when selectedWilayah changes
	// $: if (selectedWilayahId !== null) {
	// 	selectedLingkunganId = null;
	// }

	// $: if (selectedEventDate) {
	// 	selectedEventId = events.find((event) => event.date === selectedEventDate)?.id || null;
	// }

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
			items={eventsDate.map((date) => ({
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
			items={filteredEvents.map((e) => ({ value: e.id, name: `${e.description}` }))}
			bind:value={selectedEventId}
		/>
	</Label>

	{#if events && events.length > 0}
		<Label class="text-md font-normal">
			Wilayah
			<Select
				class="mt-2"
				id="select-wilayah"
				items={wilayahs.map((e) => ({ value: e.id, name: e.name }))}
				bind:value={selectedWilayahId}
			/>
		</Label>

		<Label class="text-md font-normal">
			Lingkungan
			<Select
				class="mt-2"
				id="select-lingkungan"
				items={filteredLingkungans.map((e) => ({ value: e.id, name: e.name }))}
				bind:value={selectedLingkunganId}
			/>
		</Label>
	{/if}
</div>
