<script lang="ts">
	import {
		Button,
		Input,
		Label,
		Modal,
		Select,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Tooltip
	} from 'flowbite-svelte';

	import JadwalKonfirmasiDetail from '$components/jadwal/JadwalKonfirmasiDetail.svelte';
	import type { ChurchZoneGroup } from '$core/entities/Schedule';
	import { ArchiveOutline, CashOutline, UsersOutline } from 'flowbite-svelte-icons';

	// Svelte 5: Use $props() for component props
	const { description, rows, openRow, toggleRow, zones } = $props<{
		description: string;
		rows: any[];
		openRow: number | null;
		toggleRow: (index: number) => void;
		zones: ChurchZoneGroup[];
	}>();

	// Svelte 5: Use $state() for reactive state
	let defaultModalPicZone = $state(false);
	let defaultModalPicEvent = $state(false);
	let selectedZoneId = $state<string | null>(null);
	let eventZonePic = $state('');

	// Svelte 5: Use $derived() for computed values
	const zoneOptions = $derived(
		zones.map((e: ChurchZoneGroup) => ({ value: e.id ?? '', name: e.name ?? '' }))
	);

	// Svelte 5: Event handlers with proper typing
	function handleToggleRow(index: number, event: Event) {
		// Prevent event bubbling when clicking on buttons
		if ((event.target as HTMLElement).closest('button')) {
			return;
		}
		toggleRow(index);
	}

	function handleAddPic(event: Event) {
		event.stopPropagation();
		defaultModalPicZone = true;
	}

	function handleSubmitPicZone(event: SubmitEvent) {
		// Form submission logic can be handled here if needed
		// The form will still submit to the server action
	}

	function handleSubmitPicEvent(event: SubmitEvent) {
		// Form submission logic can be handled here if needed
		// The form will still submit to the server action
	}
</script>

<Table>
	<TableHead>
		<TableHeadCell class="w-1/3 px-2 lg:w-1/6">Zona</TableHeadCell>
		<TableHeadCell class="hidden px-2 lg:table-cell">Lingkungan</TableHeadCell>
		<TableHeadCell class="w-1/3 px-2 lg:w-1/12">
			<UsersOutline /><Tooltip type="auto">Petugas</Tooltip>
		</TableHeadCell>
		<TableHeadCell class="w-1/3 px-2 lg:w-1/12" id="header-ppg">
			<ArchiveOutline /><Tooltip type="auto">PPG</Tooltip>
		</TableHeadCell>
		<TableHeadCell class="w-1/3 px-2 lg:w-1/12" id="header-kolekte">
			<CashOutline /><Tooltip type="auto">Kolekte</Tooltip>
		</TableHeadCell>
	</TableHead>
	<TableBody class="divide-y">
		<TableBodyRow>
			{#if description.length == 0}
				<TableBodyCell colspan={5} class="px-2 align-top">
					<Button size="xs" onclick={(event: Event) => handleAddPic(event)}>Tambah PIC Misa</Button>
				</TableBodyCell>
			{:else}
				<TableBodyCell colspan={5} class="px-2 align-top">PIC Misa: {description}</TableBodyCell>
			{/if}
		</TableBodyRow>
		{#each rows as jadwalDetaillZone, i}
			<TableBodyRow class="hover:bg-gray-100" onclick={(event) => handleToggleRow(i, event)}>
				<TableBodyCell class="px-2 align-top"
					>{jadwalDetaillZone.name}
					<ol class="block lg:hidden">
						{#each jadwalDetaillZone.lingkungan as lingkungan}
							<li>{lingkungan}</li>
						{/each}
					</ol>
					<ol class="mt-2 block lg:hidden">
						{#if jadwalDetaillZone.pic && jadwalDetaillZone.pic.length > 0}
							{#each jadwalDetaillZone.pic as pic}
								<li>PIC: {pic}</li>
							{/each}
						{:else if jadwalDetaillZone.name !== 'Non Zona'}
							<Button size="xs" onclick={(event: Event) => handleAddPic(event)}
								>Tambah PIC Zona</Button
							>
						{/if}
					</ol>
				</TableBodyCell>
				<TableBodyCell class="hidden px-2 align-top lg:table-cell">
					<div class="grid grid-cols-2 gap-2">
						<div>
							<ol>
								{#each jadwalDetaillZone.lingkungan as lingkungan}
									<li>{lingkungan}</li>
								{/each}
							</ol>
						</div>
						<div>
							<ol>
								{#if jadwalDetaillZone.pic && jadwalDetaillZone.pic.length > 0}
									{#each jadwalDetaillZone.pic as pic}
										<li>PIC: {pic}</li>
									{/each}
								{:else if jadwalDetaillZone.name !== 'Non Zona'}
									<Button size="xs" onclick={(event: Event) => handleAddPic(event)}
										>Tambah PIC Zona</Button
									>
								{/if}
							</ol>
						</div>
					</div>
				</TableBodyCell>
				<TableBodyCell class="px-2 align-top">{jadwalDetaillZone.zoneUshers}</TableBodyCell>
				<TableBodyCell class="px-2 align-top">{jadwalDetaillZone.zonePpg}</TableBodyCell>
				<TableBodyCell class="px-2 align-top">{jadwalDetaillZone.zoneKolekte}</TableBodyCell>
			</TableBodyRow>
			{#if openRow === i}
				<TableBodyRow>
					<TableBodyCell colspan={5} class="p-0">
						<div class="my-2 grid gap-2 sm:grid-cols-1 lg:grid-cols-4">
							{#each rows[i].detail as lingkungan}
								<JadwalKonfirmasiDetail {lingkungan} />
							{/each}
						</div>
					</TableBodyCell>
				</TableBodyRow>
			{/if}
		{/each}
	</TableBody>
</Table>

<Modal title="Tambah PIC Misa" bind:open={defaultModalPicZone}>
	<form method="POST" action="?/updatePic" onsubmit={handleSubmitPicEvent}>
		<div class="mb-4 grid gap-4 sm:grid-cols-1">
			<div>
				<Label for="pic" class="mb-2">PIC Misa</Label>
			</div>
		</div>
	</form>
</Modal>

<!-- PIC modal for adding pic to zone -->
<Modal title="PIC Zona" bind:open={defaultModalPicZone}>
	<form method="POST" action="?/updatePic" onsubmit={handleSubmitPicZone}>
		<div class="mb-4 grid gap-4 sm:grid-cols-1">
			<div>
				<Label for="zone" class="mb-2">Zona Tugas</Label>
				<Select
					id="zone"
					name="zone"
					class="mt-2"
					items={zoneOptions}
					bind:value={selectedZoneId}
					placeholder="Pilih Zona"
					required
				/>
			</div>
			<div>
				<Label for="pic" class="mb-2">PIC Peta</Label>
				<Input
					type="text"
					id="pic"
					name="pic"
					placeholder="Tulis nama. Gunakan koma bila lebih dari 1"
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
