<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Alert, Badge, Breadcrumb, BreadcrumbItem, Button, Checkbox, Dropdown, DropdownItem, Input, Label, Modal, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
	import { DotsVerticalOutline, PlusOutline } from 'flowbite-svelte-icons';
	import type { PageData, ActionData } from './$types';
	import type { Wilayah } from '$core/entities/Parish';

	const { data, form } = $props<{ data: PageData; form: ActionData }>();

	// ── Church edit state ─────────────────────────────────────────────────────
	let isEditingChurch = $state(false);
	let churchName = $state('');
	let churchCode = $state('');
	let churchRequiresSpecialCollection = $state(false);
	let isSubmittingChurch = $state(false);

	// ── Parish edit state ─────────────────────────────────────────────────────
	let isEditingParish = $state(false);
	let parishName = $state('');
	let parishCode = $state('');
	let isSubmittingParish = $state(false);

	// ── Wilayah modal state ───────────────────────────────────────────────────
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let selectedWilayah = $state<Wilayah | null>(null);
	let isSubmitting = $state(false);

	// Create form fields
	let createName = $state('');
	let createCode = $state('');
	let createSequence = $state('');

	// Edit form fields
	let editName = $state('');
	let editCode = $state('');
	let editSequence = $state('');

	function openEdit(w: Wilayah) {
		selectedWilayah = w;
		editName = w.name;
		editCode = w.code ?? '';
		editSequence = w.sequence !== null ? String(w.sequence) : '';
		showEditModal = true;
	}

	function openDelete(w: Wilayah) {
		selectedWilayah = w;
		showDeleteModal = true;
	}

	function resetCreate() {
		createName = '';
		createCode = '';
		createSequence = '';
	}

	// Sync church fields from data (on load and after invalidateAll)
	$effect(() => {
		churchName = data.church?.name ?? '';
		churchCode = data.church?.code ?? '';
		churchRequiresSpecialCollection = (data.church?.requiresSpecialCollection ?? 0) === 1;
	});

	// Sync parish fields from data (on load and after invalidateAll)
	$effect(() => {
		parishName = data.parish?.name ?? '';
		parishCode = data.parish?.code ?? '';
	});
</script>

<div>
	<!-- Breadcrumb -->
	<Breadcrumb class="mb-4">
		<BreadcrumbItem href="/">Beranda</BreadcrumbItem>
		<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
		<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
		<BreadcrumbItem>Paroki</BreadcrumbItem>
	</Breadcrumb>

	<!-- ── Parish Info Card ──────────────────────────────────────────────── -->
	<div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Informasi Paroki</h2>
			{#if !isEditingParish}
				<Button size="sm" color="alternative" onclick={() => (isEditingParish = true)}>Ubah</Button>
			{/if}
		</div>

		{#if form?.error && isEditingParish}
			<Alert color="red" class="mb-4">{form.error}</Alert>
		{/if}

		{#if isEditingParish}
			<form
				method="POST"
				action="?/updateParish"
				use:enhance={() => {
					isSubmittingParish = true;
					return async ({ update }) => {
						await update();
						await invalidateAll();
						isSubmittingParish = false;
						if (!form?.error) isEditingParish = false;
					};
				}}
			>
				<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<Label for="parish-name" class="mb-1">Nama Paroki <span class="text-red-500">*</span></Label>
						<Input id="parish-name" name="name" bind:value={parishName} required disabled={isSubmittingParish} />
					</div>
					<div>
						<Label for="parish-code" class="mb-1">Kode <span class="text-red-500">*</span></Label>
						<Input id="parish-code" name="code" bind:value={parishCode} required disabled={isSubmittingParish} />
					</div>
				</div>
				<div class="flex gap-2">
					<Button type="submit" disabled={isSubmittingParish}>Simpan</Button>
					<Button color="alternative" type="button" onclick={() => (isEditingParish = false)} disabled={isSubmittingParish}>Batal</Button>
				</div>
			</form>
		{:else}
			<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nama</dt>
					<dd class="mt-1 text-sm text-gray-900 dark:text-white">{data.parish?.name ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kode</dt>
					<dd class="mt-1">
						{#if data.parish?.code}
							<Badge color="blue">{data.parish.code}</Badge>
						{:else}
							<span class="text-sm text-gray-400">—</span>
						{/if}
					</dd>
				</div>
			</dl>
		{/if}
	</div>

	<!-- ── Church Info Card ─────────────────────────────────────────────── -->
	<div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Informasi Gereja</h2>
			{#if !isEditingChurch}
				<Button size="sm" color="alternative" onclick={() => (isEditingChurch = true)}>Ubah</Button>
			{/if}
		</div>

		{#if form?.error && isEditingChurch}
			<Alert color="red" class="mb-4">{form.error}</Alert>
		{/if}

		{#if isEditingChurch}
			<form
				method="POST"
				action="?/updateChurch"
				use:enhance={() => {
					isSubmittingChurch = true;
					return async ({ update }) => {
						await update();
						await invalidateAll();
						isSubmittingChurch = false;
						if (!form?.error) isEditingChurch = false;
					};
				}}
			>
				<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<Label for="church-name" class="mb-1">Nama Gereja <span class="text-red-500">*</span></Label>
						<Input id="church-name" name="name" bind:value={churchName} required disabled={isSubmittingChurch} />
					</div>
					<div>
						<Label for="church-code" class="mb-1">Kode Gereja <span class="text-red-500">*</span></Label>
						<Input id="church-code" name="code" bind:value={churchCode} required disabled={isSubmittingChurch} />
					</div>
				</div>
				<div class="mb-4">
					<Checkbox
						id="church-requires-special-collection"
						name="requiresSpecialCollection"
						value="true"
						bind:checked={churchRequiresSpecialCollection}
						disabled={isSubmittingChurch}
					>Kolekte Khusus (PPG/PPKG)</Checkbox>
				</div>
				<div class="flex gap-2">
					<Button type="submit" disabled={isSubmittingChurch}>Simpan</Button>
					<Button color="alternative" type="button" onclick={() => (isEditingChurch = false)} disabled={isSubmittingChurch}>Batal</Button>
				</div>
			</form>
		{:else}
			<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nama Gereja</dt>
					<dd class="mt-1 text-sm text-gray-900 dark:text-white">{data.church?.name ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kode Gereja</dt>
					<dd class="mt-1">
						{#if data.church?.code}
							<Badge color="blue">{data.church.code}</Badge>
						{:else}
							<span class="text-sm text-gray-400">—</span>
						{/if}
					</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kolekte Khusus (PPG/PPKG)</dt>
					<dd class="mt-1">
						{#if (data.church?.requiresSpecialCollection ?? 0) === 1}
							<Badge color="green">Aktif</Badge>
						{:else}
							<Badge color="gray">Tidak Aktif</Badge>
						{/if}
					</dd>
				</div>
			</dl>
		{/if}
	</div>

	<!-- ── Wilayah Section ───────────────────────────────────────────────── -->
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Wilayah</h2>
		<Button size="sm" onclick={() => { resetCreate(); showCreateModal = true; }}>
			<PlusOutline class="mr-2 h-4 w-4" />
			Tambah Wilayah
		</Button>
	</div>

	{#if data.wilayahs.length === 0}
		<div class="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-600 dark:bg-gray-800">
			<p class="text-sm text-gray-500 dark:text-gray-400">Belum ada wilayah. Tambah wilayah untuk mulai mengelola komunitas.</p>
		</div>
	{:else}
		<div class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
			<Table hoverable>
				<TableHead>
					<TableHeadCell>Nama</TableHeadCell>
					<TableHeadCell>Kode</TableHeadCell>
					<TableHeadCell>Urutan</TableHeadCell>
					<TableHeadCell class="w-12"><span class="sr-only">Aksi</span></TableHeadCell>
				</TableHead>
				<TableBody>
					{#each data.wilayahs as w (w.id)}
						<TableBodyRow>
							<TableBodyCell>{w.name}</TableBodyCell>
							<TableBodyCell>
								{#if w.code}
									<Badge color="gray">{w.code}</Badge>
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</TableBodyCell>
							<TableBodyCell>{w.sequence ?? '—'}</TableBodyCell>
							<TableBodyCell>
								<button class="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
									<DotsVerticalOutline class="h-4 w-4 text-gray-500" />
								</button>
								<Dropdown>
									<DropdownItem onclick={() => openEdit(w)}>Edit</DropdownItem>
									<DropdownItem onclick={() => openDelete(w)} class="text-red-600 dark:text-red-400">Hapus</DropdownItem>
								</Dropdown>
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{/if}
</div>

<!-- ── Create Modal ──────────────────────────────────────────────────────── -->
<Modal title="Tambah Wilayah" bind:open={showCreateModal} size="sm">
	{#if form?.error && showCreateModal}
		<Alert color="red" class="mb-4">{form.error}</Alert>
	{/if}

	<form
		method="POST"
		action="?/createWilayah"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				isSubmitting = false;
				if (!form?.error) showCreateModal = false;
			};
		}}
	>
		<div class="mb-4">
			<Label for="create-name" class="mb-1">Nama <span class="text-red-500">*</span></Label>
			<Input id="create-name" name="name" bind:value={createName} required disabled={isSubmitting} placeholder="cth. Wilayah I" />
		</div>
		<div class="mb-4">
			<Label for="create-code" class="mb-1">Kode</Label>
			<Input id="create-code" name="code" bind:value={createCode} disabled={isSubmitting} placeholder="cth. W1" />
		</div>
		<div class="mb-6">
			<Label for="create-sequence" class="mb-1">Urutan</Label>
			<Input id="create-sequence" name="sequence" type="number" bind:value={createSequence} disabled={isSubmitting} placeholder="cth. 1" />
		</div>
		<div class="flex justify-end gap-2">
			<Button color="alternative" type="button" onclick={() => (showCreateModal = false)} disabled={isSubmitting}>Batal</Button>
			<Button type="submit" disabled={isSubmitting}>Simpan</Button>
		</div>
	</form>
</Modal>

<!-- ── Edit Modal ────────────────────────────────────────────────────────── -->
<Modal title="Edit Wilayah" bind:open={showEditModal} size="sm">
	{#if form?.error && showEditModal}
		<Alert color="red" class="mb-4">{form.error}</Alert>
	{/if}

	{#if selectedWilayah}
		<form
			method="POST"
			action="?/updateWilayah"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					await invalidateAll();
					isSubmitting = false;
					if (!form?.error) showEditModal = false;
				};
			}}
		>
			<input type="hidden" name="wilayahId" value={selectedWilayah.id} />
			<div class="mb-4">
				<Label for="edit-name" class="mb-1">Nama <span class="text-red-500">*</span></Label>
				<Input id="edit-name" name="name" bind:value={editName} required disabled={isSubmitting} />
			</div>
			<div class="mb-4">
				<Label for="edit-code" class="mb-1">Kode</Label>
				<Input id="edit-code" name="code" bind:value={editCode} disabled={isSubmitting} />
			</div>
			<div class="mb-6">
				<Label for="edit-sequence" class="mb-1">Urutan</Label>
				<Input id="edit-sequence" name="sequence" type="number" bind:value={editSequence} disabled={isSubmitting} />
			</div>
			<div class="flex justify-end gap-2">
				<Button color="alternative" type="button" onclick={() => (showEditModal = false)} disabled={isSubmitting}>Batal</Button>
				<Button type="submit" disabled={isSubmitting}>Simpan</Button>
			</div>
		</form>
	{/if}
</Modal>

<!-- ── Delete Modal ──────────────────────────────────────────────────────── -->
<Modal title="Hapus Wilayah" bind:open={showDeleteModal} size="sm">
	{#if selectedWilayah}
		<p class="mb-2 text-sm text-gray-700 dark:text-gray-300">
			Yakin ingin menonaktifkan wilayah <strong>{selectedWilayah.name}</strong>?
		</p>
		<p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
			Komunitas yang terdaftar di wilayah ini mungkin terpengaruh.
		</p>
		<form
			method="POST"
			action="?/deleteWilayah"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					await invalidateAll();
					isSubmitting = false;
					if (!form?.error) showDeleteModal = false;
				};
			}}
		>
			<input type="hidden" name="wilayahId" value={selectedWilayah.id} />
			<div class="flex justify-end gap-2">
				<Button color="alternative" type="button" onclick={() => (showDeleteModal = false)} disabled={isSubmitting}>Batal</Button>
				<Button color="red" type="submit" disabled={isSubmitting}>Hapus</Button>
			</div>
		</form>
	{/if}
</Modal>
