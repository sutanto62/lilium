<script lang="ts">
	export let data;

	$: mass = data.jadwalDetail;
	$: zones = mass.zones;
</script>

<!-- {JSON.stringify(mass, null, 2)} -->

<div class="print-content">
	<div class="print-header mb-4 text-center">
		<h1
			class="mb-2 text-2xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white md:text-2xl lg:text-3xl"
		>
			Gereja St. Laurensius, Paroki Alam Sutera
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
			{#each zones as zone}
				{#each zone.ushers as usher, j}
					<tr style="border: 1px solid black;">
						{#if j === 0}
							<td rowspan={zone.rowSpan}>{zone.zone}</td>
							<td rowspan={zone.rowSpan}>{zone.pic}</td>
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
	}

	th,
	td {
		border: 1px solid black;
		padding: 2px;
	}

	.rowspan {
		border-bottom: none;
	}

	/* Print-specific styles */
	@media print {
		.print-content {
			padding: 0.5rem;
		}
	}
</style>
