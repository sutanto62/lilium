<script lang="ts">
	import { Breadcrumb, BreadcrumbItem, Heading, P, Timeline } from 'flowbite-svelte';
	export let data;

	$: masses = data.masses;
</script>

${masses.length}

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/admin" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin/misa">Misa</BreadcrumbItem>
</Breadcrumb>

<div class="w-full">
	{#if masses.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800"
		>
			;
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
				Petugas Tatib masih kosong.
			</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Hubungi para ketua lingkungan untuk segera melakukan konfirmasi.
			</p>
		</div>
	{/if}
	{#each masses as mass}
		<div>
			<p>{mass.name}</p>
		</div>
	{/each}
</div>
