<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { Page404, Section } from 'flowbite-svelte-blocks';
</script>

<main class="mx-auto bg-gray-50 dark:bg-gray-900">
	<div class="container mx-auto px-4 pt-24 dark:bg-gray-900 md:pt-32 lg:px-0">
		<Section name="page404">
			<Page404>
				{#snippet h1()}
					403
				{/snippet}
				{#snippet paragraph()}
					<p
						class="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl"
					>
						Ada yang salah.
					</p>
					<p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
						Maaf, admin tidak memperkenankan akses halaman ini. Hubungi PIC.
					</p>
					<Button href="/" size="lg" color="red">Kembali ke Beranda</Button>
				{/snippet}
			</Page404>
		</Section>
	</div>
</main>
