<script lang="ts">
	import { Navbar, NavBrand } from 'flowbite-svelte';
</script>

<Navbar color="primary" class="mb-7 py-7" fluid={true} id="nav">
	<div class="container sm:px-0 md:px-3">
		<NavBrand href="/">
			<!-- Kidung Agung 2:2 -->
			<img src="/images/lily-amongs-thorns.png" class="size-16" alt="LIS logo" />
			<span class="self-center whitespace-nowrap text-2xl font-bold dark:text-white"
				>Lilium Inter Spinas</span
			>
		</NavBrand>
	</div>
</Navbar>
