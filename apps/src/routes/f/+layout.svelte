<script lang="ts">
	import '$src/app.css';
</script>

<svelte:head>
	<title
		>{import.meta.env.VITE_SITE_TITLE || 'Lilium Inter Spinas'} | Form Konfirmasi Tugas Tata Tertib</title
	>
	<meta
		name="description"
		content="Membantu konfirmasi tugas Pelayanan dan Tata Tertib misa dan titik tugas."
	/>
</svelte:head>

<!-- do not add main tag and navigation/footer components here -->
<div class="container mx-auto px-4 pb-8 pt-8 dark:bg-gray-900 sm:pt-8 lg:px-0">
	<slot />
</div>
