<script lang="ts">
	import FeatureCard from '$components/FeatureCard.svelte';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { Breadcrumb, BreadcrumbItem, Heading, Hr } from 'flowbite-svelte';
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
<Heading tag="h3">Pengelolaan Petugas</Heading>
<FeatureDefault class="mb-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
	<FeatureCard
		title="Tata Tertib"
		description="Kelola jadwal tata tertib lingkungan per misa. Cetak daftar petugas."
		buttonHref="/admin/tatib"
		buttonText="Kelola"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Jadwal Bulanan"
		description="Buat jadwal misa bulanan. Satu bulan sekali."
		buttonHref="/admin/misa"
		buttonText="Jadwal"
		buttonColor="alternative"
	/>
</FeatureDefault>
