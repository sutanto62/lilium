<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { dndzone, dragHandle, dragHandleZone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import type { DndEvent } from 'svelte-dnd-action';
	import { Alert, Badge, Breadcrumb, BreadcrumbItem, Button, Input, Label, Select, Spinner } from 'flowbite-svelte';
	import { PenOutline, PlusOutline, TrashBinOutline, ChevronDownOutline, ChevronRightOutline, DotsVerticalOutline } from 'flowbite-svelte-icons';
	import type { PageProps } from './$types';
	import type { Section, Zone, Station } from '$core/entities/Facility';
	import type { Ministry } from '$core/entities/Ministry';

	const { data } = $props<{ data: PageProps['data'] }>();

	// ── DnD state (Maps keyed by parent ID — no sort, order = DnD order) ───────

	function buildZonesBySection(zones: Zone[]): Map<string | null, Zone[]> {
		const map = new Map<string | null, Zone[]>();
		for (const z of zones) {
			const key = z.sectionId ?? null;
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(z);
		}
		return map;
	}

	function buildStationsByZone(stations: Station[]): Map<string, Station[]> {
		const map = new Map<string, Station[]>();
		for (const s of stations) {
			if (!map.has(s.zoneId)) map.set(s.zoneId, []);
			map.get(s.zoneId)!.push(s);
		}
		return map;
	}

	let sections = $state<Section[]>(data.sections as Section[]);
	let zonesBySection = $state(buildZonesBySection(data.zones as Zone[]));
	let stationsByZone = $state(buildStationsByZone(data.stations as Station[]));

	$effect(() => {
		sections = data.sections as Section[];
		zonesBySection = buildZonesBySection(data.zones as Zone[]);
		stationsByZone = buildStationsByZone(data.stations as Station[]);
	});

	// ── Derived lookups (use server data so dropdowns never show shadow items) ─

	const ministryMap = $derived(new Map((data.ministries as Ministry[]).map((m) => [m.id, m.name])));
	const sectionOptions = $derived((data.sections as Section[]).map((s) => ({ value: s.id, name: s.name })));
	const zoneOptions = $derived((data.zones as Zone[]).map((z) => ({ value: z.id, name: z.name })));
	const ministryOptions = $derived(
		(data.ministries as Ministry[]).filter((m) => m.active).map((m) => ({ value: m.id, name: m.name }))
	);

	const orphanZones = $derived(zonesBySection.get(null) ?? []);

	// ── Collapse state ────────────────────────────────────────────────────────

	let collapsedSections = $state(new Set<string>());
	let collapsedZones = $state(new Set<string>());
	let orphansCollapsed = $state(false);

	function toggleSection(id: string) {
		collapsedSections = new Set(collapsedSections);
		collapsedSections.has(id) ? collapsedSections.delete(id) : collapsedSections.add(id);
	}
	function toggleZone(id: string) {
		collapsedZones = new Set(collapsedZones);
		collapsedZones.has(id) ? collapsedZones.delete(id) : collapsedZones.add(id);
	}

	// ── DnD helpers ───────────────────────────────────────────────────────────

	const FLIP_MS = 200;

	async function postAction(action: string, body: Record<string, string>) {
		const fd = new FormData();
		for (const [k, v] of Object.entries(body)) fd.set(k, v);
		await fetch(action, { method: 'POST', body: fd });
	}

	// Sections DnD (reorder only)
	function handleSectionConsider(e: CustomEvent<DndEvent<Section>>) {
		sections = e.detail.items;
	}
	async function handleSectionFinalize(e: CustomEvent<DndEvent<Section>>) {
		sections = e.detail.items;
		await postAction('?/reorder', { entity: 'seksi', ids: JSON.stringify(e.detail.items.map((s) => s.id)) });
	}

	// Zones DnD (reorder + re-parent between sections)
	// Map update: DnD library owns the order, we just forward its items array per bucket.
	function handleZoneConsider(sectionId: string | null, e: CustomEvent<DndEvent<Zone>>) {
		zonesBySection = new Map(zonesBySection);
		zonesBySection.set(sectionId, e.detail.items);
	}
	async function handleZoneFinalize(sectionId: string | null, e: CustomEvent<DndEvent<Zone>>) {
		const finalItems = e.detail.items;
		const movedItem = finalItems.find((z) => (z.sectionId ?? null) !== sectionId);

		zonesBySection = new Map(zonesBySection);
		zonesBySection.set(sectionId, finalItems.map((z, i) => ({ ...z, sectionId: sectionId ?? null, sequence: i })));

		if (movedItem) {
			const oldKey = movedItem.sectionId ?? null;
			zonesBySection.set(oldKey, (zonesBySection.get(oldKey) ?? []).filter((z) => z.id !== movedItem.id));
			await postAction('?/move', { entity: 'zona', id: movedItem.id, newParentId: sectionId ?? '' });
		}
		await postAction('?/reorder', { entity: 'zona', ids: JSON.stringify(finalItems.map((z) => z.id)) });
	}

	// Stations DnD (reorder + re-parent between zones)
	function handleStationConsider(zoneId: string, e: CustomEvent<DndEvent<Station>>) {
		stationsByZone = new Map(stationsByZone);
		stationsByZone.set(zoneId, e.detail.items);
	}
	async function handleStationFinalize(zoneId: string, e: CustomEvent<DndEvent<Station>>) {
		const finalItems = e.detail.items;
		const movedItem = finalItems.find((s) => s.zoneId !== zoneId);

		stationsByZone = new Map(stationsByZone);
		stationsByZone.set(zoneId, finalItems.map((s, i) => ({ ...s, zoneId, sequence: i })));

		if (movedItem) {
			const oldZoneId = movedItem.zoneId;
			stationsByZone.set(oldZoneId, (stationsByZone.get(oldZoneId) ?? []).filter((s) => s.id !== movedItem.id));
			await postAction('?/move', { entity: 'station', id: movedItem.id, newParentId: zoneId });
		}
		await postAction('?/reorder', { entity: 'station', ids: JSON.stringify(finalItems.map((s) => s.id)) });
	}

	// ── Drawer state ──────────────────────────────────────────────────────────

	type DrawerMode = 'create' | 'edit';
	type DrawerEntity = 'seksi' | 'zona' | 'station';

	interface DrawerState {
		open: boolean;
		mode: DrawerMode;
		entity: DrawerEntity;
		parentId: string | null;
		item: Section | Zone | Station | null;
	}

	let drawer = $state<DrawerState>({ open: false, mode: 'create', entity: 'seksi', parentId: null, item: null });
	let drawerError = $state<string | null>(null);
	let drawerSubmitting = $state(false);

	function openCreate(entity: DrawerEntity, parentId: string | null = null) {
		drawerError = null;
		drawer = { open: true, mode: 'create', entity, parentId, item: null };
	}
	function openEdit(entity: DrawerEntity, item: Section | Zone | Station) {
		drawerError = null;
		drawer = { open: true, mode: 'edit', entity, parentId: null, item };
	}
	function closeDrawer() {
		drawer = { ...drawer, open: false };
		drawerError = null;
	}

	const drawerTitle = $derived(
		`${drawer.mode === 'create' ? 'Tambah' : 'Ubah'} ${
			drawer.entity === 'seksi' ? 'Seksi' : drawer.entity === 'zona' ? 'Zona' : 'Titik Tugas'
		}`
	);
	const drawerAction = $derived(
		`?/${drawer.mode === 'create' ? 'create' : 'update'}${
			drawer.entity === 'seksi' ? 'Seksi' : drawer.entity === 'zona' ? 'Zona' : 'Station'
		}`
	);

	function handleDrawerSubmit() {
		drawerSubmitting = true;
		drawerError = null;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: () => Promise<void>;
		}) => {
			drawerSubmitting = false;
			if (result.type === 'failure') {
				drawerError = (result.data?.error as string) ?? 'Terjadi kesalahan';
			} else {
				await update();
				await invalidateAll();
				closeDrawer();
			}
		};
	}

	// ── Delete helpers ────────────────────────────────────────────────────────

	function confirmDelete(message: string) {
		return ({ cancel }: { cancel: () => void }) => {
			if (!confirm(message)) {
				cancel();
				return;
			}
			return async ({ update }: { update: () => Promise<void> }) => {
				await update();
				await invalidateAll();
			};
		};
	}

	// Shadow items should not show action buttons
	function isShadow(item: unknown): boolean {
		return (item as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME] === true;
	}
</script>

<svelte:head>
	<title>Struktur</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
	<BreadcrumbItem>Struktur</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4 flex items-center justify-between">
	<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Struktur Gereja</h2>
	<Button size="sm" onclick={() => openCreate('seksi')}>
		<PlusOutline class="mr-1 h-4 w-4" />Tambah Seksi
	</Button>
</div>

{#if sections.length === 0 && orphanZones.length === 0}
	<div class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
		Belum ada seksi. Mulai dengan menambahkan seksi pertama.
	</div>
{/if}

<!-- ── Sections drag-handle zone ──────────────────────────────────────────── -->

<div
	class="space-y-2"
	use:dragHandleZone={{ items: sections, type: 'sections', flipDurationMs: FLIP_MS }}
	onconsider={handleSectionConsider}
	onfinalize={handleSectionFinalize}
>
	{#each sections as section (section.id)}
		{@const sectionZones = zonesBySection.get(section.id) ?? []}
		{@const isCollapsed = collapsedSections.has(section.id)}

		<div class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
			<div class="flex items-center gap-2 px-3 py-2">
				<span
					use:dragHandle
					class="cursor-grab text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
					aria-label="Drag {section.name}"
				>
					<DotsVerticalOutline class="h-5 w-5" />
				</span>
				<button
					type="button"
					onclick={() => toggleSection(section.id)}
					class="flex flex-1 items-center gap-2 text-left"
				>
					{#if isCollapsed}
						<ChevronRightOutline class="h-4 w-4 text-gray-400" />
					{:else}
						<ChevronDownOutline class="h-4 w-4 text-gray-400" />
					{/if}
					<span class="font-semibold text-gray-900 dark:text-white">{section.name}</span>
					{#if section.code}<Badge color="blue" class="ml-1">{section.code}</Badge>{/if}
					<span class="ml-2 text-xs text-gray-400">{sectionZones.length} zona</span>
				</button>
				{#if !isShadow(section)}
					<div class="flex shrink-0 gap-1">
						<Button size="xs" color="light" title="Tambah zona" onclick={() => openCreate('zona', section.id)}>
							<PlusOutline class="h-3 w-3" />
						</Button>
						<Button size="xs" color="light" title="Ubah seksi" onclick={() => openEdit('seksi', section)}>
							<PenOutline class="h-3 w-3" />
						</Button>
						<form method="POST" action="?/deleteSeksi" use:enhance={confirmDelete(`Hapus seksi "${section.name}"?`)}>
							<input type="hidden" name="sectionId" value={section.id} />
							<Button size="xs" color="red" outline type="submit" title="Hapus seksi">
								<TrashBinOutline class="h-3 w-3" />
							</Button>
						</form>
					</div>
				{/if}
			</div>

			{#if !isCollapsed}
				<div class="border-t border-gray-100 dark:border-gray-700">
					{#if sectionZones.length === 0}
						<div class="px-10 py-3 text-sm text-gray-400 dark:text-gray-500">
							Belum ada zona.
							<button type="button" class="ml-1 text-primary-600 hover:underline dark:text-primary-400" onclick={() => openCreate('zona', section.id)}>Tambah zona</button>
						</div>
					{/if}

					<!-- Zones drag-handle zone (cross-section) -->
					<div
						class="min-h-[2px]"
						use:dragHandleZone={{ items: sectionZones, type: 'zones', flipDurationMs: FLIP_MS }}
						onconsider={(e) => handleZoneConsider(section.id, e)}
						onfinalize={(e) => handleZoneFinalize(section.id, e)}
					>
						{#each sectionZones as zone (zone.id)}
							{@const zoneStations = stationsByZone.get(zone.id) ?? []}
							{@const zoneCollapsed = collapsedZones.has(zone.id)}

							<div class="border-b border-gray-50 last:border-0 dark:border-gray-700/50">
								<div class="flex items-center gap-2 py-2 pl-8 pr-3">
									<span
										use:dragHandle
										class="cursor-grab text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
										aria-label="Drag {zone.name}"
									>
										<DotsVerticalOutline class="h-4 w-4" />
									</span>
									<button
										type="button"
										onclick={() => toggleZone(zone.id)}
										class="flex flex-1 items-center gap-2 text-left"
									>
										{#if zoneCollapsed}
											<ChevronRightOutline class="h-3.5 w-3.5 text-gray-400" />
										{:else}
											<ChevronDownOutline class="h-3.5 w-3.5 text-gray-400" />
										{/if}
										<span class="text-sm text-gray-800 dark:text-gray-200">{zone.name}</span>
										{#if zone.code}<Badge color="gray" class="ml-1 text-xs">{zone.code}</Badge>{/if}
										<span class="ml-2 text-xs text-gray-400">{zoneStations.length} titik</span>
									</button>
									{#if !isShadow(zone)}
										<div class="flex shrink-0 gap-1">
											<Button size="xs" color="light" title="Tambah titik tugas" onclick={() => openCreate('station', zone.id)}>
												<PlusOutline class="h-3 w-3" />
											</Button>
											<Button size="xs" color="light" title="Ubah zona" onclick={() => openEdit('zona', zone)}>
												<PenOutline class="h-3 w-3" />
											</Button>
											<form method="POST" action="?/deleteZona" use:enhance={confirmDelete(`Hapus zona "${zone.name}"?`)}>
												<input type="hidden" name="zoneId" value={zone.id} />
												<Button size="xs" color="red" outline type="submit" title="Hapus zona">
													<TrashBinOutline class="h-3 w-3" />
												</Button>
											</form>
										</div>
									{/if}
								</div>

								{#if !zoneCollapsed}
									{#if zoneStations.length === 0}
										<div class="py-2 pl-16 text-xs text-gray-400 dark:text-gray-500">
											Belum ada titik tugas.
											<button type="button" class="ml-1 text-primary-600 hover:underline dark:text-primary-400" onclick={() => openCreate('station', zone.id)}>Tambah</button>
										</div>
									{/if}

									<!-- Stations drag-handle zone (cross-zone) -->
									<div
										class="min-h-[2px]"
										use:dragHandleZone={{ items: zoneStations, type: 'stations', flipDurationMs: FLIP_MS }}
										onconsider={(e) => handleStationConsider(zone.id, e)}
										onfinalize={(e) => handleStationFinalize(zone.id, e)}
									>
										{#each zoneStations as station (station.id)}
											<div class="flex items-center gap-2 py-1.5 pl-16 pr-3">
												<span
													use:dragHandle
													class="cursor-grab text-gray-200 hover:text-gray-400 dark:text-gray-700 dark:hover:text-gray-500"
													aria-label="Drag {station.name}"
												>
													<DotsVerticalOutline class="h-4 w-4" />
												</span>
												<span class="flex-1 text-xs text-gray-700 dark:text-gray-300">{station.name}</span>
												{#if station.code}<Badge color="gray" class="text-xs">{station.code}</Badge>{/if}
												<span class="mr-2 text-xs text-gray-400">{ministryMap.get(station.ministryId) ?? '—'}</span>
												{#if !isShadow(station)}
													<div class="flex shrink-0 gap-1">
														<Button size="xs" color="light" title="Ubah titik tugas" onclick={() => openEdit('station', station)}>
															<PenOutline class="h-3 w-3" />
														</Button>
														<form method="POST" action="?/deleteStation" use:enhance={confirmDelete(`Hapus titik tugas "${station.name}"?`)}>
															<input type="hidden" name="stationId" value={station.id} />
															<Button size="xs" color="red" outline type="submit" title="Hapus titik tugas">
																<TrashBinOutline class="h-3 w-3" />
															</Button>
														</form>
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>

<!-- ── Orphan zones bucket ─────────────────────────────────────────────────── -->

{#if orphanZones.length > 0}
	<div class="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50">
		<div class="flex items-center gap-2 px-3 py-2">
			<button
				type="button"
				onclick={() => (orphansCollapsed = !orphansCollapsed)}
				class="flex flex-1 items-center gap-2 text-left"
			>
				{#if orphansCollapsed}
					<ChevronRightOutline class="h-4 w-4 text-gray-400" />
				{:else}
					<ChevronDownOutline class="h-4 w-4 text-gray-400" />
				{/if}
				<span class="text-sm font-medium text-gray-500 dark:text-gray-400">Zona tanpa Seksi</span>
				<Badge color="yellow">{orphanZones.length}</Badge>
			</button>
			<Button size="xs" color="light" onclick={() => openCreate('zona', null)}>
				<PlusOutline class="h-3 w-3" />
			</Button>
		</div>

		{#if !orphansCollapsed}
			<div
				class="min-h-[2px] border-t border-gray-200 dark:border-gray-700"
				use:dragHandleZone={{ items: orphanZones, type: 'zones', flipDurationMs: FLIP_MS }}
				onconsider={(e) => handleZoneConsider(null, e)}
				onfinalize={(e) => handleZoneFinalize(null, e)}
			>
				{#each orphanZones as zone (zone.id)}
					<div class="flex items-center gap-2 px-3 py-2 pl-8">
						<span
							use:dragHandle
							class="cursor-grab text-gray-300 hover:text-gray-500 dark:text-gray-600"
							aria-label="Drag {zone.name}"
						>
							<DotsVerticalOutline class="h-4 w-4" />
						</span>
						<span class="flex-1 text-sm text-gray-700 dark:text-gray-300">{zone.name}</span>
						<span class="text-xs text-gray-400">{(stationsByZone.get(zone.id) ?? []).length} titik</span>
						{#if !isShadow(zone)}
							<Button size="xs" color="light" onclick={() => openEdit('zona', zone)}>
								<PenOutline class="h-3 w-3" />
							</Button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<!-- ── Slide-out drawer ───────────────────────────────────────────────────── -->

{#if drawer.open}
	<div class="fixed inset-0 z-40 bg-black/30" role="presentation" onclick={closeDrawer}></div>

	<aside class="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
		<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
			<h3 class="font-semibold text-gray-900 dark:text-white">{drawerTitle}</h3>
			<button
				type="button"
				onclick={closeDrawer}
				class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
				aria-label="Tutup"
			>&times;</button>
		</div>

		<form
			method="POST"
			action={drawerAction}
			autocomplete="off"
			use:enhance={handleDrawerSubmit}
			class="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
		>
			{#if drawerError}
				<Alert color="red">{drawerError}</Alert>
			{/if}

			<!-- ── Seksi fields ────────────────────────────────────────────── -->
			{#if drawer.entity === 'seksi'}
				{#if drawer.mode === 'edit' && drawer.item}
					<input type="hidden" name="sectionId" value={(drawer.item as Section).id} />
				{/if}
				<div>
					<Label for="d-name" class="mb-1">Nama Seksi <span class="text-red-500">*</span></Label>
					<Input id="d-name" name="name" autocomplete="off" required disabled={drawerSubmitting}
						value={drawer.mode === 'edit' ? ((drawer.item as Section | null)?.name ?? '') : ''} />
				</div>
				<div>
					<Label for="d-code" class="mb-1">Kode</Label>
					<Input id="d-code" name="code" autocomplete="off" disabled={drawerSubmitting}
						value={drawer.mode === 'edit' ? ((drawer.item as Section | null)?.code ?? '') : ''} />
				</div>
				<div>
					<Label for="d-desc" class="mb-1">Deskripsi</Label>
					<Input id="d-desc" name="description" autocomplete="off" disabled={drawerSubmitting}
						value={drawer.mode === 'edit' ? ((drawer.item as Section | null)?.description ?? '') : ''} />
				</div>

			<!-- ── Zona fields ──────────────────────────────────────────────── -->
			{:else if drawer.entity === 'zona'}
				{#if drawer.mode === 'edit' && drawer.item}
					<input type="hidden" name="zoneId" value={(drawer.item as Zone).id} />
				{/if}
				<div>
					<Label for="d-name" class="mb-1">Nama Zona <span class="text-red-500">*</span></Label>
					<Input id="d-name" name="name" autocomplete="off" required disabled={drawerSubmitting}
						value={drawer.mode === 'edit' ? ((drawer.item as Zone | null)?.name ?? '') : ''} />
				</div>
				<div>
					<Label for="d-code" class="mb-1">Kode</Label>
					<Input id="d-code" name="code" autocomplete="off" disabled={drawerSubmitting}
						value={drawer.mode === 'edit' ? ((drawer.item as Zone | null)?.code ?? '') : ''} />
				</div>
				<div>
					<Label for="d-desc" class="mb-1">Deskripsi</Label>
					<Input id="d-desc" name="description" autocomplete="off" disabled={drawerSubmitting}
						value={drawer.mode === 'edit' ? ((drawer.item as Zone | null)?.description ?? '') : ''} />
				</div>
				<div>
					<Label for="d-section" class="mb-1">Seksi</Label>
					<Select id="d-section" name="sectionId" disabled={drawerSubmitting}
						items={[{ value: '', name: '— Tanpa Seksi —' }, ...sectionOptions]}
						value={drawer.mode === 'edit'
							? ((drawer.item as Zone | null)?.sectionId ?? '')
							: (drawer.parentId ?? '')} />
				</div>

			<!-- ── Station fields ──────────────────────────────────────────── -->
			{:else}
				{#if drawer.mode === 'edit' && drawer.item}
					<input type="hidden" name="stationId" value={(drawer.item as Station).id} />
				{/if}
				<div>
					<Label for="d-name" class="mb-1">Nama Titik Tugas <span class="text-red-500">*</span></Label>
					<Input id="d-name" name="name" autocomplete="off" required disabled={drawerSubmitting}
						value={drawer.mode === 'edit' ? ((drawer.item as Station | null)?.name ?? '') : ''} />
				</div>
				<div>
					<Label for="d-code" class="mb-1">Kode</Label>
					<Input id="d-code" name="code" autocomplete="off" disabled={drawerSubmitting}
						value={drawer.mode === 'edit' ? ((drawer.item as Station | null)?.code ?? '') : ''} />
				</div>
				<div>
					<Label for="d-zone" class="mb-1">Zona <span class="text-red-500">*</span></Label>
					<Select id="d-zone" name="zoneId" required disabled={drawerSubmitting}
						items={zoneOptions}
						value={drawer.mode === 'edit'
							? ((drawer.item as Station | null)?.zoneId ?? '')
							: (drawer.parentId ?? '')} />
				</div>
				<div>
					<Label for="d-ministry" class="mb-1">Pelayanan <span class="text-red-500">*</span></Label>
					<Select id="d-ministry" name="ministryId" required disabled={drawerSubmitting}
						items={ministryOptions}
						value={drawer.mode === 'edit' ? ((drawer.item as Station | null)?.ministryId ?? '') : ''} />
				</div>
				<div>
					<Label for="d-desc" class="mb-1">Deskripsi</Label>
					<Input id="d-desc" name="description" autocomplete="off" disabled={drawerSubmitting}
						value={drawer.mode === 'edit' ? ((drawer.item as Station | null)?.description ?? '') : ''} />
				</div>
			{/if}

			<div class="mt-auto flex gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
				<Button type="submit" disabled={drawerSubmitting} class="flex-1">
					{#if drawerSubmitting}<Spinner size="4" class="mr-2" />{/if}
					Simpan
				</Button>
				<Button color="alternative" type="button" onclick={closeDrawer} disabled={drawerSubmitting}>
					Batal
				</Button>
			</div>
		</form>
	</aside>
{/if}
