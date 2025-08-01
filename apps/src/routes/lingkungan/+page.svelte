<script lang="ts">
	import { Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';
	import LingkunganTitikTugas from './LingkunganTitikTugas.svelte';

	let { data, form } = $props();
</script>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem>Lingkungan</BreadcrumbItem>
</Breadcrumb>

<LingkunganTitikTugas {data} {form} />
