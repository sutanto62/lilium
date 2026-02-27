<script lang="ts">
	import { page } from '$app/state';
	import { tracker } from '$src/lib/utils/analytics';
	import { Button } from 'flowbite-svelte';
	import html2canvas from 'html2canvas';

	let { data } = $props();

	let event = $derived(data.jadwalDetail);
	let zones = $derived(event.listUshers);
	let kolekte = $derived(event.listKolekte);
	let ppg = $derived(event.listPpg);
	let church = $derived(data.church);

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
			link.download = `jadwal_${event.date?.replace(/\s+/g, '_')}_${
				event.date ? new Date(event.date).toISOString().split('T')[0] : 'undated'
			}.png`;
			link.href = dataUrl;

			// Trigger download
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			await tracker.track(
				'admin_jadwal_cetak_download',
				{ event_id: page.params.id, mass: event.mass, date: event.date },
				page.data.session,
				page
			);
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
			class="mb-2 text-2xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white md:text-2xl lg:text-3xl"
		>
			{church.name}, {church.parish}
		</h1>

		<h1
			class="mb-0 text-xl font-bold leading-none tracking-tight text-gray-900 dark:text-white md:text-xl lg:text-2xl"
		>
			Misa {event.mass}
			<br />
			{event.date
				? new Date(event.date).toLocaleDateString('id-ID', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})
				: ''}
		</h1>
		<div class="mt-2 text-left">
			<h2 class="mb-2 font-bold">CATATAN:</h2>
			<ol class="max-w-full list-inside list-decimal space-y-1" style="margin-left: 2rem">
				<li>
					Petugas TATIB dan PM wajib hadir {event.briefingTime ?? 'sesuai instruksi'} sebelum Misa untuk
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
	<table class="w-full border-collapse border border-black">
		<thead>
			<tr>
				<th class="border border-black">Zona</th>
				<th class="border border-black">PIC</th>
				<th class="border border-black">Posisi</th>
				<th class="border border-black">Petugas</th>
				<th class="border border-black">Wilayah</th>
				<th class="border border-black">Lingkungan</th>
			</tr>
		</thead>
		<tbody class="border border-black">
			<tr class="bg-yellow-300">
				<td colspan="6" class="border border-black"> Petugas Misa </td>
			</tr>
			{#each zones as item}
				{#each item.ushers as usher, j}
					<tr>
						{#if j === 0}
							<td rowspan={item.rowSpan} class="border-b border-r border-black">{item.zone}</td>
							<td rowspan={item.rowSpan} class="border-b border-r border-black">{item.pic}</td>
						{/if}
						<td class="border-b border-black">{usher.position}</td>
						<td class="border-b border-black">{usher.name}</td>
						<td class="border-b border-black">{usher.wilayah}</td>
						<td class="border-b border-black">{usher.lingkungan}</td>
					</tr>
				{/each}
			{/each}
			<tr class="bg-green-300">
				<td colspan="6" class="border border-black">PIC Misa: {event.pic}</td>
			</tr>
			<tr class="bg-yellow-300">
				<td colspan="6" class="border border-black">Setelah selesai perayaan Misa Ekaristi</td>
			</tr>
			{#each kolekte as item}
				{#each item.ushers as usher, j}
					<tr>
						{#if j === 0}
							<td class="border-r border-black" rowspan={item.rowSpan} colspan="2">{item.zone}</td>
						{/if}
						<td class="border-b border-black">{usher.position}</td>
						<td class="border-b border-black">{usher.name}</td>
						<td class="border-b border-black">{usher.wilayah}</td>
						<td class="border-b border-black">{usher.lingkungan}</td>
					</tr>
				{/each}
			{/each}
			<!-- <tr class="bg-yellow-300">
				<td colspan="6" class="border border-black">Bersama tim PPG menghitung uang amplop</td>
			</tr> -->
			{#each ppg as item}
				{#each item.ushers as usher, j}
					<tr>
						{#if j === 0}
							<td class="border-r border-black" rowspan={item.rowSpan} colspan="2">{item.zone}</td>
						{/if}
						<td class="border-b border-black">{usher.position}</td>
						<td class="border-b border-black">{usher.name}</td>
						<td class="border-b border-black">{usher.wilayah}</td>
						<td class="border-b border-black">{usher.lingkungan}</td>
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
	}

	.print-content tr {
		margin-top: 0px !important;
	}
	.print-content td,
	.print-content th {
		padding-bottom: 1rem !important;
		padding-left: 0.5rem !important;
		border-bottom: 1px solid black !important;
	}
	/* Print-specific styles */
	/* @media print {
		.no-print {
			display: none;
		}

		.print-content th,
		.print-content td {
			padding: 0.5rem !important;
			line-height: 1rem !important;
			border: 1px solid black !important;
		}

		table {
			page-break-inside: avoid;
		}

		tr {
			page-break-inside: avoid;
		}

		th,
		td {
			padding: 0.25rem;
		}
	} */
</style>
