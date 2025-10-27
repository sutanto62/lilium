<script lang="ts">
	import FeatureCard from '$components/FeatureCard.svelte';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';
	import { FeatureDefault } from 'flowbite-svelte-blocks';
	import { onMount } from 'svelte';

	onMount(async () => {
		await statsigService.logEvent('admin_view', 'load');
	});
</script>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem>Admin</BreadcrumbItem>
</Breadcrumb>

<FeatureDefault class="mb-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
	<FeatureCard
		title="Jadwal Tata Tertib"
		description="Kelola jadwal tata tertib lingkungan. Melihat kelengkapan petugas per misa. Cetak daftar petugas."
		buttonHref="/admin/jadwal"
		buttonText="Kelola"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Jadwal Misa"
		description="Melihat dan membuat jadwal misa. Buka sebulan sekali untuk membuat jadwal satu bulan penuh."
		buttonHref="/admin/misa"
		buttonText="Misa"
		buttonColor="alternative"
	/>
</FeatureDefault>
