<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Event as ChurchEvent } from '$core/entities/Event';
	import { statsigService } from '$src/lib/application/StatsigService';
	import LightweightCalendar from '$src/lib/components/LightweightCalendar.svelte';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import {
		Button,
		Card,
		Heading,
		Modal,
		Select,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';

	let { data, form } = $props();
	let isLoading = $state(false);
	let formElement: HTMLFormElement;
	let showPetunjukModal = $state(false);

	let events = $derived<ChurchEvent[]>(data.events ?? []);

	// Calendar state
	let selectedDate = $state<Date | null>(null);
	let filteredEvents = $derived(
		selectedDate
			? events.filter((event) => {
					const eventDate = new Date(event.date);
					return eventDate.toDateString() === selectedDate!.toDateString();
				})
			: events
	);

	let selectItems = $derived(
		filteredEvents.map((event: ChurchEvent) => ({
			value: event.id,
			name: event.description || 'Tidak ada jadwal'
		}))
	);
	let selectedEventId = $state<string | null>(null);
	let selectedEvent = $derived(
		events.length > 0
			? events.find((event: ChurchEvent) => event.id === selectedEventId) || events[0] || null
			: null
	);

	let ushers = $derived(form?.ushers ?? []);

	$effect(() => {
		// Set initial selected event from derived events
		if (events.length > 0 && !selectedEventId) {
			selectedEventId = events[0].id;
			// Set the selected date to the first event's date
			selectedDate = new Date(events[0].date);
			handleCardClick(selectedEventId);
		}
	});

	async function handleCardClick(eventId: string) {
		selectedEventId = eventId;

		await statsigService.logEvent('lingkungan_select_event', 'event', data.session || undefined, {
			eventId: eventId
		});

		// Trigger form submission to fetch ushers
		if (formElement && selectedEventId) {
			// Set the input value directly and submit
			const input = formElement.querySelector('input[name="eventId"]') as HTMLInputElement;
			if (input) {
				input.value = selectedEventId;
			}
			formElement.requestSubmit();
		}
	}

	async function handleDateSelect(date: Date) {
		selectedDate = date;

		await statsigService.logEvent('lingkungan_select_date', 'date', data.session || undefined, {
			date: date.toISOString()
		});

		// Reset selected event if current selection is not in filtered events
		if (selectedEventId && !filteredEvents.find((e) => e.id === selectedEventId)) {
			if (filteredEvents.length > 0) {
				handleCardClick(filteredEvents[0].id);
			} else {
				selectedEventId = null;
			}
		}
	}
</script>

<form
	method="POST"
	bind:this={formElement}
	use:enhance={() => {
		isLoading = true;
		return async ({ result, update }) => {
			isLoading = false;
			await update();
		};
	}}
>
	<input type="hidden" name="eventId" bind:value={selectedEventId} />
</form>

<div class="grid w-full gap-8 lg:grid-cols-7">
	<!-- Mobile -->
	<div class="rounded-xl bg-gray-100 p-4 lg:hidden">
		<h2 class="mb-4 text-xl font-light">
			{selectedDate ? `Misa ${formatDate(selectedDate.toISOString(), 'date')}` : 'Misa Minggu Ini'}
		</h2>

		<LightweightCalendar
			{events}
			{selectedEventId}
			initialSelectedDate={selectedDate}
			onEventSelect={handleCardClick}
			onDateSelect={handleDateSelect}
		/>

		{#if filteredEvents.length > 0}
			<Select
				class="text-normal mt-2"
				items={selectItems}
				bind:value={selectedEventId}
				onchange={() => handleCardClick(selectedEventId ?? '')}
			/>
		{:else}
			<p class="mt-2 text-sm font-light text-gray-500 dark:text-gray-400">
				{selectedDate ? 'Tidak ada jadwal untuk tanggal ini' : 'Jadwal tidak ditemukan'}
			</p>
		{/if}
	</div>

	<!-- Browser -->
	<div class="hidden rounded-xl bg-gray-100 p-4 sm:p-6 md:p-8 lg:col-span-2 lg:block">
		<h2 class="mb-4 text-xl font-light">
			{selectedDate ? `Misa ${formatDate(selectedDate.toISOString(), 'date')}` : 'Misa Minggu Ini'}
		</h2>
		<p class="mb-4 text-sm font-light text-gray-500 dark:text-gray-400">
			Pilih tanggal misa untuk melihat jadwal dan titik tugas
		</p>

		<LightweightCalendar
			{events}
			{selectedEventId}
			initialSelectedDate={selectedDate}
			onEventSelect={handleCardClick}
			onDateSelect={handleDateSelect}
		/>

		{#if filteredEvents.length > 0}
			{#each filteredEvents as event}
				<Card
					class={`mb-4 cursor-pointer border-2 bg-white p-4 sm:p-4 md:p-4 ${selectedEventId === event.id ? 'border-amber-500' : 'border-white'}`}
					shadow="lg"
					id={event.id}
					onclick={() => handleCardClick(event.id)}
					onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleCardClick(event.id)}
					tabindex={0}
					role="button"
					aria-label="Select event: {event.description}"
				>
					<h2 class="text-xl font-light tracking-tight text-gray-900 dark:text-white">
						{event.description}
					</h2>
					<p class="text-sm font-light text-gray-500 dark:text-gray-400">
						{formatDate(event.date, 'date')}
					</p>
				</Card>
			{/each}
		{:else}
			<div class="py-8 text-center">
				<p class="text-sm font-light text-gray-500 dark:text-gray-400">
					{selectedDate ? 'Tidak ada jadwal untuk tanggal ini' : 'Jadwal tidak ditemukan'}
				</p>
			</div>
		{/if}
	</div>
	<div class="lg:col-span-3">
		{#if selectedEvent}
			<Heading tag="h2" class="text-4xl tracking-tight text-amber-500 dark:text-white">
				Titik Tugas
			</Heading>
			<p class="text-md mb-6 font-light text-gray-900 dark:text-white">
				{selectedEvent.description}, {formatDate(selectedEvent.date, 'long')}
			</p>

			<Table color="amber" shadow class="rounded-xl">
				<TableHead>
					<TableHeadCell>Nama</TableHeadCell>
					<TableHeadCell class="hidden lg:table-cell">Zona</TableHeadCell>
					<TableHeadCell>Posisi</TableHeadCell>
					<TableHeadCell class="hidden lg:table-cell">Tugas</TableHeadCell>
				</TableHead>
				<TableBody>
					{#if isLoading}
						<TableBodyRow>
							<TableBodyCell colspan={4} class="py-8 text-center">
								<div class="flex items-center justify-center">
									<div class="h-6 w-6 animate-spin rounded-full border-b-2 border-amber-500"></div>
									<span class="ml-2">Loading ushers...</span>
								</div>
							</TableBodyCell>
						</TableBodyRow>
					{:else if form?.success === false}
						<TableBodyRow>
							<TableBodyCell colspan={4} class="py-8 text-center text-red-500">
								Error: {form.error || 'Failed to load ushers'}
							</TableBodyCell>
						</TableBodyRow>
					{:else if ushers.length === 0}
						<TableBodyRow>
							<TableBodyCell colspan={4} class="text-white-500 py-8 text-center">
								Belum ada petugas
							</TableBodyCell>
						</TableBodyRow>
					{:else}
						{#each ushers as usher}
							<TableBodyRow>
								<TableBodyCell>{usher.name}</TableBodyCell>
								<TableBodyCell class="hidden lg:table-cell">{usher.zone}</TableBodyCell>
								<TableBodyCell class="whitespace-normal"
									>{usher.zone} - {usher.position}</TableBodyCell
								>
								<TableBodyCell class="hidden lg:table-cell"
									>{usher.isPpg ? 'PPG' : ''}{usher.isKolekte ? 'Kolekte' : ''}</TableBodyCell
								>
							</TableBodyRow>
						{/each}
					{/if}
				</TableBody>
			</Table>
		{/if}
	</div>
	<div class="lg:col-span-2">
		<div class="rounded-xl bg-white p-4 sm:p-6 md:p-8">
			Mohon baca <button
				type="button"
				onclick={() => (showPetunjukModal = true)}
				class="text-blue-600 hover:underline">Petunjuk Tugas</button
			>
		</div>
	</div>
</div>

<!-- Petunjuk Tugas Modal -->
<Modal title="Petunjuk Tugas" bind:open={showPetunjukModal} autoclose>
	<div class="mb-4">
		<h3 class="mb-4 text-lg font-semibold">Petunjuk Tugas Petugas Tata Tertib</h3>
		<ul class="list-outside list-decimal space-y-2 pl-4 text-sm font-light">
			<li>Aturan Tata Tertib hadir pkl. XXX sebelum Misa untuk briefing</li>
			<li>
				Pakaian saat bertugas : (khusus Petugas TATIB lingkungan)
				<ol class="mt-2 list-outside list-disc space-y-1 pl-4 text-sm font-light">
					<li>
						Atasan kemeja/blouse PUTIH (BUKAN Polo T-Shirt atau Kaos atau Blouse tanpa lengan)
					</li>
					<li>Bawahan HITAM / Warna Gelap (bukan celana Legging / training (khusus wanita))</li>
					<li>Sepatu tertutup (bukan sepatu sandal / selop)</li>
				</ol>
			</li>
			<li>Petugas TIDAK DIPERBOLEHKAN membawa tas pada saat bertugas</li>
			<li>Membawa Handsanitizer dan botol minum sendiri</li>
			<li>
				Petugas menempati posisi tugas masing-masing yang telah ditentukan dan tidak berpindah
				tempat
			</li>
		</ul>
	</div>

	{#snippet footer()}
		<Button onclick={() => (showPetunjukModal = false)}>Tutup</Button>
	{/snippet}
</Modal>
