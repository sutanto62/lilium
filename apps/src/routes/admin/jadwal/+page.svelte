<script lang="ts">
	import {
		Avatar,
		Breadcrumb,
		BreadcrumbItem,
		Card,
		Heading,
		Listgroup,
		P,
		Timeline
	} from 'flowbite-svelte';
	import JadwalCard from '$components/jadwal/JadwalTimeline.svelte';

	export let data;

	$: events = data.currentWeek;
	$: pastEvents = data.pastWeek;
</script>

<svelte:head>
	<title>Kelola Tatib</title>
	<meta name="description" content="LIS" />
</svelte:head>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin/jadwal">Jadwal</BreadcrumbItem>
</Breadcrumb>

<div class="flex flex-col gap-8 lg:flex-row">
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
		{#if pastEvents.length > 0}
			<Card padding="lg" size="md">
				<div class="mb-4 flex items-center justify-between">
					<h5 class="text-xl font-bold leading-none text-gray-900 dark:text-white">Sebelumnya</h5>
				</div>
				<Listgroup items={pastEvents} let:item class="dark:bg-transparent! border-0">
					<div class="flex items-center space-x-4 rtl:space-x-reverse">
						<Avatar border class="ring-gray-400 dark:ring-gray-300">{item.churchCode ?? ''}</Avatar>
						<div class="min-w-0 flex-1">
							{@html item.link}
							<p class="truncate text-sm text-gray-500 dark:text-gray-400">
								{item.date} ({item.progress}%)
							</p>
						</div>
					</div>
				</Listgroup>
			</Card>
		{/if}
	</div>
</div>
