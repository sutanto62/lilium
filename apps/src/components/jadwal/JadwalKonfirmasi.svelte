<script lang="ts">
	import {
	Button,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Tooltip
	} from 'flowbite-svelte';

	import JadwalKonfirmasiDetail from '$components/jadwal/JadwalKonfirmasiDetail.svelte';
	import type { EventScheduleRows } from '$core/entities/Event';
	import type { ChurchZoneGroup } from '$core/entities/Schedule';
	import { ArchiveOutline, CashOutline, UserAddSolid, PenOutline, UsersOutline } from 'flowbite-svelte-icons';

	const { description, rows, openRow, toggleRow, zones, onEditPic, onEditDescription } = $props<{
		description: string;
		rows: EventScheduleRows[];
		openRow: number | null;
		toggleRow: (index: number) => void;
		zones: ChurchZoneGroup[];
		onEditPic?: (row: EventScheduleRows) => void;
		onEditDescription?: () => void;
	}>();

	function handleToggleRow(index: number, event: Event) {
		if ((event.target as HTMLElement).closest('button')) {
			return;
		}
		toggleRow(index);
	}

	function handleEditPic(row: EventScheduleRows, event: Event) {
		event.stopPropagation();
		onEditPic?.(row);
	}

	function handleEditDescription(event: Event) {
		event.stopPropagation();
		onEditDescription?.();
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
			<TableBodyCell colspan={5} class="px-2 align-top">
				<div class="flex items-center gap-2">
					<span>PIC Misa: {description}</span>
					{#if onEditDescription}
						<Button
							type="button"
							class="flex shrink-0 items-center justify-center rounded-full bg-gray-200 p-2 text-gray-600 hover:bg-green-300"
							title={description ? 'Edit PIC Misa' : 'Tambah PIC Misa'}
							onclick={(e: Event) => handleEditDescription(e)}
						>
							{#if description}
								<PenOutline class="size-4 btn-secondary" />
							{:else}
								<UserAddSolid class="size-4 btn-secondary" />
							{/if}
						</Button>
					{/if}
				</div>
			</TableBodyCell>
		</TableBodyRow>
		{#snippet lingkunganList(row: EventScheduleRows)}
			<ol>
				{#each row.lingkungan as lingkungan}
					<li>{lingkungan}</li>
				{/each}
			</ol>
		{/snippet}

		{#snippet picCell(row: EventScheduleRows)}
			<ol class="mt-0">
				{#each row.pic as pic}
					<li>PIC: {pic}</li>
				{/each}
			</ol>
			{#if onEditPic}
				<Button
					type="button"
					class="flex shrink-0 items-center justify-center rounded-full bg-gray-200 p-2 text-gray-600 hover:bg-green-300"
					title={row.pic.length > 0 ? 'Edit PIC zona' : 'Tambah PIC zona'}
					onclick={(e: Event) => handleEditPic(row, e)}
				>
					{#if row.pic.length > 0}
						<PenOutline class="size-4 btn-secondary" />
					{:else}
						<UserAddSolid class="size-4 btn-secondary" />
					{/if}
				</Button>
			{/if}
		{/snippet}

		{#each rows as jadwalDetaillZone, i}
			<TableBodyRow class="hover:bg-gray-100" onclick={(event) => handleToggleRow(i, event)}>
				<TableBodyCell class="px-2 align-top">
					{jadwalDetaillZone.name}
					<ol class="mt-1 block lg:hidden">
						{@render lingkunganList(jadwalDetaillZone)}
					</ol>
					<div class="mt-2 flex items-center gap-2 block lg:hidden">
						{@render picCell(jadwalDetaillZone)}
					</div>
				</TableBodyCell>
				<TableBodyCell class="hidden px-2 align-top lg:table-cell">
					<div class="grid grid-cols-2 gap-2">
						<div>{@render lingkunganList(jadwalDetaillZone)}</div>
						<div class="flex items-center gap-2">
							{@render picCell(jadwalDetaillZone)}
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
