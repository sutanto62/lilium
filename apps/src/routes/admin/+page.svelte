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

<FeatureDefault class="mb-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
	<FeatureCard
		title="Jadwal Tata Tertib"
		description="Kelola jadwal tata tertib lingkungan per misa. Cetak daftar petugas."
		buttonHref="/admin/jadwal"
		buttonText="Kelola"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Jadwal Misa"
		description="Buat jadwal misa bulanan. Satu bulan sekali."
		buttonHref="/admin/misa"
		buttonText="Jadwal"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Posisi"
		description="Konfigurasi posisi titik tugas per jenis misa."
		buttonHref="/admin/posisi"
		buttonText="Posisi"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Template Misa"
		description="Definisikan jenis-jenis misa: hari, waktu, dan kodenya."
		buttonHref="/admin/zone/misa"
		buttonText="Template"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Zona"
		description="Buat dan kelola zona titik tugas di gereja."
		buttonHref="/admin/zone/zona"
		buttonText="Zona"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Misa–Zona"
		description="Tentukan zona mana yang melayani tiap jenis misa."
		buttonHref="/admin/zone/misa-zona"
		buttonText="Relasi"
		buttonColor="alternative"
	/>
</FeatureDefault>
