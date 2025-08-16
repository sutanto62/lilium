<script lang="ts">
	import { page } from '$app/state';
	import Regional from '$components/Regional.svelte';
	import type { ChurchEvent as MassEvent } from '$core/entities/Event';
	import type { Lingkungan, Usher, Wilayah } from '$core/entities/Schedule';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { Alert, Breadcrumb, BreadcrumbItem, Button } from 'flowbite-svelte';
	import { ClipboardCleanSolid, FloppyDiskSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import UshersList from './UshersList.svelte';

	// Props
	// const { data = $bindable(), form = $bindable() } = $props<{
	// 	data: PageData;
	// 	form: ActionData;
	// }>();
	let { data, form } = $props();

	// Data
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

	async function validateUshers(usherList: Usher[]): Promise<boolean> {
		const numberOfPpg = usherList.filter((usher) => usher.isPpg).length;
		const numberOfKolekte = usherList.filter((usher) => usher.isKolekte).length;
		const hasExactPpg = numberOfPpg === 2;
		const hasExactKolekte = numberOfKolekte === 3;
		const hasMinimumUshers = usherList.length >= 6;
		const isValid = hasExactPpg && hasExactKolekte && hasMinimumUshers;

		if (isSubmitted) {
			await statsigService.logEvent(
				'tatib_validate_ushers',
				isValid ? 'valid' : 'invalid',
				page.data.session || undefined,
				{
					has_exact_ppg: hasExactPpg,
					has_exact_kolekte: hasExactKolekte,
					has_minimum_ushers: hasMinimumUshers,
					number_of_ppg: numberOfPpg,
					number_of_kolekte: numberOfKolekte,
					total_ushers: usherList.length
				}
			);
		}

		return isValid;
	}

	// Watch for changes in ushers list and validate
	$effect(() => {
		validateUshers(ushers).then((valid) => {
			isUshersValid = valid;
		});
	});

	async function copyToClipboard(id: string) {
		const element = document.getElementById(id);
		if (element) {
			try {
				await navigator.clipboard.writeText(transformText(element.innerHTML));
				await statsigService.logEvent('tatib_copy_titik_tugas', 'button');
			} catch (error) {
				console.error('Failed to copy text: ', error);
			}
		}
	}

	onMount(async () => {
		await statsigService.logEvent('tatib_view', 'confirm', page.data.session || undefined);
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		isSubmitted = true;
		const sanitizedUshers = ushers.map((usher) => ({
			...usher,
			name: sanitizeName(usher.name)
		}));
		ushers = sanitizedUshers;

		await statsigService.logEvent(
			'tatib_confirm_ushers',
			'submit',
			page.data.session || undefined,
			{
				lingkungan: data.lingkungans.find((l: Lingkungan) => l.id === selectedLingkunganId)?.name,
				wilayah: data.wilayahs.find((w: Wilayah) => w.id === selectedWilayahId)?.name,
				eventDate: selectedEventDate,
				mass: data.events.find((e: MassEvent) => e.id === selectedEventId)?.mass
			}
		);

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

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem>Konfirmasi</BreadcrumbItem>
</Breadcrumb>

<!-- On error  -->
{#if form?.error}
	<Alert color="red" class="mb-4">
		<span class="font-medium">Kesalahan:</span>
		{form?.error}
	</Alert>
{/if}

<!-- On success -->
{#if form?.success}
	<Alert color="green" class="mb-4 text-black">
		<div id="copy-usher">
			<p class="font-medium">
				Konfirmasi lingkungan: <strong>{form?.json.lingkungan} ({form?.json.wilayahName})</strong>
				<br />
				Misa: <strong>{form?.json.mass}</strong><br />
				Tanggal Tugas: <strong>{form?.json.event}</strong>
			</p>
			<p class="font-medium">Petugas:</p>
			{#if form?.json.ushers.length === 0}
				<p>Hubungi admin untuk penentuan posisi petugas secara manual.</p>
			{:else}
				<ol class="list-inside list-none">
					{#each form?.json.ushers as usher}
						<li>- {usher.name} (<strong>{usher.zone}-{usher.positionName}</strong>)</li>
					{/each}
				</ol>
			{/if}
			<br />
			Tanggal konfirmasi: {form?.json.submitted} <br />
		</div>
		<Button color="blue" class="mr-2 mt-4" onclick={() => copyToClipboard('copy-usher')}>
			<ClipboardCleanSolid class="mr-2 h-5 w-5" />
			Salin ke Clipboard
		</Button>
	</Alert>
{/if}

{#if showForm}
	<h1 class="mb-6 text-xl font-semibold">Konfirmasi Petugas Tata Tertib</h1>
	<p class="mb-4 text-sm text-gray-600">
		Hari ini: <strong>{data.currentDay}</strong> • {data.formAvailabilityReason}
	</p>
	<form method="POST" class="mb-6" onsubmit={handleSubmit}>
		<input type="hidden" name="churchId" value={data.church.id} />
		<input type="hidden" name="eventDate" value={selectedEventDate} />
		<input type="hidden" name="eventId" value={selectedEventId || ''} />
		<input type="hidden" name="wilayahId" value={selectedWilayahId || ''} />
		<input type="hidden" name="lingkunganId" value={selectedLingkunganId || ''} />
		<input type="hidden" name="ushers" value={JSON.stringify(ushers)} />

		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<section class="rounded-lg border bg-white p-6 md:col-span-1">
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
			<section class="rounded-lg border bg-white p-6 md:col-span-3">
				<UshersList bind:ushers bind:isSubmitable={isUshersValid} />
			</section>
		</div>
		<div class="flex justify-end gap-4 px-0 py-4">
			<Button type="submit" id="save-button" color="primary" disabled={isSubmitDisable}>
				<FloppyDiskSolid class="mr-2" />Simpan
			</Button>
		</div>
	</form>
{:else}
	<h2 class="mb-6 text-2xl font-bold">Pendaftaran Petugas Tata Tertib Telah Ditutup</h2>
	<p>Konfirmasi Tata Tertib hanya pada hari Senin s/d Kamis.</p>
	<p class="mt-2 text-sm text-gray-600">
		Hari ini: <strong>{data.currentDay}</strong><br />
		{data.formAvailabilityReason}
	</p>
{/if}
