<script lang="ts">
	import { page } from '$app/state';
	import { formatDate } from '$lib/utils/dateUtils';
	import { statsigService } from '$src/lib/application/StatsigService.js';
	import { tracker } from '$src/lib/utils/analytics';
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		ButtonGroup,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';

	type EventListItem = {
		date: string;
		mass: string;
		ushers: string;
		progress: number;
		id: string;
	};

	type FilterStatus = 'all' | 'confirmed' | 'incomplete' | 'unconfirmed' | 'today';

	let { data } = $props();
	let currentFilter = $state<FilterStatus>('all');

	let upcomingEvents = $derived(
		data.currentWeek.map(
			(event): EventListItem => ({
				date: event.date,
				mass: `${event.code} - ${event.description}`,
				ushers: event.usherCounts.totalUshers.toString(),
				progress: Math.floor(event.usherCounts.progress),
				id: event.id
			})
		)
	);

	let filteredEvents = $derived(() => {
		const filter = currentFilter as FilterStatus;

		if (filter === 'confirmed') {
			return upcomingEvents.filter((event) => event.progress === 100);
		} else if (filter === 'incomplete') {
			return upcomingEvents.filter((event) => event.progress > 0 && event.progress < 100);
		} else if (filter === 'unconfirmed') {
			return upcomingEvents.filter((event) => event.progress === 0);
		} else {
			return upcomingEvents;
		}
	});

	// Track empty states (business insights)
	$effect(() => {
		// Track empty filter results (business insight)
		if (filteredEvents().length === 0 && upcomingEvents.length > 0) {
			tracker.track(
				'admin_jadwal_empty_filter',
				{
					filter: currentFilter,
					total_events: upcomingEvents.length,
					filter_type: currentFilter
				},
				page.data.session,
				page
			);
		}

		// Track completely empty page (business insight)
		if (upcomingEvents.length === 0) {
			tracker.track(
				'admin_jadwal_empty',
				{
					has_past_events: data.pastWeek.length > 0
				},
				page.data.session,
				page
			);
		}
	});

	async function setFilter(filter: FilterStatus) {
		const previousFilter = currentFilter;
		currentFilter = filter;

		const filteredCount = filteredEvents().length;

		// Track with Statsig (key events)
		statsigService.logEvent('admin_jadwal_filter', 'change', page.data.session || undefined, {
			previous_filter: previousFilter,
			new_filter: filter,
			filtered_count: filteredCount,
			total_count: upcomingEvents.length
		});

		// Track with PostHog (business context)
		await tracker.track(
			'admin_jadwal_filter_change',
			{
				previous_filter: previousFilter,
				new_filter: filter,
				filtered_count: filteredCount,
				total_count: upcomingEvents.length,
				filter_type: filter
			},
			page.data.session,
			page
		);
	}

	async function handleEventClick(eventId: string, eventDate: string, progress: number) {
		// PostHog autocapture handles the click, we add business context
		await tracker.track(
			'admin_jadwal_event_navigate',
			{
				event_id: eventId,
				event_date: eventDate,
				progress_percentage: progress,
				progress_status: progress === 100 ? 'complete' : progress > 0 ? 'partial' : 'unconfirmed'
			},
			page.data.session,
			page
		);
	}

	// Track client-side page load
	$effect(() => {
		// Only track if we have data loaded (prevents tracking before data is ready)
		if (data.currentWeek !== undefined) {
			const session = page.data.session || undefined;
			const metadata = {
				total_events: data.currentWeek?.length || 0,
				past_events_count: data.pastWeek?.length || 0,
				masses_count: data.masses?.length || 0,
				has_events: (data.currentWeek?.length || 0) > 0,
				has_past_events: (data.pastWeek?.length || 0) > 0,
				has_session: !!session
			};

			// Dual tracking for client-side page view
			Promise.all([
				statsigService.logEvent('admin_jadwal_view', 'load', session, metadata),
				tracker.track('admin_jadwal_view', metadata, session, page)
			]);
		}
	});
</script>

<svelte:head>
	<title>Kelola Tatib</title>
	<meta
		name="description"
		content="Dashboard atas petugas tata tertib lingkungan, kelengkapan petugas, dan status konfirmasi."
	/>
</svelte:head>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem>Jadwal</BreadcrumbItem>
</Breadcrumb>

<!-- <Button onclick={switchListEvents}>Switch</Button> -->
<div class="mb-4">
	<ButtonGroup class="*:ring-primary-700!">
		<Button onclick={() => setFilter('all')} color={currentFilter === 'all' ? 'primary' : 'light'}>
			Semua
		</Button>
		<Button
			onclick={() => setFilter('confirmed')}
			color={currentFilter === 'confirmed' ? 'primary' : 'light'}
		>
			Sudah Konfirmasi
		</Button>
		<Button
			onclick={() => setFilter('incomplete')}
			color={currentFilter === 'incomplete' ? 'primary' : 'light'}
		>
			Belum Lengkap
		</Button>
		<Button
			onclick={() => setFilter('unconfirmed')}
			color={currentFilter === 'unconfirmed' ? 'primary' : 'light'}
		>
			Belum Konfirmasi
		</Button>
	</ButtonGroup>
</div>

<Table striped={true} shadow>
	<caption
		class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
	>
		Jadwal Konfirmasi Petugas Tatib
		<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
			Berikut jadwal konfirmasi petugas tatib untuk 2 minggu ke depan.
		</p>
	</caption>
	<TableHead>
		<TableHeadCell>Tanggal</TableHeadCell>
		<TableHeadCell>Misa</TableHeadCell>
		<TableHeadCell>Petugas</TableHeadCell>
		<TableHeadCell>Status</TableHeadCell>
		<!-- TODO: visual edit sign
		<TableHeadCell>
			<span class="sr-only">Edit</span>
		</TableHeadCell> 
		-->
	</TableHead>
	<TableBody>
		{#each filteredEvents() as event}
			<TableBodyRow>
				<TableBodyCell>{formatDate(event.date, 'long')}</TableBodyCell>
				<TableBodyCell>
					<a
						href="/admin/jadwal/{event.id}"
						class="font-medium text-primary-600 hover:underline dark:text-primary-500"
						onclick={() => handleEventClick(event.id, event.date, event.progress)}
					>
						{event.mass}
					</a>
				</TableBodyCell>
				<TableBodyCell>{event.ushers}</TableBodyCell>
				<TableBodyCell>{event.progress}%</TableBodyCell>

				<!-- <TableBodyCell class="flex items-center gap-2">
					<a
						href="/tables"
						class="font-medium text-primary-600 hover:underline dark:text-primary-500"
						><PenSolid /></a
					>
					<a
						href="/tables"
						class="font-medium text-primary-600 hover:underline dark:text-primary-500"
						><FileLinesSolid /></a
					>
				</TableBodyCell> -->
			</TableBodyRow>
		{/each}
	</TableBody>
</Table>

<!--
<div class="flex flex-col gap-8 lg:flex-row">
	<div class="w-full lg:w-4/6">
		<Heading tag="h2" class="mb-2 text-2xl tracking-tight text-gray-900 dark:text-white">
			Daftar Konfirmasi
		</Heading>
		<P class="mb-6"
			>Berikut daftar lingkungan yang telah melakukan konfirmasi untuk tugas 2 minggu ke depan.</P
		>
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
				<JadwalCard {event} usherCounts={event.usherCounts} color="primary" />
			{/each}
		</Timeline>
	</div>

	<div class="w-full lg:w-2/6">
		{#if pastEvents.length > 0}
			<Card size="md">
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
-->
