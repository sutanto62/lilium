<script lang="ts">
	import { Alert, Breadcrumb, BreadcrumbItem, Button } from 'flowbite-svelte';
	import { FloppyDiskSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	export let data: PageProps['data'];
	export let form: PageProps['form'];

	$: events = data.events;

	// async function handleSubmit() {
	// 	try {
	// 		await fetch('', {
	// 			method: 'POST',
	// 			headers: {
	// 				'Content-Type': 'application/x-www-form-urlencoded'
	// 			},
	// 			body: new URLSearchParams()
	// 		});
	// 		goto('/admin/misa', { invalidateAll: true });
	// 	} catch (err) {
	// 		alert('Gagal membuat jadwal misa');
	// 	}
	// }

	let showAlert = true;

	onMount(() => {
		if (form?.success || form?.error) {
			setTimeout(() => {
				showAlert = false;
			}, 10000); // 10 seconds
		}
	});
</script>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/admin" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin/misa">Misa</BreadcrumbItem>
</Breadcrumb>

{#if form?.success && showAlert}
	<Alert color="green" class="mb-4">
		<p>Jadwal misa berhasil dibuat</p>
	</Alert>
{/if}

{#if form?.error && showAlert}
	<Alert color="red" class="mb-4">
		<p>{form.error}</p>
	</Alert>
{/if}

<div class="w-full">
	{#if events.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800"
		>
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
				Petugas Tatib masih kosong.
			</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Hubungi para ketua lingkungan untuk segera melakukan konfirmasi.
			</p>
		</div>
	{/if}

	<div class="mb-4">
		<form method="POST">
			<Button type="submit" id="save-button" color="primary">
				<FloppyDiskSolid class="mr-2" />Tambah Jadwal Misa
			</Button>
		</form>
	</div>

	{#each events as event}
		<div>
			<p>{event.weekNumber}/{event.date}: {event.code}, {event.description}</p>
		</div>
	{/each}
</div>
