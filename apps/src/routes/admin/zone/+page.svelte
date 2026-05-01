<script lang="ts">
	import FeatureCard from '$components/FeatureCard.svelte';
	import { Breadcrumb, BreadcrumbItem, Heading } from 'flowbite-svelte';
	import { FeatureDefault } from 'flowbite-svelte-blocks';
</script>

<svelte:head>
	<title>Zona &amp; Misa</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem>Zona</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-4 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
	Konfigurasi Zona &amp; Misa
</Heading>

<FeatureDefault class="mb-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
	<FeatureCard
		title="Jadwal Misa"
		description="Buat dan kelola template jadwal misa. Tentukan hari, waktu, dan kode misa."
		buttonHref="/admin/data-misa"
		buttonText="Kelola Misa"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Zona"
		description="Buat dan kelola zona titik tugas. Setiap zona mewakili area pelayanan di gereja."
		buttonHref="/admin/data-zona"
		buttonText="Kelola Zona"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Relasi Misa-Zona"
		description="Tentukan zona mana yang melayani setiap jadwal misa."
		buttonHref="/admin/data-zona-misa"
		buttonText="Kelola Relasi"
		buttonColor="alternative"
	/>
</FeatureDefault>
