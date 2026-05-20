<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Alert, Badge, Breadcrumb, BreadcrumbItem, Button, Checkbox, Input, Label } from 'flowbite-svelte';
	import type { PageProps } from './$types';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	let isEditing = $state(false);
	let churchName = $state('');
	let churchCode = $state('');
	let churchRequiresSpecialCollection = $state(false);
	let isSubmitting = $state(false);

	$effect(() => {
		churchName = data.church?.name ?? '';
		churchCode = data.church?.code ?? '';
		churchRequiresSpecialCollection = (data.church?.requiresSpecialCollection ?? 0) === 1;
	});
</script>

<svelte:head>
	<title>Gereja</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
	<BreadcrumbItem>Gereja</BreadcrumbItem>
</Breadcrumb>

<div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Informasi Gereja</h2>
		{#if !isEditing}
			<Button size="sm" color="alternative" onclick={() => (isEditing = true)}>Ubah</Button>
		{/if}
	</div>

	{#if form?.error}
		<Alert color="red" class="mb-4">{form.error}</Alert>
	{/if}
	{#if form?.success}
		<Alert color="green" class="mb-4">Berhasil disimpan.</Alert>
	{/if}

	{#if isEditing}
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					await invalidateAll();
					isSubmitting = false;
					if (!form?.error) isEditing = false;
				};
			}}
		>
			<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<Label for="church-name" class="mb-1">Nama Gereja <span class="text-red-500">*</span></Label>
					<Input autocomplete="off" id="church-name" name="name" bind:value={churchName} required disabled={isSubmitting} />
				</div>
				<div>
					<Label for="church-code" class="mb-1">Kode Gereja <span class="text-red-500">*</span></Label>
					<Input autocomplete="off" id="church-code" name="code" bind:value={churchCode} required disabled={isSubmitting} />
				</div>
			</div>
			<div class="mb-4">
				<Checkbox
					id="church-requires-special-collection"
					name="requiresSpecialCollection"
					value="true"
					bind:checked={churchRequiresSpecialCollection}
					disabled={isSubmitting}
				>Kolekte Khusus (PPG/PPKG)</Checkbox>
			</div>
			<div class="flex gap-2">
				<Button type="submit" disabled={isSubmitting}>Simpan</Button>
				<Button color="alternative" type="button" onclick={() => (isEditing = false)} disabled={isSubmitting}>Batal</Button>
			</div>
		</form>
	{:else}
		<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nama Gereja</dt>
				<dd class="mt-1 text-sm text-gray-900 dark:text-white">{data.church?.name ?? '—'}</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kode Gereja</dt>
				<dd class="mt-1">
					{#if data.church?.code}
						<Badge color="blue">{data.church.code}</Badge>
					{:else}
						<span class="text-sm text-gray-400">—</span>
					{/if}
				</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kolekte Khusus (PPG/PPKG)</dt>
				<dd class="mt-1">
					{#if (data.church?.requiresSpecialCollection ?? 0) === 1}
						<Badge color="green">Aktif</Badge>
					{:else}
						<Badge color="gray">Tidak Aktif</Badge>
					{/if}
				</dd>
			</div>
		</dl>
	{/if}
</div>
