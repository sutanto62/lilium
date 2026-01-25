<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { tick } from 'svelte';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import { page } from '$app/state';
	import type { MassPositionView } from '$core/entities/Schedule';
	import {
		Alert,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Checkbox,
		Heading,
		Input,
		Label,
		Modal,
		P,
		Select,
		Spinner,
		Textarea
	} from 'flowbite-svelte';
	import {
		CirclePlusSolid,
		PenOutline,
		TrashBinOutline,
		ArrowUpOutline,
		ArrowDownOutline
	} from 'flowbite-svelte-icons';
	import type { PageProps } from './$types';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	// Derived data
	const mass = $derived(data.mass);
	const serverPositions = $derived(data.positionsByMass);
	const requirePpg = $derived(data.requirePpg ?? false);
	
	// Local reactive state for positions (allows optimistic updates)
	let localPositions = $state<MassPositionView[]>([]);
	let isOptimisticUpdate = $state(false);
	
	// Initialize local positions from server data
	$effect(() => {
		if (localPositions.length === 0) {
			localPositions = serverPositions;
		}
	});
	
	// Sync local state with server data when it changes (but not during optimistic updates)
	$effect(() => {
		if (!isOptimisticUpdate) {
			localPositions = serverPositions;
		}
	});
	
	const positionsByMass = $derived(localPositions);

	// UI state
	let showAlert = $state(true);
	let isSubmitting = $state(false);
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let selectedPosition = $state<MassPositionView | null>(null);
	let deletingPositionId = $state<string | null>(null);
	let openMobileActionsId = $state<string | null>(null);

	// Reorder form state (used to avoid direct fetch calls)
	let reorderForm: HTMLFormElement | null = null;
	let reorderZoneId = $state<string>('');
	let reorderItemsJson = $state<string>('');
	let lastReorderPreviousPositions: MassPositionView[] | null = null;
	let lastReorderZoneId: string | null = null;
	let lastReorderDirection: 'up' | 'down' | null = null;
	let lastReorderItemCount = 0;

	// Create form state
	let createZoneId = $state<string>('');
	let createName = $state('');
	let createType = $state<'usher' | 'prodiakon' | 'peta'>('usher');
	let createCode = $state('');
	let createDescription = $state('');
	let createIsPpg = $state(false);
	let createSequence = $state<string>('');

	// Edit form state
	let editZoneId = $state<string>('');
	let editName = $state('');
	let editType = $state<'usher' | 'prodiakon' | 'peta'>('usher');
	let editCode = $state('');
	let editDescription = $state('');
	let editIsPpg = $state(false);
	let editSequence = $state<string>('');

	// Group positions by zone group (positions are flat, not nested by zone)
	type GroupedPositions = {
		zoneGroupId: string | null;
		zoneGroupName: string | null;
		zoneGroupSequence: number | null;
		positions: MassPositionView[];
	};

	const groupedPositions = $derived(() => {
		const groups = new Map<string | null, GroupedPositions>();

		// Group positions by zone group only
		for (const position of positionsByMass) {
			const groupKey = position.zoneGroupId ?? 'no-group';
			if (!groups.has(groupKey)) {
				groups.set(groupKey, {
					zoneGroupId: position.zoneGroupId,
					zoneGroupName: position.zoneGroupName,
					zoneGroupSequence: position.zoneGroupSequence,
					positions: []
				});
			}

			const group = groups.get(groupKey)!;
			group.positions.push(position);
		}

		// Sort positions within each group by sequence (ascending)
		// Positions with null sequence go to the end
		for (const group of groups.values()) {
			group.positions.sort((a, b) => {
				const seqA = a.positionSequence;
				const seqB = b.positionSequence;
				
				// Both have sequences - sort ascending
				if (seqA !== null && seqB !== null) {
					return seqA - seqB;
				}
				
				// Only A has sequence - A comes first
				if (seqA !== null && seqB === null) {
					return -1;
				}
				
				// Only B has sequence - B comes first
				if (seqA === null && seqB !== null) {
					return 1;
				}
				
				// Both null - sort by zone name, then position name
				const zoneCompare = a.zoneName.localeCompare(b.zoneName);
				if (zoneCompare !== 0) return zoneCompare;
				return a.positionName.localeCompare(b.positionName);
			});
		}

		// Sort groups by sequence (ascending), then by name if sequence is null
		return Array.from(groups.values()).sort((a, b) => {
			const seqA = a.zoneGroupSequence;
			const seqB = b.zoneGroupSequence;
			
			// Both have sequences - sort ascending
			if (seqA !== null && seqA !== undefined && seqB !== null && seqB !== undefined) {
				return seqA - seqB;
			}
			
			// Only A has sequence - A comes first
			if (seqA !== null && seqA !== undefined && (seqB === null || seqB === undefined)) {
				return -1;
			}
			
			// Only B has sequence - B comes first
			if ((seqA === null || seqA === undefined) && seqB !== null && seqB !== undefined) {
				return 1;
			}
			
			// Both null/undefined - sort by name
			const nameA = a.zoneGroupName ?? '';
			const nameB = b.zoneGroupName ?? '';
			return nameA.localeCompare(nameB);
		});
	});

	// Get unique zones for create form dropdown
	const availableZones = $derived.by(() => {
		const zoneMap = new Map<string, { id: string; name: string }>();
		for (const position of positionsByMass) {
			if (!zoneMap.has(position.zoneId)) {
				zoneMap.set(position.zoneId, {
					id: position.zoneId,
					name: position.zoneName
				});
			}
		}
		return Array.from(zoneMap.values()).sort((a, b) => a.name.localeCompare(b.name));
	});

	// Auto-hide alerts after 10 seconds
	$effect(() => {
		if (form?.success || form?.error) {
			setTimeout(() => {
				showAlert = false;
			}, 10000);
			isSubmitting = false;
		}
	});

	// Functions
	function openCreateModal() {
		createZoneId = availableZones.length > 0 ? availableZones[0].id : '';
		createName = '';
		createType = 'usher';
		createCode = '';
		createDescription = '';
		createIsPpg = false;
		createSequence = '';
		showCreateModal = true;
	}

	function openEditModal(position: MassPositionView) {
		selectedPosition = position;
		editZoneId = position.zoneId;
		editName = position.positionName;
		editType = position.positionType;
		editCode = ''; // Code is not in MassPositionView, will need to fetch or leave empty
		editDescription = ''; // Description is not in MassPositionView, will need to fetch or leave empty
		editIsPpg = position.isPpg;
		editSequence = position.positionSequence !== null ? position.positionSequence.toString() : '';
		showEditModal = true;
	}

	function openDeleteModal(position: MassPositionView) {
		selectedPosition = position;
		deletingPositionId = position.positionId;
		showDeleteModal = true;
	}

	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		showDeleteModal = false;
		selectedPosition = null;
		deletingPositionId = null;
	}

	function toggleMobileActions(positionId: string) {
		openMobileActionsId = openMobileActionsId === positionId ? null : positionId;
	}

	function closeMobileActionsMenu() {
		openMobileActionsId = null;
	}

	async function handleReorder(zoneId: string, positionId: string, direction: 'up' | 'down') {
		if (isSubmitting) return;

		// Snapshot current state for potential rollback
		lastReorderPreviousPositions = localPositions;

		// Collect all positions in this zone and sort by current sequence (falling back to stable index)
		const zonePositions = localPositions
			.filter((p) => p.zoneId === zoneId)
			.sort((a, b) => {
				const seqA = a.positionSequence ?? 9999;
				const seqB = b.positionSequence ?? 9999;
				if (seqA !== seqB) return seqA - seqB;
				const idxA = localPositions.findIndex((p) => p.positionId === a.positionId);
				const idxB = localPositions.findIndex((p) => p.positionId === b.positionId);
				return idxA - idxB;
			});

		if (zonePositions.length < 2) {
			return;
		}

		const currentIndex = zonePositions.findIndex((p) => p.positionId === positionId);
		if (currentIndex === -1) return;

		const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		if (newIndex < 0 || newIndex >= zonePositions.length) return;

		// Compute new ordered list for this zone
		const orderedZonePositions = [...zonePositions];
		[orderedZonePositions[currentIndex], orderedZonePositions[newIndex]] = [
			orderedZonePositions[newIndex],
			orderedZonePositions[currentIndex]
		];

		// Assign new 1-based sequences for this zone
		const sequenceById = new Map<string, number>();
		orderedZonePositions.forEach((pos, idx) => {
			sequenceById.set(pos.positionId, idx + 1);
		});

		// Build updated local positions array with new sequences for this zone
		const updatedPositions = localPositions.map((pos) =>
			pos.zoneId === zoneId && sequenceById.has(pos.positionId)
				? { ...pos, positionSequence: sequenceById.get(pos.positionId)! }
				: pos
		);

		// Optimistically update the UI immediately
		isOptimisticUpdate = true;
		localPositions = updatedPositions;

		// Build items payload for the server using the new order
		const items = orderedZonePositions.map((p, idx) => ({
			id: p.positionId,
			sequence: idx + 1
		}));

		// Store context for the enhanced form handler
		lastReorderZoneId = zoneId;
		lastReorderDirection = direction;
		lastReorderItemCount = items.length;

		// Prepare hidden form fields for SvelteKit action
		reorderZoneId = zoneId;
		reorderItemsJson = JSON.stringify(items);

		// Submit to server via enhanced form (CSRF-protected, no direct fetch)
		if (reorderForm) {
			isSubmitting = true;
			reorderForm.requestSubmit();
		} else {
			console.error('Reorder form is not initialized');
			isOptimisticUpdate = false;
			if (lastReorderPreviousPositions) {
				localPositions = lastReorderPreviousPositions;
			}
		}
	}

	function getPositionTypeLabel(type: 'usher' | 'prodiakon' | 'peta'): string {
		switch (type) {
			case 'usher':
				return 'Usher';
			case 'prodiakon':
				return 'Prodiakon';
			case 'peta':
				return 'Peta';
			default:
				return type;
		}
	}
</script>

<svelte:head>
	<title>Posisi Misa - {mass.name}</title>
	<meta name="description" content="Kelola posisi untuk misa {mass.name}" />
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/misa">Misa</BreadcrumbItem>
	<BreadcrumbItem>Posisi</BreadcrumbItem>
</Breadcrumb>

<!-- Success/Error Alerts -->
{#if form?.success && showAlert}
	<Alert color="green" class="mb-4">
		<p>Operasi berhasil dilakukan</p>
	</Alert>
{/if}

{#if form?.error && showAlert}
	<Alert color="red" class="mb-4">
		<p>{form.error}</p>
	</Alert>
{/if}

<!-- Header -->
<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	<div>
		<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
			Posisi Misa: {mass.name}
		</Heading>
		{#if mass.day && mass.time}
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{mass.day === 'sunday' ? 'Minggu' : mass.day} - {mass.time}
			</p>
		{/if}
	</div>
	<Button
		class="w-full sm:w-auto"
		color="primary"
		onclick={openCreateModal}
		disabled={isSubmitting || availableZones.length === 0}
	>
		<CirclePlusSolid class="mr-2 h-4 w-4" />
		Tambah Posisi
	</Button>
</div>

<!-- Grouped Positions List -->
{#if groupedPositions().length > 0}
	<div class="space-y-6">
		{#each groupedPositions() as group (group.zoneGroupId ?? 'no-group')}
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
				{#if group.zoneGroupName}
					<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
						{group.zoneGroupName}
					</h2>
				{/if}

				{#if group.positions.length > 0}
					<div class="space-y-2">
						{#each group.positions as position, idx (position.positionId)}
							<div
								class="flex items-center justify-between rounded bg-white p-3 dark:bg-gray-800"
							>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span
											class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300"
											title="Urutan: {position.positionSequence ?? idx + 1}"
										>
											{position.positionSequence ?? idx + 1}
										</span>
										
										<span class="font-medium text-gray-900 dark:text-white">
											{position.positionName}
										</span>
										<span
											class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
										>
											{position.zoneName}
										</span>
										{#if position.isPpg}
											<span
												class="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
											>
												PPG
											</span>
										{/if}
									</div>
								</div>
					
								<div class="flex items-center gap-2">
									<!-- Desktop actions -->
									<div class="hidden items-center gap-2 sm:flex">
										<!-- Edit button -->
										<Button
											size="xs"
											color="light"
											onclick={() => openEditModal(position)}
											disabled={isSubmitting}
											title="Edit posisi"
										>
											<PenOutline class="h-4 w-4" />
										</Button>

										<!-- Delete button -->
										<Button
											size="xs"
											color="red"
											onclick={() => openDeleteModal(position)}
											disabled={isSubmitting}
											title="Hapus posisi"
										>
											<TrashBinOutline class="h-4 w-4" />
										</Button>
									</div>

									<!-- Mobile actions -->
									<div class="relative sm:hidden">
										<Button
											size="xs"
											color="light"
											onclick={() => toggleMobileActions(position.positionId)}
											disabled={isSubmitting}
											title="Opsi posisi"
										>
											<span class="text-lg leading-none">⋮</span>
										</Button>

										{#if openMobileActionsId === position.positionId}
											<div
												class="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
											>
												<button
													type="button"
													class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
													disabled={isSubmitting || idx === 0}
													onclick={() => {
														handleReorder(position.zoneId, position.positionId, 'up');
														closeMobileActionsMenu();
													}}
												>
													<span>Pindah ke atas</span>
												</button>
												<button
													type="button"
													class="mt-1.5 flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
													disabled={isSubmitting || idx === group.positions.length - 1}
													onclick={() => {
														handleReorder(position.zoneId, position.positionId, 'down');
														closeMobileActionsMenu();
													}}
												>
													<span>Pindah ke bawah</span>
												</button>
												<button
													type="button"
													class="mt-1.5 flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
													disabled={isSubmitting}
													onclick={() => {
														openEditModal(position);
														closeMobileActionsMenu();
													}}
												>
													<span>Edit posisi</span>
												</button>
												<button
													type="button"
													class="mt-1.5 flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/40"
													disabled={isSubmitting}
													onclick={() => {
														openDeleteModal(position);
														closeMobileActionsMenu();
													}}
												>
													<span>Hapus posisi</span>
												</button>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada posisi</p>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<div class="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
		<p class="text-gray-500 dark:text-gray-400">Belum ada posisi untuk misa ini</p>
		{#if availableZones.length === 0}
			<p class="mt-2 text-sm text-gray-400 dark:text-gray-500">
				Zona harus ditambahkan ke misa terlebih dahulu
			</p>
		{/if}
	</div>
{/if}

<!-- Hidden form used for position reordering (avoids direct fetch calls) -->
<form
	method="POST"
	action="?/reorder_positions"
	class="hidden"
	bind:this={reorderForm}
	use:enhance={() => {
		return async ({ update, result }) => {
			try {
				if (result.type === 'success') {
					// Apply SvelteKit action result
					await update();
					// Wait for Svelte to process updates
					await tick();
					// Now safe to clear optimistic flag - server data should be synced
					isOptimisticUpdate = false;

					// Track analytics
					const session = page.data.session;
					if (
						session &&
						lastReorderZoneId &&
						lastReorderDirection &&
						lastReorderItemCount
					) {
						await Promise.all([
							statsigService.logEvent('admin_misa_positions_reorder', 'reorder', session, {
								zone_id: lastReorderZoneId,
								direction: lastReorderDirection,
								item_count: lastReorderItemCount
							}),
							tracker.track(
								'admin_misa_positions_reorder',
								{
									event_type: 'positions_reordered',
									zone_id: lastReorderZoneId,
									direction: lastReorderDirection,
									item_count: lastReorderItemCount
								},
								session,
								page
							)
						]);
					}
				} else if (result.type === 'failure') {
					// Revert optimistic update on failure
					isOptimisticUpdate = false;
					if (lastReorderPreviousPositions) {
						localPositions = lastReorderPreviousPositions;
					}
					const errorMessage =
						(result.data as { error?: string })?.error || 'Gagal mengubah urutan posisi';
					console.error('Failed to reorder positions:', errorMessage);
					alert(errorMessage);
				} else if (result.type === 'error') {
					// Revert optimistic update on error
					isOptimisticUpdate = false;
					if (lastReorderPreviousPositions) {
						localPositions = lastReorderPreviousPositions;
					}
					console.error('Failed to reorder positions:', result.error);
					alert('Terjadi kesalahan saat mengubah urutan posisi. Silakan coba lagi.');
				}
			} catch (error) {
				// Revert optimistic update on unexpected errors
				isOptimisticUpdate = false;
				if (lastReorderPreviousPositions) {
					localPositions = lastReorderPreviousPositions;
				}
				console.error('Failed to reorder positions:', error);
				alert('Terjadi kesalahan saat mengubah urutan posisi. Silakan coba lagi.');
			} finally {
				isSubmitting = false;
			}
		};
	}}
>
	<input type="hidden" name="zoneId" value={reorderZoneId} />
	<input type="hidden" name="items" value={reorderItemsJson} />
</form>

<!-- Create Position Modal -->
<Modal title="Tambah Posisi" bind:open={showCreateModal}>
	<form
		method="POST"
		action="?/create_position"
		use:enhance={() => {
			return async ({ update }) => {
				isSubmitting = true;
				await update();
				if (form?.success) {
					closeModals();
					await invalidate('all');
				}
			};
		}}
	>
		<div class="space-y-4">
			<div>
				<Label for="create-zoneId">Zona *</Label>
				<Select
					id="create-zoneId"
					name="zoneId"
					bind:value={createZoneId}
					required
					items={availableZones.map((z: { id: string; name: string }) => ({ value: z.id, name: z.name }))}
				/>
			</div>

			<div>
				<Label for="create-sequence">Urutan</Label>
				<Input
					id="create-sequence"
					name="sequence"
					type="number"
					min="1"
					value={createSequence}
					oninput={(e) => {
						createSequence = (e.target as HTMLInputElement).value;
					}}
					placeholder="Kosongkan untuk mengatur urutan otomatis"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Nomor urutan posisi dalam zona (1, 2, 3, ...). Kosongkan untuk mengatur urutan otomatis.
				</p>
			</div>

			<div>
				<Label for="create-name">Nama Posisi *</Label>
				<Input id="create-name" name="name" bind:value={createName} required placeholder="Contoh: Usher Depan" />
			</div>

			<div>
				<Label for="create-type">Tipe Posisi *</Label>
				<Select
					id="create-type"
					name="type"
					bind:value={createType}
					required
					items={[
						{ value: 'usher', name: 'Usher' },
						{ value: 'prodiakon', name: 'Prodiakon' },
						{ value: 'peta', name: 'Peta' }
					]}
				/>
			</div>

			<div>
				<Label for="create-code">Kode</Label>
				<Input
					id="create-code"
					name="code"
					bind:value={createCode}
					placeholder="Kode opsional"
				/>
			</div>

			<div>
				<Label for="create-description">Deskripsi</Label>
				<Textarea
					id="create-description"
					name="description"
					bind:value={createDescription}
					placeholder="Deskripsi opsional"
					rows={3}
				/>
			</div>

			{#if requirePpg}
				<div>
					<Checkbox id="create-isPpg" name="isPpg" bind:checked={createIsPpg} value="true">
						PPG (Panitia Pembangunan Gereja)
					</Checkbox>
				</div>
			{/if}
		</div>

		<div class="mt-6 flex justify-end gap-2">
			<Button type="button" color="alternative" onclick={closeModals} disabled={isSubmitting}>
				Batal
			</Button>
			<Button type="submit" color="primary" disabled={isSubmitting}>
				{#if isSubmitting}
					<Spinner class="mr-2" />
				{/if}
				Simpan
			</Button>
		</div>
	</form>
</Modal>

<!-- Edit Position Modal -->
<Modal title="Edit Posisi" bind:open={showEditModal}>
	{#if selectedPosition}
		<form
			method="POST"
			action="?/edit_position"
			use:enhance={() => {
				return async ({ update }) => {
					isSubmitting = true;
					await update();
					if (form?.success) {
						closeModals();
						await invalidate('all');
					}
				};
			}}
		>
			<input type="hidden" name="positionId" value={selectedPosition.positionId} />

			<div class="space-y-4 mx-auto w-[95%] sm:w-full sm:px-3">
				<div>
					<Label for="edit-zoneId">Sub Zona *</Label>
					<Select
						id="edit-zoneId"
						name="zoneId"
						bind:value={editZoneId}
						required
						items={availableZones.map((z: { id: string; name: string }) => ({ value: z.id, name: z.name }))}
					/>
				</div>

				<div>
					<Label for="edit-sequence">Urutan</Label>
					<Input
						id="edit-sequence"
						name="sequence"
						type="number"
						min="1"
						value={editSequence}
						oninput={(e) => {
							editSequence = (e.target as HTMLInputElement).value;
						}}
						placeholder="Kosongkan untuk menghapus urutan"
					/>
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						Nomor urutan posisi dalam zona (1, 2, 3, ...). Kosongkan untuk menghapus urutan.
					</p>
				</div>

				<div>
					<Label for="edit-name">Nama Posisi *</Label>
					<Input id="edit-name" name="name" bind:value={editName} required />
				</div>

				<div>
					<Label for="edit-type">Tipe Posisi *</Label>
					<Select
						id="edit-type"
						name="type"
						bind:value={editType}
						required
						items={[
							{ value: 'usher', name: 'Usher' },
							{ value: 'prodiakon', name: 'Prodiakon' },
							{ value: 'peta', name: 'Peta' }
						]}
					/>
				</div>

				{#if requirePpg}
					<div>
						<Checkbox id="edit-isPpg" name="isPpg" bind:checked={editIsPpg} value="true">
							PPG (Panitia Pembangunan Gereja)
						</Checkbox>
					</div>
				{/if}

				
			</div>

			<div class="mt-6 flex justify-end gap-2">
				<Button type="button" color="alternative" onclick={closeModals} disabled={isSubmitting}>
					Batal
				</Button>
				<Button type="submit" color="primary" disabled={isSubmitting}>
					{#if isSubmitting}
						<Spinner class="mr-2" />
					{/if}
					Simpan
				</Button>
			</div>
		</form>
	{/if}
</Modal>

<!-- Delete Position Modal -->
<Modal title="Hapus Posisi" bind:open={showDeleteModal}>
	{#if selectedPosition}
		<P class="mb-4">
			Apakah Anda yakin ingin menghapus posisi <strong>{selectedPosition.positionName}</strong>? Posisi ini
			akan dinonaktifkan dan tidak akan muncul di daftar posisi, namun data historis akan tetap tersimpan.
		</P>

		<form
			method="POST"
			action="?/delete_position"
			use:enhance={() => {
				return async ({ update }) => {
					isSubmitting = true;
					await update();
					if (form?.success) {
						closeModals();
						await invalidate('all');
					}
				};
			}}
		>
			<input type="hidden" name="positionId" value={selectedPosition.positionId} />

			<div class="flex justify-end gap-2">
				<Button type="button" color="alternative" onclick={closeModals} disabled={isSubmitting}>
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
