<script lang="ts">
	export let data;

	$: jadwalDetail = data.jadwalDetail;
</script>

<!-- Add your print layout here -->
{JSON.stringify(jadwalDetail, null, 2)}

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
