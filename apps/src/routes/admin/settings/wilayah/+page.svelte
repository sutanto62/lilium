<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		Alert,
		Badge,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		Input,
		Label,
		Modal,
		P,
		Spinner
	} from 'flowbite-svelte';
	import { PenOutline, PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import type { PageProps } from './$types';
	import type { Wilayah } from '$core/entities/Parish';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	const wilayahs = $derived(data.wilayahs);

	let openDropdownId = $state<string | null>(null);
	let showDeleteModal = $state(false);
	let showFormModal = $state(false);
	let selectedWilayah = $state<Wilayah | null>(null);
	let isSubmitting = $state(false);
	let showAlert = $state(true);

	// Form fields
	let formName = $state('');
	let formCode = $state('');
	let formSequence = $state('');

	function openCreateModal() {
		selectedWilayah = null;
		formName = '';
		formCode = '';
		formSequence = '';
		showFormModal = true;
	}

	function openEditModal(w: Wilayah) {
		selectedWilayah = w;
		formName = w.name;
		formCode = w.code ?? '';
		formSequence = w.sequence != null ? String(w.sequence) : '';
		showFormModal = true;
		openDropdownId = null;
	}

	function openDeleteModal(w: Wilayah) {
		selectedWilayah = w;
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
	<title>Wilayah</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
	<BreadcrumbItem>Wilayah</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<div class="mb-4 flex items-center justify-between">
		<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
			Pengaturan Wilayah
		</Heading>
		<Button color="blue" onclick={openCreateModal}>
			<PlusOutline class="mr-2 h-4 w-4" />
			Tambah
		</Button>
	</div>

	{#if form?.success && showAlert}
		<Alert color="green" class="mb-4"><p>Berhasil disimpan.</p></Alert>
	{/if}
	{#if form?.error && showAlert}
		<Alert color="red" class="mb-4"><p>{form.error}</p></Alert>
	{/if}

	{#if wilayahs.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Belum ada wilayah.</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Wilayah adalah unit teritorial di bawah paroki, misalnya "Wilayah I".
			</p>
			<Button color="blue" class="mt-4" onclick={openCreateModal}>
				<PlusOutline class="mr-2 h-4 w-4" />
				Tambah Wilayah
			</Button>
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
			<table class="w-full text-left text-sm text-gray-500 dark:text-gray-400">
				<caption class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
					Daftar Wilayah
					<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
						Unit teritorial yang termasuk dalam paroki.
					</p>
				</caption>
				<thead class="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
					<tr>
						<th class="w-16 px-4 py-3">Urutan</th>
						<th class="w-full px-4 py-3">Nama Wilayah</th>
						<th class="px-4 py-3">Kode</th>
						<th class="w-12 px-4 py-3 text-right"><span class="sr-only">Aksi</span></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each wilayahs as w (w.id)}
						<tr class="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
							<td class="w-16 px-4 py-3">{w.sequence ?? '—'}</td>
							<td class="w-full px-4 py-3 font-medium text-gray-900 dark:text-white">{w.name}</td>
							<td class="px-4 py-3">
								{#if w.code}
									<Badge color="gray">{w.code}</Badge>
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</td>
							<td class="w-12 px-4 py-3 text-right">
								<div class="relative" data-dropdown-menu>
									<Button
										size="xs"
										color="light"
										onclick={() => (openDropdownId = openDropdownId === w.id ? null : w.id)}
										disabled={isSubmitting}
										title="Opsi"
									>
										<span class="text-lg leading-none">⋮</span>
									</Button>
									{#if openDropdownId === w.id}
										<div
											class="absolute right-0 z-20 bottom-full mb-2 w-44 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
											data-dropdown-menu
										>
											<button
												type="button"
												class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
												onclick={() => openEditModal(w)}
											>
												<PenOutline class="h-4 w-4" /><span>Edit</span>
											</button>
											<button
												type="button"
												class="mt-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
												onclick={() => openDeleteModal(w)}
											>
												<TrashBinOutline class="h-4 w-4" /><span>Hapus</span>
											</button>
										</div>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Create / Edit Modal -->
<Modal title={selectedWilayah ? 'Edit Wilayah' : 'Tambah Wilayah'} bind:open={showFormModal} size="sm">
	<form
		method="POST"
		action={selectedWilayah ? '?/update' : '?/create'}
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				isSubmitting = false;
			};
		}}
	>
		{#if selectedWilayah}
			<input type="hidden" name="wilayahId" value={selectedWilayah.id} />
		{/if}

		<div class="mb-4">
			<Label for="name" class="mb-2">Nama Wilayah <span class="text-red-500">*</span></Label>
			<Input autocomplete="off"
				id="name"
				name="name"
				bind:value={formName}
				placeholder="cth. Wilayah I"
				required
				disabled={isSubmitting}
			/>
		</div>
		<div class="mb-4">
			<Label for="code" class="mb-2">Kode</Label>
			<Input autocomplete="off"
				id="code"
				name="code"
				bind:value={formCode}
				placeholder="cth. W1"
				disabled={isSubmitting}
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
				disabled={isSubmitting}
			/>
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" color="alternative" onclick={() => (showFormModal = false)} disabled={isSubmitting}>
				Batal
			</Button>
			<Button type="submit" color="blue" disabled={isSubmitting}>
				{#if isSubmitting}<Spinner class="mr-2" size="4" />{/if}
				{selectedWilayah ? 'Simpan' : 'Tambah'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal title="Hapus Wilayah" bind:open={showDeleteModal} size="sm">
	{#if selectedWilayah}
		<P class="mb-4">
			Apakah Anda yakin ingin menonaktifkan wilayah <strong>{selectedWilayah.name}</strong>?
			Komunitas yang terdaftar di wilayah ini mungkin terpengaruh.
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
			<input type="hidden" name="wilayahId" value={selectedWilayah.id} />
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
