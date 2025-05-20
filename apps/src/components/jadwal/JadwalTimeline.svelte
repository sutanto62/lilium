<script lang="ts">
	import { Card, Progressbar, TimelineItem, Tooltip } from 'flowbite-svelte';
	import { ArchiveOutline, CashOutline, UsersOutline } from 'flowbite-svelte-icons';

	import type { Event as ChurchEvent } from '$core/entities/Event';
	import { formatDate } from '$lib/utils/dateUtils';
	import { Button } from 'flowbite-svelte';

	export let event: ChurchEvent;
	export let usherCounts;
	export let color: 'primary' = 'primary';

	$: progress = usherCounts.progress;
</script>

<TimelineItem
	date={formatDate(event.date)}
	title={event.type === 'mass' ? (event.mass ?? '') : (event.description ?? '')}
	><Card>
		<h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
			{#if event.type === 'mass'}
				{event.mass}
			{:else}
				{event.description}
			{/if}
		</h2>
		<p class="mb-2 text-sm text-gray-500">{event.church}</p>
		<div class="text-sm text-gray-900">
			<h3 class="font-semibold">Konfirmasi</h3>
			<Progressbar {progress} class="my-3" {color} />
			<h3 class="font-semibold">Petugas</h3>
			<div class="flex items-center justify-between">
				<span class="flex items-center gap-2">
					<UsersOutline class="text-gray-500" />{usherCounts.confirmedUshers}
				</span>
				<Tooltip type="auto">Total Petugas {usherCounts.totalUshers}</Tooltip>

				<span class="flex items-center gap-2"
					><ArchiveOutline class="text-gray-500" />{usherCounts.totalPpg}</span
				>
				<Tooltip type="auto">Petugas PPG</Tooltip>

				<span class="flex items-center gap-2">
					<CashOutline class="text-gray-500" />{usherCounts.totalKolekte}</span
				>
				<Tooltip type="auto">Penghitung Kolekte</Tooltip>

				<Button class="text-sm" size="xs" href="/admin/jadwal/{event.id}" {color}>Detail</Button>
			</div>
		</div>
	</Card>
</TimelineItem>
