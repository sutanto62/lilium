<script lang="ts" module>
	declare const window: Window & typeof globalThis;
</script>

<script lang="ts">
	import {
		Alert,
		Button,
		Input,
		Progressbar,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Toggle
	} from 'flowbite-svelte';
	import { onMount } from 'svelte';

	import type { Usher } from '$core/entities/Schedule';
	import { UserAddSolid } from 'flowbite-svelte-icons';

	// Props
	let {
		isSubmitable = $bindable(false),
		ushers = $bindable<Usher[]>([
			{
				name: '',
				isPpg: false,
				isKolekte: false,
				sequence: 0
			}
		])
	} = $props<{
		isSubmitable?: boolean;
		ushers?: Usher[];
	}>();

	// function validateName(name: string): string | undefined {
	// 	// Don't validate empty input
	// 	if (!name.trim()) {
	// 		return undefined;
	// 	}

	// 	const sanitized = name.trim();
	// 	const words = sanitized.split(' ');

	// 	// Check if each word is at least 3 characters long
	// 	if (words.some((word) => word.length < 3)) {
	// 		return 'Nama minimal 3 karakter';
	// 	}

	// 	// Check if total length is reasonable (between 3 and 50 characters)
	// 	if (sanitized.length < 3 || sanitized.length > 50) {
	// 		return 'Nama harus antara 3 dan 50 karakter';
	// 	}

	// 	// Check for repeated characters (more than 3 same characters in sequence)
	// 	if (/(.)\1{2,}/.test(sanitized)) {
	// 		return 'Nama tidak boleh mengandung karakter yang berulang lebih dari 2 kali';
	// 	}

	// 	return undefined;
	// }

	// TODO: check after input data
	// function handleNameChange(index: number, value: string) {
	// 	console.log(`handleNameChange: ${value}`);
	// 	ushers = ushers.map((usher, i) => {
	// 		if (i === index) {
	// 			return {
	// 				...usher,
	// 				name: value,
	// 				validationMessage: validateName(value)
	// 			};
	// 		}
	// 		return usher;
	// 	});
	// }

	let selectedRole = $state<'PPG' | 'Kolekte' | null>(null);
	let screenMinWidth = $state(640);
	let screenWidth = $state(0);
	let maxUshers = $state(8);
	let showMaxAlert = $state(false);

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
		ushers = ushers.map((usher: Usher, i: number) => {
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

		ushers = [
			...ushers,
			{
				name: '',
				isPpg: false,
				isKolekte: false,
				sequence: ushers.length
			}
		];
	}

	// function removeUsher(index: number) {
	// 	ushers = ushers.filter((_, i) => i !== index);
	// }

	let progress = $derived(calculateProgress(ushers));
	let numberOfPpg = $derived(ushers.filter((p: Usher) => p.isPpg).length);
	let numberOfKolekte = $derived(ushers.filter((p: Usher) => p.isKolekte).length);
	let numberOfUsher = $derived(ushers.length);
	$effect(() => {
		isSubmitable = numberOfPpg >= 0 && numberOfKolekte >= 3 && numberOfUsher >= 6;
	});

	// Reset
	function reset() {
		ushers = [
			{
				name: '',
				isPpg: false,
				isKolekte: false,
				sequence: 0
			}
		];
		selectedRole = null;
	}

	function calculateProgress(usher: Usher[]) {
		if (usher.length === 0) return 0;

		// Get the number of filled names
		const filledNames = usher.filter((p) => p.name.trim() !== '').length;
		const progress = Math.round((filledNames / maxUshers) * 100);

		// const confirmationStatus = usher.map((p) => {
		// 	if (progress === 0) return 'unconfirmed';
		// 	if (progress === 100) return 'confirmed';
		// 	return 'incomplete';
		// });

		return progress;
	}
</script>

<div class="relative">
	<div
		class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-0 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="text-left text-lg font-semibold">
			Petugas
			<p class="mt-1 text-sm font-normal">
				Mohon isi petugas sesuai dengan persyaratan (8 orang dan 3 Kolekte)
			</p>
		</div>
		<Button color="primary" size="xs" onclick={addUsher}>
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
				<TableHeadCell class="w-20 px-4">PPG</TableHeadCell>
				<TableHeadCell class="w-20 px-4">Kolekte</TableHeadCell>
			{:else}
				<!-- <TableHeadCell class="w-10 px-0">#</TableHeadCell> -->
				<TableHeadCell class="w-full min-w-48 !px-4">Petugas</TableHeadCell>
			{/if}
		</TableHead>
		<TableBody class="divide-y [&>tr>td]:px-4">
			{#each ushers as usher, index}
				<TableBodyRow>
					{#if screenWidth > screenMinWidth}
						<TableBodyCell class="w-10">{index + 1}</TableBodyCell>
						<TableBodyCell class="w-max min-w-48">
							<div class="flex items-start gap-4">
								<div class="flex-1">
									<Input
										id="name-{index}"
										type="text"
										placeholder="Masukkan nama"
										bind:value={usher.name}
										class="mt-2"
										required
										minlength={3}
										maxlength={50}
									/>
									{#if usher.validationMessage}
										<Alert color="red" class="mt-2">
											{usher.validationMessage}
										</Alert>
									{/if}
								</div>
							</div>
						</TableBodyCell>
						<TableBodyCell class="w-20">
							<div class="flex h-full items-center justify-center">
								<input
									id="ppg-{index}"
									type="checkbox"
									bind:checked={usher.isPpg}
									class="h-4 w-4 rounded border-gray-300"
									onclick={() => handleRoleChange(index, 'PPG')}
								/>
							</div>
						</TableBodyCell>
						<TableBodyCell class="w-20">
							<div class="flex h-full items-center justify-center">
								<input
									id="kolekte-{index}"
									type="checkbox"
									bind:checked={usher.isKolekte}
									class="h-4 w-4 rounded border-gray-300"
									onclick={() => handleRoleChange(index, 'Kolekte')}
								/>
							</div>
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
									bind:value={usher.name}
									required
									minlength={3}
									maxlength={50}
								/>
								<div class="flex flex-row gap-4">
									<Toggle
										id="isPpg-{index}"
										bind:checked={usher.isPpg}
										onclick={() => handleRoleChange(index, 'PPG')}>PPG</Toggle
									>
									<Toggle
										id="isKolekte-{index}"
										bind:checked={usher.isKolekte}
										onclick={() => handleRoleChange(index, 'Kolekte')}>Menghitung Kolekte</Toggle
									>
								</div>
							</div>
						</TableBodyCell>
					{/if}
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>

	<div
		class="sticky bottom-0 z-10 flex justify-end gap-4 border-t border-gray-200 bg-white px-0 py-4 dark:border-gray-700 dark:bg-gray-800"
	>
		<Button id="reset-button" color="alternative" size="xs" onclick={reset}>Reset</Button>
	</div>
</div>
