<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		Alert,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		Input,
		Label,
		Modal,
		P,
		Select,
		Spinner,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { PenOutline, PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import type { PageProps } from './$types';
	import type { Station, Zone } from '$core/entities/Facility';
	import type { Ministry } from '$core/entities/Ministry';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	const stations = $derived(data.stations);
	const zones = $derived(data.zones);
	const ministries = $derived(data.ministries);

	// Build lookup maps for display
	const zoneMap = $derived(new Map(zones.map((z: Zone) => [z.id, z.name])));
	const ministryMap = $derived(new Map(ministries.map((m: Ministry) => [m.id, m.name])));

	const zoneOptions = $derived(zones.map((z: Zone) => ({ value: z.id, name: z.name })));
	const ministryOptions = $derived(ministries.map((m: Ministry) => ({ value: m.id, name: m.name })));

	let openDropdownId = $state<string | null>(null);
	let showDeleteModal = $state(false);
	let showFormModal = $state(false);
	let selectedStation = $state<Station | null>(null);
	let isSubmitting = $state(false);
	let showAlert = $state(true);

	// Form fields
	let formName = $state('');
	let formCode = $state('');
	let formDescription = $state('');
	let formZoneId = $state('');
	let formMinistryId = $state('');
	let formSequence = $state('');

	function openCreateModal() {
		selectedStation = null;
		formName = '';
		formCode = '';
		formDescription = '';
		formZoneId = zones[0]?.id ?? '';
		formMinistryId = ministries[0]?.id ?? '';
		formSequence = '';
		showFormModal = true;
	}

	function openEditModal(s: Station) {
		selectedStation = s;
		formName = s.name;
		formCode = s.code ?? '';
		formDescription = s.description ?? '';
		formZoneId = s.zoneId;
		formMinistryId = s.ministryId;
		formSequence = s.sequence != null ? String(s.sequence) : '';
		showFormModal = true;
		openDropdownId = null;
	}

	function openDeleteModal(s: Station) {
		selectedStation = s;
		showDeleteModal = true;
		openDropdownId = null;
	}

	$effect(() => {
		if (form?.success || form?.error) {
			setTimeout(() => { showAlert = false; }, 10000);
			isSubmitting = false;
			if (form?.success) {
				showFormModal = false;
				showDeleteModal = false;
			}
		}
	});
</script>

<svelte:head>
	<title>Pos</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
	<BreadcrumbItem>Pos</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<div class="mb-4 flex items-right justify-between">
		<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
			Pengaturan Pos
		</Heading>
		<Button color="blue" onclick={openCreateModal} disabled={zones.length === 0 || ministries.length === 0}>
			<PlusOutline class="mr-2 h-4 w-4" />
			Tambah
		</Button>
	</div>

	{#if zones.length === 0}
		<Alert color="yellow" class="mb-4">
			<p>Belum ada zona. Silakan buat zona terlebih dahulu sebelum menambahkan pos.</p>
		</Alert>
	{/if}

	{#if form?.success && showAlert}
		<Alert color="green" class="mb-4"><p>Berhasil disimpan.</p></Alert>
	{/if}
	{#if form?.error && showAlert}
		<Alert color="red" class="mb-4"><p>{form.error}</p></Alert>
	{/if}

	{#if stations.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Belum ada pos.</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">Pos adalah titik penugasan spesifik dalam zona, misal "Pintu 1" atau "Lorong Kiri 3".</p>
		</div>
	{:else}
		<Table striped={true} shadow>
			<caption class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
				Keterangan
				<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
					Pos adalah titik penugasan petugas dalam zona. Setiap pos dikaitkan dengan jenis pelayanan.
				</p>
			</caption>
			<TableHead>
				<TableHeadCell>Kode</TableHeadCell>
				<TableHeadCell>Nama</TableHeadCell>
				<TableHeadCell>Zona</TableHeadCell>
				<TableHeadCell>Pelayanan</TableHeadCell>
				<TableHeadCell>Urutan</TableHeadCell>
				<TableHeadCell><span class="sr-only">Aksi</span></TableHeadCell>
			</TableHead>
			<TableBody>
				{#each stations as s}
					<TableBodyRow>
						<TableBodyCell>{s.code || '-'}</TableBodyCell>
						<TableBodyCell>{s.name}</TableBodyCell>
						<TableBodyCell>{zoneMap.get(s.zoneId) ?? '-'}</TableBodyCell>
						<TableBodyCell>{ministryMap.get(s.ministryId) ?? '-'}</TableBodyCell>
						<TableBodyCell>{s.sequence ?? '-'}</TableBodyCell>
						<TableBodyCell>
							<div class="relative" data-dropdown-menu>
								<Button size="xs" color="light" onclick={() => openDropdownId = openDropdownId === s.id ? null : s.id} disabled={isSubmitting} title="Opsi">
									<span class="text-lg leading-none">⋮</span>
								</Button>
								{#if openDropdownId === s.id}
									<div class="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" data-dropdown-menu>
										<button type="button" class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700" onclick={() => openEditModal(s)}>
											<PenOutline class="h-4 w-4" /><span>Edit</span>
										</button>
										<button type="button" class="mt-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" onclick={() => openDeleteModal(s)}>
											<TrashBinOutline class="h-4 w-4" /><span>Hapus</span>
										</button>
									</div>
								{/if}
							</div>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</div>

<!-- Create / Edit Modal -->
<Modal title={selectedStation ? 'Edit Pos' : 'Tambah Pos'} bind:open={showFormModal}>
	<form
		method="POST"
		action={selectedStation ? '?/update' : '?/create'}
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				isSubmitting = false;
			};
		}}
	>
		{#if selectedStation}
			<input type="hidden" name="stationId" value={selectedStation.id} />
		{/if}

		<div class="mb-4">
			<Label for="name" class="mb-2">Nama Pos <span class="text-red-500">*</span></Label>
			<Input id="name" name="name" bind:value={formName} placeholder="cth. Pintu 1" required />
		</div>
		<div class="mb-4">
			<Label for="code" class="mb-2">Kode</Label>
			<Input id="code" name="code" bind:value={formCode} placeholder="cth. D1" />
		</div>
		<div class="mb-4">
			<Label for="zoneId" class="mb-2">Zona <span class="text-red-500">*</span></Label>
			<Select id="zoneId" name="zoneId" bind:value={formZoneId} items={zoneOptions} required />
		</div>
		<div class="mb-4">
			<Label for="ministryId" class="mb-2">Pelayanan <span class="text-red-500">*</span></Label>
			<Select id="ministryId" name="ministryId" bind:value={formMinistryId} items={ministryOptions} required />
		</div>
		<div class="mb-4">
			<Label for="description" class="mb-2">Deskripsi</Label>
			<Input id="description" name="description" bind:value={formDescription} placeholder="cth. Pintu utama sebelah kiri" />
		</div>
		<div class="mb-4">
			<Label for="sequence" class="mb-2">Urutan</Label>
			<Input id="sequence" name="sequence" type="number" bind:value={formSequence} placeholder="cth. 1" />
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" color="alternative" onclick={() => (showFormModal = false)} disabled={isSubmitting}>Batal</Button>
			<Button type="submit" color="blue" disabled={isSubmitting}>
				{#if isSubmitting}<Spinner class="mr-2" />{/if}
				{selectedStation ? 'Simpan' : 'Tambah'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal title="Hapus Pos" bind:open={showDeleteModal}>
	{#if selectedStation}
		<P class="mb-4">
			Apakah Anda yakin ingin menghapus pos <strong>{selectedStation.name}</strong>?
		</P>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					await invalidateAll();
					isSubmitting = false;
				};
			}}
		>
			<input type="hidden" name="stationId" value={selectedStation.id} />
			<div class="flex justify-end gap-2">
				<Button type="button" color="alternative" onclick={() => (showDeleteModal = false)} disabled={isSubmitting}>Batal</Button>
				<Button type="submit" color="red" disabled={isSubmitting}>
					{#if isSubmitting}<Spinner class="mr-2" />{/if}
					Hapus
				</Button>
			</div>
		</form>
	{/if}
</Modal>

<svelte:window onclick={(e) => {
	if (openDropdownId) {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-dropdown-menu]')) openDropdownId = null;
	}
}} />
