<script lang="ts" module>
	declare const window: Window & typeof globalThis;
</script>

<script lang="ts">
	import { page } from '$app/state';
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
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import { logger } from '$src/lib/utils/logger';
	import { UserAddSolid } from 'flowbite-svelte-icons';
	import UsherListShortcut from './UsherListShortcut.svelte';

	// Props
	let {
		isSubmitable = $bindable(false),
		requirePpg = false,
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
		requirePpg?: boolean;
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

	let session = $derived(page.data?.session);
	let isAdmin = $derived(session?.user?.role === 'admin');

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

	async function handleRoleChange(index: number, role: 'PPG' | 'Kolekte') {
		// Prevent PPG role changes when feature is disabled
		if (role === 'PPG' && !requirePpg) {
			logger.warn(`Attempted to change PPG role when feature is disabled`);
			return;
		}

		const previousState = {
			isPpg: ushers[index]?.isPpg || false,
			isKolekte: ushers[index]?.isKolekte || false
		};

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

		const newState = {
			isPpg: ushers[index]?.isPpg || false,
			isKolekte: ushers[index]?.isKolekte || false
		};

		// Track role change with metadata
		const metadata = {
			event_type: 'role_change',
			role: role,
			usher_index: index,
			previous_is_ppg: previousState.isPpg,
			previous_is_kolekte: previousState.isKolekte,
			new_is_ppg: newState.isPpg,
			new_is_kolekte: newState.isKolekte,
			current_ppg_count: ushers.filter((u: Usher) => u.isPpg).length,
			current_kolekte_count: ushers.filter((u: Usher) => u.isKolekte).length,
			total_ushers: ushers.length
		};

		await Promise.all([
			statsigService.logEvent(
				'tatib_ushers_role_change',
				role,
				page.data.session || undefined,
				metadata
			),
			tracker.track('tatib_ushers_role_change', metadata, page.data.session, page)
		]);
	}

	async function addUsher() {
		if (ushers.length >= maxUshers) {
			showMaxAlert = true;

			const metadata = {
				event_type: 'max_limit_reached',
				current_count: ushers.length,
				max_limit: maxUshers
			};

			await Promise.all([
				statsigService.logEvent(
					'tatib_ushers_max_limit',
					'reached',
					page.data.session || undefined,
					metadata
				),
				tracker.track('tatib_ushers_max_limit', metadata, page.data.session, page)
			]);

			setTimeout(() => {
				showMaxAlert = false;
			}, 3000); // Hide alert after 3 seconds

			return;
		}

		const previousCount = ushers.length;
		ushers = [
			...ushers,
			{
				name: '',
				isPpg: false,
				isKolekte: false,
				sequence: ushers.length
			}
		];

		// Track usher addition
		const metadata = {
			event_type: 'usher_added',
			previous_count: previousCount,
			new_count: ushers.length,
			max_limit: maxUshers,
			current_ppg_count: ushers.filter((u: Usher) => u.isPpg).length,
			current_kolekte_count: ushers.filter((u: Usher) => u.isKolekte).length
		};

		await Promise.all([
			statsigService.logEvent(
				'tatib_ushers_add',
				'button',
				page.data.session || undefined,
				metadata
			),
			tracker.track('tatib_ushers_add', metadata, page.data.session, page)
		]);
	}

	// function removeUsher(index: number) {
	// 	ushers = ushers.filter((_, i) => i !== index);
	// }

	let progress = $derived(calculateProgress(ushers));
	let numberOfPpg = $derived(ushers.filter((p: Usher) => p.isPpg).length);
	let numberOfKolekte = $derived(ushers.filter((p: Usher) => p.isKolekte).length);
	let numberOfUsher = $derived(ushers.length);
	let previousProgress = $state(0);
	let previousIsSubmitable = $state(false);

	$effect(() => {
		// Validation logic depends on requirePpg configuration
		// If PPG required: exactly 2 PPG, exactly 3 Kolekte, minimum 6 ushers
		// If PPG not required: 0-2 PPG allowed, exactly 3 Kolekte, minimum 6 ushers
		const ppgValid = requirePpg ? numberOfPpg === 2 : numberOfPpg >= 0 && numberOfPpg <= 2;
		const kolekteValid = numberOfKolekte === 3;
		const usherCountValid = numberOfUsher >= 6;

		isSubmitable = ppgValid && kolekteValid && usherCountValid;

		// Track progress milestones (25%, 50%, 75%, 100%)
		const progressMilestones = [25, 50, 75, 100];
		const currentProgress = progress;
		const reachedMilestone = progressMilestones.find(
			(milestone) => previousProgress < milestone && currentProgress >= milestone
		);

		if (reachedMilestone) {
			const metadata = {
				event_type: 'progress_milestone',
				milestone: reachedMilestone,
				current_progress: currentProgress,
				filled_names_count: ushers.filter((u: Usher) => u.name.trim() !== '').length,
				total_ushers: numberOfUsher
			};

			tracker.track('tatib_ushers_progress', metadata, page.data.session, page);
		}

		// Track when form becomes submitable
		if (!previousIsSubmitable && isSubmitable) {
			const metadata = {
				event_type: 'form_ready',
				ppg_count: numberOfPpg,
				kolekte_count: numberOfKolekte,
				total_ushers: numberOfUsher,
				progress: currentProgress
			};

			tracker.track('tatib_ushers_form_ready', metadata, page.data.session, page);
		}

		previousProgress = currentProgress;
		previousIsSubmitable = isSubmitable;
	});

	// Reset
	async function reset() {
		const previousCount = ushers.length;
		const previousPpgCount = ushers.filter((u: Usher) => u.isPpg).length;
		const previousKolekteCount = ushers.filter((u: Usher) => u.isKolekte).length;
		const filledNamesCount = ushers.filter((u: Usher) => u.name.trim() !== '').length;

		ushers = [
			{
				name: '',
				isPpg: false,
				isKolekte: false,
				sequence: 0
			}
		];
		selectedRole = null;

		// Track reset action
		const metadata = {
			event_type: 'reset',
			previous_count: previousCount,
			previous_ppg_count: previousPpgCount,
			previous_kolekte_count: previousKolekteCount,
			previous_filled_names_count: filledNamesCount
		};

		await Promise.all([
			statsigService.logEvent(
				'tatib_ushers_reset',
				'button',
				page.data.session || undefined,
				metadata
			),
			tracker.track('tatib_ushers_reset', metadata, page.data.session, page)
		]);
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
				{#if requirePpg}
					Mohon isi petugas sesuai dengan persyaratan (8 orang, 2 PPG dan 3 Kolekte)
				{:else}
					Mohon isi petugas sesuai dengan persyaratan (minimal 6 orang, 3 Kolekte)
				{/if}
			</p>
		</div>

		{#if isAdmin}
			<UsherListShortcut bind:ushers />
		{/if}

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
				{#if requirePpg}
					<TableHeadCell class="w-20 px-4">PPG</TableHeadCell>
				{/if}
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
						{#if requirePpg}
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
						{/if}
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
									{#if requirePpg}
										<Toggle
											id="isPpg-{index}"
											bind:checked={usher.isPpg}
											onclick={() => handleRoleChange(index, 'PPG')}>PPG</Toggle
										>
									{/if}
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
