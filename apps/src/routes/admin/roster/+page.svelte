<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Alert,
		Badge,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Fileupload,
		Label,
		Select,
		Spinner
	} from 'flowbite-svelte';
	import { CheckCircleSolid, ExclamationCircleSolid, InfoCircleSolid } from 'flowbite-svelte-icons';

	let { form } = $props();

	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 3 }, (_, i) => ({
		value: String(currentYear + i - 1),
		name: String(currentYear + i - 1)
	}));
	const months = [
		{ value: '1', name: 'Januari' },
		{ value: '2', name: 'Februari' },
		{ value: '3', name: 'Maret' },
		{ value: '4', name: 'April' },
		{ value: '5', name: 'Mei' },
		{ value: '6', name: 'Juni' },
		{ value: '7', name: 'Juli' },
		{ value: '8', name: 'Agustus' },
		{ value: '9', name: 'September' },
		{ value: '10', name: 'Oktober' },
		{ value: '11', name: 'November' },
		{ value: '12', name: 'Desember' }
	];

	let selectedYear = $state(String(currentYear));
	let selectedMonth = $state(String(new Date().getMonth() + 1));
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Upload Roster Bulanan</title>
</svelte:head>

<Breadcrumb class="mb-6">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem>Upload Roster</BreadcrumbItem>
</Breadcrumb>

<!-- Centered single-column layout — max-w-md keeps it readable on all screen sizes -->
<div class="mx-auto w-full max-w-md px-0 sm:px-0">

	<!-- Page heading -->
	<div class="mb-6">
		<h1 class="text-xl font-bold text-gray-900 dark:text-white">Upload Roster Bulanan</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Unggah file XLSX jadwal tugas tatib lingkungan. Sistem akan membuat roster untuk setiap
			jadwal misa yang ditemukan.
		</p>
	</div>

	<!-- Result alerts — inside the same column so they align with the card -->
	{#if form?.success}
		<Alert color="green" class="mb-4" dismissable>
			{#snippet icon()}
				<CheckCircleSolid class="size-5 shrink-0" />
			{/snippet}
			<div>
				<p class="font-semibold">Upload berhasil!</p>
				<p class="text-sm">
					{form.created} roster dibuat,
					{form.skipped} dilewati (sudah ada).
				</p>
				{#if form.errors?.length > 0}
					<details class="mt-2">
						<summary class="cursor-pointer text-sm font-medium">
							{form.errors.length} baris tidak dapat diproses — lihat detail
						</summary>
						<ul class="mt-2 space-y-1 text-sm">
							{#each form.errors as err}
								<li class="flex gap-1"><span aria-hidden="true">•</span>{err}</li>
							{/each}
						</ul>
					</details>
				{/if}
			</div>
		</Alert>
	{:else if form?.error}
		<Alert color="red" class="mb-4" dismissable>
			{#snippet icon()}
				<ExclamationCircleSolid class="size-5 shrink-0" />
			{/snippet}
			{form.error}
		</Alert>
	{/if}

	<!-- Form card -->
	<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<form
			method="POST"
			action="?/uploadRoster"
			enctype="multipart/form-data"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update({ reset: false });
				};
			}}
		>
			<!-- Tahun + Bulan side-by-side on all sizes (both fields are short) -->
			<div class="mb-4 grid grid-cols-2 gap-4">
				<div>
					<Label for="year" class="mb-2">Tahun</Label>
					<Select id="year" name="year" items={years} bind:value={selectedYear} required />
				</div>
				<div>
					<Label for="month" class="mb-2">Bulan</Label>
					<Select id="month" name="month" items={months} bind:value={selectedMonth} required />
				</div>
			</div>

			<!-- File upload -->
			<div class="mb-4">
				<Label for="file" class="mb-2">File XLSX</Label>
				<Fileupload id="file" name="file" accept=".xlsx" required />
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Kolom yang dibutuhkan: NAMA LINGKUNGAN, HARI/TGL, JAM, LOKASI
				</p>
			</div>

			<!-- Info note -->
			<Alert color="blue" class="mb-6 text-sm">
				{#snippet icon()}
					<InfoCircleSolid class="size-4 shrink-0" />
				{/snippet}
				Roster yang sudah ada tidak akan ditimpa — baris tersebut dilewati otomatis.
			</Alert>

			<Button type="submit" class="w-full" disabled={submitting}>
				{#if submitting}
					<Spinner class="me-2 size-4" />
					Memproses...
				{:else}
					Upload & Buat Roster
				{/if}
			</Button>
		</form>
	</div>

	<!-- Post-success actions -->
	{#if form?.success && form.created > 0}
		<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap gap-2">
				<Badge color="green">{form.created} roster dibuat</Badge>
				{#if form.skipped > 0}
					<Badge color="gray">{form.skipped} dilewati</Badge>
				{/if}
			</div>
			<Button href="/admin/tatib" color="alternative" size="sm">
				← Kembali ke Jadwal
			</Button>
		</div>
	{/if}

</div>
