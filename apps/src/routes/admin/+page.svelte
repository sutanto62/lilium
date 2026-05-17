<script lang="ts">
	import { untrack } from 'svelte';
	import FeatureCard from '$components/FeatureCard.svelte';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import { Breadcrumb, BreadcrumbItem, Heading } from 'flowbite-svelte';
	import { FeatureDefault } from 'flowbite-svelte-blocks';
	import { page } from '$app/state';

	let { data } = $props();
	const isNewRosterFlow = $derived(data.isNewRosterFlow ?? false);

	$effect(() => {
		const session = page.data.session || undefined;
		// Snapshot reactive value so $effect doesn't re-track isNewRosterFlow
		const isRosterFlow = untrack(() => isNewRosterFlow);
		const metadata = { is_new_roster_flow: isRosterFlow };

		Promise.all([
			statsigService.logEvent('admin_dashboard_view', 'load', session, metadata),
			tracker.track('admin_dashboard_view', metadata, session, page)
		]).catch((err) => {
			if (import.meta.env.DEV) console.warn('admin/+page: analytics failed', err);
		});
	});
</script>

<Breadcrumb class="mb-4">
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
