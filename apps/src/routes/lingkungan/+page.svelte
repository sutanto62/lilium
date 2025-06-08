<script lang="ts">
	import type { Lingkungan } from '$core/entities/Schedule';
	import { Breadcrumb, BreadcrumbItem, Button } from 'flowbite-svelte';
	import LingkunganTataTertib from './LingkunganTataTertib.svelte';

	let { data } = $props();
	let events = $derived(data.events ?? []);
	let lingkungan = $derived(data.lingkungan ?? ({} as Lingkungan));
</script>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem>Lingkungan {lingkungan.name}</BreadcrumbItem>
</Breadcrumb>

{#if data.success && events.length > 0}
	<LingkunganTataTertib {events} {lingkungan} />
{:else}
	<!-- TODO: change this to a more user friendly message -->
	<p>Halaman ini hanya untuk pengguna yang terdaftar pada lingkungan.</p>
	<Button class="mt-4" href="/">Kembali</Button>
{/if}
