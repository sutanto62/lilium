<script lang="ts">
	import Footer from '$components/Footer.svelte';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
</script>

<svelte:head>
	<title>LIS Sola ADMIN | Pengelolaan data LIS</title>
	<meta name="description" content="Pengelolaan jadwal, jam, dan titik tugas" />
</svelte:head>

<NavigationAdmin />
<main class="relative h-full w-full overflow-y-auto bg-white dark:bg-gray-800">
	<!-- <main class="mx-auto bg-gray-50 dark:bg-gray-900"> -->
	<div class="container mx-auto px-4 py-8 pt-24 dark:bg-gray-900 md:pt-32 lg:px-0">
		<slot />
	</div>
</main>
<Footer />
