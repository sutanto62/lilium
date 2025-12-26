<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { statsigService } from '$src/lib/application/StatsigService';
	import DatePicker from '$src/lib/components/DatePicker.svelte';
	import { tracker } from '$src/lib/utils/analytics';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import {
		Alert,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		Modal,
		P,
		Spinner,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Toolbar
	} from 'flowbite-svelte';
	import { CogSolid } from 'flowbite-svelte-icons';
	import type { PageProps } from './$types';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	// Filter
	let selectedDate = $state<Date | undefined>(undefined);
	let showAlert = $state(true);
	let showConfirmModal = $state(false);
	let isSubmitting = $state(false);

	const events = data.events;

	// Initialize selectedDate from URL search params
	$effect(() => {
		const dateParam = page.url.searchParams.get('date');
		if (dateParam && selectedDate === undefined) {
			const parsedDate = new Date(dateParam);
			if (!isNaN(parsedDate.getTime())) {
				selectedDate = parsedDate;
			}
		} else if (!dateParam && selectedDate === undefined) {
			selectedDate = new Date();
		}
	});

	// Handle date selection and sync with URL
	async function handleDateSelect(date: Date | { from?: Date; to?: Date }) {
		// Extract the selected date from the datepicker callback
		const selected = date instanceof Date ? date : date.from || date.to;

		if (!selected) {
			return;
		}

		// Format date as YYYY-MM-DD for URL
		const dateStr = selected.toISOString().split('T')[0];

		// Track date filter usage with PostHog
		await tracker.track(
			'admin_misa_date_filter_used',
			{
				selected_date: dateStr
			},
			page.data.session,
			page
		);

		// Update URL with new date parameter using replaceState
		// This avoids conflicts with SvelteKit's router
		const url = new URL(page.url);
		url.searchParams.set('date', dateStr);

		// Use replaceState to update URL without adding to history
		// replaceState takes (url, state) where url is pathname + search
		replaceState(url.pathname + url.search, {});

		// Invalidate to reload data with new search params
		await invalidate(url);
	}

	// Handle bulk create confirmation
	async function handleBulkCreateClick(event: Event) {
		event.preventDefault();

		// Track bulk create button click (intent)
		await tracker.track(
			'admin_misa_bulk_create_clicked',
			{
				next_month_start: nextMonthInfo().startDate,
				next_month_end: nextMonthInfo().endDate
			},
			page.data.session,
			page
		);

		showConfirmModal = true;
	}

	function handleConfirmBulkCreate() {
		showConfirmModal = false;
		isSubmitting = true;
		// Form will submit via enhance
	}

	function handleCancelBulkCreate() {
		showConfirmModal = false;
	}

	// Calculate next month info for confirmation dialog
	const nextMonthInfo = $derived(() => {
		const now = new Date();
		const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		const lastDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
		return {
			startDate: nextMonth.toISOString().split('T')[0],
			endDate: lastDayOfNextMonth.toISOString().split('T')[0],
			startDateFormatted: formatDate(nextMonth.toISOString().split('T')[0], 'long'),
			endDateFormatted: formatDate(lastDayOfNextMonth.toISOString().split('T')[0], 'long')
		};
	});

	// Modernize analytics: Replace onMount with $effect for reactive tracking
	$effect(() => {
		const session = page.data.session || undefined;

		// Track page load if no form state
		if (!form?.success && !form?.error) {
			statsigService.logEvent('admin_misa_view', 'load', session);
		}

		// Handle form result analytics and alerts
		if (form?.success) {
			statsigService.logEvent('admin_misa_create', 'success', session);

			// Track bulk create success with PostHog
			tracker.track(
				'admin_misa_bulk_create_success',
				{
					message: form.message || 'Events created successfully'
				},
				session,
				page
			);

			isSubmitting = false;
		} else if (form?.error) {
			statsigService.logEvent('admin_misa_create', 'error', session, {
				error: form.error
			});

			// Track bulk create error with PostHog
			tracker.track(
				'admin_misa_bulk_create_error',
				{
					error: form.error
				},
				session,
				page
			);

			isSubmitting = false;
		}

		// Auto-hide alerts after 10 seconds if form has result
		if (form?.success || form?.error) {
			setTimeout(() => {
				showAlert = false;
			}, 10000);
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
		<DatePicker bind:value={selectedDate} onselect={handleDateSelect} />
		<div class="ml-4 space-x-2">
			<form
				method="POST"
				class="w-full"
				use:enhance={() => {
					return async ({ update }) => {
						isSubmitting = true;
						await update();
					};
				}}
			>
				<Button
					type="button"
					id="save-button"
					color="primary"
					class="whitespace-nowrap"
					onclick={handleBulkCreateClick}
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<Spinner class="mr-2" />
					{:else}
						<CogSolid class="mr-2" />
					{/if}
					+ Misa Bulan Depan
				</Button>
			</form>
		</div>
	</Toolbar>

	<!-- Confirmation Modal -->
	<Modal bind:open={showConfirmModal} size="md">
		<div class="space-y-4">
			<h3 class="text-xl font-semibold text-gray-900 dark:text-white">
				Konfirmasi Buat Jadwal Misa Bulan Depan
			</h3>
			<P class="text-gray-500 dark:text-gray-400">
				Anda akan membuat jadwal misa untuk bulan depan:
			</P>
			<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
				<P class="font-medium text-gray-900 dark:text-white">
					Periode: {nextMonthInfo().startDateFormatted} - {nextMonthInfo().endDateFormatted}
				</P>
				<P class="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Sistem akan membuat jadwal misa berdasarkan jadwal misa aktif yang terdaftar.
				</P>
			</div>
			<P class="text-sm text-gray-500 dark:text-gray-400">Apakah Anda yakin ingin melanjutkan?</P>
			<div class="flex justify-end space-x-2">
				<Button color="alternative" onclick={handleCancelBulkCreate}>Batal</Button>
				<form
					method="POST"
					use:enhance={() => {
						return async ({ update }) => {
							showConfirmModal = false;
							isSubmitting = true;
							await update();
						};
					}}
				>
					<Button type="submit" color="primary">Ya, Buat Jadwal</Button>
				</form>
			</div>
		</div>
	</Modal>
</div>

{#if events.length === 0}
	<div
		class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800"
	>
		<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Jadwal misa masih kosong.</p>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Belum ada jadwal misa untuk periode yang dipilih. Gunakan tombol "Misa Bulan Depan" untuk
			membuat jadwal.
		</p>
	</div>
{:else}
	<Table striped={true} shadow>
		<caption
			class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
		>
			Jadwal Misa
			<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
				Berikut daftar jadwal misa untuk periode yang dipilih.
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
							onclick={async () => {
								await tracker.track(
									'admin_misa_edit_clicked',
									{
										event_id: event.id,
										event_date: event.date,
										event_code: event.code,
										event_description: event.description
									},
									page.data.session,
									page
								);
							}}
						>
							Edit
						</a>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}
