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
		Select,
		Spinner
	} from 'flowbite-svelte';
	import { PenOutline, PlusOutline, TrashBinOutline, CheckOutline } from 'flowbite-svelte-icons';
	import type { PageProps } from './$types';
	import type { Community } from '$core/entities/Parish';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	type UserRow = (typeof data.users)[number];

	const users = $derived(data.users);
	const lingkunganOptions = $derived(data.lingkunganOptions as Community[]);

	const STATUS_OPTIONS = [
		{ value: 'active', name: 'Aktif' },
		{ value: 'inactive', name: 'Nonaktif' },
		{ value: 'all', name: 'Semua' }
	];
	let filterStatus = $state<'active' | 'inactive' | 'all'>('active');
	const filteredUsers = $derived(
		filterStatus === 'all' ? users
		: filterStatus === 'active' ? users.filter((u: UserRow) => !!u.active)
		: users.filter((u: UserRow) => !u.active)
	);

	let openDropdownId = $state<string | null>(null);
	let showDeactivateModal = $state(false);
	let showFormModal = $state(false);
	let selectedUser = $state<UserRow | null>(null);
	let isSubmitting = $state(false);
	let showAlert = $state(true);

	// Form fields
	let formName = $state('');
	let formEmail = $state('');
	let formRole = $state<'admin' | 'user'>('user');
	let formLingkunganId = $state('');

	function openCreateModal() {
		selectedUser = null;
		formName = '';
		formEmail = '';
		formRole = 'user';
		formLingkunganId = '';
		showFormModal = true;
	}

	function openEditModal(u: UserRow) {
		selectedUser = u;
		formRole = u.role as 'admin' | 'user';
		formLingkunganId = u.lingkunganId ?? '';
		showFormModal = true;
		openDropdownId = null;
	}

	function openDeactivateModal(u: UserRow) {
		selectedUser = u;
		showDeactivateModal = true;
		openDropdownId = null;
	}

	function getLingkunganName(id: string | null): string {
		if (!id) return '—';
		return lingkunganOptions.find((l) => l.id === id)?.name ?? '—';
	}

	$effect(() => {
		if (form?.success || form?.error) {
			showAlert = true;
			setTimeout(() => {
				showAlert = false;
			}, 10000);
			isSubmitting = false;
			if (form?.success) {
				showFormModal = false;
				showDeactivateModal = false;
			}
		}
	});
</script>

<svelte:head>
	<title>Pengguna</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
	<BreadcrumbItem>Pengguna</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<div class="mb-4 flex items-center justify-between">
		<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
			Pengaturan Pengguna
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

	{#if users.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Belum ada pengguna.</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Tambahkan pengguna agar mereka dapat masuk dan menggunakan aplikasi.
			</p>
			<Button color="blue" class="mt-4" onclick={openCreateModal}>
				<PlusOutline class="mr-2 h-4 w-4" />
				Tambah Pengguna
			</Button>
		</div>
	{:else}
		<div class="mb-4 flex items-center gap-3">
			<Label for="filterStatus" class="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">Status:</Label>
			<Select id="filterStatus" items={STATUS_OPTIONS} bind:value={filterStatus} class="w-40" />
		</div>
		{#if filteredUsers.length === 0}
			<div class="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
				<p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada pengguna dengan status ini.</p>
			</div>
		{:else}
		<div class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
			<table class="w-full text-left text-sm text-gray-500 dark:text-gray-400">
				<caption class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
					Daftar Pengguna
					<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
						Pengguna yang terdaftar di gereja ini.
					</p>
				</caption>
				<thead class="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
					<tr>
						<th class="w-full px-4 py-3">Nama</th>
						<th class="px-4 py-3">Email</th>
						<th class="px-4 py-3">Peran</th>
						<th class="px-4 py-3">Lingkungan</th>
						<th class="px-4 py-3">Status</th>
						<th class="w-12 px-4 py-3 text-right"><span class="sr-only">Aksi</span></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each filteredUsers as u (u.id)}
						<tr class="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
							<td class="w-full px-4 py-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
							<td class="px-4 py-3">{u.email}</td>
							<td class="px-4 py-3">
								<Badge color={u.role === 'admin' ? 'purple' : 'blue'}>
									{u.role === 'admin' ? 'Admin' : 'Pengguna'}
								</Badge>
							</td>
							<td class="px-4 py-3">{getLingkunganName(u.lingkunganId)}</td>
							<td class="px-4 py-3">
								<Badge color={u.active ? 'green' : 'red'}>
									{u.active ? 'Aktif' : 'Nonaktif'}
								</Badge>
							</td>
							<td class="w-12 px-4 py-3 text-right">
								<div class="relative" data-dropdown-menu>
									<Button
										size="xs"
										color="light"
										onclick={() => (openDropdownId = openDropdownId === u.id ? null : u.id)}
										disabled={isSubmitting}
										title="Opsi"
									>
										<span class="text-lg leading-none">⋮</span>
									</Button>
									{#if openDropdownId === u.id}
										<div
											class="absolute right-0 z-20 bottom-full mb-2 w-44 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
											data-dropdown-menu
										>
											<button
												type="button"
												class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
												onclick={() => openEditModal(u)}
											>
												<PenOutline class="h-4 w-4" /><span>Edit</span>
											</button>
											{#if u.active}
												<button
													type="button"
													class="mt-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
													onclick={() => openDeactivateModal(u)}
												>
													<TrashBinOutline class="h-4 w-4" /><span>Nonaktifkan</span>
												</button>
											{:else}
												<form
													method="POST"
													action="?/reactivate"
													use:enhance={() => {
														isSubmitting = true;
														openDropdownId = null;
														return async ({ update }) => {
															await update();
															await invalidateAll();
															isSubmitting = false;
														};
													}}
												>
													<input type="hidden" name="userId" value={u.id} />
													<button
														type="submit"
														class="mt-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
													>
														<CheckOutline class="h-4 w-4" /><span>Aktifkan</span>
													</button>
												</form>
											{/if}
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
	{/if}
</div>

<!-- Create / Edit Modal -->
<Modal title={selectedUser ? 'Edit Pengguna' : 'Tambah Pengguna'} bind:open={showFormModal} size="sm">
	<form
		method="POST"
		action={selectedUser ? '?/update' : '?/create'}
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				isSubmitting = false;
			};
		}}
	>
		{#if selectedUser}
			<input type="hidden" name="userId" value={selectedUser.id} />
		{/if}

		{#if !selectedUser}
			<div class="mb-4">
				<Label for="name" class="mb-2">Nama <span class="text-red-500">*</span></Label>
				<Input
					autocomplete="off"
					id="name"
					name="name"
					bind:value={formName}
					placeholder="cth. Budi Santoso"
					required
					disabled={isSubmitting}
				/>
			</div>
			<div class="mb-4">
				<Label for="email" class="mb-2">Email <span class="text-red-500">*</span></Label>
				<Input
					autocomplete="off"
					id="email"
					name="email"
					type="email"
					bind:value={formEmail}
					placeholder="cth. budi@example.com"
					required
					disabled={isSubmitting}
				/>
			</div>
		{/if}

		<div class="mb-4">
			<Label for="role" class="mb-2">Peran <span class="text-red-500">*</span></Label>
			<Select id="role" name="role" bind:value={formRole} disabled={isSubmitting}>
				<option value="user">Pengguna</option>
				<option value="admin">Admin</option>
			</Select>
		</div>

		<div class="mb-4">
			<Label for="lingkunganId" class="mb-2">Lingkungan</Label>
			<Select id="lingkunganId" name="lingkunganId" bind:value={formLingkunganId} disabled={isSubmitting}>
				<option value="">Tidak ada</option>
				{#each lingkunganOptions as l}
					<option value={l.id}>{l.name}</option>
				{/each}
			</Select>
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" color="alternative" onclick={() => (showFormModal = false)} disabled={isSubmitting}>
				Batal
			</Button>
			<Button type="submit" color="blue" disabled={isSubmitting}>
				{#if isSubmitting}<Spinner class="mr-2" size="4" />{/if}
				{selectedUser ? 'Simpan' : 'Tambah'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Deactivate Confirmation Modal -->
<Modal title="Nonaktifkan Pengguna" bind:open={showDeactivateModal} size="sm">
	{#if selectedUser}
		<P class="mb-4">
			Apakah Anda yakin ingin menonaktifkan pengguna <strong>{selectedUser.name}</strong>?
			Pengguna tidak akan dapat masuk ke aplikasi.
		</P>
		<form
			method="POST"
			action="?/deactivate"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					await invalidateAll();
					isSubmitting = false;
				};
			}}
		>
			<input type="hidden" name="userId" value={selectedUser.id} />
			<div class="flex justify-end gap-2">
				<Button type="button" color="alternative" onclick={() => (showDeactivateModal = false)} disabled={isSubmitting}>
					Batal
				</Button>
				<Button type="submit" color="red" disabled={isSubmitting}>
					{#if isSubmitting}<Spinner class="mr-2" size="4" />{/if}
					Nonaktifkan
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
