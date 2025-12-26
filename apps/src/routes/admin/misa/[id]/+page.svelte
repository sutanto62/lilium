<script lang="ts">
	import { enhance } from '$app/forms';
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
	let isSubmitting = $state(false);

	// Auto-hide alerts after 10 seconds if form has result
	$effect(() => {
		if (form?.success || form?.error) {
			setTimeout(() => {
				showAlert = false;
			}, 10000);
			isSubmitting = false;
		}
	});

	// Form validation
	let dateError = $state<string | null>(null);
	let codeError = $state<string | null>(null);
	let descriptionError = $state<string | null>(null);

	function validateForm(formData: FormData): boolean {
		dateError = null;
		codeError = null;
		descriptionError = null;

		const date = formData.get('date') as string;
		const code = formData.get('code') as string;
		const description = formData.get('description') as string;

		if (!date) {
			dateError = 'Tanggal harus diisi';
			return false;
		}

		const dateObj = new Date(date);
		if (isNaN(dateObj.getTime())) {
			dateError = 'Tanggal tidak valid';
			return false;
		}

		if (!code || code.trim().length === 0) {
			codeError = 'Kode harus diisi';
			return false;
		}

		if (!description || description.trim().length === 0) {
			descriptionError = 'Nama harus diisi';
			return false;
		}

		return true;
	}
</script>

<svelte:head>
	<title>Detail Misa</title>
	<meta name="description" content="Lihat dan edit detail jadwal misa" />
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/misa">Misa</BreadcrumbItem>
	<BreadcrumbItem>Detail</BreadcrumbItem>
</Breadcrumb>

<!-- on succes alert -->
{#if form?.success && showAlert}
	<Alert color="green" class="mb-4">
		<p>Data misa berhasil diperbarui</p>
	</Alert>
{/if}

<!-- on error alert -->
{#if form?.error && showAlert}
	<Alert color="red" class="mb-4">
		<p>{form.error}</p>
	</Alert>
{/if}

<div class="mb-4">
	<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl"
		>Detail Misa</Heading
	>

	<Section name="crudcreateform">
		<h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Edit Misa</h2>

		<form
			method="POST"
			class="space-y-4"
			use:enhance={({ formData }) => {
				if (!validateForm(formData)) {
					return async ({ update }) => {
						await update();
					};
				}
				return async ({ update }) => {
					isSubmitting = true;
					await update();
				};
			}}
		>
			<div>
				<Label for="date">Tanggal</Label>
				<Input
					id="date"
					name="date"
					type="date"
					value={data.event.date}
					required
					color={dateError ? 'red' : 'default'}
				/>
				{#if dateError}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{dateError}</p>
				{/if}
			</div>

			<div>
				<Label for="code">Kode</Label>
				<Input
					id="code"
					name="code"
					value={data.event.code}
					required
					color={codeError ? 'red' : 'default'}
				/>
				{#if codeError}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{codeError}</p>
				{/if}
			</div>

			<div>
				<Label for="description">Nama</Label>
				<Textarea
					id="description"
					name="description"
					value={data.event.description}
					required
					color={descriptionError ? 'red' : 'default'}
				/>
				{#if descriptionError}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{descriptionError}</p>
				{/if}
			</div>

			<div>
				<Label for="isComplete">Status</Label>
				<Select id="isComplete" name="isComplete" value={data.event.isComplete?.toString()}>
					<option value="0">Belum Selesai</option>
					<option value="1">Selesai</option>
				</Select>
			</div>

			<div>
				<Label for="active">Status Aktif</Label>
				<Select id="active" name="active" value={data.event.active?.toString()}>
					<option value="0">Tidak Aktif</option>
					<option value="1">Aktif</option>
				</Select>
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
