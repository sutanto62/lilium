<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { P, Hr, Button, Alert } from 'flowbite-svelte';
	import { FloppyDiskSolid, ClipboardCleanSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import type { TagsInputEvents } from 'svelte-tags-input';
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

	// Create a separate array for each mass
	let picAssignments: Record<string, string[]> = {};

	// Initialize empty arrays for each mass
	onMount(() => {
		currentDay = new Date().getDay();
		data.masses.forEach((mass) => {
			picAssignments[mass.id] = [];
		});
	});

	// Optional: Handle tag events
	function handleTagAdd(event: CustomEvent<TagsInputEvents>) {
		console.log('Tag added:', event.detail.tag);
	}

	function handleTagRemove(event: CustomEvent<TagsInputEvents>) {
		console.log('Tag removed:', event.detail.tag);
	}

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
				<P size="xl" class="mb-3" weight="bold">PIC Misa sebelumnya</P>
				<ul>
					{#each data.masses as mass}
						<li>{mass.name}</li>
					{/each}
				</ul>
			</section>
			<section class="rounded-lg border bg-white p-6 md:col-span-3">
				<P size="xl" class="mb-3" weight="bold">Form isian PIC</P>

				{#each data.masses as mass}
					<P size="lg" class="mt-3" weight="semibold">{mass.name}</P>
					<div class="input-tag">
						<Tags
							name="pic-assignments"
							bind:tags={picAssignments[mass.id]}
							placeholder="Ketikan nama PIC..."
							allowPaste={true}
							allowDrop={true}
							onlyUnique={true}
							addKeys={[13, 188]}
							on:tags:add={handleTagAdd}
							on:tags:remove={handleTagRemove}
							labelShow={true}
							labelText="PIC PETA"
						/>
					</div>
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

<style>
	/* Customize svelte-tags-input */
	.input-tag :global(.svelte-tags-input-layout) {
		display: -webkit-box;
		display: -ms-flexbox;
		display: flex;
		-ms-flex-wrap: wrap;
		flex-wrap: wrap;
		-webkit-box-align: center;
		-ms-flex-align: center;
		align-items: center;
		padding: 0px 5px 5px 5px;
		border-radius: 10px !important;
		border: 1px solid #ccc;
	}

	.input-tag :global(.svelte-tags-input-layout:focus),
	.input-tag :global(.svelte-tags-input-layout:hover) {
		border-radius: 1rem;
		border: solid 1px grey;
	}

	.input-tag :global(.svelte-tags-input-layout:focus-within) {
		outline: 0px solid #fff !important;
	}
</style>
