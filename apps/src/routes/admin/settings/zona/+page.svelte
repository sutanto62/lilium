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
	import type { Zone, Section } from '$core/entities/Facility';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	const zones = $derived(data.zones);
	const sections = $derived(data.sections);

	// Build section lookup for display
	const sectionMap = $derived(
		new Map(sections.map((s: Section) => [s.id, s.name]))
	);

	const sectionOptions = $derived([
		{ value: '', name: '— Tanpa Seksi —' },
		...sections.map((s: Section) => ({ value: s.id, name: s.name }))
	]);

	let filterSectionId = $state('');

	const filteredZones = $derived(
		filterSectionId ? zones.filter((z: Zone) => z.sectionId === filterSectionId) : zones
	);

	let openDropdownId = $state<string | null>(null);
	let showDeleteModal = $state(false);
	let showFormModal = $state(false);
	let selectedZone = $state<Zone | null>(null);
	let isSubmitting = $state(false);
	let showAlert = $state(true);

	// Form fields
	let formName = $state('');
	let formCode = $state('');
	let formDescription = $state('');
	let formSectionId = $state('');
	let formSequence = $state('');

	function openCreateModal() {
		selectedZone = null;
		formName = '';
		formCode = '';
		formDescription = '';
		formSectionId = '';
		formSequence = '';
		showFormModal = true;
	}

	function openEditModal(z: Zone) {
		selectedZone = z;
		formName = z.name;
		formCode = z.code ?? '';
		formDescription = z.description ?? '';
		formSectionId = z.sectionId ?? '';
		formSequence = z.sequence != null ? String(z.sequence) : '';
		showFormModal = true;
		openDropdownId = null;
	}

	function openDeleteModal(z: Zone) {
		selectedZone = z;
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
	<title>Zona</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
	<BreadcrumbItem>Zona</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<div class="mb-4 flex items-right justify-between">
		<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
			Pengaturan Zona
		</Heading>
		<Button color="blue" onclick={openCreateModal}>
			<PlusOutline class="mr-2 h-4 w-4" />
			Tambah
		</Button>
	</div>

	<div class="mb-4 flex items-center gap-2">
		<Label for="filterSection" class="whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">Filter Seksi</Label>
		<Select id="filterSection" bind:value={filterSectionId} items={[{ value: '', name: 'Semua Seksi' }, ...sections.map((s: Section) => ({ value: s.id, name: s.name }))]} class="w-56" />
	</div>

	{#if form?.success && showAlert}
		<Alert color="green" class="mb-4"><p>Berhasil disimpan.</p></Alert>
	{/if}
	{#if form?.error && showAlert}
		<Alert color="red" class="mb-4"><p>{form.error}</p></Alert>
	{/if}

	{#if zones.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Belum ada zona.</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">Zona adalah area pelayanan dalam seksi, misal "Lorong Kiri" atau "Pintu Masuk Utama".</p>
		</div>
	{:else}
		<Table striped={true} shadow>
			<caption class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
				Keterangan
				<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
					Zona adalah area pelayanan di dalam seksi. Setiap zona berisi satu atau beberapa pos.
				</p>
			</caption>
			<TableHead>
				<TableHeadCell>Kode</TableHeadCell>
				<TableHeadCell>Nama</TableHeadCell>
				<TableHeadCell>Seksi</TableHeadCell>
				<TableHeadCell>Deskripsi</TableHeadCell>
				<TableHeadCell>Urutan</TableHeadCell>
				<TableHeadCell><span class="sr-only">Aksi</span></TableHeadCell>
			</TableHead>
			<TableBody>
				{#each filteredZones as z}
					<TableBodyRow>
						<TableBodyCell>{z.code || '-'}</TableBodyCell>
						<TableBodyCell>{z.name}</TableBodyCell>
						<TableBodyCell>{z.sectionId ? (sectionMap.get(z.sectionId) ?? '-') : '-'}</TableBodyCell>
						<TableBodyCell>{z.description || '-'}</TableBodyCell>
						<TableBodyCell>{z.sequence ?? '-'}</TableBodyCell>
						<TableBodyCell>
							<div class="relative" data-dropdown-menu>
								<Button size="xs" color="light" onclick={() => openDropdownId = openDropdownId === z.id ? null : z.id} disabled={isSubmitting} title="Opsi">
									<span class="text-lg leading-none">⋮</span>
								</Button>
								{#if openDropdownId === z.id}
									<div class="absolute right-0 z-20 mt-2 w-44 bottom-full rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" data-dropdown-menu>
										<button type="button" class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700" onclick={() => openEditModal(z)}>
											<PenOutline class="h-4 w-4" /><span>Edit</span>
										</button>
										<button type="button" class="mt-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" onclick={() => openDeleteModal(z)}>
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
<Modal title={selectedZone ? 'Edit Zona' : 'Tambah Zona'} bind:open={showFormModal}>
	<form
		method="POST"
		action={selectedZone ? '?/update' : '?/create'}
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				isSubmitting = false;
			};
		}}
	>
		{#if selectedZone}
			<input type="hidden" name="zoneId" value={selectedZone.id} />
		{/if}

		<div class="mb-4">
			<Label for="name" class="mb-2">Nama Zona <span class="text-red-500">*</span></Label>
			<Input autocomplete="off" id="name" name="name" bind:value={formName} placeholder="cth. Lorong Kiri" required />
		</div>
		<div class="mb-4">
			<Label for="code" class="mb-2">Kode</Label>
			<Input autocomplete="off" id="code" name="code" bind:value={formCode} placeholder="cth. LEFT" />
		</div>
		<div class="mb-4">
			<Label for="sectionId" class="mb-2">Seksi</Label>
			<Select id="sectionId" name="sectionId" bind:value={formSectionId} items={sectionOptions} />
		</div>
		<div class="mb-4">
			<Label for="description" class="mb-2">Deskripsi</Label>
			<Input autocomplete="off" id="description" name="description" bind:value={formDescription} placeholder="cth. Lorong sebelah kiri altar" />
		</div>
		<div class="mb-4">
			<Label for="sequence" class="mb-2">Urutan</Label>
			<Input autocomplete="off" id="sequence" name="sequence" type="number" bind:value={formSequence} placeholder="cth. 1" />
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" color="alternative" onclick={() => (showFormModal = false)} disabled={isSubmitting}>Batal</Button>
			<Button type="submit" color="blue" disabled={isSubmitting}>
				{#if isSubmitting}<Spinner class="mr-2" />{/if}
				{selectedZone ? 'Simpan' : 'Tambah'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal title="Hapus Zona" bind:open={showDeleteModal}>
	{#if selectedZone}
		<P class="mb-4">
			Apakah Anda yakin ingin menghapus zona <strong>{selectedZone.name}</strong>? Pos di dalam zona ini tidak akan terhapus.
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
			<input type="hidden" name="zoneId" value={selectedZone.id} />
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
