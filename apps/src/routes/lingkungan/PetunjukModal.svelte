<script lang="ts">
	import { Button, Modal } from 'flowbite-svelte';

	let {
		open = $bindable(false),
		briefingTime = null
	}: {
		open?: boolean;
		briefingTime?: string | null;
	} = $props();
</script>

<Modal title="Petunjuk Tugas" bind:open autoclose>
	<div class="mb-4">
		<h3 class="mb-4 text-lg font-semibold">Petunjuk Tugas Petugas Tata Tertib</h3>
		<ul class="list-outside list-decimal space-y-2 pl-4 text-sm font-light">
			<li>Aturan Tata Tertib hadir pkl. {briefingTime ?? '[waktu]'} sebelum Misa untuk briefing</li>
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
		<Button onclick={() => (open = false)}>Tutup</Button>
	{/snippet}
</Modal>
