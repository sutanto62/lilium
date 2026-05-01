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
	import { PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import type { PageProps } from './$types';
	import type { ChurchZone, Mass, MassZone } from '$core/entities/Schedule';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	const massZones = $derived(data.massZones as MassZone[]);
	const masses = $derived(data.masses as Mass[]);
	const zones = $derived(data.zones as ChurchZone[]);

	const massOptions = $derived(masses.map((m: Mass) => ({ value: m.id, name: m.name })));
	const zoneOptions = $derived(zones.map((z: ChurchZone) => ({ value: z.id, name: z.name })));

	function getMassName(massId: string) {
		return masses.find((m: Mass) => m.id === massId)?.name ?? massId;
	}
	function getZoneName(zoneId: string) {
		return zones.find((z: ChurchZone) => z.id === zoneId)?.name ?? zoneId;
	}

	let showDeleteModal = $state(false);
	let showCreateModal = $state(false);
	let selectedMassZone = $state<MassZone | null>(null);
	let isSubmitting = $state(false);
	let showAlert = $state(true);

	let formMassId = $state('');
	let formZoneId = $state('');

	function openCreateModal() {
		formMassId = massOptions[0]?.value ?? '';
		formZoneId = zoneOptions[0]?.value ?? '';
		showCreateModal = true;
	}

	function openDeleteModal(mz: MassZone) {
		selectedMassZone = mz;
		showDeleteModal = true;
	}

	$effect(() => {
		if (form?.success || form?.error) {
			setTimeout(() => { showAlert = false; }, 10000);
			isSubmitting = false;
			if (form?.success) {
				showCreateModal = false;
				showDeleteModal = false;
			}
		}
	});

	$effect(() => {
		if (data.massZones !== undefined) {
			const session = page.data.session || undefined;
			const metadata = { total_mass_zones: data.massZones?.length || 0 };
			Promise.all([
				statsigService.logEvent('admin_zone_misa_zona_view', 'load', session, metadata),
				tracker.track('admin_zone_misa_zona_view', metadata, session, page)
			]);
		}
	});
</script>

<svelte:head>
	<title>Kelola Misa-Zona</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
	<BreadcrumbItem>Misa–Zona</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<div class="mb-4 flex items-center justify-between">
		<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
			Relasi Misa-Zona
		</Heading>
		<Button color="blue" onclick={openCreateModal} disabled={massOptions.length === 0 || zoneOptions.length === 0}>
			<PlusOutline class="mr-2 h-4 w-4" />
			Tambah Relasi
		</Button>
	</div>

	{#if form?.success && showAlert}
		<Alert color="green" class="mb-4"><p>Berhasil disimpan.</p></Alert>
	{/if}
	{#if form?.error && showAlert}
		<Alert color="red" class="mb-4"><p>{form.error}</p></Alert>
	{/if}

	{#if massOptions.length === 0 || zoneOptions.length === 0}
		<div class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
			Pastikan sudah ada data <a href="/admin/data-misa" class="underline">Misa</a> dan <a href="/admin/data-zona" class="underline">Zona</a> sebelum membuat relasi.
		</div>
	{/if}

	{#if massZones.length === 0}
		<div class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Belum ada relasi misa-zona.</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">Tambahkan relasi untuk menentukan zona yang melayani setiap misa.</p>
		</div>
	{:else}
		<Table striped={true} shadow>
			<caption class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
				Daftar Relasi Misa-Zona
				<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">Zona yang melayani setiap jadwal misa.</p>
			</caption>
			<TableHead>
				<TableHeadCell>Misa</TableHeadCell>
				<TableHeadCell>Zona</TableHeadCell>
				<TableHeadCell>Urutan</TableHeadCell>
				<TableHeadCell>Status</TableHeadCell>
				<TableHeadCell><span class="sr-only">Aksi</span></TableHeadCell>
			</TableHead>
			<TableBody>
				{#each massZones as mz}
					<TableBodyRow>
						<TableBodyCell>{getMassName(mz.mass)}</TableBodyCell>
						<TableBodyCell>{getZoneName(mz.zone)}</TableBodyCell>
						<TableBodyCell>{mz.sequence ?? '-'}</TableBodyCell>
						<TableBodyCell>
							{#if mz.active === 1}
								<span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">Aktif</span>
							{:else}
								<span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">Nonaktif</span>
							{/if}
						</TableBodyCell>
						<TableBodyCell>
							<Button size="xs" color="red" onclick={() => openDeleteModal(mz)} disabled={isSubmitting} title="Hapus">
								<TrashBinOutline class="h-4 w-4" />
							</Button>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</div>

<!-- Create Modal -->
<Modal title="Tambah Relasi Misa-Zona" bind:open={showCreateModal}>
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				isSubmitting = false;
			};
		}}
	>
		<div class="mb-4">
			<Label for="massId" class="mb-2">Misa <span class="text-red-500">*</span></Label>
			<Select id="massId" name="massId" bind:value={formMassId} items={massOptions} required />
		</div>
		<div class="mb-4">
			<Label for="zoneId" class="mb-2">Zona <span class="text-red-500">*</span></Label>
			<Select id="zoneId" name="zoneId" bind:value={formZoneId} items={zoneOptions} required />
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" color="alternative" onclick={() => (showCreateModal = false)} disabled={isSubmitting}>Batal</Button>
			<Button type="submit" color="blue" disabled={isSubmitting}>
				{#if isSubmitting}<Spinner class="mr-2" />{/if}
				Tambah
			</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal title="Hapus Relasi" bind:open={showDeleteModal}>
	{#if selectedMassZone}
		<P class="mb-4">
			Apakah Anda yakin ingin menghapus relasi <strong>{getMassName(selectedMassZone.mass)}</strong> — <strong>{getZoneName(selectedMassZone.zone)}</strong>?
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
			<input type="hidden" name="massZoneId" value={selectedMassZone.id} />
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
