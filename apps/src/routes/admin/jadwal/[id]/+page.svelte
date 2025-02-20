<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';
	import {
		ArchiveOutline,
		CashOutline,
		UsersOutline,
		PrinterOutline,
		TrashBinOutline
	} from 'flowbite-svelte-icons';
	import JadwalKonfirmasi from '$components/jadwal/JadwalKonfirmasi.svelte';

	export let data;

	$: jadwalDetail = data.jadwalDetail;
	$: users = data.users;
	$: zones = data.zones;

	let openRow: number | null = null;

	const toggleRow = (i: number) => {
		openRow = openRow === i ? null : i;
	};

	let deleting = false;
	// let defaultModal = false;
</script>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin/jadwal">Jadwal</BreadcrumbItem>
	<BreadcrumbItem href={`/admin/jadwal/${jadwalDetail.id}`}>
		{jadwalDetail.mass}
	</BreadcrumbItem>
</Breadcrumb>

<h1 class="my-4 text-xl font-bold">{jadwalDetail.mass}</h1>

<div class="flex flex-col gap-4">
	<ul class="flex gap-4 text-sm font-light text-gray-500">
		<li class="flex items-center gap-2"><UsersOutline class="size-4" /><span>Petugas</span></li>
		<li class="flex items-center gap-2"><ArchiveOutline class="size-4" /> <span>PPG</span></li>
		<li class="flex items-center gap-2"><CashOutline class="size-4" /> <span>Kolekte</span></li>
	</ul>
	<div class="flex justify-end gap-2">
		<form
			method="POST"
			action="?/deactivate"
			use:enhance={() => {
				deleting = true;
				return ({ update }) => {
					update({ reset: false });
				};
			}}
		>
			<Button type="submit" size="xs" color="light" class="ml-2" disabled={deleting}>
				<TrashBinOutline class="me-2 h-5 w-5" />
				{deleting ? 'Menghapus...' : 'Hapus'}
			</Button>
		</form>
		<Button
			size="xs"
			on:click={() => window.open(`/admin/jadwal/${jadwalDetail.id}/cetak`, '_blank')}
		>
			<PrinterOutline class="me-2 h-5 w-5" /> Cetak
		</Button>
	</div>
</div>

<div class="mt-4">
	{#if jadwalDetail.rows && jadwalDetail.rows.length > 0}
		<JadwalKonfirmasi rows={jadwalDetail.rows} {openRow} {toggleRow} {users} {zones} />
	{:else}
		<p>Data tidak ditemukan</p>
	{/if}
</div>
