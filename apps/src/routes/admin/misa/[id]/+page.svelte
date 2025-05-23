<script lang="ts">
	import {
		Alert,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		Input,
		Label,
		Select,
		Textarea
	} from 'flowbite-svelte';
	import { Section } from 'flowbite-svelte-blocks';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	const { data, form } = $props<{
		data: PageProps['data'];
		form: PageProps['form'];
	}>();

	let showAlert = $state(true);

	onMount(() => {
		if (form?.success || form?.error) {
			setTimeout(() => {
				showAlert = false;
			}, 10000); // 10 seconds
		}
	});
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

		<form method="POST" class="space-y-4">
			<input type="hidden" name="id" value={data.event.mass} />
			<div>
				<Label for="date">Tanggal</Label>
				<Input id="date" name="date" type="date" value={data.event.date} required />
			</div>

			<div>
				<Label for="code">Kode</Label>
				<Input id="code" name="code" value={data.event.code} required />
			</div>

			<div>
				<Label for="description">Nama</Label>
				<Textarea id="description" name="description" value={data.event.description} required />
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
				<Button href="/admin/misa" color="alternative">Kembali</Button>
				<Button type="submit" color="primary">Simpan</Button>
			</div>
		</form>
	</Section>
</div>
