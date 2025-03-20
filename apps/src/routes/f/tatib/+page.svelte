<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { Button, Alert } from 'flowbite-svelte';
	import { FloppyDiskSolid, ClipboardCleanSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';

	// Utils
	import { featureFlags } from '$lib/utils/FeatureFlag';

	// Components
	import type { Usher } from '$core/entities/Schedule';
	import UshersList from './UshersList.svelte';
	import Regional from '$components/Regional.svelte';

	// Props
	export let data: PageData;
	export let form: ActionData;

	// Data
	let selectedMassId: string | null = null;
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
	let currentDay: number;

	// Show/hide form
	$: isFeatureEnabled = featureFlags.isEnabled('no_saturday_sunday');
	$: isWeekend = [0, 5, 6].includes(currentDay);
	$: showForm = isFeatureEnabled ? !isWeekend : true;

	// Disabled submit button
	let isUshersValid: boolean = false;
	// $: isSubmitDisable = false;
	$: isSubmitDisable =
		!isUshersValid ||
		selectedMassId == null ||
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
	<h1 class="mb-6 text-xl font-semibold">{data.church.name} Konfirmasi Petugas Tata Tertib</h1>
	<form method="POST" class="mb-6">
		<input type="hidden" name="churchId" value={data.church.id} />
		<input type="hidden" name="massId" value={selectedMassId || ''} />
		<input type="hidden" name="wilayahId" value={selectedWilayahId || ''} />
		<input type="hidden" name="lingkunganId" value={selectedLingkunganId || ''} />
		<input type="hidden" name="ushers" value={JSON.stringify(ushers)} />

		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<section class="rounded-lg border bg-white p-6 md:col-span-1">
				<Regional
					masses={data.masses}
					wilayahs={data.wilayahs}
					lingkungans={data.lingkungans}
					bind:selectedMassId
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
