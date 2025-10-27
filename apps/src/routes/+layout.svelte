<script lang="ts">
	import { page } from '$app/state';
	import Footer from '$components/Footer.svelte';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
	import '$src/app.css';
	import { posthogService } from '$src/lib/application/PostHogService';
	import { onMount } from 'svelte';

	// Initialize PostHog and track page views
	onMount(async () => {
		await posthogService.use();

		// Track initial page view
		await posthogService.trackPageView(
			page.route.id || 'unknown',
			{
				url: page.url.href,
				path: page.url.pathname
			},
			page.data.session || undefined
		);
	});
</script>

<svelte:head>
	<title
		>{import.meta.env.VITE_SITE_TITLE || 'Lilium Inter Spinas'} | Solusi layanan kegiatan gereja</title
	>
	<meta
		name="description"
		content="Mempermudah umat untuk ikut serta berkegiatan menggereja, penjadwalan kegiatan, konfirmasi tugas."
	/>
</svelte:head>

<NavigationAdmin />
<main class="mx-auto bg-gray-50 dark:bg-gray-900">
	<div class="container mx-auto px-4 pt-20 lg:px-0 dark:bg-gray-900">
		<slot />
	</div>
</main>
<Footer />
