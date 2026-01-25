<script lang="ts">
	import { page } from '$app/state';
	import { statsigService } from '$src/lib/application/StatsigService';
	import { tracker } from '$src/lib/utils/analytics';
	import {
		Alert,
		Breadcrumb,
		BreadcrumbItem,
		Heading,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import type { PageProps } from './$types';
	import type { Mass } from '$core/entities/Schedule';

	const { data } = $props<{
		data: PageProps['data'];
	}>();

	// Use $derived to make masses reactive to data changes
	const masses = $derived(data.masses);

	// Format day name from English to Indonesian
	function formatDayName(day: string): string {
		const dayMap: Record<string, string> = {
			sunday: 'Minggu',
			monday: 'Senin',
			tuesday: 'Selasa',
			wednesday: 'Rabu',
			thursday: 'Kamis',
			friday: 'Jumat',
			saturday: 'Sabtu'
		};
		return dayMap[day.toLowerCase()] || day;
	}

	// Format time display
	function formatTime(time: string | null): string {
		if (!time) return '-';
		return time;
	}

	// Track page load
	$effect(() => {
		const session = page.data.session || undefined;

		// Track page load if data is ready
		if (data.masses !== undefined) {
			const metadata = {
				total_masses: data.masses?.length || 0,
				active_masses: data.masses?.filter((mass: Mass) => mass.active === 1).length || 0,
				inactive_masses: data.masses?.filter((mass: Mass) => mass.active === 0).length || 0,
				has_masses: (data.masses?.length || 0) > 0,
				has_session: !!session
			};

			// Dual tracking for client-side page view
			Promise.all([
				statsigService.logEvent('admin_posisi_view', 'load', session, metadata),
				tracker.track('admin_posisi_view', metadata, session, page)
			]);
		}
	});
</script>

<svelte:head>
	<title>Posisi</title>
	<meta
		name="description"
		content="Melihat daftar jadwal misa yang terdaftar di gereja. Setiap jadwal misa menentukan hari, waktu, dan posisi yang diperlukan."
	/>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem>Posisi</BreadcrumbItem>
</Breadcrumb>

<div class="mb-4">
	<Heading tag="h1" class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl"
		>Posisi</Heading
	>

	{#if masses.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800"
		>
			<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
				Jadwal misa masih kosong.
			</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Belum ada jadwal misa yang terdaftar. Silakan hubungi administrator untuk menambahkan jadwal
				misa.
			</p>
		</div>
	{:else}
		<Table striped={true} shadow>
			<caption
				class="bg-white p-5 text-left text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
			>
				Jadwal Misa
				<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
					Berikut daftar jadwal misa yang terdaftar di gereja.
				</p>
			</caption>
			<TableHead>
				<TableHeadCell>Kode</TableHeadCell>
				<TableHeadCell>Nama</TableHeadCell>
				<TableHeadCell>Hari</TableHeadCell>
				<TableHeadCell>Waktu</TableHeadCell>
				<TableHeadCell>Briefing</TableHeadCell>
				<TableHeadCell>Status</TableHeadCell>
				<TableHeadCell>Urutan</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each masses as mass}
					<TableBodyRow>
						<TableBodyCell>
							{mass.code || '-'}
						</TableBodyCell>
						<TableBodyCell>{mass.name}</TableBodyCell>
						<TableBodyCell>{formatDayName(mass.day)}</TableBodyCell>
						<TableBodyCell>{formatTime(mass.time)}</TableBodyCell>
						<TableBodyCell>{formatTime(mass.briefingTime)}</TableBodyCell>
						<TableBodyCell>
							{#if mass.active === 1}
								<span
									class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
								>
									Aktif
								</span>
							{:else}
								<span
									class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
								>
									Tidak Aktif
								</span>
							{/if}
						</TableBodyCell>
						<TableBodyCell>{mass.sequence ?? '-'}</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</div>
