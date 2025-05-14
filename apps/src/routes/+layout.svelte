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
	<title>Lilium Inter Spinas | Solusi layanan kegiatan gereja</title>
	<meta
		name="description"
		content="Mempermudah umat untuk ikut serta berkegiatan menggereja, penjadwalan kegiatan, konfirmasi tugas."
	/>
</svelte:head>

<div class="container h-screen max-w-full px-0 py-0" id="main">
	<slot />
</div>
