<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Community } from '$core/entities/Parish';
	import type { ChurchEvent } from '$core/entities/Event';
	import {
		Alert,
		Badge,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Fileupload,
		Label,
		Select,
		Spinner,
		Tabs,
		TabItem
	} from 'flowbite-svelte';
	import { CheckCircleSolid, ExclamationCircleSolid, InfoCircleSolid } from 'flowbite-svelte-icons';

	let { data, form } = $props();

	const communities = $derived<Community[]>(data.communities ?? []);
	const upcomingEvents = $derived<ChurchEvent[]>(data.upcomingEvents ?? []);

	// ── Upload tab state ──────────────────────────────────────────────────────
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
	let submittingUpload = $state(false);

	// ── Manual tab state ──────────────────────────────────────────────────────
	let selectedEventId = $state('');
	let selectedCommunityIds = $state<string[]>([]);
	let submittingManual = $state(false);

	// Build event dropdown items
	const eventItems = $derived(
		upcomingEvents.map((e: ChurchEvent) => ({
			value: e.id,
			name: `${e.date} — ${e.mass}`
		}))
	);

	// Group communities by wilayah for the checklist
	type CommunityGroup = { wilayahName: string; items: Community[] };
	const communitiesByWilayah = $derived(
		communities.reduce((acc: Record<string, CommunityGroup>, c: Community) => {
			const key = c.wilayahId || '__none__';
			if (!acc[key]) acc[key] = { wilayahName: c.wilayahName || '(Tanpa Wilayah)', items: [] };
			acc[key].items.push(c);
			return acc;
		}, {} as Record<string, CommunityGroup>)
	);

	function toggleCommunity(id: string) {
		if (selectedCommunityIds.includes(id)) {
			selectedCommunityIds = selectedCommunityIds.filter((x) => x !== id);
		} else {
			selectedCommunityIds = [...selectedCommunityIds, id];
		}
	}

	function selectAllCommunities() {
		selectedCommunityIds = communities.map((c: Community) => c.id);
	}

	function clearCommunities() {
		selectedCommunityIds = [];
	}
</script>

<svelte:head>
	<title>Roster</title>
</svelte:head>

<Breadcrumb class="mb-6">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem>Roster</BreadcrumbItem>
</Breadcrumb>

<div class="mx-auto w-full max-w-lg">

	<div class="mb-6">
		<h1 class="text-xl font-bold text-gray-900 dark:text-white">Buat Roster</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Buat roster secara manual atau unggah file XLSX untuk beberapa jadwal sekaligus.
		</p>
	</div>

	<!-- Result alerts -->
	{#if form?.success}
		<Alert color="green" class="mb-4" dismissable>
			{#snippet icon()}<CheckCircleSolid class="size-5 shrink-0" />{/snippet}
			<div>
				<p class="font-semibold">Berhasil!</p>
				<p class="text-sm">
					{form.created} roster dibuat{form.skipped ? `, ${form.skipped} dilewati (sudah ada)` : ''}.
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
			{#snippet icon()}<ExclamationCircleSolid class="size-5 shrink-0" />{/snippet}
			{form.error}
		</Alert>
	{/if}

	<Tabs style="underline">

		<!-- ── Tab 1: Manual creation ───────────────────────────────────────── -->
		<TabItem open title="Buat Manual">
			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
				{#if upcomingEvents.length === 0}
					<Alert color="yellow" class="text-sm">
						{#snippet icon()}<InfoCircleSolid class="size-4 shrink-0" />{/snippet}
						Tidak ada jadwal misa dalam 60 hari ke depan. Buat jadwal misa terlebih dahulu.
					</Alert>
				{:else}
					<form
						method="POST"
						action="?/createRoster"
						use:enhance={() => {
							submittingManual = true;
							return async ({ update }) => {
								submittingManual = false;
								await update({ reset: false });
							};
						}}
					>
						<!-- Event selector -->
						<div class="mb-4">
							<Label for="eventId" class="mb-2">Jadwal Misa <span class="text-red-500">*</span></Label>
							<Select
								id="eventId"
								name="eventId"
								items={[{ value: '', name: '— Pilih jadwal —' }, ...eventItems]}
								bind:value={selectedEventId}
								required
							/>
						</div>

						<!-- Community checklist -->
						<div class="mb-4">
							<div class="mb-2 flex items-center justify-between">
								<Label>Lingkungan <span class="text-red-500">*</span></Label>
								<div class="flex gap-2 text-xs">
									<button type="button" onclick={selectAllCommunities} class="text-blue-600 hover:underline dark:text-blue-400">
										Pilih semua
									</button>
									<span class="text-gray-300">|</span>
									<button type="button" onclick={clearCommunities} class="text-gray-500 hover:underline">
										Hapus pilihan
									</button>
								</div>
							</div>

							{#if communities.length === 0}
								<p class="text-sm text-yellow-600 dark:text-yellow-400">
									Belum ada data lingkungan. Tambahkan di
									<a href="/admin/settings/community" class="underline">pengaturan</a>.
								</p>
							{:else}
								<div class="max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700">
									{#each Object.entries(communitiesByWilayah) as [_key, group]}
										<div class="mb-3 last:mb-0">
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
							{/if}
						</div>

						<Button
							type="submit"
							class="w-full"
							disabled={submittingManual || !selectedEventId || selectedCommunityIds.length === 0}
						>
							{#if submittingManual}
								<Spinner class="me-2 size-4" /> Membuat...
							{:else}
								Buat Roster ({selectedCommunityIds.length} lingkungan)
							{/if}
						</Button>
					</form>
				{/if}
			</div>

			<!-- Post-success links -->
			{#if form?.success && form.created > 0 && form.eventId}
				<div class="mt-4 flex justify-end">
					<Button href="/admin/tatib/{form.eventId}" color="alternative" size="sm">
						Lihat Roster →
					</Button>
				</div>
			{/if}
		</TabItem>

		<!-- ── Tab 2: XLSX Upload ────────────────────────────────────────────── -->
		<TabItem title="Upload XLSX">
			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
				<form
					method="POST"
					action="?/uploadRoster"
					enctype="multipart/form-data"
					use:enhance={() => {
						submittingUpload = true;
						return async ({ update }) => {
							submittingUpload = false;
							await update({ reset: false });
						};
					}}
				>
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

					<div class="mb-4">
						<Label for="file" class="mb-2">File XLSX</Label>
						<Fileupload id="file" name="file" accept=".xlsx" required />
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Kolom yang dibutuhkan: NAMA LINGKUNGAN, HARI/TGL, JAM, LOKASI
						</p>
					</div>

					<Alert color="blue" class="mb-6 text-sm">
						{#snippet icon()}<InfoCircleSolid class="size-4 shrink-0" />{/snippet}
						Roster yang sudah ada tidak akan ditimpa — baris tersebut dilewati otomatis.
					</Alert>

					<Button type="submit" class="w-full" disabled={submittingUpload}>
						{#if submittingUpload}
							<Spinner class="me-2 size-4" /> Memproses...
						{:else}
							Upload & Buat Roster
						{/if}
					</Button>
				</form>
			</div>

			<!-- Post-upload summary badges -->
			{#if form?.success && (form.created > 0 || (form.skipped ?? 0) > 0)}
				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<div class="flex flex-wrap gap-2">
						<Badge color="green">{form.created} roster dibuat</Badge>
						{#if (form.skipped ?? 0) > 0}
							<Badge color="gray">{form.skipped} dilewati</Badge>
						{/if}
					</div>
					<Button href="/admin/tatib" color="alternative" size="sm">
						← Kembali ke Jadwal
					</Button>
				</div>
			{/if}
		</TabItem>

	</Tabs>
</div>
