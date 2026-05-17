<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import JadwalKonfirmasi from '$components/jadwal/JadwalKonfirmasi.svelte';
	import type { EventScheduleRows } from '$core/entities/Event';
	import type { ChurchZoneGroup } from '$core/entities/Schedule.js';
	import type { RosterEntry } from '$core/entities/Roster';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import {
		Badge,
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
		UserAddSolid,
		ExclamationCircleSolid,
		PrinterOutline,
		TrashBinOutline,
		UsersOutline,
		CheckCircleSolid,
		CloseCircleSolid
	} from 'flowbite-svelte-icons';

	let { data, form } = $props();

	let eventDetail = $derived(data.eventDetail);
	let zones = $derived(data.zones);
	let roster = $derived(data.roster);
	let communities = $derived(data.communities ?? []);
	let isNewRosterFlow = $derived(data.isNewRosterFlow);

	let openRow = $state<number | null>(null);
	let isDeleteConfirmation = $state(false);
	let showCreateRosterModal = $state(false);
	let selectedCommunityIds = $state<string[]>([]);
	let defaultModalPicZone = $state(false);
	let selectedZoneId = $state<string | null>(null);
	let eventZonePic = $state('');
	let deleting = $state(false);
	let editingZoneRow = $state<EventScheduleRows | null>(null);
	let isMisaPicEdit = $state(false);
	let actionError = $state<string | null>(null);

	// Clear action error when form result arrives
	$effect(() => {
		if (form?.success) {
			actionError = null;
			invalidateAll();
		} else if (form?.error) {
			actionError = form.error as string;
		}
	});

	const toggleRow = (i: number) => {
		openRow = openRow === i ? null : i;
	};

	const zoneOptions = $derived(
		zones.map((e: ChurchZoneGroup) => ({ value: e.id ?? '', name: e.name ?? '' }))
	);

	const globalZoneId = $derived(
		zones.find((z: ChurchZoneGroup) => z.name === 'Global')?.id ?? ''
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
		isMisaPicEdit = false;
		selectedZoneId = null;
		eventZonePic = '';
	}

	function handleEditDescription() {
		editingZoneRow = null;
		isMisaPicEdit = true;
		selectedZoneId = globalZoneId;
		eventZonePic = eventDetail.description ?? '';
		defaultModalPicZone = true;
	}

	// ── Roster helpers ─────────────────────────────────────────────────────────

	function openCreateRosterModal() {
		selectedCommunityIds = communities.map((c: { id: string }) => c.id);
		showCreateRosterModal = true;
	}

	function toggleCommunity(id: string) {
		if (selectedCommunityIds.includes(id)) {
			selectedCommunityIds = selectedCommunityIds.filter((x) => x !== id);
		} else {
			selectedCommunityIds = [...selectedCommunityIds, id];
		}
	}

	// Group communities by wilayah for display
	type CommunityGroup = { wilayahName: string; items: { id: string; name: string; wilayahId: string; wilayahName: string }[] };
	const communitiesByWilayah = $derived(
		communities.reduce(
			(acc: Record<string, CommunityGroup>, c: { id: string; name: string; wilayahId: string; wilayahName: string }) => {
				const key = c.wilayahId || '__none__';
				if (!acc[key]) acc[key] = { wilayahName: c.wilayahName || '(Tanpa Wilayah)', items: [] };
				acc[key].items.push(c);
				return acc;
			},
			{} as Record<string, CommunityGroup>
		)
	);

	function statusBadgeColor(status: string): 'gray' | 'yellow' | 'green' {
		if (status === 'confirmed') return 'green';
		if (status === 'submitted') return 'yellow';
		return 'gray';
	}

	function statusLabel(status: string): string {
		if (status === 'confirmed') return 'Dikonfirmasi';
		if (status === 'submitted') return 'Tersubmit';
		return 'Draft';
	}
</script>


<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/tatib">Jadwal</BreadcrumbItem>
	<BreadcrumbItem>
		{eventDetail.mass}
	</BreadcrumbItem>
</Breadcrumb>

<h1 class="my-4 text-xl font-bold">
	{formatDate(eventDetail.date ?? '', 'long')} - {eventDetail.mass}
</h1>

<div class="flex flex-col gap-4">
	<div class="flex justify-end gap-2">
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
			onclick={() => window.open(`/admin/tatib/${eventDetail.id}/cetak`, '_blank')}
		>
			<PrinterOutline class="me-2 h-5 w-5" /> Cetak
		</Button>
	</div>
</div>

<!-- ── New roster flow view ──────────────────────────────────────────────── -->
{#if isNewRosterFlow}
	<div class="mt-4">
		{#if actionError}
			<div class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
				{actionError}
			</div>
		{/if}

		{#if !roster}
			<div class="flex flex-col items-start gap-3">
				<p class="text-gray-500">Belum ada roster untuk misa ini.</p>
				{#if communities.length === 0}
					<p class="text-sm text-yellow-600">
						Belum ada data lingkungan. Tambahkan lingkungan di
						<a href="/admin/settings/community" class="underline">pengaturan</a> terlebih dahulu.
					</p>
				{:else}
					<Button size="sm" onclick={openCreateRosterModal}>
						<UsersOutline class="me-2 h-4 w-4" /> Buat Roster
					</Button>
				{/if}
			</div>

			<!-- ── Create Roster Modal ────────────────────────────────────────── -->
			<Modal bind:open={showCreateRosterModal} title="Buat Roster" size="md" autoclose={false}>
				{#if communities.length > 0}
					<form
						method="POST"
						action="?/createRoster"
						use:enhance={() =>
							async ({ update }) => {
								await update({ reset: false });
								showCreateRosterModal = false;
							}}
					>
						<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
							Pilih lingkungan yang akan dimasukkan dalam roster ini.
						</p>

						<div class="mb-4 max-h-72 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700">
							{#each Object.entries(communitiesByWilayah) as [_key, group]}
								<div class="mb-3">
									<p class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
										{group.wilayahName}
									</p>
									{#each group.items as community}
										<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700">
											<input
												type="checkbox"
												name="communityIds"
												value={community.id}
												checked={selectedCommunityIds.includes(community.id)}
												onchange={() => toggleCommunity(community.id)}
												class="h-4 w-4 rounded border-gray-300 text-blue-600"
											/>
											<span class="text-sm text-gray-800 dark:text-gray-200">{community.name}</span>
										</label>
									{/each}
								</div>
							{/each}
						</div>

						{#if actionError}
							<p class="mb-3 text-sm text-red-600">{actionError}</p>
						{/if}

						<div class="flex justify-end gap-2">
							<Button
								type="button"
								color="alternative"
								size="sm"
								onclick={() => (showCreateRosterModal = false)}
							>
								Batal
							</Button>
							<Button
								type="submit"
								size="sm"
								disabled={selectedCommunityIds.length === 0}
							>
								Buat Roster ({selectedCommunityIds.length})
							</Button>
						</div>
					</form>
				{/if}
			</Modal>
		{:else}
			<div class="flex flex-col gap-2">
				<div class="mb-2 flex items-center gap-2 text-sm text-gray-500">
					<span>Roster</span>
					<Badge color="gray">v{roster.version}</Badge>
				</div>
				<ul class="flex flex-col gap-2">
					{#each roster.entries as entry (entry.id)}
						<li class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
							<div class="flex items-start justify-between gap-4">
								<div>
									<div class="flex items-center gap-2">
										<span class="font-medium text-gray-900 dark:text-white">
											{entry.communityName}
										</span>
										<span class="text-sm text-gray-500">({entry.wilayahName})</span>
										<Badge color={statusBadgeColor(entry.status)}>
											{statusLabel(entry.status)}
										</Badge>
									</div>

									{#if entry.ushers.length > 0}
										<ul class="mt-2 space-y-0.5 pl-2 text-sm text-gray-600 dark:text-gray-400">
											{#each entry.ushers as usher (usher.id)}
												<li>• {usher.name}</li>
											{/each}
										</ul>
									{:else if entry.status === 'draft'}
										<p class="mt-1 text-sm text-gray-400">Menunggu konfirmasi dari lingkungan.</p>
									{/if}
								</div>

								<div class="flex shrink-0 flex-col gap-1">
									{#if entry.status === 'submitted'}
										<form
											method="POST"
											action="?/confirmEntry"
											use:enhance={() =>
												async ({ update }) => {
													await update({ reset: false });
												}}
										>
											<input type="hidden" name="rosterId" value={roster.id} />
											<input type="hidden" name="communityId" value={entry.communityId} />
											<Button type="submit" size="xs" color="green">
												<CheckCircleSolid class="me-1 size-4" /> Konfirmasi
											</Button>
										</form>
									{/if}
									{#if entry.status === 'submitted' || entry.status === 'confirmed'}
										<form
											method="POST"
											action="?/reopenEntry"
											use:enhance={() =>
												async ({ update }) => {
													await update({ reset: false });
												}}
										>
											<input type="hidden" name="rosterId" value={roster.id} />
											<input type="hidden" name="communityId" value={entry.communityId} />
											<Button type="submit" size="xs" color="alternative">
												<CloseCircleSolid class="me-1 size-4" /> Buka kembali
											</Button>
										</form>
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

<!-- ── Legacy view ───────────────────────────────────────────────────────── -->
{:else}
	<div class="mt-4">
		<ul class="mb-4 flex gap-4 text-sm font-light text-gray-500">
			<li class="flex items-center gap-2"><UsersOutline class="size-4" /><span>Petugas</span></li>
			<li class="flex items-center gap-2"><ArchiveOutline class="size-4" /> <span>PPG</span></li>
			<li class="flex items-center gap-2"><CashOutline class="size-4" /> <span>Kolekte</span></li>
		</ul>
		{#if eventDetail.rows && eventDetail.rows.length > 0}
			<JadwalKonfirmasi
				description={eventDetail.description ?? ''}
				rows={eventDetail.rows}
				{openRow}
				{toggleRow}
				{zones}
				onEditPic={handleEditPic}
				onEditDescription={handleEditDescription}
			/>
		{:else}
			<p>Data tidak ditemukan</p>
		{/if}
	</div>
{/if}

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
						return async ({ result }) => {
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

<!-- PIC modal — only used in legacy view -->
{#if !isNewRosterFlow}
	<Modal
		title={isMisaPicEdit ? (eventDetail.description ? 'Edit PIC Misa' : 'Tambah PIC Misa') : editingZoneRow ? 'Edit PIC Zona' : 'Tambah PIC Zona'}
		bind:open={defaultModalPicZone}
	>
		<form
			method="POST"
			action="?/updatePic"
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success' && result.data?.success) {
						await invalidateAll();
						resetPicModal();
					}
				};
			}}
		>
			<input
				type="hidden"
				name="mode"
				value={isMisaPicEdit
					? (eventDetail.description ? 'edit' : 'add')
					: (editingZoneRow && editingZoneRow.pic.length > 0 ? 'edit' : 'add')}
			/>
			<input type="hidden" name="is_misa_pic" value={isMisaPicEdit} />
			<div class="mb-4 grid gap-4 sm:grid-cols-1">
				<div>
					<Label for="zone" class="mb-2">Zona</Label>
					{#if isMisaPicEdit}
						<input type="hidden" name="zone" value={globalZoneId} />
						<P class="mt-2 text-gray-700 dark:text-gray-300">PIC Misa</P>
					{:else if editingZoneRow}
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
{/if}
