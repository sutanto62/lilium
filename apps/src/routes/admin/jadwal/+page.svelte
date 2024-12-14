<script lang="ts">
	import { Breadcrumb, BreadcrumbItem, Timeline } from 'flowbite-svelte';
	import JadwalCard from '$components/jadwal/JadwalTimeline.svelte';

	export let data;

	$: events = data.events;
</script>

<svelte:head>
	<title>Kelola Tatib</title>
	<meta name="description" content="LIS" />
</svelte:head>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/admin" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin/jadwal">Jadwal</BreadcrumbItem>
</Breadcrumb>

<div class="container">
	<Timeline>
		{#each events as event}
			<JadwalCard {event} usherCounts={event.usherCounts} />
		{/each}
	</Timeline>
</div>
