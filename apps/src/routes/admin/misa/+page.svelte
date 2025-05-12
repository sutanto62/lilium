<script lang="ts">
	import { goto } from '$app/navigation';
	import { Breadcrumb, BreadcrumbItem, Button } from 'flowbite-svelte';
	import { FloppyDiskSolid } from 'flowbite-svelte-icons';

	export let data;
	export let form;

	$: events = data.events;
	$: success = form?.success;
	$: error = form?.error;

	async function handleSubmit() {
		try {
			await fetch('?/createEvent', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams()
			});
			alert('Jadwal misa berhasil dibuat');
			goto('/admin/misa', { invalidateAll: true });
		} catch (err) {
			alert('Gagal membuat jadwal misa');
		}
	}
</script>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/admin" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin/misa">Misa</BreadcrumbItem>
</Breadcrumb>

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
		<form on:submit|preventDefault={handleSubmit}>
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
