<script lang="ts">
	import { Section, Page404 } from 'flowbite-svelte-blocks';
	import { Button } from 'flowbite-svelte';
</script>

<Section name="page404">
	<Page404>
		<svelte:fragment slot="h1">403</svelte:fragment>
		<svelte:fragment slot="paragraph">
			<p class="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
				Ada yang salah.
			</p>
			<p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
				Maaf, admin tidak memperkenankan akses halaman ini. Hubungi PIC.
			</p>
			<Button href="/" size="lg" color="red">Kembali ke Beranda</Button>
		</svelte:fragment>
	</Page404>
</Section>
