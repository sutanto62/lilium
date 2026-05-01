<script lang="ts">
	import { Breadcrumb, BreadcrumbItem, Heading, P } from 'flowbite-svelte';
</script>

<svelte:head>
	<title>Pengaturan</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem>Pengaturan</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-2 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
	Pengaturan
</Heading>
<P class="text-gray-500 dark:text-gray-400">
	Pilih kategori pengaturan dari menu di sebelah kiri.
</P>
