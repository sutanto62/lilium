<script lang="ts">
	import { page } from '$app/state';
	import FeatureCard from '$components/FeatureCard.svelte';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import { Heading, P } from 'flowbite-svelte';
	import { FeatureDefault, Section } from 'flowbite-svelte-blocks';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	const { data = $bindable() } = $props<{
		data: PageData;
	}>();

	onMount(async () => {
		const metadata = {
			is_admin: data.isAdmin || false,
			is_user: data.isUser || false,
			no_saturday_sunday_enabled: data.isNoSaturdaySunday || false
		};

		await Promise.all([
			statsigService.logEvent('home_view', 'menu', page.data.session || undefined, metadata),
			tracker.track(
				'home_view',
				{
					event_type: 'page_load',
					...metadata
				},
				page.data.session,
				page
			)
		]);
	});

	async function handleFeatureClick(featureName: string, href: string) {
		const metadata = {
			feature_name: featureName,
			feature_href: href,
			is_admin: data.isAdmin || false
		};

		await Promise.all([
			statsigService.logEvent(
				'home_feature_click',
				'navigation',
				page.data.session || undefined,
				metadata
			),
			tracker.track(
				'home_feature_click',
				{
					event_type: 'feature_navigation',
					...metadata
				},
				page.data.session,
				page
			)
		]);
	}
</script>

<svelte:head>
	<title>{import.meta.env.VITE_SITE_TITLE || 'Lilium Inter Spinas'} | Beranda</title>
	<meta
		name="description"
		content="Selamat datang! L.I.S (Laurentius Information System) adalah sistem informasi pelayanan Paroki Alam Sutera."
	/>
</svelte:head>

<Section name="feature">
	<!-- TODO: Provide separate page for admin related features -->

	<Heading tag="h2" class="text-4xl tracking-tight text-gray-900 dark:text-white">
		Selamat Melayani
	</Heading>
	<P>Sistem informasi pelayanan Paroki Alam Sutera. Hanya untuk kalangan sendiri.</P>
	{#if data.isAdmin}
		<FeatureDefault class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
			<FeatureCard
				title="Jadwal Tata Tertib"
				description="Kelola jadwal tata tertib lingkungan. Melihat kelengkapan petugas per misa. Cetak daftar petugas."
				buttonHref="/admin/jadwal"
				buttonText="Kelola"
				onclick={() => handleFeatureClick('Jadwal Tata Tertib', '/admin/jadwal')}
			/>
			<FeatureCard
				title="Pengaturan Misa"
				description="Melihat dan membuat jadwal misa. Buka sebulan sekali untuk membuat jadwal satu bulan penuh."
				buttonHref="/admin/misa"
				buttonText="Misa"
				buttonColor="alternative"
				onclick={() => handleFeatureClick('Pengaturan Misa', '/admin/misa')}
			/>
		</FeatureDefault>
	{/if}
	<FeatureDefault class="mb-4 mt-8 grid grid-cols-1 gap-4 md:grid-cols-4 ">
		<FeatureCard
			title="Tugas Tata Tertib"
			description="Konfirmasi kehadiran tugas tata tertib lingkungan."
			buttonHref="/f/tatib"
			buttonText="Konfirmasi"
			onclick={() => handleFeatureClick('Tugas Tata Tertib', '/f/tatib')}
		/>

		<FeatureCard
			title="Lingkungan"
			description="Lihat titik tugas sesuai konfirmasi pengurus lingkungan."
			buttonHref="/lingkungan"
			buttonText="Cek Titik Tugas"
			buttonColor="alternative"
			onclick={() => handleFeatureClick('Lingkungan', '/lingkungan')}
		/>

		<FeatureCard
			title="Petunjuk Pemakaian"
			description="Aturan, tata cara, dan hal penting lain yang perlu diketahui selama mempergunakan sistem."
			buttonHref="/f/petunjuk"
			buttonText="Baca"
			buttonColor="alternative"
			onclick={() => handleFeatureClick('Petunjuk Pemakaian', '/f/petunjuk')}
		/>
	</FeatureDefault>
</Section>
