<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import JadwalKonfirmasi from '$components/jadwal/JadwalKonfirmasi.svelte';
	import type { EventScheduleRows } from '$core/entities/Event';
	import type { ChurchZoneGroup } from '$core/entities/Schedule.js';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Input,
		Label,
		Modal,
		P,
		Select,
		Toast
	} from 'flowbite-svelte';
	import {
		ArchiveOutline,
		CashOutline,
		CirclePlusSolid,
		ExclamationCircleSolid,
		PrinterOutline,
		TrashBinOutline,
		UsersOutline
	} from 'flowbite-svelte-icons';

	let { data } = $props();

	let eventDetail = $derived(data.eventDetail);
	let zones = $derived(data.zones);

	let openRow = $state<number | null>(null);
	let isDeleteConfirmation = $state(false);
	let defaultModalPicZone = $state(false);
	let selectedZoneId = $state<string | null>(null);
	let eventZonePic = $state('');
	let deleting = $state(false);
	let editingZoneRow = $state<EventScheduleRows | null>(null);

	const toggleRow = (i: number) => {
		openRow = openRow === i ? null : i;
	};

	const zoneOptions = $derived(
		zones.map((e: ChurchZoneGroup) => ({ value: e.id ?? '', name: e.name ?? '' }))
	);

	function handleAddPic(event: Event) {
		event.stopPropagation();
		editingZoneRow = null;
		selectedZoneId = null;
		eventZonePic = '';
		defaultModalPicZone = true;
	}

	function handleEditPic(row: EventScheduleRows) {
		editingZoneRow = row;
		selectedZoneId = row.id;
		eventZonePic = row.pic.join(', ');
		defaultModalPicZone = true;
	}

	function resetPicModal() {
		defaultModalPicZone = false;
		editingZoneRow = null;
		selectedZoneId = null;
		eventZonePic = '';
	}
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
		<Button color="alternative" size="xs" onclick={(event: Event) => handleAddPic(event)}
			><CirclePlusSolid class="me-2 h-4 w-4" /> PIC Zona</Button
		>
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
		<JadwalKonfirmasi
			description={eventDetail.description ?? ''}
			rows={eventDetail.rows}
			{openRow}
			{toggleRow}
			{zones}
			onEditPic={handleEditPic}
		/>
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

<!-- PIC modal for add or edit -->
<Modal title={editingZoneRow ? 'Edit PIC Zona' : 'PIC Zona'} bind:open={defaultModalPicZone}>
	<form
		method="POST"
		action="?/updatePic"
		use:enhance={() => {
			return async ({ result, update }) => {
				await update();
				if (result.type === 'success' && result.data?.success) {
					resetPicModal();
				}
			};
		}}
	>
		<input type="hidden" name="mode" value={editingZoneRow ? 'edit' : 'add'} />
		<div class="mb-4 grid gap-4 sm:grid-cols-1">
			<div>
				<Label for="zone" class="mb-2">Zona</Label>
				{#if editingZoneRow}
					<input type="hidden" name="zone" value={selectedZoneId ?? ''} />
					<P class="mt-2 text-gray-700 dark:text-gray-300">{editingZoneRow.name}</P>
				{:else}
					<Select
						id="zone"
						name="zone"
						class="mt-2"
						items={zoneOptions}
						bind:value={selectedZoneId}
						placeholder="Pilih Zona"
						required
					/>
				{/if}
			</div>
			<div>
				<Label for="pic" class="mb-2">Tulis nama</Label>
				<Input
					type="text"
					id="pic"
					name="pic"
					placeholder="Pisahkan nama petugas dengan koma bila lebih dari 1"
					required
					bind:value={eventZonePic}
				/>
			</div>
		</div>
		<div class="flex justify-end">
			<Button type="submit" class="w-28">Simpan</Button>
		</div>
	</form>
</Modal>
