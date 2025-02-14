<script lang="ts">
	export let data;

	$: jadwalDetail = data.jadwalDetail;
</script>

<!-- Add your print layout here -->
<div class="print-content">
	<h1 class="mb-4 text-center text-2xl font-bold">{jadwalDetail.mass}</h1>
	<p class="mb-8 text-center">
		{jadwalDetail.date
			? new Date(jadwalDetail.date).toLocaleDateString('id-ID', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			: '-'}
	</p>

	<p class="mb-8 text-center">
		Petugas 3 Lingk @8 orang = 24 orang + PETA 3 orang + PIC PPG 1 orang
	</p>

	<table class="w-full border-collapse border">
		<thead>
			<tr>
				<th class="w-16 border p-2">NO.</th>
				<th class="border p-2">PETUGAS TATIB</th>
				<th class="border p-2">PIC ZONA (PETA)</th>
			</tr>
		</thead>
		<tbody>
			{#if jadwalDetail.rows && jadwalDetail.rows.length > 0}
				{#each jadwalDetail.rows as zone}
					{#if zone.detail}
						{#each zone.detail as lingkungan}
							{#each lingkungan.ushers as usher, index}
								<tr>
									<td class="border p-2 text-center">{index + 1}</td>
									<td class="border p-2">{usher.name} - {usher.position}</td>
									<td class="border p-2" class:rowspan={index === 0}>
										{#if index === 0}
											{lingkungan.name}
										{/if}
									</td>
								</tr>
							{/each}
						{/each}
					{/if}
				{/each}
				<tr>
					<td class="border p-2" colspan="3">PIC TATIB (PETA)</td>
				</tr>
				<tr>
					<td class="border p-2" colspan="3">PIC PPG</td>
				</tr>
			{:else}
				<tr>
					<td colspan="3" class="border p-2 text-center">Tidak ada data yang tersedia</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>

<style>
	@media print {
		.print-content {
			padding: 2rem;
		}

		table {
			border-collapse: collapse;
			width: 100%;
		}

		th,
		td {
			border: 1px solid black;
			padding: 8px;
		}

		.rowspan {
			border-bottom: none;
		}
	}
</style>
