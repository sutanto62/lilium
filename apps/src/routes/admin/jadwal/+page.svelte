<script lang="ts">
	import {
		Activity,
		ActivityItem,
		Breadcrumb,
		BreadcrumbItem,
		Heading,
		P,
		Timeline
	} from 'flowbite-svelte';
	import JadwalCard from '$components/jadwal/JadwalTimeline.svelte';

	export let data;

	$: events = data.currentWeek;
	$: activities = data.pastWeek;
</script>

<svelte:head>
	<title>Kelola Tatib</title>
	<meta name="description" content="LIS" />
</svelte:head>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin/jadwal">Jadwal</BreadcrumbItem>
</Breadcrumb>

<div class="flex flex-col gap-4 lg:flex-row">
	<div class="w-full lg:w-4/6">
		<Heading tag="h2" class="mb-2 text-2xl tracking-tight text-gray-900 dark:text-white">
			Minggu ini
		</Heading>
		<P class="mb-6">Melihat lingkungan yang telah melakukan konfirmasi tugas tata tertib.</P>
		{#if events.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800"
			>
				<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
					Petugas Tatib masih kosong.
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Hubungi para ketua lingkungan untuk segera melakukan konfirmasi.
				</p>
			</div>
		{/if}

		<Timeline>
			{#each events as event}
				<JadwalCard {event} usherCounts={event.usherCounts} color="primary" fullCard />
			{/each}
		</Timeline>
	</div>

	<div class="w-full lg:w-2/6">
		{#if activities.length > 0}
			<Heading tag="h2" class="mb-2 text-2xl tracking-tight text-gray-900 dark:text-white">
				Minggu lalu
			</Heading>
			<Activity>
				<ActivityItem {activities} />
			</Activity>
		{/if}
	</div>
</div>
