<script lang="ts">
	import { page } from '$app/state';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import { Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';
	import LingkunganTitikTugas from './LingkunganTitikTugas.svelte';

	let { data, form } = $props();

	// Track client-side page load
	$effect(() => {
		// Only track if we have data loaded (prevents tracking before data is ready)
		if (data.events !== undefined) {
			const session = data.session || undefined;
			const metadata = {
				total_events: data.events?.length || 0,
				has_events: (data.events?.length || 0) > 0,
				has_session: !!session
			};

			// Dual tracking for client-side page view
			Promise.all([
				statsigService.logEvent('lingkungan_titik_tugas_view', 'load', session, metadata),
				tracker.track('lingkungan_titik_tugas_view', metadata, session, page)
			]);
		}
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
