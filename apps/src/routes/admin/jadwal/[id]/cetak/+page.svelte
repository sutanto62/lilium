<script lang="ts">
	export let data;

	$: mass = data.jadwalDetail;
	$: zones = mass.listUshers;
	$: kolekte = mass.listKolekte;
	$: ppg = mass.listPpg;
	$: church = data.church;

	$: briefingTime = mass.time
		? new Date(`2000-01-01 ${mass.time}`).getTime() - 75 * 60 * 1000
		: null;
	$: formattedBriefingTime = briefingTime
		? new Date(briefingTime).toLocaleTimeString('id-ID', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})
		: '';
</script>

<div class="print-content">
	<div class="print-header mb-4 text-center">
		<h1
			class="mb-2 text-2xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white md:text-2xl lg:text-3xl"
		>
			{church.name}, {church.parish}
		</h1>

		<h1
			class="mb-0 text-xl font-bold leading-none tracking-tight text-gray-900 dark:text-white md:text-xl lg:text-2xl"
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
					Petugas TATIB dan PM wajib hadir {formattedBriefingTime} sebelum Misa untuk briefing
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
					<tr style="border: 1px solid black;">
						{#if j === 0}
							<td rowspan={item.rowSpan}>{item.zone}</td>
							<td rowspan={item.rowSpan}>{item.pic}</td>
						{/if}
						<td>{usher.position}</td>
						<td>{usher.name}</td>
						<td>{usher.wilayah}</td>
						<td>{usher.lingkungan}</td>
					</tr>
				{/each}
			{/each}
			<tr style="background-color: #FFFF00;">
				<td colspan="6" style="border: 1px solid black;">Setelah selesai perayaan Misa Ekaristi</td>
			</tr>
			{#each kolekte as item}
				{#each item.ushers as usher, j}
					<tr style="border: 1px solid black;">
						{#if j === 0}
							<td rowspan={item.rowSpan} colspan="2">{item.zone}</td>
						{/if}
						<td>{usher.position}</td>
						<td>{usher.name}</td>
						<td>{usher.wilayah}</td>
						<td>{usher.lingkungan}</td>
					</tr>
				{/each}
			{/each}
			<tr style="background-color: #FFFF00;">
				<td colspan="6" style="border: 1px solid black;">Bersama tim PPG menghitung uang amplop</td>
			</tr>
			{#each ppg as item}
				{#each item.ushers as usher, j}
					<tr style="border: 1px solid black;">
						{#if j === 0}
							<td rowspan={item.rowSpan} colspan="2">{item.zone}</td>
						{/if}
						<td>{usher.position}</td>
						<td>{usher.name}</td>
						<td>{usher.wilayah}</td>
						<td>{usher.lingkungan}</td>
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* Base styles for both print and non-print */
	table {
		border-collapse: collapse;
		width: 100%;
		border: 1px solid black;
		font-size: 10px;
	}

	th,
	td {
		border: 1px solid black;
		padding: 1px 2px;
		line-height: 1.2;
	}

	.rowspan {
		border-bottom: none;
	}

	/* Print-specific styles */
	@media print {
		.print-content {
			padding: 0.25rem;
		}

		@page {
			margin: 1cm;
		}
	}
</style>
