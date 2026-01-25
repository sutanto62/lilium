<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import {
		Alert,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		Modal,
		P,
		Spinner,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { PenOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import type { PageProps } from './$types';
	import type { Mass } from '$core/entities/Schedule';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	// Use $derived to make masses reactive to data changes
	const masses = $derived(data.masses);

	// State for dropdown menu
	let openDropdownId = $state<string | null>(null);

	// State for delete confirmation modal
	let showDeleteModal = $state(false);
	let selectedMass = $state<Mass | null>(null);
	let isSubmitting = $state(false);
	let showAlert = $state(true);

	// Format day name from English to Indonesian
	function formatDayName(day: string): string {
		const dayMap: Record<string, string> = {
			sunday: 'Minggu',
			monday: 'Senin',
			tuesday: 'Selasa',
			wednesday: 'Rabu',
			thursday: 'Kamis',
			friday: 'Jumat',
			saturday: 'Sabtu'
		};
		return dayMap[day.toLowerCase()] || day;
	}

	// Format time display
	function formatTime(time: string | null): string {
		if (!time) return '-';
		return time;
	}

	// Toggle dropdown menu
	function toggleDropdown(massId: string) {
		openDropdownId = openDropdownId === massId ? null : massId;
	}

	// Close dropdown menu
	function closeDropdown() {
		openDropdownId = null;
	}

	// Open delete confirmation modal
	function openDeleteModal(mass: Mass) {
		selectedMass = mass;
		showDeleteModal = true;
		closeDropdown();
	}

	// Close delete modal
	function closeDeleteModal() {
		showDeleteModal = false;
		selectedMass = null;
	}

	// Handle edit - navigate to detail page
	async function handleEdit(mass: Mass) {
		closeDropdown();
		await tracker.track(
			'admin_posisi_edit_clicked',
			{
				mass_id: mass.id,
				mass_name: mass.name,
				mass_code: mass.code
			},
			page.data.session,
			page
		);
		await goto(`/admin/posisi/${mass.id}`);
	}

	// Auto-hide alerts after 10 seconds if form has result
	$effect(() => {
		if (form?.success || form?.error) {
			setTimeout(() => {
				showAlert = false;
			}, 10000);
			isSubmitting = false;
		}
	});

	// Track page load
	$effect(() => {
		const session = page.data.session || undefined;

		// Track page load if data is ready
		if (data.masses !== undefined) {
			const metadata = {
				total_masses: data.masses?.length || 0,
				active_masses: data.masses?.filter((mass: Mass) => mass.active === 1).length || 0,
				inactive_masses: data.masses?.filter((mass: Mass) => mass.active === 0).length || 0,
				has_masses: (data.masses?.length || 0) > 0,
				has_session: !!session
			};

			// Dual tracking for client-side page view
			Promise.all([
				statsigService.logEvent('admin_posisi_view', 'load', session, metadata),
				tracker.track('admin_posisi_view', metadata, session, page)
			]);
		}
	});
</script>

<svelte:head>
	<title>Posisi</title>
	<meta
		name="description"
		content="Melihat daftar jadwal misa yang terdaftar di gereja. Setiap jadwal misa menentukan hari, waktu, dan posisi yang diperlukan."
	/>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem>Posisi</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl"
		>Posisi</Heading
	>

	{#if form?.success && showAlert}
		<Alert color="green" class="mb-4">
			<p>Jadwal misa berhasil dinonaktifkan</p>
		</Alert>
	{/if}

	{#if form?.error && showAlert}
		<Alert color="red" class="mb-4">
			<p>{form.error}</p>
		</Alert>
	{/if}

	{#if masses.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800"
		>
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
				Jadwal misa masih kosong.
			</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Belum ada jadwal misa yang terdaftar. Silakan hubungi administrator untuk menambahkan jadwal
				misa.
			</p>
		</div>
	{:else}
		<Table striped={true} shadow>
			<caption
				class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
			>
				Jadwal Misa
				<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
					Berikut daftar jadwal misa yang terdaftar di gereja.
				</p>
			</caption>
			<TableHead>
				<TableHeadCell>Kode</TableHeadCell>
				<TableHeadCell>Nama</TableHeadCell>
				<TableHeadCell>Hari</TableHeadCell>
				<TableHeadCell>Waktu</TableHeadCell>
				<TableHeadCell>Briefing</TableHeadCell>
				<TableHeadCell>Status</TableHeadCell>
				<TableHeadCell>Urutan</TableHeadCell>
				<TableHeadCell>
					<span class="sr-only">Aksi</span>
				</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each masses as mass}
					<TableBodyRow>
						<TableBodyCell>
							{mass.code || '-'}
						</TableBodyCell>
						<TableBodyCell>{mass.name}</TableBodyCell>
						<TableBodyCell>{formatDayName(mass.day)}</TableBodyCell>
						<TableBodyCell>{formatTime(mass.time)}</TableBodyCell>
						<TableBodyCell>{formatTime(mass.briefingTime)}</TableBodyCell>
						<TableBodyCell>
							{#if mass.active === 1}
								<span
									class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
								>
									Aktif
								</span>
							{:else}
								<span
									class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
								>
									Tidak Aktif
								</span>
							{/if}
						</TableBodyCell>
						<TableBodyCell>{mass.sequence ?? '-'}</TableBodyCell>
						<TableBodyCell>
							<div class="relative" data-dropdown-menu>
								<Button
									size="xs"
									color="light"
									onclick={() => toggleDropdown(mass.id)}
									disabled={isSubmitting}
									title="Opsi"
								>
									<span class="text-lg leading-none">⋮</span>
								</Button>

								{#if openDropdownId === mass.id}
									<div
										class="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
										data-dropdown-menu
									>
										<button
											type="button"
											class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
											disabled={isSubmitting}
											onclick={() => handleEdit(mass)}
										>
											<PenOutline class="h-4 w-4" />
											<span>Edit</span>
										</button>
										<button
											type="button"
											class="mt-1.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
											disabled={isSubmitting}
											onclick={() => openDeleteModal(mass)}
										>
											<TrashBinOutline class="h-4 w-4" />
											<span>Hapus</span>
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

<!-- Delete Confirmation Modal -->
<Modal title="Hapus Jadwal Misa" bind:open={showDeleteModal}>
	{#if selectedMass}
		<P class="mb-4">
			Apakah Anda yakin ingin menghapus jadwal misa <strong>{selectedMass.name}</strong>? Jadwal misa ini
			akan dinonaktifkan dan tidak akan muncul di daftar, namun data historis akan tetap tersimpan.
		</P>

		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				return async ({ update }) => {
					isSubmitting = true;
					await update();
					if (form?.success) {
						closeDeleteModal();
						await invalidate('all');
					}
				};
			}}
		>
			<input type="hidden" name="massId" value={selectedMass.id} />

			<div class="flex justify-end gap-2">
				<Button type="button" color="alternative" onclick={closeDeleteModal} disabled={isSubmitting}>
					Batal
				</Button>
				<Button type="submit" color="red" disabled={isSubmitting}>
					{#if isSubmitting}
						<Spinner class="mr-2" />
					{/if}
					Hapus
				</Button>
			</div>
		</form>
	{/if}
</Modal>

<!-- Click outside to close dropdown -->
<svelte:window
	onclick={(e) => {
		if (openDropdownId) {
			const target = e.target as HTMLElement;
			// Close if clicking outside the dropdown menu
			if (!target.closest('[data-dropdown-menu]')) {
				closeDropdown();
			}
		}
	}}
/>
