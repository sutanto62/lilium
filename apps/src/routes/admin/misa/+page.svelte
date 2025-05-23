<script lang="ts">
	import type { Event as ChurchEvent } from '$core/entities/Event';
	import DatePicker from '$src/lib/components/DatePicker.svelte';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import {
		Alert,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Toolbar
	} from 'flowbite-svelte';
	import { CogSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	// Filter
	let selectedDate = $state<Date | undefined>(undefined);
	let showAlert = $state(true);

	// TODO: sync filtered date with loaded data (maximum 2 weeks)
	const events = $derived(
		data.events.filter((event: ChurchEvent) => {
			const eventDate = new Date(event.date);
			const isFuture = eventDate >= new Date();

			if (!selectedDate) return isFuture;

			return eventDate.toDateString() === selectedDate.toDateString();
		})
	);

	onMount(() => {
		if (form?.success || form?.error) {
			setTimeout(() => {
				showAlert = false;
			}, 10000); // 10 seconds
		}
	});
</script>

<svelte:head>
	<title>Misa</title>
	<meta
		name="description"
		content="Melihat dan membuat jadwal misa. Buka sebulan sekali untuk membuat jadwal satu bulan penuh."
	/>
</svelte:head>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem>Misa</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl"
		>Misa</Heading
	>

	{#if form?.success && showAlert}
		<Alert color="green" class="mb-4">
			<p>Jadwal misa berhasil dibuat</p>
		</Alert>
	{/if}

	{#if form?.error && showAlert}
		<Alert color="red" class="mb-4">
			<p>{form.error}</p>
		</Alert>
	{/if}

	<Toolbar embedded class="sm:flex-column w-full gap-4 py-4 text-gray-500 dark:text-gray-300">
		<DatePicker bind:value={selectedDate} />
		{#snippet end()}
			<div class="space-x-2">
				<form method="POST" class="w-full">
					<Button type="submit" id="save-button" color="primary" class="whitespace-nowrap">
						<CogSolid class="mr-2" />+ Misa Bulan Depan
					</Button>
				</form>
			</div>
		{/snippet}
	</Toolbar>
</div>

{#if events.length === 0}
	<div
		class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800"
	>
		<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
			Petugas Tatib masih kosong.
		</p>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Hubungi para ketua lingkungan untuk segera melakukan konfirmasi.
		</p>
	</div>
{:else}
	<Table striped={true} shadow>
		<caption
			class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
		>
			Jadwal Konfirmasi Petugas Tatib
			<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
				Berikut jadwal konfirmasi petugas tatib untuk 2 minggu ke depan.
			</p>
		</caption>
		<TableHead>
			<TableHeadCell>Tanggal</TableHeadCell>
			<TableHeadCell>Gereja</TableHeadCell>
			<TableHeadCell>Kode</TableHeadCell>
			<TableHeadCell>Nama</TableHeadCell>
			<TableHeadCell>
				<span class="sr-only">Edit</span>
			</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each events as event}
				<TableBodyRow>
					<TableBodyCell>{formatDate(event.date, 'long')}</TableBodyCell>
					<TableBodyCell>{event.church}</TableBodyCell>
					<TableBodyCell>
						{event.code}
					</TableBodyCell>
					<TableBodyCell>{event.description}</TableBodyCell>
					<TableBodyCell>
						<a
							href="/admin/misa/{event.id}"
							class="font-medium text-primary-600 hover:underline dark:text-primary-500"
						>
							Edit
						</a>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}
