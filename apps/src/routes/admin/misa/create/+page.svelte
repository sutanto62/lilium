<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { EventType } from '$core/entities/Event';
	import { statsigService } from '$src/lib/application/StatsigService.js';
	import DatePicker from '$src/lib/components/DatePicker.svelte';
	import { tracker } from '$src/lib/utils/analytics';
	import { getWeekNumber } from '$src/lib/utils/dateUtils.js';
	import {
		Alert,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		Input,
		Label,
		Select,
		Spinner,
		Textarea
	} from 'flowbite-svelte';
	import { Section } from 'flowbite-svelte-blocks';
	import type { PageProps } from './$types';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	let showAlert = $state(true);
	let selectedDate: Date | undefined = $state(undefined);
	let weekNumber: number | undefined = $state(undefined);
	let isSubmitting = $state(false);

	// Track page load
	$effect(() => {
		const session = page.data.session || undefined;

		// Only track if form hasn't been submitted yet (initial page load)
		if (!form?.success && !form?.error && data.church?.masses !== undefined) {
			const metadata = {
				masses_count: data.church?.masses?.length || 0,
				has_masses: (data.church?.masses?.length || 0) > 0
			};

			// Dual tracking for client-side page view
			Promise.all([
				statsigService.logEvent('admin_misa_create_view', 'load', session, metadata),
				tracker.track('admin_misa_create_view', metadata, session, page)
			]);
		}
	});

	// Track form results and auto-hide alerts after 10 seconds
	$effect(() => {
		const session = page.data.session || undefined;

		if (form?.success) {
			// Track successful form submission
			statsigService.logEvent('admin_misa_create', 'success', session);
			tracker.track(
				'admin_misa_create_success',
				{
					message: form.message || 'Event created successfully'
				},
				session,
				page
			);

			setTimeout(() => {
				showAlert = false;
			}, 10000);
			isSubmitting = false;
		} else if (form?.error) {
			// Track form submission error
			statsigService.logEvent('admin_misa_create', 'error', session, {
				error: form.error
			});
			tracker.track(
				'admin_misa_create_error',
				{
					error: form.error
				},
				session,
				page
			);

			setTimeout(() => {
				showAlert = false;
			}, 10000);
			isSubmitting = false;
		}
	});

	// Calculate week number when date changes
	$effect(() => {
		if (selectedDate) {
			const dateStr = selectedDate.toLocaleDateString('en-CA');
			weekNumber = getWeekNumber(dateStr);
		}
	});

	function handleDateSelect(date: Date | { from?: Date; to?: Date }) {
		const selected = date instanceof Date ? date : date.from || date.to;
		if (selected) {
			selectedDate = selected;
		}
	}

	// Form validation
	let dateError = $state<string | null>(null);
	let massError = $state<string | null>(null);
	let codeError = $state<string | null>(null);
	let descriptionError = $state<string | null>(null);

	function validateForm(formData: FormData): boolean {
		dateError = null;
		massError = null;
		codeError = null;
		descriptionError = null;

		const date = formData.get('date') as string;
		const mass = formData.get('mass') as string;
		const code = formData.get('code') as string;
		const description = formData.get('description') as string;

		if (!date) {
			dateError = 'Tanggal harus diisi';
			// Track validation error
			tracker.track(
				'admin_misa_create_validation_error',
				{
					error_field: 'date',
					error_type: 'missing'
				},
				page.data.session,
				page
			);
			return false;
		}

		const dateObj = new Date(date);
		if (isNaN(dateObj.getTime())) {
			dateError = 'Tanggal tidak valid';
			// Track validation error
			tracker.track(
				'admin_misa_create_validation_error',
				{
					error_field: 'date',
					error_type: 'invalid'
				},
				page.data.session,
				page
			);
			return false;
		}

		if (!mass) {
			massError = 'Jenis Misa harus dipilih';
			// Track validation error
			tracker.track(
				'admin_misa_create_validation_error',
				{
					error_field: 'mass',
					error_type: 'missing'
				},
				page.data.session,
				page
			);
			return false;
		}

		if (!code || code.trim().length === 0) {
			codeError = 'Kode harus diisi';
			// Track validation error
			tracker.track(
				'admin_misa_create_validation_error',
				{
					error_field: 'code',
					error_type: 'missing'
				},
				page.data.session,
				page
			);
			return false;
		}

		if (!description || description.trim().length === 0) {
			descriptionError = 'Nama harus diisi';
			// Track validation error
			tracker.track(
				'admin_misa_create_validation_error',
				{
					error_field: 'description',
					error_type: 'missing'
				},
				page.data.session,
				page
			);
			return false;
		}

		return true;
	}
</script>

<svelte:head>
	<title>Tambah Misa</title>
	<meta name="description" content="Tambah misa" />
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/misa">Misa</BreadcrumbItem>
	<BreadcrumbItem>Misa Baru</BreadcrumbItem>
</Breadcrumb>

<!-- Success alert -->
{#if form?.success && showAlert}
	<Alert color="green" class="mb-4">
		<p>Data misa berhasil disimpan</p>
	</Alert>
{/if}

<!-- Error alert -->
{#if form?.error && showAlert}
	<Alert color="red" class="mb-4">
		<p>{form.error}</p>
	</Alert>
{/if}

<div class="mb-4">
	<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl"
		>Misa Baru</Heading
	>

	<Section name="crudcreateform">
		<h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Tambah Misa</h2>

		<form
			method="POST"
			class="space-y-4"
			use:enhance={({ formData }) => {
				if (!validateForm(formData)) {
					return async ({ update }) => {
						await update();
					};
				}

				// Track form submission attempt
				const session = page.data.session || undefined;
				const date = formData.get('date') as string;
				const mass = formData.get('mass') as string;
				const type = formData.get('type') as string;

				tracker.track(
					'admin_misa_create_submit',
					{
						event_type: 'form_submission',
						has_date: !!date,
						has_mass: !!mass,
						event_type_value: type
					},
					session,
					page
				);

				return async ({ update }) => {
					isSubmitting = true;
					await update();
				};
			}}
		>
			<div>
				<Label for="date">Tanggal</Label>
				<DatePicker bind:value={selectedDate} onselect={handleDateSelect} required />
				<input type="hidden" name="date" value={selectedDate?.toLocaleDateString('en-CA')} />
				<input type="hidden" name="weekNumber" value={weekNumber} />
				{#if dateError}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{dateError}</p>
				{/if}
			</div>

			<div>
				<Label for="mass">Jenis Misa</Label>
				<Select id="mass" name="mass" required color={massError ? 'red' : 'default'}>
					<option value="">Pilih Jenis Misa</option>
					{#if data.church?.masses}
						{#each data.church.masses as mass}
							<option value={mass.id}>{mass.name}</option>
						{/each}
					{/if}
				</Select>
				{#if massError}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{massError}</p>
				{/if}
			</div>

			<div>
				<Label for="type">Perayaan</Label>
				<Select id="type" name="type" required>
					<option value={EventType.MASS}>Misa Biasa</option>
					<option value={EventType.FEAST}>Perayaan</option>
				</Select>
			</div>

			<div>
				<Label for="code">Kode</Label>
				<Input id="code" name="code" required color={codeError ? 'red' : 'default'} />
				{#if codeError}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{codeError}</p>
				{/if}
			</div>

			<div>
				<Label for="description">Nama Misa</Label>
				<small>Nama muncul pada pilihan jadwal misa saat konfirmasi</small>
				<Textarea
					id="description"
					name="description"
					required
					color={descriptionError ? 'red' : 'default'}
					class="w-full"
				/>
				{#if descriptionError}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{descriptionError}</p>
				{/if}
			</div>

			<div class="flex justify-end space-x-2">
				<Button href="/admin/misa" color="alternative" disabled={isSubmitting}>Kembali</Button>
				<Button type="submit" color="primary" disabled={isSubmitting}>
					{#if isSubmitting}
						<Spinner class="mr-2" />
					{/if}
					Simpan
				</Button>
			</div>
		</form>
	</Section>
</div>
