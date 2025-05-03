<script lang="ts">
	import Navigation from '$components/Navigation.svelte';
</script>

<svelte:head>
	<title>LIS Sola PETA | Solusi layanan PETA</title>
	<meta
		name="description"
		content="Membantu konfirmasi tugas Pelayanan dan Tata Tertib misa dan titik tugas."
	/>
</svelte:head>

<Navigation />
<div class="container px-3">
	<slot />
</div>
