<script lang="ts">
	import type { ChurchEvent } from '$core/entities/Event';
	import type { UsherResponse } from '$core/entities/Usher';
	import { page } from '$app/state';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import {
		Button,
		ButtonGroup,
		Heading,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';

	type UsherGroup = {
		lingkungan: string;
		wilayah: string;
		ushers: UsherResponse[];
		isOpen: boolean;
	};

	let {
		selectedEvent,
		lingkungans,
		groupedUshers,
		filterValue,
		ushers,
		isLoading,
		formSuccess,
		formError,
		onFilterChange,
		onPetunjukOpen
	}: {
		selectedEvent: ChurchEvent | null;
		lingkungans: string[];
		groupedUshers: UsherGroup[];
		filterValue: string;
		ushers: UsherResponse[];
		isLoading: boolean;
		formSuccess: boolean | undefined;
		formError: string | undefined;
		onFilterChange: (filter: string) => void;
		onPetunjukOpen: () => void;
	} = $props();

	let copied = $state(false);

	function formatRosterText(): string {
		if (!selectedEvent) return '';
		const lines: string[] = [
			`Titik Tugas — ${selectedEvent.description}`,
			`${formatDate(selectedEvent.date, 'long')}`,
			''
		];
		for (const group of groupedUshers) {
			lines.push(`${group.lingkungan} (${group.wilayah})`);
			for (const usher of group.ushers) {
				const badges = [usher.isPpg ? 'PPG' : '', usher.isKolekte ? 'Kolekte' : '']
					.filter(Boolean)
					.join(', ');
				lines.push(`  ${usher.name} — ${usher.zone} / ${usher.position}${badges ? ` [${badges}]` : ''}`);
			}
			lines.push('');
		}
		return lines.join('\n').trim();
	}

	async function handleCopyRoster() {
		try {
			await navigator.clipboard.writeText(formatRosterText());
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard API unavailable — silently ignore
		}

		await Promise.all([
			statsigService.logEvent(
				'lingkungan_titik_tugas_copy_roster',
				'click',
				page.data.session || undefined,
				{ usher_count: ushers.length, group_count: groupedUshers.length }
			),
			tracker.track(
				'lingkungan_titik_tugas_copy_roster',
				{ usher_count: ushers.length, group_count: groupedUshers.length },
				page.data.session || undefined,
				page
			)
		]);
	}
</script>

{#if selectedEvent}
	<Heading tag="h2" class="text-4xl tracking-tight text-amber-500 dark:text-white">
		Titik Tugas
	</Heading>
	<p class="text-md mb-6 font-light text-gray-900 dark:text-white">
		{selectedEvent.description}, {formatDate(selectedEvent.date, 'long')}
	</p>

	<div class="mb-4 flex items-center justify-between">
		{#if lingkungans.length > 1}
			<ButtonGroup>
				<Button size="sm" onclick={() => onFilterChange('')}>Semua</Button>
				{#each lingkungans as lingkungan}
					<Button size="sm" onclick={() => onFilterChange(lingkungan)}>{lingkungan}</Button>
				{/each}
			</ButtonGroup>
		{:else}
			<span></span>
		{/if}

		{#if ushers.length > 0}
			<Button size="sm" color="light" onclick={handleCopyRoster}>
				{copied ? 'Tersalin!' : 'Salin Daftar'}
			</Button>
		{/if}
	</div>

	<Table color="amber" shadow class="rounded-xl">
		<TableHead>
			<TableHeadCell>Nama</TableHeadCell>
			<TableHeadCell class="hidden lg:table-cell">Zona</TableHeadCell>
			<TableHeadCell>Posisi</TableHeadCell>
			<TableHeadCell class="hidden lg:table-cell">Tugas</TableHeadCell>
		</TableHead>
		<TableBody>
			{#if isLoading}
				<TableBodyRow>
					<TableBodyCell colspan={4} class="py-8 text-center">
						<div class="flex items-center justify-center">
							<div class="h-6 w-6 animate-spin rounded-full border-b-2 border-amber-500"></div>
							<span class="ml-2">Loading ushers...</span>
						</div>
					</TableBodyCell>
				</TableBodyRow>
			{:else if formSuccess === false}
				<TableBodyRow>
					<TableBodyCell colspan={4} class="py-8 text-center text-red-500">
						Error: {formError || 'Failed to load ushers'}
					</TableBodyCell>
				</TableBodyRow>
			{:else if ushers.length === 0}
				<TableBodyRow>
					<TableBodyCell colspan={4} class="text-white-500 py-8 text-center">
						Belum ada petugas
					</TableBodyCell>
				</TableBodyRow>
			{:else}
				{#each groupedUshers as group}
					<TableBodyRow class="text-md">
						<TableBodyCell
							class="whitespace-normal bg-amber-200 text-sm font-semibold text-black"
							colspan={4}
						>
							{group.lingkungan} ({group.wilayah})
						</TableBodyCell>
					</TableBodyRow>
					{#each group.ushers as usher}
						<TableBodyRow class="text-sm">
							<TableBodyCell class="whitespace-normal text-sm">
								{usher.name}
								{#if usher.isPpg}
									<span class="text-sm sm:hidden"> (PPG)</span>
								{/if}
								{#if usher.isKolekte}
									<span class="text-sm sm:hidden"> (Kolekte)</span>
								{/if}
							</TableBodyCell>
							<TableBodyCell class="hidden whitespace-normal text-sm lg:table-cell">
								{usher.zone}
							</TableBodyCell>
							<TableBodyCell class="whitespace-normal text-sm">
								<span class="block sm:hidden">{usher.zone} - </span>{usher.position}
							</TableBodyCell>
							<TableBodyCell class="hidden whitespace-normal text-sm lg:table-cell">
								{usher.isPpg ? 'PPG' : ''}{usher.isKolekte ? 'Kolekte' : ''}
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				{/each}
			{/if}
		</TableBody>
	</Table>

	<div class="mt-6 rounded-xl bg-white p-4 sm:p-6 md:p-8">
		Mohon baca <button
			type="button"
			onclick={onPetunjukOpen}
			class="text-blue-600 hover:underline">Petunjuk Tugas</button
		>
	</div>
{/if}
