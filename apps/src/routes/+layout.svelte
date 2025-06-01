<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import '$src/app.css';
	import posthog from 'posthog-js';

	if (browser) {
		beforeNavigate(() => posthog.capture('$pageleave'));
		afterNavigate(() => posthog.capture('$pageview'));
	}
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

<!-- IMPORTANT: Do not add <main> or <div> tags in page content as they are already provided by the layout -->
<slot />
