<script lang="ts">
	import { browser } from '$app/environment';
	import '$src/app.css';
	import { initStatsig } from '$src/lib/utils/analytic';

	if (browser) {
		initStatsig();
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
