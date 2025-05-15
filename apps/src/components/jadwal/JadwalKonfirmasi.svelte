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
	import type { ChurchZone } from '$core/entities/Schedule';
	import { ArchiveOutline, CashOutline, UsersOutline } from 'flowbite-svelte-icons';

	export let rows;
	export let openRow;
	export let toggleRow;
	export let zones: ChurchZone[];

	let defaultModal = false;
	let selectedZoneId: string | null = null;
	let eventZonePic: string | null = null;
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
			<!-- TODO: prevent open on tambah pic click -->
			<TableBodyRow class="hover:bg-gray-100" on:click={() => toggleRow(i)}>
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
						{:else}
							<!-- 1 zone 1 pic -->
							<Button size="xs" on:click={() => (defaultModal = true)}>Tambah PIC</Button>
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
								{:else}
									<!-- 1 zone 1 pic -->
									<Button size="xs" on:click={() => (defaultModal = true)}>Tambah PIC</Button>
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

<Modal title="Tambah PIC" bind:open={defaultModal}>
	<form method="POST" action="?/jadwalDetailPic">
		<div class="mb-4 grid gap-4 sm:grid-cols-1">
			<div>
				<Label for="zone" class="mb-2">Zona Tugas</Label>
				<Select
					id="zone"
					name="zone"
					class="mt-2"
					items={zones.map((e) => ({ value: e.id ?? '', name: e.name ?? '' }))}
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
