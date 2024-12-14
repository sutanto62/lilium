<script lang="ts" context="module">
	declare const window: Window & typeof globalThis;
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Alert,
		Progressbar,
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		Input,
		Checkbox,
		Toggle,
		Button
	} from 'flowbite-svelte';

	import { UserAddSolid } from 'flowbite-svelte-icons';
	import type { Usher } from '$core/entities/schedule';

	// Props
	export let isSubmitable: boolean = false;
	export let ushers: Usher[] = [
		{
			name: '',
			whatsapp: '',
			isPpg: false,
			isKolekte: false,
			sequence: 0
		}
	];

	let selectedRole: 'PPG' | 'Kolekte' | null = null;
	let screenMinWidth: number = 640;
	let screenWidth: number;
	let maxUshers: number = 8;
	let showMaxAlert = false;

	onMount(() => {
		screenWidth = window.innerWidth;
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	function handleResize() {
		screenWidth = window.innerWidth;
	}

	function handleRoleChange(index: number, role: 'PPG' | 'Kolekte') {
		ushers = ushers.map((usher, i) => {
			if (i === index) {
				if (role === 'PPG') {
					return { ...usher, isPpg: !usher.isPpg, isKolekte: false };
				} else {
					return { ...usher, isKolekte: !usher.isKolekte, isPpg: false };
				}
			}
			return usher;
		});
	}

	function addUsher() {
		if (ushers.length >= maxUshers) {
			showMaxAlert = true;
			setTimeout(() => {
				showMaxAlert = false;
			}, 3000); // Hide alert after 3 seconds

			return;
		}

		ushers = [...ushers, { name: '', whatsapp: '', isPpg: false, isKolekte: false, sequence: 0 }];
	}

	// Recalculate progress whenever ushers changes
	$: progress = calculateProgress(ushers);

	function calculateProgress(usher: Usher[]) {
		if (usher.length === 0) return 0;

		// Get the number of filled names
		const filledNames = usher.filter((p) => p.name.trim() !== '').length;

		return Math.round((filledNames / maxUshers) * 100);
	}

	$: numberOfPpg = ushers.filter((p) => p.isPpg).length;
	$: numberOfKolekte = ushers.filter((p) => p.isKolekte).length;
	$: isSubmitable = numberOfPpg >= 2 && numberOfKolekte >= 3 && progress >= (6 / maxUshers) * 100;

	// Reset
	function reset() {
		ushers = [
			{
				name: '',
				whatsapp: '',
				isPpg: false,
				isKolekte: false,
				sequence: 0
			}
		];
		selectedRole = null;
	}
</script>

<div class="flex items-center justify-between gap-4 px-0 pb-4">
	<caption class="text-left text-lg font-semibold">
		Petugas
		<p class="mt-1 text-sm font-normal">
			Mohon isi petugas sesuai dengan persyaratan (8 orang dengan 2 PPG dan 3 Kolekte)
		</p>
	</caption>
	<Button color="alternative" size="xs" on:click={addUsher}>
		<UserAddSolid class="mr-2" /> Petugas
	</Button>
</div>

{#if progress > 0}
	<div class="mb-4">
		<Progressbar {progress} size="h-2" color={progress < 75 ? 'gray' : 'green'} />
		<p class="mt-2 text-sm text-gray-500">
			{progress}% lengkap
		</p>
	</div>
{/if}

{#if showMaxAlert}
	<Alert color="red" class="mb-4">Jumlah maksimum petugas ({maxUshers}) telah tercapai.</Alert>
{/if}

<Table>
	<TableHead>
		{#if screenWidth > screenMinWidth}
			<TableHeadCell class="w-10 px-4">#</TableHeadCell>
			<TableHeadCell class="w-max min-w-48 px-4">Nama</TableHeadCell>
			<TableHeadCell class="w-48 min-w-48 px-4">WhatsApp</TableHeadCell>
			<TableHeadCell class="w-20 px-4">PPG</TableHeadCell>
			<TableHeadCell class="w-20 px-4">Kolekte</TableHeadCell>
		{:else}
			<!-- <TableHeadCell class="w-10 px-0">#</TableHeadCell> -->
			<TableHeadCell class="w-full min-w-48 !px-4">Petugas</TableHeadCell>
		{/if}
	</TableHead>
	<TableBody tableBodyClass="divide-y [&>tr>td]:px-4">
		{#each ushers as usher, index}
			<TableBodyRow>
				{#if screenWidth > screenMinWidth}
					<TableBodyCell class="w-10">{index + 1}</TableBodyCell>
					<TableBodyCell class="w-max min-w-48">
						<Input
							type="text"
							id="name-{index}"
							placeholder="Tulis nama"
							required
							bind:value={usher.name}
						/>
					</TableBodyCell>
					<TableBodyCell class="w-48 min-w-48">
						<Input
							type="tel"
							id="whatsapp-{index}"
							placeholder="Tulis no WhatsApp"
							bind:value={usher.whatsapp}
							pattern="[0-9]*"
						/>
					</TableBodyCell>
					<TableBodyCell class="w-20">
						<Checkbox
							id="isPpg-{index}"
							bind:checked={usher.isPpg}
							on:click={() => handleRoleChange(index, 'PPG')}
						/>
					</TableBodyCell>
					<TableBodyCell class="w-20">
						<Checkbox
							id="isKolekte-{index}"
							bind:checked={usher.isKolekte}
							on:click={() => handleRoleChange(index, 'Kolekte')}
						/>
					</TableBodyCell>
				{:else}
					<!-- <TableBodyCell class="w-10">1</TableBodyCell> -->
					<TableBodyCell class="w-full !px-1">
						<div class="flex flex-col gap-4">
							<div class="w-full">
								Petugas {index + 1}
							</div>
							<Input
								type="text"
								id="name-{index}"
								placeholder="Tulis nama"
								required
								bind:value={usher.name}
							/>
							<Input
								type="text"
								id="whatsapp-{index}"
								placeholder="Tulis nomor WhatsApp"
								required
								bind:value={usher.whatsapp}
								pattern="[0-9]*"
							/>
							<div class="flex flex-row gap-4">
								<Toggle
									id="isPpg-{index}"
									bind:checked={usher.isPpg}
									on:click={() => handleRoleChange(index, 'PPG')}>PPG</Toggle
								>
								<Toggle
									id="isKolekte-{index}"
									bind:checked={usher.isKolekte}
									on:click={() => handleRoleChange(index, 'Kolekte')}>Menghitung Kolekte</Toggle
								>
							</div>
						</div>
					</TableBodyCell>
				{/if}
			</TableBodyRow>
		{/each}
	</TableBody>
</Table>

<div class="flex justify-end gap-4 px-0 py-4">
	<Button id="reset-button" color="alternative" size="xs" on:click={reset}>Reset</Button>
</div>
