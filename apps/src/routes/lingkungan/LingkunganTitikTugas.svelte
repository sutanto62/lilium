<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { ChurchEvent } from '$core/entities/Event';
	import type { UsherResponse } from '$core/entities/Usher';
	import { statsigService } from '$src/lib/application/StatsigService';
	import LightweightCalendar from '$src/lib/components/LightweightCalendar.svelte';
	import { tracker } from '$src/lib/utils/analytics';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import {
		Button,
		ButtonGroup,
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
	let lingkungans = $state<string[]>([]);
	let filterValue = $state<string>('');

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

	// Ushers
	let ushers = $derived(form?.ushers ?? []);
	let groupedUshers = $derived(() => {
		const currentUshers = form?.ushers ?? [];

		if (currentUshers.length === 0) {
			return [];
		}

		// Initialize Empty Map
		const groups = new Map<
			string,
			{
				lingkungan: string;
				wilayah: string;
				ushers: UsherResponse[];
				isOpen: boolean;
			}
		>();

		// Accumulate ushers by lingkungan
		currentUshers.forEach((usher: UsherResponse) => {
			const key = `${usher.wilayah}-${usher.lingkungan}`;
			if (!groups.has(key)) {
				groups.set(key, {
					lingkungan: usher.lingkungan || '',
					wilayah: usher.wilayah || '',
					ushers: [],
					isOpen: true
				});
			}
			groups.get(key)!.ushers.push(usher);
		});

		// Filtering group

		const sortedGroups = Array.from(groups.values()).sort(
			(a, b) => a.wilayah.localeCompare(b.wilayah) || a.lingkungan.localeCompare(b.lingkungan)
		);

		if (filterValue === '') {
			return sortedGroups;
		}

		return sortedGroups.filter((group) => group.lingkungan.includes(filterValue));
	});

	$effect(() => {
		// Set initial selected event from derived events
		if (events.length > 0 && !selectedEventId) {
			selectedEventId = events[0].id;
			// Set the selected date to the first event's date
			selectedDate = new Date(events[0].date);
			handleCardClick(selectedEventId);
		}

		// Set initial lingkungans
		lingkungans = Array.from(
			new Set(
				ushers
					.map((usher: UsherResponse) => usher.lingkungan)
					.filter((l: string | null | undefined): l is string => !!l)
			)
		);
	});

	// Track empty states
	$effect(() => {
		// Track empty events (no events available)
		if (events.length === 0) {
			tracker.track(
				'lingkungan_titik_tugas_empty_events',
				{
					has_selected_date: !!selectedDate
				},
				page.data.session,
				page
			);
		}

		// Track empty filtered events (date selected but no events)
		if (selectedDate && filteredEvents.length === 0 && events.length > 0) {
			tracker.track(
				'lingkungan_titik_tugas_empty_filtered',
				{
					selected_date: selectedDate.toISOString(),
					total_events: events.length
				},
				page.data.session,
				page
			);
		}

		// Track empty ushers (event selected but no ushers)
		if (selectedEventId && ushers.length === 0 && !isLoading && form?.success !== false) {
			tracker.track(
				'lingkungan_titik_tugas_empty_ushers',
				{
					event_id: selectedEventId,
					has_events: events.length > 0
				},
				page.data.session,
				page
			);
		}

		// Track empty filter results (filter applied but no groups)
		if (filterValue && filterValue !== '' && groupedUshers().length === 0 && ushers.length > 0) {
			tracker.track(
				'lingkungan_titik_tugas_empty_filter',
				{
					filter: filterValue,
					total_ushers: ushers.length,
					total_groups: Array.from(
						new Set(ushers.map((u: UsherResponse) => `${u.wilayah}-${u.lingkungan}`))
					).length
				},
				page.data.session,
				page
			);
		}
	});

	async function handleCardClick(eventId: string) {
		const previousEventId = selectedEventId;
		selectedEventId = eventId;

		const selectedEventData = events.find((e) => e.id === eventId);
		const metadata = {
			event_id: eventId,
			previous_event_id: previousEventId || null,
			event_date: selectedEventData?.date || null,
			event_description: selectedEventData?.description || null
		};

		// Dual tracking for event selection
		await Promise.all([
			statsigService.logEvent(
				'lingkungan_titik_tugas_event_select',
				'event',
				data.session || undefined,
				metadata
			),
			tracker.track('lingkungan_titik_tugas_event_select', metadata, page.data.session, page)
		]);

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

	async function handleEventClick(eventId: string, eventDate: string) {
		const metadata = {
			event_id: eventId,
			event_date: eventDate
		};

		// Dual tracking for event click (business context for autocaptured click)
		await Promise.all([
			statsigService.logEvent(
				'lingkungan_titik_tugas_event_click',
				'click',
				data.session || undefined,
				metadata
			),
			tracker.track('lingkungan_titik_tugas_event_click', metadata, page.data.session, page)
		]);
	}

	async function handleDateSelect(date: Date) {
		const previousDate = selectedDate;
		selectedDate = date;

		const filteredCount = filteredEvents.length;
		const metadata = {
			date: date.toISOString(),
			previous_date: previousDate?.toISOString() || null,
			filtered_events_count: filteredCount,
			total_events: events.length
		};

		// Dual tracking for date selection
		await Promise.all([
			statsigService.logEvent(
				'lingkungan_titik_tugas_date_select',
				'date',
				data.session || undefined,
				metadata
			),
			tracker.track('lingkungan_titik_tugas_date_select', metadata, page.data.session, page)
		]);
	}

	async function handleFilterChange(filter: string) {
		const previousFilter = filterValue;
		filterValue = filter;

		const filteredCount = groupedUshers().length;
		const metadata = {
			previous_filter: previousFilter || 'all',
			new_filter: filter || 'all',
			filtered_groups_count: filteredCount,
			total_ushers: ushers.length,
			lingkungans_count: lingkungans.length
		};

		// Dual tracking for filter change
		await Promise.all([
			statsigService.logEvent(
				'lingkungan_titik_tugas_filter',
				'change',
				data.session || undefined,
				metadata
			),
			tracker.track('lingkungan_titik_tugas_filter_change', metadata, page.data.session, page)
		]);
	}

	async function handlePetunjukModalOpen() {
		showPetunjukModal = true;

		const metadata = {
			event_id: selectedEventId || null,
			has_selected_event: !!selectedEventId
		};

		// Track modal open (PostHog autocapture handles click, we add business context)
		await tracker.track('lingkungan_titik_tugas_petunjuk_open', metadata, page.data.session, page);
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
		<p class="mb-4 text-sm font-light text-gray-500 dark:text-gray-400">Pilih tanggal misa</p>

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
					class={`mb-4 cursor-pointer border-4 bg-white p-4 sm:p-4 md:p-4 ${selectedEventId === event.id ? 'border-amber-500' : 'border-white'}`}
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
					{selectedDate ? 'Jadwal sudah selesai/belum dibuka' : 'Jadwal tidak ditemukan'}
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

			{#if lingkungans.length > 1}
				<div class="mb-4 flex justify-end">
					<ButtonGroup>
						<Button size="sm" onclick={() => handleFilterChange('')}>Semua</Button>
						{#each lingkungans as lingkungan}
							<Button size="sm" onclick={() => handleFilterChange(lingkungan)}>{lingkungan}</Button>
						{/each}
					</ButtonGroup>
				</div>
			{/if}

			<!-- Table Titik Tugas -->
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
						<!-- Grouping -->
						{#each groupedUshers() as group}
							<TableBodyRow class="text-md">
								<TableBodyCell
									class="whitespace-normal bg-amber-200 text-sm font-semibold text-black"
									colspan={4}
								>
									{group.lingkungan} ({group.wilayah})
								</TableBodyCell>
							</TableBodyRow>
							{#each group.ushers as usher}
								<TableBodyRow class="text-sm">
									<TableBodyCell class="whitespace-normal text-sm">
										{usher.name}
										{#if usher.isPpg}
											<span class="text-sm sm:hidden"> (PPG)</span>
										{/if}
										{#if usher.isKolekte}
											<span class="text-sm sm:hidden"> (Kolekte)</span>
										{/if}
									</TableBodyCell>
									<TableBodyCell class="hidden whitespace-normal text-sm lg:table-cell">
										{usher.zone}
									</TableBodyCell>
									<TableBodyCell class="whitespace-normal text-sm">
										<span class="block sm:hidden">{usher.zone} - </span>{usher.position}
									</TableBodyCell>
									<TableBodyCell class="hidden whitespace-normal text-sm lg:table-cell">
										{usher.isPpg ? 'PPG' : ''}{usher.isKolekte ? 'Kolekte' : ''}
									</TableBodyCell>
								</TableBodyRow>
							{/each}
						{/each}

						<!-- No grouping -->
						<!-- {#each ushers as usher}
							<TableBodyRow class="text-sm">
								<TableBodyCell class="whitespace-normal text-sm"
									>{usher.wilayah} {usher.lingkungan} - {usher.name}</TableBodyCell
								>
								<TableBodyCell class="hidden whitespace-normal text-sm lg:table-cell">
									{usher.zone}
								</TableBodyCell>
								<TableBodyCell class="whitespace-normal text-sm">
									<span class="block sm:hidden">{usher.zone} - </span>{usher.position}
								</TableBodyCell>
								<TableBodyCell class="hidden whitespace-normal text-sm lg:table-cell">
									{usher.isPpg ? 'PPG' : ''}{usher.isKolekte ? 'Kolekte' : ''}
								</TableBodyCell>
							</TableBodyRow>
						{/each} -->
					{/if}
				</TableBody>
			</Table>
		{/if}
	</div>
	<div class="lg:col-span-2">
		<div class="rounded-xl bg-white p-4 sm:p-6 md:p-8">
			Mohon baca <button
				type="button"
				onclick={() => handlePetunjukModalOpen()}
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
