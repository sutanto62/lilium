<script>
	import { page } from '$app/stores';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
	import { Button } from 'flowbite-svelte';
	import { Section } from 'flowbite-svelte-blocks';

	$: errorMessage =
		{
			404: 'Halaman tidak ditemukan.',
			500: 'Terjadi kesalahan pada server.'
			// Add more status codes as needed
		}[$page.status] || 'Terjadi kesalahan.'; // Default message
</script>

<NavigationAdmin />
<Section name="page404" class="flex flex-col items-center justify-center">
	<h1
		class="mb-4 text-center text-7xl font-extrabold tracking-tight text-primary-600 dark:text-primary-500 lg:text-7xl"
	>
		{$page.status}
	</h1>
	<figure class="w-full text-center">
		{#if $page.status === 404}
			<img
				class="mx-auto mb-4 h-auto rounded-lg"
				src="/images/error-404.png"
				alt="Annibale Carracci painting by Jean-Louis Roullet, 1680-1695"
			/>
			<figcaption class="relative bottom-12 px-4 text-sm text-white">
				<p>Annibale Carracci, Jean-Louis Roullet, 1680-1695</p>
			</figcaption>
		{:else if $page.status === 500}
			<img
				class="mx-auto mb-4 h-auto rounded-lg"
				src="/images/error-500.png"
				alt="Storm op het Meer van Galilea Leven van Christus, Maerten de Vos, 1620"
			/>
			<figcaption class="relative bottom-12 px-4 text-sm text-white">
				<p>Storm op het Meer van Galilea Leven van Christus, Maerten de Vos, 1620</p>
			</figcaption>
		{/if}
	</figure>
	<p class="text-center">
		{$page.error?.message || errorMessage}. Klik
		<span><Button size="xs" href="/">di sini</Button></span> untuk kembali ke halaman utama
	</p>
</Section>
