<script lang="ts">
	import { Button, Heading, Li, List } from 'flowbite-svelte';
</script>

<svelte:head>
	<title>LIS Petunjuk Pemakaian</title>
	<meta name="description" content="LIS" />
</svelte:head>

<div class="mb-4">
	<Button color="primary" onclick={() => history.back()}>← Kembali</Button>
</div>

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
