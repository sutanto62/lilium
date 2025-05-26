<script lang="ts">
	import { EventType } from '$core/entities/Event';
	import { getWeekNumber } from '$src/lib/utils/dateUtils.js';
	import {
		Alert,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Datepicker,
		Heading,
		Input,
		Label,
		Select,
		Textarea
	} from 'flowbite-svelte';
	import { Section } from 'flowbite-svelte-blocks';
	import { onMount } from 'svelte';

	let { data, form } = $props();

	let showAlert = $state(true);
	let selectedDate: Date | undefined = $state(undefined);
	let weekNumber: number | undefined = $state(undefined);

	onMount(() => {
		if (form?.success || form?.error) {
			setTimeout(() => {
				showAlert = false;
			}, 10000); // 10 seconds
		}
	});

	function handleDateSelect(date: Date | { from?: Date; to?: Date }) {
		if (date instanceof Date) {
			selectedDate = date;
			console.log(`selectedDate ${JSON.stringify(selectedDate.toLocaleDateString('en-CA'))}`);
		}
		weekNumber = getWeekNumber(selectedDate?.toLocaleDateString('en-CA') as string);
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

<!-- on succes alert -->
{#if form?.success && showAlert}
	<Alert color="green" class="mb-4">
		<p>Data misa berhasil disimpan</p>
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
		>Misa Baru</Heading
	>

	<Section name="crudcreateform">
		<h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Edit Misa</h2>

		<form method="POST" class="space-y-4">
			<div>
				<Label for="date">Tanggal</Label>
				<Datepicker
					bind:value={selectedDate}
					onselect={handleDateSelect}
					required
					dateFormat={{
						dateStyle: 'medium'
					}}
				/>

				<input type="hidden" name="date" value={selectedDate?.toLocaleDateString('en-CA')} />
				<input type="hidden" name="weekNumber" value={weekNumber} />
			</div>

			<div>
				<Label for="date">Jenis Misa</Label>
				<Select id="mass" name="mass" required>
					{#if data.church?.masses}
						{#each data.church.masses as mass}
							<option value={mass.id}>{mass.name}</option>
						{/each}
					{/if}
				</Select>
			</div>

			<div>
				<Label for="date">Perayaan</Label>
				<Select id="type" name="type" required>
					<option value={EventType.MASS}>Misa Biasa</option>
					<option value={EventType.FEAST}>Perayaan</option>
				</Select>
			</div>

			<div>
				<Label for="code">Kode</Label>
				<Input id="code" name="code" required />
			</div>

			<div>
				<Label for="description">Nama</Label>
				<Textarea id="description" name="description" required />
			</div>

			<div class="flex justify-end space-x-2">
				<Button href="/admin/misa" color="alternative">Kembali</Button>
				<Button type="submit" color="primary">Simpan</Button>
			</div>
		</form>
	</Section>
</div>
