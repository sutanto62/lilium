<script lang="ts">
	import type { UsherByEventResponse } from '$core/entities/Event';
	import type { Lingkungan } from '$core/entities/Schedule';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import {
		Badge,
		Button,
		ButtonGroup,
		Heading,
		Modal,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { ArchiveSolid, CashSolid } from 'flowbite-svelte-icons';

	// let { events } = $props<{ events: any[] }>();

	let { events, lingkungan } = $props<{ events: any[]; lingkungan: Lingkungan }>();

	let records = $derived(events);

	// Filter
	type FilterStatus = 'all' | 'active' | 'inactive';
	let currentFilter: FilterStatus = $state('active');
	let filteredRecords = $derived(
		records.filter((event: any) => {
			if (currentFilter === 'active') {
				return event.active === 1;
			} else if (currentFilter === 'inactive') {
				return event.active === 0;
			} else {
				return true;
			}
		})
	);

	const setFilter = (filter: FilterStatus) => {
		currentFilter = filter;
	};

	const statusColor = (status: number) => {
		switch (status) {
			case 1:
				return 'green';
			case 0:
				return 'gray';
			default:
				return 'gray';
		}
	};

	let showModal = $state(false);
	let selectedEvent = $state<any | null>(null);

	const handleShowModal = (event: any) => {
		selectedEvent = event;
		showModal = true;
	};
</script>

<div class="mb-4">
	<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl"
		>Tata Tertib</Heading
	>
</div>

<div class="mb-4">
	<ButtonGroup class="*:ring-primary-700!">
		<Button
			onclick={() => setFilter('active')}
			color={currentFilter === 'active' ? 'primary' : 'light'}
		>
			Aktif
		</Button>
		<Button
			onclick={() => setFilter('inactive')}
			color={currentFilter === 'inactive' ? 'primary' : 'light'}
		>
			Selesai
		</Button>
	</ButtonGroup>
</div>

<Table striped={true} shadow>
	<caption
		class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
	>
		Laporan
		<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
			Tugas tata tertib baru atau yang telah selesai
		</p>
	</caption>
	<TableHead>
		<TableHeadCell class="hidden sm:table-cell">No</TableHeadCell>
		<TableHeadCell>Daftar</TableHeadCell>
		<TableHeadCell class="w-full">Misa</TableHeadCell>
		<TableHeadCell class="hidden sm:table-cell"></TableHeadCell>
	</TableHead>
	<TableBody>
		{#each filteredRecords as row, index}
			<TableBodyRow>
				<TableBodyCell class="hidden sm:table-cell">{index + 1}</TableBodyCell>
				<TableBodyCell>
					<Button size="md" color="light" onclick={() => handleShowModal(row)}>Tampilkan</Button>
				</TableBodyCell>
				<TableBodyCell class="w-full">
					<span class="font-bold">{formatDate(row.date, 'long')}</span>: Misa {row.code}, {row.description}<br
					/>
					<span class="font-bold">Petugas:</span>
					{row.ushers.map((usher: UsherByEventResponse) => usher.name).join(', ')}
					<div class="mt-2 sm:hidden">
						<Badge rounded color={statusColor(row.active)}>{row.active ? 'Aktif' : 'Selesai'}</Badge
						>
					</div>
				</TableBodyCell>
				<TableBodyCell class="hidden sm:table-cell">
					<Badge rounded color={statusColor(row.active)}>{row.active ? 'Aktif' : 'Selesai'}</Badge>
				</TableBodyCell>
			</TableBodyRow>
		{/each}
	</TableBody>
</Table>

<Modal title="Titik Tugas {lingkungan.name}" bind:open={showModal} autoclose>
	<div class="mb-4">
		<p>Gereja {selectedEvent.church}</p>
		<p>
			{selectedEvent.date}, {selectedEvent.description}
		</p>
	</div>
	{#if selectedEvent?.ushers.length > 0}
		<div class="mt-2">
			<table class="w-full border-collapse text-left">
				<thead>
					<tr class="h-8 border-b border-t border-gray-200">
						<th class="text-sm font-semibold">Nama</th>
						<th class="text-right text-sm font-semibold">Posisi</th>
					</tr>
				</thead>
				<tbody>
					{#each selectedEvent?.ushers as usher}
						<tr>
							<td class="text-sm font-light">{usher.name}</td>
							<td class="flex items-center justify-end text-right text-sm font-light">
								{#if usher.isPpg}
									<ArchiveSolid class="mr-1 size-4 text-orange-300" />
								{:else if usher.isKolekte}
									<CashSolid class="mr-1 size-4 text-orange-300" />
								{/if}
								<span>{usher.position}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#snippet footer()}
		<Button onclick={() => (showModal = false)}>Tutup</Button>
	{/snippet}
</Modal>
