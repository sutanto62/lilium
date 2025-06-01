<script lang="ts">
	import { Navbar, NavBrand } from 'flowbite-svelte';
</script>

<Navbar color="primary bg-primary-200" class="mb-7 py-7 print:hidden" fluid={true} id="nav">
	<div class="container sm:px-0 md:px-3">
		<NavBrand href="/">
			<!-- Kidung Agung 2:2 -->
			<img src="/images/logi.png" class="size-16" alt="LIS logo" />
			<span class="self-center whitespace-nowrap text-2xl font-bold dark:text-white"
				>{import.meta.env.VITE_SITE_TITLE || 'Lilium Inter Spinas'}</span
			>
		</NavBrand>
	</div>
</Navbar>
