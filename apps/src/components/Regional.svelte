<script lang="ts">
	import { Label, Select } from 'flowbite-svelte';

	import type { Mass, Wilayah, Lingkungan } from '$core/entities/schedule';

	// Props
	export let masses: Mass[];
	export let wilayahs: Wilayah[];
	export let lingkungans: Lingkungan[];
	export let selectedMassId: string | null = null;
	export let selectedWilayahId: string | null = null;
	export let selectedLingkunganId: string | null = null;

	// Filter lingkungan based on selected wilayah
	$: filteredLingkungans = selectedWilayahId
		? lingkungans.filter((l) => l.wilayah === selectedWilayahId)
		: [];

	// Reset selectedLingkungan when selectedWilayah changes
	$: if (selectedWilayahId !== null) {
		selectedLingkunganId = null;
	}

	// Reset selectedWilayah and selectedLingkungan when selectedEvent changes
	$: if (selectedMassId !== null) {
		selectedWilayahId = null;
		selectedLingkunganId = null;
	}

	import { onMount } from 'svelte';

	let currentDate: string;

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
	<caption class="text-left text-lg font-semibold">
		Pilih Jadwal
		<p class="mt-1 text-sm font-normal">{currentDate}</p>
	</caption>
	<Label class="text-md font-normal">
		Jadwal Misa
		<Select
			class="mt-2"
			id="select-event"
			items={masses.map((e) => ({ value: e.id, name: `${e.code} - ${e.name}` }))}
			bind:value={selectedMassId}
		/>
	</Label>
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
</div>
