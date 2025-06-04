<script lang="ts">
	import FeatureCard from '$components/FeatureCard.svelte';
	import Footer from '$components/Footer.svelte';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
	import { Heading, P } from 'flowbite-svelte';
	import { FeatureDefault, Section } from 'flowbite-svelte-blocks';
	import type { PageData } from './$types';

	// Props
	export let data: PageData;
</script>

<NavigationAdmin />
<main class="mx-auto bg-gray-50 dark:bg-gray-900">
	<div class="container mx-auto px-4 pt-24 dark:bg-gray-900 md:pt-32 lg:px-0">
		<Section name="feature">
			<!-- TODO: Provide separate page for admin related features -->

			<Heading tag="h2" class="text-4xl tracking-tight text-gray-900 dark:text-white">
				Selamat Melayani
			</Heading>
			<P>Sistem informasi pelayanan Paroki Alam Sutera. Hanya untuk kalangan sendiri.</P>
			{#if data.isAdmin}
				<FeatureDefault class="mb-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<FeatureCard
						title="Jadwal Tata Tertib"
						description="Kelola jadwal tata tertib lingkungan. Melihat kelengkapan petugas per misa. Cetak daftar petugas."
						buttonHref="/admin/jadwal"
						buttonText="Kelola"
					/>
					<FeatureCard
						title="Jadwal Misa"
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
					description="Konfirmasi kehadiran tugas tata tertib lingkungan. Jadwal konfirmasi hanya dibuka setiap Senin s.d. Kamis."
					buttonHref="/f/tatib"
					buttonText="Konfirmasi"
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
	</div>
</main>
<Footer />
