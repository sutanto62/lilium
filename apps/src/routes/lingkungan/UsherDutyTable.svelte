<script lang="ts">
	import type { ChurchEvent } from '$core/entities/Event';
	import type { UsherResponse } from '$core/entities/Usher';
	import { page } from '$app/state';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import { formatDate } from '$src/lib/utils/dateUtils';

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
				const badges = [usher.isPpg ? 'PPG' : '', (usher.isKolekte && !usher.isPpg) ? 'Kolekte' : '']
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
	<!-- Lingkungan filter -->
	{#if lingkungans.length > 1}
		<div class="mb-4">
			<label for="lingkungan-filter" class="sr-only">Filter berdasarkan lingkungan</label>
			<div class="relative">
				<select
					id="lingkungan-filter"
					value={filterValue}
					onchange={(e) => onFilterChange(e.currentTarget.value)}
					class="w-full appearance-none rounded-md border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-base font-medium text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus-visible:ring-gray-400"
				>
					<option value="">Tampilkan semua lingkungan</option>
					{#each lingkungans as lingkungan}
						<option value={lingkungan}>{lingkungan}</option>
					{/each}
				</select>
				<div class="pointer-events-none absolute inset-y-0 right-3 flex items-center" aria-hidden="true">
					<svg class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</div>
			</div>
		</div>
	{/if}

	<!-- Usher table -->
	<div
		role="region"
		aria-label="Daftar petugas"
		aria-live="polite"
		aria-busy={isLoading}
	>
		{#if isLoading}
			<div class="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-6 dark:border-gray-700 dark:bg-gray-800">
				<div class="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100" role="status" aria-label="Memuat data"></div>
				<span class="text-base text-gray-700 dark:text-gray-300">Memuat petugas...</span>
			</div>
		{:else if formSuccess === false}
			<div class="rounded-md border border-red-200 bg-red-50 px-4 py-4 dark:border-red-800 dark:bg-red-900/20" role="alert">
				<p class="text-base font-medium text-red-800 dark:text-red-400">Gagal memuat data petugas</p>
				{#if formError}
					<p class="mt-1 text-base text-red-600 dark:text-red-300">{formError}</p>
				{/if}
			</div>
		{:else if ushers.length === 0}
			<div class="rounded-md border border-gray-200 px-4 py-8 text-center dark:border-gray-700">
				<p class="text-base text-gray-600 dark:text-gray-400">Belum ada petugas untuk jadwal ini</p>
			</div>
		{:else}
			<table class="w-full border-collapse text-base">
				<thead>
					<tr class="border-b-2 border-gray-900 dark:border-gray-100">
						<th scope="col" class="py-3 pr-4 text-left text-base font-semibold text-gray-900 dark:text-gray-100">Nama</th>
						<th scope="col" class="hidden py-3 pr-4 text-left text-base font-semibold text-gray-900 dark:text-gray-100 lg:table-cell">Zona</th>
						<th scope="col" class="hidden py-3 pr-4 text-left text-base font-semibold text-gray-900 dark:text-gray-100 lg:table-cell">Posisi</th>
						<th scope="col" class="hidden py-3 text-left text-base font-semibold text-gray-900 dark:text-gray-100 lg:table-cell">Tugas</th>
					</tr>
				</thead>
				<tbody>
					{#each groupedUshers as group}
						<tr>
							<td
								colspan={4}
								class="border-b border-gray-200 bg-gray-100 py-2 pl-3 text-base font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-400"
							>
								{group.lingkungan} — {group.wilayah}
							</td>
						</tr>
						{#each group.ushers as usher}
							<tr class="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
								<td class="py-2 pr-4 text-base">
									<!-- Mobile: 2-line stacked -->
									<div class="lg:hidden">
										<div class="flex flex-wrap items-center gap-1.5">
											<span class="font-medium text-gray-900 dark:text-gray-100">{usher.name}</span>
											{#if usher.isPpg}<span class="rounded bg-gray-200 px-1.5 py-0.5 text-sm text-gray-700 dark:bg-gray-600 dark:text-gray-300">PPG</span>{/if}
											{#if usher.isKolekte && !usher.isPpg}<span class="rounded bg-gray-200 px-1.5 py-0.5 text-sm text-gray-700 dark:bg-gray-600 dark:text-gray-300">Kolekte</span>{/if}
										</div>
										<p class="mb-0 mt-0.5 text-base text-gray-500 dark:text-gray-400">{usher.zone} · {usher.position}</p>
									</div>
									<!-- Desktop: name only -->
									<span class="hidden text-gray-900 dark:text-gray-100 lg:inline">{usher.name}</span>
								</td>
								<td class="hidden py-2 pr-4 text-base text-gray-700 dark:text-gray-300 lg:table-cell">{usher.zone}</td>
								<td class="hidden py-2 pr-4 text-base text-gray-700 dark:text-gray-300 lg:table-cell">{usher.position}</td>
								<td class="hidden py-2 text-base text-gray-700 dark:text-gray-300 lg:table-cell">
									{#if usher.isPpg}<span class="mr-1 rounded bg-gray-200 px-1 py-0.5 text-base text-gray-700 dark:bg-gray-600 dark:text-gray-300">PPG</span>{/if}
									{#if usher.isKolekte && !usher.isPpg}<span class="rounded bg-gray-200 px-1 py-0.5 text-base text-gray-700 dark:bg-gray-600 dark:text-gray-300">Kolekte</span>{/if}
								</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
{/if}
