<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Alert, Badge, Breadcrumb, BreadcrumbItem, Button, Input, Label } from 'flowbite-svelte';
	import type { PageData, ActionData } from './$types';

	const { data, form } = $props<{ data: PageData; form: ActionData }>();

	// ── Parish edit state ─────────────────────────────────────────────────────
	let isEditingParish = $state(false);
	let parishName = $state('');
	let parishCode = $state('');
	let isSubmittingParish = $state(false);



	// Sync parish fields from data (on load and after invalidateAll)
	$effect(() => {
		parishName = data.parish?.name ?? '';
		parishCode = data.parish?.code ?? '';
	});
</script>

<div>
	<!-- Breadcrumb -->
	<Breadcrumb class="mb-4">
		<BreadcrumbItem href="/">Beranda</BreadcrumbItem>
		<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
		<BreadcrumbItem href="/admin/settings">Pengaturan</BreadcrumbItem>
		<BreadcrumbItem>Paroki</BreadcrumbItem>
	</Breadcrumb>

	<!-- ── Parish Info Card ──────────────────────────────────────────────── -->
	<div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Informasi Paroki</h2>
			{#if !isEditingParish}
				<Button size="sm" color="alternative" onclick={() => (isEditingParish = true)}>Ubah</Button>
			{/if}
		</div>

		{#if form?.error && isEditingParish}
			<Alert color="red" class="mb-4">{form.error}</Alert>
		{/if}

		{#if isEditingParish}
			<form
				method="POST"
				action="?/updateParish"
				use:enhance={() => {
					isSubmittingParish = true;
					return async ({ update }) => {
						await update();
						await invalidateAll();
						isSubmittingParish = false;
						if (!form?.error) isEditingParish = false;
					};
				}}
			>
				<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<Label for="parish-name" class="mb-1">Nama Paroki <span class="text-red-500">*</span></Label>
						<Input autocomplete="off" id="parish-name" name="name" bind:value={parishName} required disabled={isSubmittingParish} />
					</div>
					<div>
						<Label for="parish-code" class="mb-1">Kode <span class="text-red-500">*</span></Label>
						<Input autocomplete="off" id="parish-code" name="code" bind:value={parishCode} required disabled={isSubmittingParish} />
					</div>
				</div>
				<div class="flex gap-2">
					<Button type="submit" disabled={isSubmittingParish}>Simpan</Button>
					<Button color="alternative" type="button" onclick={() => (isEditingParish = false)} disabled={isSubmittingParish}>Batal</Button>
				</div>
			</form>
		{:else}
			<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nama</dt>
					<dd class="mt-1 text-sm text-gray-900 dark:text-white">{data.parish?.name ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Kode</dt>
					<dd class="mt-1">
						{#if data.parish?.code}
							<Badge color="blue">{data.parish.code}</Badge>
						{:else}
							<span class="text-sm text-gray-400">—</span>
						{/if}
					</dd>
				</div>
			</dl>
		{/if}
	</div>

</div>