<script lang="ts">
	import { formatDate } from '$src/lib/utils/dateUtils';
	import { Breadcrumb, BreadcrumbItem, Button, Card, Heading, Li, List } from 'flowbite-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const isFeatureTimezone = $derived(data.isFeatureTimezone);
	const serverTime = $derived(data.currentServerTime);
	const serverTimeISO = $derived(data.currentServerTime.toISOString());
	const timezoneInfo = $derived(data.timezoneInfo);
</script>

<svelte:head>
	<title>LIS Petunjuk Pemakaian</title>
	<meta
		name="description"
		content="Pelajari cara menggunakan LIS untuk konfirmasi petugas tata tertib."
	/>
</svelte:head>

<Breadcrumb class="mb-4	">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem>Petunjuk</BreadcrumbItem>
</Breadcrumb>

{#if isFeatureTimezone}
	<Card class="mb-6">
		<div class="p-6">
			<Heading tag="h5" class="mb-4">Server Timezone Information</Heading>
			<div class="space-y-2 text-sm">
				<p><strong>Timezone:</strong> {timezoneInfo.timezone}</p>
				<p><strong>Timezone Name:</strong> {timezoneInfo.timezoneName}</p>
				<p><strong>Timezone Abbreviation:</strong> {timezoneInfo.timezoneAbbr}</p>
				<p><strong>UTC Offset:</strong> {timezoneInfo.timezoneOffsetFormatted}</p>
				<p><strong>UTC Time:</strong> {timezoneInfo.utcTime}</p>
				<p><strong>Local Time:</strong> {timezoneInfo.localTime}</p>
				<p><strong>Formatted Time:</strong> {formatDate(serverTimeISO, 'datetime')}</p>
				<p>
					<strong>Asia Jakarta Time:</strong>
					{formatDate(data.asiaJakartaTime.toISOString(), 'datetime')}
				</p>
			</div>
		</div>
	</Card>
{/if}

<Heading tag="h5" class="mb-4 mt-7">A. Panduan Lengkap Sistem Konfirmasi</Heading>

<Heading tag="h6" class="mb-2">1. Waktu Konfirmasi</Heading>
<List class="mb-4 space-y-1">
	<Li>Konfirmasi hanya dapat dilakukan pada hari Senin hingga Kamis</Li>
	<Li>Sistem tidak dapat diakses untuk konfirmasi pada hari Jumat, Sabtu, dan Minggu</Li>
</List>

<Heading tag="h6" class="mb-2">2. Langkah Detail Konfirmasi</Heading>
<List tag="ol" class="mb-4 space-y-1">
	<Li>Pilih Jadwal Misa yang tersedia dari daftar</Li>
	<Li>Pilih Wilayah gereja yang sesuai</Li>
	<Li>Pilih Lingkungan yang akan bertugas</Li>
	<Li
		>Masukkan data petugas:
		<List class="ml-5 space-y-1">
			<Li>Nama lengkap petugas</Li>
			<Li>Tandai tugas Kolekte jika sesuai</Li>
			<Li>Atur urutan petugas sesuai kebutuhan</Li>
		</List>
	</Li>
	<Li>Tekan tombol Simpan untuk memproses konfirmasi</Li>
</List>

<Heading tag="h6" class="mb-2">3. Setelah Konfirmasi</Heading>
<List class="mb-4 space-y-1">
	<Li>Sistem akan menampilkan daftar petugas dengan posisi tugasnya</Li>
	<Li>Gunakan tombol "Salin ke Clipboard" untuk menyalin daftar</Li>
	<Li>Hubungi admin jika tidak ada posisi yang ditetapkan</Li>
</List>

<Heading tag="h6" class="mb-2">4. Catatan Penting</Heading>
<List class="mb-4 space-y-1">
	<Li>Pastikan semua data diisi lengkap sebelum menyimpan</Li>
	<Li>Satu lingkungan hanya dapat konfirmasi sekali per jadwal misa</Li>
	<Li>Hubungi admin jika terjadi kesalahan</Li>
	<Li>Periksa kembali kebenaran data petugas sebelum menyimpan</Li>
</List>

<div class="mb-4">
	<Button color="primary" onclick={() => history.back()}>← Kembali</Button>
</div>
