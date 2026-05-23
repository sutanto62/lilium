<script lang="ts">
	import { page } from '$app/state';
	import Footer from '$components/Footer.svelte';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
	import '$src/app.css';
	import { posthogService } from '$src/lib/application/PostHogService';
	import { themeStore } from '$lib/utils/themeStore';
	import { onMount } from 'svelte';

	// Initialize theme on mount
	onMount(async () => {
		// Initialize theme store (this will apply the correct class to html element)
		// The store is automatically initialized on first access
		const unsubscribe = themeStore.subscribe(() => {});
		
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

		return () => {
			unsubscribe();
		};
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
