<script lang="ts">
	import type { PageData } from './$types';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
	import { Section, HeroHeader, FeatureDefault } from 'flowbite-svelte-blocks';
	import {
		QuestionCircleSolid,
		ClipboardListSolid,
		UserCircleSolid,
		CalendarMonthSolid
	} from 'flowbite-svelte-icons';
	import FeatureCard from '$components/FeatureCard.svelte';
	import { P, Heading } from 'flowbite-svelte';

	// Props
	export let data: PageData;
</script>

<NavigationAdmin />
<Section name="feature">
	<!-- TODO: Provide separate page for admin related features -->

	<Heading tag="h2" class="mb-4 mt-8 text-4xl tracking-tight text-gray-900 dark:text-white">
		Selamat Melayani
	</Heading>
	<P class="mb-6">Sistem informasi pelayanan Paroki Alam Sutera. Hanya untuk kalangan sendiri.</P>
	{#if data.isAdmin}
		<div class="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-400">
			<!-- <Heading tag="h2" class="mb-2 text-2xl tracking-tight text-gray-900 dark:text-white">
				Menu Admin
			</Heading> -->
			<P size="sm" class="mb-3">
				Menu khusus untuk admin sistem. Hanya dapat diakses oleh pengguna dengan hak akses admin.
			</P>
			<FeatureDefault divClass="grid grid-cols-1 md:grid-cols-4 gap-4">
				<FeatureCard
					icon={ClipboardListSolid}
					title="Jadwal Tata Tertib"
					description="Kelola jadwal tata tertib lingkungan. Melihat kelengkapan petugas per misa. Cetak daftar petugas."
					buttonHref="/admin/jadwal"
					buttonText="Kelola"
					isAdmin={true}
				/>
				<!-- <FeatureCard
					icon={UserCircleSolid}
					title="PIC PETA"
					description="Setiap minggu petugas PETA akan bergantian menjadi PIC pada setiap misa. PIC harus sudah terdaftar."
					buttonHref="/admin/pic"
					buttonText="Atur PIC"
				/> -->
			</FeatureDefault>
		</div>
	{/if}
	<FeatureDefault divClass="grid grid-cols-1 md:grid-cols-4 gap-4 ">
		<FeatureCard
			icon={CalendarMonthSolid}
			title="Tugas Tata Tertib"
			description="Konfirmasi kehadiran tugas tata tertib lingkungan. Jadwal konfirmasi hanya dibuka setiap Senin s.d. Kamis."
			buttonHref="/f/tatib"
			buttonText="Konfirmasi"
		/>
		<FeatureCard
			icon={QuestionCircleSolid}
			title="Petunjuk Pemakaian"
			description="Aturan, tata cara, dan hal penting lain yang perlu diketahui selama mempergunakan sistem."
			buttonHref="/f/petunjuk"
			buttonText="Baca"
			buttonColor="alternative"
		/>
	</FeatureDefault>
</Section>
