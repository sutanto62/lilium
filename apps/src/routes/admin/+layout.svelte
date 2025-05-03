<script lang="ts">
	import Footer from '$components/Footer.svelte';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
</script>

<svelte:head>
	<title>LIS Sola ADMIN | Pengelolaan data LIS</title>
	<meta name="description" content="Pengelolaan jadwal, jam, dan titik tugas" />
</svelte:head>

<NavigationAdmin />
<div class="container">
	<slot />
</div>
<Footer />
