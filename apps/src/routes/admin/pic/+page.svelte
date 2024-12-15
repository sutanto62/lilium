<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { Heading, Hr, Button, Alert } from 'flowbite-svelte';
	import { FloppyDiskSolid, ClipboardCleanSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import Tags from 'svelte-tags-input';

	// Utils
	import { featureFlags } from '$lib/utils/FeatureFlag';

	// Components
	import Regional from '$components/Regional.svelte';

	// Props
	export let data: PageData;
	// export let form: ActionData;

	// Data
	let selectedMassId: string | null = null;
	let currentDay: number;
	let selectedDate: Date = new Date();
	let picPeta: string[] = ['Virginia', 'Irwan', 'Julianto', 'Agus', 'Liawati'];
	let picPetaAssigned: string[] = [];

	// Show/hide form
	$: isFeatureEnabled = featureFlags.isEnabled('no_saturday_sunday');
	$: isWeekend = [0, 5, 6].includes(currentDay);
	$: showForm = isFeatureEnabled ? !isWeekend : true;

	// Disabled submit button
	$: isSubmitDisable = selectedMassId == null;

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
	<title>PIC Misa</title>
	<meta name="description" content="LIS" />
</svelte:head>

<!-- On error  -->
<!-- {#if form?.error}
	<Alert color="red" class="mb-4">
		<span class="font-medium">Error:</span>
		{form?.error}
	</Alert>
{/if} -->

<!-- On success -->
<!-- {#if form?.success}
	<Alert color="green" class="mb-4"></Alert>
{/if} -->

{#if showForm}
	<h1 class="mb-6 text-xl font-semibold">{data.church.name} PIC Misa</h1>
	<form method="POST" class="mb-6">
		<input type="hidden" name="churchId" value={data.church.id} />
		<input type="hidden" name="massId" value={selectedMassId || ''} />

		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<section class="rounded-lg border bg-white p-6 md:col-span-1">
				<h1>PIC Misa sebelumnya</h1>
				<ul>
					{#each data.masses as mass}
						<li>{mass.name}</li>
					{/each}
				</ul>
			</section>
			<section class="rounded-lg border bg-white p-6 md:col-span-3">
				<h1>Form isian PIC</h1>

				{#each data.masses as mass}
					<Heading tag="h6" class="mt-3">{mass.name}</Heading>
					<Hr hrClass="my-1" />
					<Tags />
				{/each}
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
