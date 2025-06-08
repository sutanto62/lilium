<script lang="ts">
	import Footer from '$components/Footer.svelte';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
	import '$src/app.css';
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
	<div class="container mx-auto px-4 pt-20 dark:bg-gray-900 lg:px-0">
		<slot />
	</div>
</main>
<Footer />
