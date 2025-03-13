<script lang="ts">
	import {
		Activity,
		ActivityItem,
		Card,
		Progressbar,
		TimelineItem,
		Tooltip
	} from 'flowbite-svelte';
	import { ArchiveOutline, CashOutline, UsersOutline } from 'flowbite-svelte-icons';

	import { Button } from 'flowbite-svelte';
	import { formatDate } from '$lib/utils/dateUtils';
	import type { Event as ChurchEvent } from '$core/entities/Event';

	export let event: ChurchEvent;
	export let usherCounts;
	export let color: string;
	export let fullCard: boolean = false;

	$: progress = usherCounts.progress;

	let activities = [
		{
			title:
				'Bonnie moved <a href="/" class="font-semibold text-primary-600 dark:text-primary-500 hover:underline">Jese Leos</a> to <span class="bg-gray-100 text-gray-800 text-xs font-normal me-2 px-2.5 py-0.5 rounded-sm dark:bg-gray-600 dark:text-gray-300">Funny Group</span>',
			date: 'just now',
			alt: 'image alt here',
			src: '/images/profile-picture-2.webp'
		},
		{
			title: 'We don’t serve their kind here! What? Your droids. ',
			date: '2 hours ago',
			alt: 'image alt here',
			src: '/images/profile-picture-2.webp',
			text: 'The approach will not be easy. You are required to maneuver straight down this trench and skim the surface to this point. The target area is only two meters wide. '
		},
		{
			title: 'They’ll have to wait outside. We don’t want them here. ',
			date: '1 day ago',
			alt: 'image alt here',
			src: '/images/profile-picture-3.webp'
		}
	];
</script>

{#if fullCard}
	<TimelineItem date={formatDate(event.date)}
		><Card>
			<h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
				{event.mass}
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
{:else}
	<Activity>
		<ActivityItem {activities} />
	</Activity>
{/if}
