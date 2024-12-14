<script lang="ts">
	import {
		Table,
		TableHead,
		TableHeadCell,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		Tooltip
	} from 'flowbite-svelte';

	import { ArchiveOutline, CashOutline, UsersOutline } from 'flowbite-svelte-icons';
	import JadwalKonfirmasiDetail from '$components/jadwal/JadwalKonfirmasiDetail.svelte';

	export let rows;
	export let openRow;
	export let toggleRow;
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
	<TableBody tableBodyClass="divide-y">
		{#each rows as jadwalDetaillZone, i}
			<TableBodyRow class="hover:bg-gray-100" on:click={() => toggleRow(i)}>
				<TableBodyCell class="px-2 align-top"
					>{jadwalDetaillZone.name}
					<ol class="block lg:hidden">
						{#each jadwalDetaillZone.lingkungan as lingkungan}
							<li>{lingkungan}</li>
						{/each}
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
							<span>PIC PETA</span>
							<ol>
								{#each jadwalDetaillZone.pic as pic}
									<li>{pic}</li>
								{/each}
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
