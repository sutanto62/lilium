<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import JadwalKonfirmasi from '$components/jadwal/JadwalKonfirmasi.svelte';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import { Breadcrumb, BreadcrumbItem, Button, P, Toast } from 'flowbite-svelte';
	import {
		ArchiveOutline,
		CashOutline,
		ExclamationCircleSolid,
		PenOutline,
		PrinterOutline,
		TrashBinOutline,
		UsersOutline
	} from 'flowbite-svelte-icons';

	let { data } = $props();

	let eventDetail = $derived(data.eventDetail);
	let zones = $derived(data.zones);

	let openRow = $state<number | null>(null);
	let isDeleteConfirmation = $state(false);
	let deleting = $state(false);

	const toggleRow = (i: number) => {
		openRow = openRow === i ? null : i;
	};

	// let defaultModal = false;
</script>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/jadwal">Jadwal</BreadcrumbItem>
	<BreadcrumbItem>
		{eventDetail.mass}
	</BreadcrumbItem>
</Breadcrumb>

<h1 class="my-4 text-xl font-bold">
	{formatDate(eventDetail.date ?? '', 'long')} - {eventDetail.mass}
</h1>

<div class="flex flex-col gap-4">
	<ul class="flex gap-4 text-sm font-light text-gray-500">
		<li class="flex items-center gap-2"><UsersOutline class="size-4" /><span>Petugas</span></li>
		<li class="flex items-center gap-2"><ArchiveOutline class="size-4" /> <span>PPG</span></li>
		<li class="flex items-center gap-2"><CashOutline class="size-4" /> <span>Kolekte</span></li>
	</ul>
	<div class="flex justify-end gap-2">
		<Button
			onclick={() => (isDeleteConfirmation = true)}
			type="submit"
			size="xs"
			color="light"
			class="ml-2 bg-red-200"
			disabled={deleting}
		>
			<TrashBinOutline class="me-2 h-5 w-5" />
			{deleting ? 'Menghapus...' : 'Hapus Misa'}
		</Button>
		<Button type="submit" size="xs" color="light" class="alternative">
			<PenOutline class="me-2 h-5 w-5" />Tambah PIC
		</Button>
		<Button
			size="xs"
			onclick={() => window.open(`/admin/jadwal/${eventDetail.id}/cetak`, '_blank')}
		>
			<PrinterOutline class="me-2 h-5 w-5" /> Cetak
		</Button>
	</div>
</div>

<div class="mt-4">
	{#if eventDetail.rows && eventDetail.rows.length > 0}
		<JadwalKonfirmasi rows={eventDetail.rows} {openRow} {toggleRow} {zones} />
	{:else}
		<p>Data tidak ditemukan</p>
	{/if}
</div>

{#if isDeleteConfirmation}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<Toast align={false} color="red" class="w-auto" dismissable={false}>
			{#snippet icon()}
				<ExclamationCircleSolid class="size-8" />
			{/snippet}
			<div class="ms-6">
				<h1 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
					Menghapus Jadwal Misa
				</h1>
				<P class="mb-3 text-sm font-light">
					Lingkungan tidak akan dapat melakukan konfirmasi untuk tugas tata tertib pada misa <strong
						>{eventDetail.mass}</strong
					>.
				</P>
				<form
					method="POST"
					action="?/deactivate"
					use:enhance={() => {
						deleting = true;
						return async ({ result, update }) => {
							deleting = false;
							if (result.type === 'redirect') {
								isDeleteConfirmation = false;
								await goto(result.location);
							}
						};
					}}
				>
					<div class="flex gap-2">
						<Button size="sm" type="submit" disabled={deleting}>
							{#if deleting}
								Menghapus...
							{:else}
								Ya! Saya yakin
							{/if}
						</Button>
						<Button
							size="sm"
							type="button"
							color="alternative"
							disabled={deleting}
							onclick={() => (isDeleteConfirmation = false)}
						>
							Batal
						</Button>
					</div>
				</form>
			</div>
		</Toast>
	</div>
{/if}
