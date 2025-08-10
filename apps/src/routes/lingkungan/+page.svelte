<script lang="ts">
	import { statsigService } from '$src/lib/application/StatsigService';
	import { Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';
	import { onMount } from 'svelte';
	import LingkunganTitikTugas from './LingkunganTitikTugas.svelte';

	let { data, form } = $props();

	onMount(async () => {
		await statsigService.logEvent('lingkungan_view', 'menu');
	});
</script>

<svelte:head>
	<title>{import.meta.env.VITE_SITE_TITLE || 'Lilium Inter Spinas'} | Titik Tugas Tatib</title>
	<meta name="description" content="Melihat titik tata tertib lingkungan." />
</svelte:head>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem>Lingkungan</BreadcrumbItem>
</Breadcrumb>

<LingkunganTitikTugas {data} {form} />
