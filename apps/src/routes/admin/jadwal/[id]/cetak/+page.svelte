<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import html2canvas from 'html2canvas';

	export let data;

	$: mass = data.jadwalDetail;
	$: zones = mass.listUshers;
	$: kolekte = mass.listKolekte;
	$: ppg = mass.listPpg;
	$: church = data.church;

	async function downloadImage() {
		const element = document.getElementById('print-content');
		if (!element) return;

		try {
			const canvas = await html2canvas(element, {
				useCORS: true,
				logging: false
			});

			// Convert canvas to data URL
			const dataUrl = canvas.toDataURL('image/png');

			// Create temporary link element
			const link = document.createElement('a');
			link.download = `jadwal_${mass.date?.replace(/\s+/g, '_')}_${
				mass.date ? new Date(mass.date).toISOString().split('T')[0] : 'undated'
			}.png`;
			link.href = dataUrl;

			// Trigger download
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error('Error generating image:', error);
		}
	}
</script>

<div class="no-print mb-4">
	<div class="flex items-center justify-center gap-2">
		<Button
			class="flex items-center justify-center rounded-full bg-gray-200 p-2 text-gray-600 hover:bg-gray-300"
			onclick={downloadImage}
		>
			Download Daftar
		</Button>
	</div>
</div>

<div class="print-content" id="print-content">
	<div class="print-header mb-4 text-center">
		<h1
			class="mb-2 text-2xl leading-none font-extrabold tracking-tight text-gray-900 md:text-2xl lg:text-3xl dark:text-white"
		>
			{church.name}, {church.parish}
		</h1>

		<h1
			class="mb-0 text-xl leading-none font-bold tracking-tight text-gray-900 md:text-xl lg:text-2xl dark:text-white"
		>
			Misa {mass.mass}
			<br />
			{mass.date
				? new Date(mass.date).toLocaleDateString('id-ID', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})
				: ''}
		</h1>
		<div class="mt-2 text-left">
			<h2 class="mb-2 font-bold">CATATAN:</h2>
			<ol class="list-inside list-decimal">
				<li>
					Petugas TATIB dan PM wajib hadir {mass.briefingTime ?? 'sesuai instruksi'} sebelum Misa untuk
					briefing
				</li>
				<li>
					Pakaian saat bertugas : (khusus Petugas TATIB lingkungan)
					<ul class="ml-4 list-inside list-disc">
						<li>Atasan kemeja/blouse PUTIH Berlengan (bukan Polo T-Shirt atau Kaos)</li>
						<li>Bawahan HITAM / Warna Gelap (bukan celana Legging / training (khusus wanita)</li>
						<li>Sepatu tertutup (bukan sepatu sandal / selop)</li>
					</ul>
				</li>
				<li>Petugas TIDAK DIPERBOLEHKAN membawa tas pada saat bertugas</li>
				<li>Membawa Handsanitizer dan botol minum sendiri</li>
				<li>
					Petugas menempati posisi tugas masing-masing yang telah ditentukan dan tidak berpindah
					tempat
				</li>
			</ol>
		</div>
	</div>
	<table style="border-collapse: collapse; width: 100%;">
		<thead>
			<tr>
				<th>Zona</th>
				<th>PIC</th>
				<th>Posisi</th>
				<th>Petugas</th>
				<th>Wilayah</th>
				<th>Lingkungan</th>
			</tr>
		</thead>
		<tbody style="border: 1px solid black;">
			<tr style="background-color: #FFFF00;">
				<td colspan="6" style="border: 1px solid black;"> Petugas Misa </td>
			</tr>
			{#each zones as item}
				{#each item.ushers as usher, j}
					<tr>
						{#if j === 0}
							<td
								rowspan={item.rowSpan}
								style="border-bottom: 1px solid black;
							border-right: 1px solid black;">{item.zone}</td
							>
							<td
								rowspan={item.rowSpan}
								style="border-bottom: 1px solid black;
							border-right: 1px solid black;">{item.pic}</td
							>
						{/if}
						<td style="border-bottom: 1px solid black;">{usher.position}</td>
						<td style="border-bottom: 1px solid black;">{usher.name}</td>
						<td style="border-bottom: 1px solid black;">{usher.wilayah}</td>
						<td style="border-bottom: 1px solid black;">{usher.lingkungan}</td>
					</tr>
				{/each}
			{/each}
			<tr style="background-color: #FFFF00;">
				<td colspan="6" style="border: 1px solid black;">Setelah selesai perayaan Misa Ekaristi</td>
			</tr>
			{#each kolekte as item}
				{#each item.ushers as usher, j}
					<tr>
						{#if j === 0}
							<td style="border-right: 1px solid black;" rowspan={item.rowSpan} colspan="2"
								>{item.zone}</td
							>
						{/if}
						<td style="border-bottom: 1px solid black;">{usher.position}</td>
						<td style="border-bottom: 1px solid black;">{usher.name}</td>
						<td style="border-bottom: 1px solid black;">{usher.wilayah}</td>
						<td style="border-bottom: 1px solid black;">{usher.lingkungan}</td>
					</tr>
				{/each}
			{/each}
			<tr style="background-color: #FFFF00;">
				<td colspan="6" style="border: 1px solid black;">Bersama tim PPG menghitung uang amplop</td>
			</tr>
			{#each ppg as item}
				{#each item.ushers as usher, j}
					<tr>
						{#if j === 0}
							<td style="border-right: 1px solid black;" rowspan={item.rowSpan} colspan="2"
								>{item.zone}</td
							>
						{/if}
						<td style="border-bottom: 1px solid black;">{usher.position}</td>
						<td style="border-bottom: 1px solid black;">{usher.name}</td>
						<td style="border-bottom: 1px solid black;">{usher.wilayah}</td>
						<td style="border-bottom: 1px solid black;">{usher.lingkungan}</td>
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* Base styles for both print and non-print */
	.print-content {
		padding: 5rem;
		/* font-size: 0.875rem; 14px */
		border: 1px solid black;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		border: 1px solid black;
		/* font-size: 0.75rem; 12px */
	}

	tr {
		height: 1.2rem;
	}

	th,
	td {
		vertical-align: middle; /* Center content vertically */
		white-space: nowrap; /* Prevent text wrapping */
		overflow: hidden; /* Handle overflow */
		text-overflow: ellipsis; /* Show ellipsis for overflowing text */
	}
</style>
