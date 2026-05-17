<script lang="ts">
	import FeatureCard from '$components/FeatureCard.svelte';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { Breadcrumb, BreadcrumbItem, Heading } from 'flowbite-svelte';
	import { FeatureDefault } from 'flowbite-svelte-blocks';
	import { onMount } from 'svelte';

	let { data } = $props();
	const isNewRosterFlow = $derived(data.isNewRosterFlow ?? false);

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
		title="Jadwal Misa"
		description="Buat jadwal perayaan (misa) bulanan. Setiap perayaan menjadi acuan penugasan roster lingkungan."
		buttonHref="/admin/misa"
		buttonText="Buka"
		buttonColor="alternative"
	/>
	{#if isNewRosterFlow}
		<FeatureCard
			title="Roster"
			description="Tugaskan lingkungan ke jadwal misa. Buat secara manual per jadwal atau unggah XLSX bulanan sekaligus."
			buttonHref="/admin/roster"
			buttonText="Buka"
			buttonColor="alternative"
		/>
	{/if}
	<FeatureCard
		title="Tata Tertib"
		description={isNewRosterFlow
			? 'Konfirmasi daftar petugas yang diajukan lingkungan. Pantau status setiap entri roster dan cetak daftar.'
			: 'Kelola penugasan petugas tatib per lingkungan. Cetak dan kelola daftar petugas misa.'}
		buttonHref="/admin/tatib"
		buttonText="Buka"
		buttonColor="alternative"
	/>
</FeatureDefault>
