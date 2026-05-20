<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
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
		Spinner,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Textarea
	} from 'flowbite-svelte';
	import { PenOutline, PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import type { PageProps } from './$types';
	import type { ChurchZoneGroup } from '$core/entities/Schedule';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	const zoneGroups = $derived(data.zoneGroups);

	let openDropdownId = $state<string | null>(null);
	let showDeleteModal = $state(false);
	let showFormModal = $state(false);
	let selectedGroup = $state<ChurchZoneGroup | null>(null);
	let isSubmitting = $state(false);
	let showAlert = $state(true);

	let formName = $state('');
	let formCode = $state('');
	let formDescription = $state('');
	let formSequence = $state('');

	function openCreateModal() {
		selectedGroup = null;
		formName = '';
		formCode = '';
		formDescription = '';
		formSequence = '';
		showFormModal = true;
	}

	function openEditModal(group: ChurchZoneGroup) {
		selectedGroup = group;
		formName = group.name;
		formCode = group.code ?? '';
		formDescription = group.description ?? '';
		formSequence = group.sequence != null ? String(group.sequence) : '';
		showFormModal = true;
		openDropdownId = null;
	}

	function openDeleteModal(group: ChurchZoneGroup) {
		selectedGroup = group;
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

	$effect(() => {
		if (data.zoneGroups !== undefined) {
			const session = page.data.session || undefined;
			const metadata = { total_zone_groups: data.zoneGroups?.length || 0, has_zone_groups: (data.zoneGroups?.length || 0) > 0 };
			Promise.all([
				statsigService.logEvent('admin_zone_zona_group_view', 'load', session, metadata),
				tracker.track('admin_zone_zona_group_view', metadata, session, page)
			]);
		}
	});
</script>

<svelte:head>
	<title>Kelola Grup Zona</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
	<BreadcrumbItem>Grup Zona</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<div class="mb-4 flex items-center justify-between">
		<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
			Kelola Grup Zona
		</Heading>
		<Button color="blue" onclick={openCreateModal}>
			<PlusOutline class="mr-2 h-4 w-4" />
			Tambah Grup Zona
		</Button>
	</div>

	{#if form?.success && showAlert}
		<Alert color="green" class="mb-4"><p>Berhasil disimpan.</p></Alert>
	{/if}
	{#if form?.error && showAlert}
		<Alert color="red" class="mb-4"><p>{form.error}</p></Alert>
	{/if}

	{#if zoneGroups.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Belum ada grup zona.</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">Klik tombol "Tambah Grup Zona" untuk menambahkan grup pertama.</p>
		</div>
	{:else}
		<Table striped={true} shadow>
			<caption class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
				Daftar Grup Zona
				<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">Pengelompokan zona titik tugas di gereja.</p>
			</caption>
			<TableHead>
				<TableHeadCell>Kode</TableHeadCell>
				<TableHeadCell>Nama</TableHeadCell>
				<TableHeadCell>Deskripsi</TableHeadCell>
				<TableHeadCell>Urutan</TableHeadCell>
				<TableHeadCell>Status</TableHeadCell>
				<TableHeadCell><span class="sr-only">Aksi</span></TableHeadCell>
			</TableHead>
			<TableBody>
				{#each zoneGroups as group}
					<TableBodyRow>
						<TableBodyCell>{group.code || '-'}</TableBodyCell>
						<TableBodyCell>{group.name}</TableBodyCell>
						<TableBodyCell>{group.description || '-'}</TableBodyCell>
						<TableBodyCell>{group.sequence ?? '-'}</TableBodyCell>
						<TableBodyCell>
							{#if group.active === 1}
								<span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">Aktif</span>
							{:else}
								<span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">Nonaktif</span>
							{/if}
						</TableBodyCell>
						<TableBodyCell>
							<div class="relative" data-dropdown-menu>
								<Button size="xs" color="light" onclick={() => openDropdownId = openDropdownId === group.id ? null : group.id} disabled={isSubmitting} title="Opsi">
									<span class="text-lg leading-none">⋮</span>
								</Button>
								{#if openDropdownId === group.id}
									<div class="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" data-dropdown-menu>
										<button type="button" class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700" onclick={() => openEditModal(group)}>
											<PenOutline class="h-4 w-4" /><span>Edit</span>
										</button>
										<button type="button" class="mt-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" onclick={() => openDeleteModal(group)}>
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
<Modal title={selectedGroup ? 'Edit Grup Zona' : 'Tambah Grup Zona'} bind:open={showFormModal}>
	<form
		method="POST"
		action={selectedGroup ? '?/update' : '?/create'}
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				isSubmitting = false;
			};
		}}
	>
		{#if selectedGroup}
			<input type="hidden" name="zoneGroupId" value={selectedGroup.id} />
		{/if}

		<div class="mb-4">
			<Label for="name" class="mb-2">Nama Grup Zona <span class="text-red-500">*</span></Label>
			<Input autocomplete="off" id="name" name="name" bind:value={formName} placeholder="cth. Pintu Masuk" required />
		</div>
		<div class="mb-4">
			<Label for="code" class="mb-2">Kode</Label>
			<Input autocomplete="off" id="code" name="code" bind:value={formCode} placeholder="cth. GZA" />
		</div>
		<div class="mb-4">
			<Label for="description" class="mb-2">Deskripsi</Label>
			<Textarea id="description" name="description" bind:value={formDescription} placeholder="Deskripsi grup zona" rows={2} />
		</div>
		<div class="mb-4">
			<Label for="sequence" class="mb-2">Urutan</Label>
			<Input autocomplete="off" id="sequence" name="sequence" type="number" bind:value={formSequence} placeholder="cth. 1" />
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" color="alternative" onclick={() => (showFormModal = false)} disabled={isSubmitting}>Batal</Button>
			<Button type="submit" color="blue" disabled={isSubmitting}>
				{#if isSubmitting}<Spinner class="mr-2" />{/if}
				{selectedGroup ? 'Simpan' : 'Tambah'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal title="Hapus Grup Zona" bind:open={showDeleteModal}>
	{#if selectedGroup}
		<P class="mb-4">
			Apakah Anda yakin ingin menghapus grup zona <strong>{selectedGroup.name}</strong>? Data historis akan tetap tersimpan.
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
			<input type="hidden" name="zoneGroupId" value={selectedGroup.id} />
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
