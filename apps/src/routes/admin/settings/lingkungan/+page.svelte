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
	import type { Community, Wilayah } from '$core/entities/Parish';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	const wilayahs = $derived(data.wilayahs);
	const communities = $derived(data.communities);

	let openDropdownId = $state<string | null>(null);
	let showDeleteModal = $state(false);
	let showFormModal = $state(false);
	let selectedCommunity = $state<Community | null>(null);
	let isSubmitting = $state(false);
	let showAlert = $state(true);

	// Form fields
	let formName = $state('');
	let formWilayahId = $state('');
	let formSequence = $state('');

	const wilayahOptions = $derived(
		wilayahs.map((w: Wilayah) => ({ value: w.id, name: w.name }))
	);

	const filterOptions = $derived([
		{ value: '', name: 'Semua Wilayah' },
		...wilayahs.map((w: Wilayah) => ({ value: w.id, name: w.name }))
	]);

	let filterWilayahId = $state('');

	const filteredCommunities = $derived(
		filterWilayahId ? communities.filter((c: Community) => c.wilayahId === filterWilayahId) : communities
	);

	function openCreateModal() {
		selectedCommunity = null;
		formName = '';
		formWilayahId = wilayahs[0]?.id ?? '';
		formSequence = '';
		showFormModal = true;
	}

	function openEditModal(c: Community) {
		selectedCommunity = c;
		formName = c.name;
		formWilayahId = c.wilayahId;
		formSequence = c.sequence != null ? String(c.sequence) : '';
		showFormModal = true;
		openDropdownId = null;
	}

	function openDeleteModal(c: Community) {
		selectedCommunity = c;
		showDeleteModal = true;
		openDropdownId = null;
	}

	$effect(() => {
		if (form?.success || form?.error) {
			showAlert = true;
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
	<title>Lingkungan</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
	<BreadcrumbItem>Lingkungan</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<div class="mb-4 flex items-center justify-between">
		<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
			Pengaturan Lingkungan
		</Heading>
		<Button color="blue" onclick={openCreateModal} disabled={wilayahs.length === 0}>
			<PlusOutline class="mr-2 h-4 w-4" />
			Tambah
		</Button>
	</div>

	{#if wilayahs.length === 0}
		<Alert color="yellow" class="mb-4">
			<p>Belum ada wilayah terdaftar. Tambahkan wilayah terlebih dahulu sebelum membuat lingkungan.</p>
		</Alert>
	{/if}

	{#if form?.success && showAlert}
		<Alert color="green" class="mb-4"><p>Berhasil disimpan.</p></Alert>
	{/if}
	{#if form?.error && showAlert}
		<Alert color="red" class="mb-4"><p>{form.error}</p></Alert>
	{/if}

	{#if communities.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Belum ada lingkungan.</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Lingkungan adalah komunitas teritorial di bawah wilayah, misalnya "Lingkungan Santo Yohanes".
			</p>
			{#if wilayahs.length > 0}
				<Button color="blue" class="mt-4" onclick={openCreateModal}>
					<PlusOutline class="mr-2 h-4 w-4" />
					Tambah Lingkungan
				</Button>
			{/if}
		</div>
	{:else}
		<div class="mb-4 flex items-center gap-3">
		<Label for="filterWilayah" class="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">Filter Wilayah:</Label>
		<Select
			id="filterWilayah"
			items={filterOptions}
			bind:value={filterWilayahId}
			class="w-56"
		/>
	</div>

	<Table striped={true} shadow>
			<caption class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
				Daftar Lingkungan
				<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
					Komunitas teritorial yang termasuk dalam wilayah dan paroki.
				</p>
			</caption>
			<TableHead>
				<TableHeadCell class="w-16">Urutan</TableHeadCell>
				<TableHeadCell class="w-full">Nama Lingkungan</TableHeadCell>
				<TableHeadCell class="w-12 text-right"><span class="sr-only">Aksi</span></TableHeadCell>
			</TableHead>
			<TableBody>
				{#each filteredCommunities as c}
					<TableBodyRow>
						<TableBodyCell class="w-16">{c.sequence ?? '-'}</TableBodyCell>
						<TableBodyCell class="w-full font-medium">{c.name}</TableBodyCell>
						<TableBodyCell class="w-12 text-right">
							<div class="relative" data-dropdown-menu>
								<Button
									size="xs"
									color="light"
									onclick={() => (openDropdownId = openDropdownId === c.id ? null : c.id)}
									disabled={isSubmitting}
									title="Opsi"
								>
									<span class="text-lg leading-none">⋮</span>
								</Button>
								{#if openDropdownId === c.id}
									<div
										class="absolute right-0 z-20 bottom-full mb-2 w-44 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
										data-dropdown-menu
									>
										<button
											type="button"
											class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
											onclick={() => openEditModal(c)}
										>
											<PenOutline class="h-4 w-4" /><span>Edit</span>
										</button>
										<button
											type="button"
											class="mt-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
											onclick={() => openDeleteModal(c)}
										>
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
<Modal title={selectedCommunity ? 'Edit Lingkungan' : 'Tambah Lingkungan'} bind:open={showFormModal}>
	<form
		method="POST"
		action={selectedCommunity ? '?/update' : '?/create'}
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				isSubmitting = false;
			};
		}}
	>
		{#if selectedCommunity}
			<input type="hidden" name="communityId" value={selectedCommunity.id} />
		{/if}

		<div class="mb-4">
			<Label for="wilayahId" class="mb-2">Wilayah <span class="text-red-500">*</span></Label>
			<Select
				id="wilayahId"
				name="wilayahId"
				items={wilayahOptions}
				bind:value={formWilayahId}
				required
			/>
		</div>
		<div class="mb-4">
			<Label for="name" class="mb-2">Nama Lingkungan <span class="text-red-500">*</span></Label>
			<Input autocomplete="off"
				id="name"
				name="name"
				bind:value={formName}
				placeholder="cth. Lingkungan Santo Yohanes"
				required
			/>
		</div>
		<div class="mb-4">
			<Label for="sequence" class="mb-2">Urutan</Label>
			<Input autocomplete="off"
				id="sequence"
				name="sequence"
				type="number"
				bind:value={formSequence}
				placeholder="cth. 1"
				min="1"
			/>
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" color="alternative" onclick={() => (showFormModal = false)} disabled={isSubmitting}>
				Batal
			</Button>
			<Button type="submit" color="blue" disabled={isSubmitting}>
				{#if isSubmitting}<Spinner class="mr-2" size="4" />{/if}
				{selectedCommunity ? 'Simpan' : 'Tambah'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal title="Hapus Lingkungan" bind:open={showDeleteModal}>
	{#if selectedCommunity}
		<P class="mb-4">
			Apakah Anda yakin ingin menghapus lingkungan <strong>{selectedCommunity.name}</strong>
			dari wilayah <strong>{selectedCommunity.wilayahName}</strong>?
			Data roster yang sudah ada tidak akan terhapus.
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
			<input type="hidden" name="communityId" value={selectedCommunity.id} />
			<div class="flex justify-end gap-2">
				<Button type="button" color="alternative" onclick={() => (showDeleteModal = false)} disabled={isSubmitting}>
					Batal
				</Button>
				<Button type="submit" color="red" disabled={isSubmitting}>
					{#if isSubmitting}<Spinner class="mr-2" size="4" />{/if}
					Hapus
				</Button>
			</div>
		</form>
	{/if}
</Modal>

<svelte:window
	onclick={(e) => {
		if (openDropdownId) {
			const target = e.target as HTMLElement;
			if (!target.closest('[data-dropdown-menu]')) openDropdownId = null;
		}
	}}
/>
