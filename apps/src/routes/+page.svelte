<script lang="ts">
	import FeatureCard from '$components/FeatureCard.svelte';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { Heading, P } from 'flowbite-svelte';
	import { FeatureDefault, Section } from 'flowbite-svelte-blocks';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	const { data = $bindable() } = $props<{
		data: PageData;
	}>();

	onMount(async () => {
		await statsigService.logEvent('home_view', 'menu');
	});
</script>

<Section name="feature">
	<!-- TODO: Provide separate page for admin related features -->

	<Heading tag="h2" class="text-4xl tracking-tight text-gray-900 dark:text-white">
		Selamat Melayani
	</Heading>
	<P>Sistem informasi pelayanan Paroki Alam Sutera. Hanya untuk kalangan sendiri.</P>
	{#if data.isAdmin}
		<FeatureDefault class="mb-12 mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
			<FeatureCard
				title="Jadwal Tata Tertib"
				description="Kelola jadwal tata tertib lingkungan. Melihat kelengkapan petugas per misa. Cetak daftar petugas."
				buttonHref="/admin/jadwal"
				buttonText="Kelola"
			/>
			<FeatureCard
				title="Pengaturan Misa"
				description="Melihat dan membuat jadwal misa. Buka sebulan sekali untuk membuat jadwal satu bulan penuh."
				buttonHref="/admin/misa"
				buttonText="Misa"
				buttonColor="alternative"
			/>
		</FeatureDefault>
	{/if}
	<FeatureDefault class="mb-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-4 ">
		<FeatureCard
			title="Tugas Tata Tertib"
			description="Konfirmasi kehadiran tugas tata tertib lingkungan."
			buttonHref="/f/tatib"
			buttonText="Konfirmasi"
		/>

		<FeatureCard
			title="Lingkungan"
			description="Jadwal tugas tata tertib lingkungan dan daftar konfirmasi yang telah berlalu."
			buttonHref="/lingkungan"
			buttonText="Lihat"
			buttonColor="alternative"
		/>

		<FeatureCard
			title="Petunjuk Pemakaian"
			description="Aturan, tata cara, dan hal penting lain yang perlu diketahui selama mempergunakan sistem."
			buttonHref="/f/petunjuk"
			buttonText="Baca"
			buttonColor="alternative"
		/>
	</FeatureDefault>
</Section>
