<script lang="ts">
	import { Alert, Button } from 'flowbite-svelte';
	import { ClipboardCleanSolid, FloppyDiskSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import type { ActionData, PageData } from './$types';
	// Utils
	import { featureFlags } from '$lib/utils/FeatureFlag';

	// Components
	import Regional from '$components/Regional.svelte';
	import type { Usher } from '$core/entities/Schedule';
	import UshersList from './UshersList.svelte';

	// Props
	export let data: PageData;
	export let form: ActionData;

	// Data
	let selectedEventId: string | null = null;
	let selectedWilayahId: string | null = null;
	let selectedLingkunganId: string | null = null;
	let ushers: Usher[] = [
		{
			name: '',
			isPpg: false,
			isKolekte: false,
			sequence: 0
		}
	];

	// Display form only on weekdays
	let currentDay: number;
	$: showForm = [1, 2, 3, 4].includes(currentDay) || !featureFlags.isEnabled('no_saturday_sunday');

	// Disabled submit button
	let isUshersValid: boolean = false;
	$: isSubmitDisable =
		!isUshersValid ||
		selectedEventId == null ||
		selectedWilayahId == null ||
		selectedLingkunganId == null;

	onMount(() => {
		currentDay = new Date().getDay();
	});

	// TODO: bump to navigator.clipboard
	async function copyToClipboard(id: string) {
		const element = document.getElementById(id);
		if (element) {
			try {
				await navigator.clipboard.writeText(element.innerText);
			} catch (error) {
				console.error('Failed to copy text: ', error);
			}
		}
	}
</script>

<svelte:head>
	<title>Konfirmasi Tatib</title>
	<meta name="description" content="LIS" />
</svelte:head>

<!-- On error  -->
{#if form?.error}
	<Alert color="red" class="mb-4">
		<span class="font-medium">Error:</span>
		{form?.error}
	</Alert>
{/if}

<!-- On success -->
{#if form?.success}
	<Alert color="green" class="mb-4">
		<div id="copy-usher">
			<span class="font-medium">Terima kasih!: </span>
			Berikut adalah petugas tata tertib yang telah dikonfirmasi:
			{#if form?.json.ushers.length === 0}
				<p>Hubungi admin untuk penentuan posisi petugas secara manual.</p>
			{:else}
				<ol class="list-inside list-none">
					{#each form?.json.ushers as usher}
						<li>- {usher.name} (<strong>{usher.positionName}</strong>)</li>
					{/each}
				</ol>
			{/if}
		</div>
		<Button color="blue" class="mt-4" on:click={() => copyToClipboard('copy-usher')}>
			<ClipboardCleanSolid class="mr-2 h-5 w-5" />
			Salin ke Clipboard
		</Button>
	</Alert>
{/if}

{#if showForm}
	<h1 class="mb-6 text-xl font-semibold">Konfirmasi Petugas Tata Tertib</h1>
	<form method="POST" class="mb-6">
		<input type="hidden" name="churchId" value={data.church.id} />
		<input type="hidden" name="eventId" value={selectedEventId || ''} />
		<input type="hidden" name="wilayahId" value={selectedWilayahId || ''} />
		<input type="hidden" name="lingkunganId" value={selectedLingkunganId || ''} />
		<input type="hidden" name="ushers" value={JSON.stringify(ushers)} />

		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<section class="rounded-lg border bg-white p-6 md:col-span-1">
				<Regional
					eventsDate={data.eventsDate}
					events={data.events}
					wilayahs={data.wilayahs}
					lingkungans={data.lingkungans}
					bind:selectedEventId
					bind:selectedWilayahId
					bind:selectedLingkunganId
				/>
			</section>
			<section class="rounded-lg border bg-white p-6 md:col-span-3">
				<UshersList bind:ushers bind:isSubmitable={isUshersValid} />
			</section>
		</div>
		<div class="flex justify-end gap-4 px-0 py-4">
			<Button type="submit" id="save-button" color="primary" disabled={isSubmitDisable}>
				<FloppyDiskSolid class="mr-2" />Simpan
			</Button>
		</div>
	</form>
{:else}
	<h2 class="mb-6 text-2xl font-bold">Pendaftaran Petugas Tata Tertib Telah Ditutup</h2>
	<p>Konfirmasi Tata Tertib hanya pada hari Senin s/d Kamis.</p>
{/if}
