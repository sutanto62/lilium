<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Regional from '$components/Regional.svelte';
	import type { ChurchEvent as MassEvent } from '$core/entities/Event';
	import type { Lingkungan, Usher, Wilayah } from '$core/entities/Schedule';
	import type { MinistryRole } from '$core/entities/Ministry';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import { Alert, Badge, Breadcrumb, BreadcrumbItem, Button, Label, Select } from 'flowbite-svelte';
	import { ClipboardCleanSolid, FloppyDiskSolid, CirclePlusSolid, TrashBinOutline } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import UshersList from './UshersList.svelte';
	import { shouldRequirePpg } from '$lib/utils/ppgUtils';

	// Props
	let { data, form } = $props();

	// ── New roster flow state ─────────────────────────────────────────────────

	type NewUsherInput = { name: string; ministryRoleCode: string };

	let newUshers = $state<NewUsherInput[]>([{ name: '', ministryRoleCode: '' }]);
	let isNewFlowSubmitting = $state(false);

	function addNewUsher() {
		newUshers = [...newUshers, { name: '', ministryRoleCode: '' }];
	}

	function removeNewUsher(index: number) {
		if (newUshers.length <= 1) return;
		newUshers = newUshers.filter((_, i) => i !== index);
	}

	function isNewFlowValid(): boolean {
		return newUshers.every((u) => u.name.trim() !== '' && u.ministryRoleCode !== '');
	}

	function roleOptions(roles: MinistryRole[]): { value: string; name: string }[] {
		return roles.map((r) => ({ value: r.code, name: r.name }));
	}

	function statusLabel(status: string): string {
		if (status === 'confirmed') return 'Dikonfirmasi';
		if (status === 'submitted') return 'Tersubmit — menunggu konfirmasi admin';
		return 'Draft';
	}

	function statusBadgeColor(status: string): 'gray' | 'yellow' | 'green' {
		if (status === 'confirmed') return 'green';
		if (status === 'submitted') return 'yellow';
		return 'gray';
	}

	// ── Legacy state ──────────────────────────────────────────────────────────

	let selectedEventDate = $state<string | null>(null);
	let selectedEventId = $state<string | null>(null);
	let selectedWilayahId = $state<string | null>(null);
	let selectedLingkunganId = $state<string | null>(null);
	let isSubmitted = $state<boolean>(false);
	let ushers = $state<Usher[]>([
		{
			name: '',
			isPpg: false,
			isKolekte: false,
			sequence: 0
		}
	]);

	// Restore form data on validation failure
	$effect(() => {
		if (form?.formData) {
			selectedEventDate = form.formData.eventDate;
			selectedEventId = form.formData.eventId;
			selectedWilayahId = form.formData.wilayahId;
			selectedLingkunganId = form.formData.lingkunganId;
			try {
				ushers = JSON.parse(form.formData.ushers);
			} catch (e) {
				console.error('Failed to parse ushers data:', e);
			}
		}

		// Track error state
		if (form?.error) {
			tracker.track(
				'tatib_error',
				{
					event_type: 'form_error',
					error_message: form.error,
					has_form_data: !!form.formData
				},
				page.data.session,
				page
			);
		}

		// Track success state
		if (form?.success) {
			tracker.track(
				'tatib_success',
				{
					event_type: 'form_success',
					lingkungan: form.json?.lingkungan,
					wilayah: form.json?.wilayahName,
					mass: form.json?.mass,
					ushers_count: form.json?.ushers?.length || 0
				},
				page.data.session,
				page
			);
		}
	});

	// Use server-provided form visibility
	let showForm = $derived(data.showForm);

	// Disabled submit button
	let isUshersValid = $state<boolean>(false);
	let isSubmitDisable = $derived(
		!isUshersValid ||
			selectedEventId === null ||
			selectedWilayahId === null ||
			selectedLingkunganId === null
	);

	// Name validation and sanitization
	function sanitizeName(name: string): string {
		return name
			.trim()
			.replace(/\s+/g, ' ') // Replace multiple spaces with single space
			.replace(/[^a-zA-Z\s]/g, '') // Remove special characters and numbers
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');
	}

	// Transform text and convert <strong> tags to asterisks
	function transformText(text: string): string {
		return text
			.replace(/<strong>/g, '*')
			.replace(/<\/strong>/g, '*')
			.replace(/<br\s*\/?>/g, '\n')
			.replace(/<\/p>/g, '\n\n')
			.replace(/<\/li>/g, '\n')
			.replace(/<p[^>]*>/g, '') // Remove opening <p> tags
			.replace(/<ol[^>]*>/g, '') // Remove opening <ol> tags
			.replace(/<\/ol[^>]*>/g, '') // Remove closing <ol> tags
			.replace(/<li[^>]*>/g, '') // Remove opening <li> tags
			.replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
			.replace(/\n\s+/g, '\n') // Clean up spaces after line breaks
			.trim();
	}

	function validateUshers(usherList: Usher[]): boolean {
		const requirePpg = data.requirePpg;
		const numberOfPpg = usherList.filter((usher) => usher.isPpg).length;
		const numberOfKolekte = usherList.filter((usher) => usher.isKolekte).length;
		const hasValidPpg = requirePpg ? numberOfPpg === 2 : numberOfPpg <= 2;
		const hasExactKolekte = numberOfKolekte === 3;
		const hasMinimumUshers = usherList.length >= 6;
		return hasValidPpg && hasExactKolekte && hasMinimumUshers;
	}

	// Watch for changes in ushers list and validate
	$effect(() => {
		isUshersValid = validateUshers(ushers);
	});

	async function copyToClipboard(id: string) {
		const element = document.getElementById(id);
		if (element) {
			try {
				await navigator.clipboard.writeText(transformText(element.innerHTML));
				await Promise.all([
					statsigService.logEvent(
						'tatib_copy_titik_tugas',
						'button',
						page.data.session || undefined
					),
					tracker.track(
						'tatib_copy_titik_tugas',
						{
							event_type: 'button_click',
							action: 'copy_to_clipboard'
						},
						page.data.session,
						page
					)
				]);
			} catch (error) {
				console.error('Failed to copy text: ', error);
				const errorMetadata = {
					error_type: error instanceof Error ? error.name : 'unknown',
					error_message: error instanceof Error ? error.message : String(error)
				};

				await Promise.all([
					statsigService.logEvent(
						'tatib_error',
						'copy_failed',
						page.data.session || undefined,
						errorMetadata
					),
					tracker.track(
						'tatib_error',
						{
							event_type: 'copy_failed',
							...errorMetadata
						},
						page.data.session,
						page
					)
				]);
			}
		}
	}

	onMount(async () => {
		await Promise.all([
			statsigService.logEvent('tatib_view', 'confirm', page.data.session || undefined),
			tracker.track(
				'tatib_view',
				{
					event_type: 'page_load',
					show_form: showForm
				},
				page.data.session,
				page
			)
		]);
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		isSubmitted = true;
		const sanitizedUshers = ushers.map((usher) => ({
			...usher,
			name: sanitizeName(usher.name)
		}));
		ushers = sanitizedUshers;

		const requirePpg = data.requirePpg;
		const numberOfPpg = sanitizedUshers.filter((u) => u.isPpg).length;
		const numberOfKolekte = sanitizedUshers.filter((u) => u.isKolekte).length;
		const isValid = validateUshers(sanitizedUshers);

		const validationMetadata = {
			require_ppg: requirePpg,
			has_valid_ppg: requirePpg ? numberOfPpg === 2 : numberOfPpg <= 2,
			has_exact_kolekte: numberOfKolekte === 3,
			has_minimum_ushers: sanitizedUshers.length >= 6,
			number_of_ppg: numberOfPpg,
			number_of_kolekte: numberOfKolekte,
			total_ushers: sanitizedUshers.length,
			validation_status: isValid ? 'valid' : 'invalid'
		};

		const submitMetadata = {
			lingkungan: data.lingkungans.find((l: Lingkungan) => l.id === selectedLingkunganId)?.name,
			wilayah: data.wilayahs.find((w: Wilayah) => w.id === selectedWilayahId)?.name,
			eventDate: selectedEventDate,
			mass: data.events.find((e: MassEvent) => e.id === selectedEventId)?.mass,
			total_ushers: sanitizedUshers.length,
			number_of_ppg: numberOfPpg,
			number_of_kolekte: numberOfKolekte
		};

		await Promise.all([
			statsigService.logEvent(
				'tatib_validate_ushers',
				isValid ? 'valid' : 'invalid',
				page.data.session || undefined,
				validationMetadata
			),
			tracker.track(
				'tatib_validate_ushers',
				{ event_type: isValid ? 'valid' : 'invalid', ...validationMetadata },
				page.data.session,
				page
			),
			statsigService.logEvent(
				'tatib_confirm_ushers',
				'submit',
				page.data.session || undefined,
				submitMetadata
			),
			tracker.track(
				'tatib_confirm_ushers',
				{ event_type: 'submit', ...submitMetadata },
				page.data.session,
				page
			)
		]);

		(e.target as HTMLFormElement).submit();
	}
</script>

<svelte:head>
	<title
		>{import.meta.env.VITE_SITE_TITLE || 'Lilium Inter Spinas'} | Form Konfirmasi Tugas Tata Tertib</title
	>
	<meta
		name="description"
		content="Mempermudah konfirmasi petugas tata tertib untuk jadwal misa."
	/>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem>Konfirmasi</BreadcrumbItem>
</Breadcrumb>

<!-- ── Error / success alerts (shared by both flows) ──────────────────────── -->
{#if form?.error}
	<Alert color="red" class="mb-4">
		<span class="font-medium">Kesalahan:</span>
		{form?.error}
	</Alert>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- NEW ROSTER FLOW (gate: new_roster_flow + rosterId + communityId params) -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if data.isNewRosterFlow}
	{@const entry = data.rosterEntry}

	{#if !entry}
		<Alert color="red" class="mb-4">
			<span class="font-medium">Tidak ditemukan:</span> Data komunitas untuk roster ini tidak tersedia.
			Silakan hubungi admin.
		</Alert>
	{:else}
		<h1 class="mb-2 text-xl font-semibold dark:text-white">Konfirmasi Petugas Tata Tertib</h1>
		<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
			Komunitas: <strong>{entry.communityName}</strong> ({entry.wilayahName})
		</p>

		<!-- Status badge -->
		<div class="mb-4 flex items-center gap-2">
			<span class="text-sm text-gray-500">Status:</span>
			<Badge color={statusBadgeColor(entry.status)}>{statusLabel(entry.status)}</Badge>
		</div>

		{#if form?.success && form?.rosterEntry}
			<!-- Success state after submit -->
			<Alert
				color="green"
				class="mb-4 text-gray-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-100"
			>
				<p class="font-medium">
					Konfirmasi berhasil untuk komunitas <strong>{form.communityName}</strong> ({form.wilayahName}).
				</p>
				<p class="mt-1 text-sm">Jumlah petugas: {form.ushersCount}</p>
				<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
					Menunggu konfirmasi dari admin.
				</p>
			</Alert>
		{:else if entry.status === 'draft'}
			<!-- Submission form -->
			<form
				method="POST"
				action="?/submitRosterEntry"
				use:enhance={() => {
					isNewFlowSubmitting = true;
					return async ({ update }) => {
						isNewFlowSubmitting = false;
						await update({ reset: false });
					};
				}}
			>
				<input type="hidden" name="rosterId" value={data.rosterId} />
				<input type="hidden" name="communityId" value={data.communityId} />
				<input type="hidden" name="ushers" value={JSON.stringify(newUshers)} />

				<div class="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
					<h2 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
						Daftar Petugas
					</h2>

					<div class="flex flex-col gap-3">
						{#each newUshers as usher, i (i)}
							<div class="flex items-end gap-2">
								<div class="flex-1">
									<Label for="usher-name-{i}" class="mb-1 text-xs">Nama</Label>
									<input
										id="usher-name-{i}"
										type="text"
										class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
										placeholder="Nama petugas"
										required
										bind:value={usher.name}
									/>
								</div>
								<div class="w-36 shrink-0">
									<Label for="usher-role-{i}" class="mb-1 text-xs">Peran</Label>
									<Select
										id="usher-role-{i}"
										class="text-sm"
										items={roleOptions(data.ministryRoles)}
										bind:value={usher.ministryRoleCode}
										placeholder="Pilih peran"
										required
									/>
								</div>
								{#if newUshers.length > 1}
									<Button
										type="button"
										size="xs"
										color="light"
										class="mb-0.5 shrink-0"
										onclick={() => removeNewUsher(i)}
									>
										<TrashBinOutline class="size-4" />
									</Button>
								{/if}
							</div>
						{/each}
					</div>

					<Button type="button" size="xs" color="alternative" class="mt-3" onclick={addNewUsher}>
						<CirclePlusSolid class="me-1 size-3" /> Tambah petugas
					</Button>
				</div>

				<div class="flex justify-end">
					<Button
						type="submit"
						color="primary"
						disabled={isNewFlowSubmitting || !isNewFlowValid()}
					>
						<FloppyDiskSolid class="mr-2" />
						{isNewFlowSubmitting ? 'Menyimpan...' : 'Simpan Konfirmasi'}
					</Button>
				</div>
			</form>
		{:else}
			<!-- Read-only view for submitted / confirmed entries -->
			<div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
				<h2 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Daftar Petugas</h2>
				{#if entry.ushers.length === 0}
					<p class="text-sm text-gray-400">Belum ada petugas yang terdaftar.</p>
				{:else}
					<ul class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
						{#each entry.ushers as usher (usher.id)}
							<li>• {usher.name}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- LEGACY FLOW                                                              -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{:else}
	<!-- Success alert (legacy) -->
	{#if form?.success}
		<Alert color="green" class="mb-4 text-gray-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-100">
			<div id="copy-usher">
				<p class="font-medium">
					Konfirmasi lingkungan: <strong>{form?.json?.lingkungan} ({form?.json?.wilayahName})</strong>
					<br />
					Misa: <strong>{form?.json?.mass}</strong><br />
					Tanggal Tugas: <strong>{form?.json?.event}</strong>
				</p>
				<p class="font-medium">Petugas:</p>
				{#if !form?.json?.ushers || form.json.ushers.length === 0}
					<p>Hubungi admin untuk penentuan posisi petugas secara manual.</p>
				{:else}
					<ol class="list-inside list-none">
						{#each form.json.ushers as usher}
							<li>- {usher.name} (<strong>{usher.zone}-{usher.positionName}</strong>)</li>
						{/each}
					</ol>
				{/if}
				<br />
				Tanggal konfirmasi: {form?.json?.submitted} <br />
			</div>
			<Button color="blue" class="mr-2 mt-4" onclick={() => copyToClipboard('copy-usher')}>
				<ClipboardCleanSolid class="mr-2 h-5 w-5" />
				Salin ke Clipboard
			</Button>
		</Alert>
	{/if}

	{#if showForm}
		<h1 class="mb-6 text-xl font-semibold dark:text-white">Konfirmasi Petugas Tata Tertib</h1>
		<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
			Hari ini: <strong>{data.currentDay}</strong> • {data.formAvailabilityReason}
		</p>
		<form method="POST" action="?/confirmUshers" class="mb-6" onsubmit={handleSubmit}>
			<input type="hidden" name="churchId" value={data.church?.id} />
			<input type="hidden" name="eventDate" value={selectedEventDate} />
			<input type="hidden" name="eventId" value={selectedEventId || ''} />
			<input type="hidden" name="wilayahId" value={selectedWilayahId || ''} />
			<input type="hidden" name="lingkunganId" value={selectedLingkunganId || ''} />
			<input type="hidden" name="ushers" value={JSON.stringify(ushers)} />

			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<section class="rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800 md:col-span-1">
					<Regional
						eventsDate={data.eventsDate}
						events={data.events}
						wilayahs={data.wilayahs}
						lingkungans={data.lingkungans}
						bind:selectedEventDate
						bind:selectedEventId
						bind:selectedWilayahId
						bind:selectedLingkunganId
					/>
				</section>
				<section class="rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800 md:col-span-3">
					<UshersList bind:ushers bind:isSubmitable={isUshersValid} requirePpg={data.requirePpg} />
				</section>
			</div>
			<div class="flex justify-end gap-4 px-0 py-4">
				<Button type="submit" id="save-button" color="primary" disabled={isSubmitDisable}>
					<FloppyDiskSolid class="mr-2" />Simpan
				</Button>
			</div>
		</form>
	{:else}
		<h2 class="mb-6 text-2xl font-bold dark:text-white">Pendaftaran Petugas Tata Tertib Telah Ditutup</h2>
		<p class="text-gray-700 dark:text-gray-300">Konfirmasi Tata Tertib hanya pada hari Senin s/d Jumat.</p>
		<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
			Hari ini: <strong>{data.currentDay}</strong><br />
			{data.formAvailabilityReason}
		</p>
	{/if}
{/if}
