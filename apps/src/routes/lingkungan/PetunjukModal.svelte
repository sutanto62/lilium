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
	<div class="space-y-4">
		<h3 class="text-base font-semibold text-gray-900 dark:text-white">Petunjuk Tugas Petugas Tata Tertib</h3>
		<ol class="space-y-3 text-sm text-gray-800 dark:text-gray-200" style="list-style: decimal; padding-left: 1.25rem;">
			<li>
				Aturan Tata Tertib hadir pkl. <strong>{briefingTime ?? '[waktu]'}</strong> sebelum Misa untuk briefing
			</li>
			<li>
				Pakaian saat bertugas (khusus Petugas TATIB lingkungan):
				<ul class="mt-2 space-y-1 text-gray-700 dark:text-gray-300" style="list-style: disc; padding-left: 1.25rem;">
					<li>Atasan kemeja/blouse <strong>PUTIH</strong> — bukan Polo T-Shirt, Kaos, atau Blouse tanpa lengan</li>
					<li>Bawahan <strong>HITAM / Warna Gelap</strong> — bukan celana Legging/training (khusus wanita)</li>
					<li>Sepatu tertutup — bukan sepatu sandal/selop</li>
				</ul>
			</li>
			<li>Petugas <strong>TIDAK DIPERBOLEHKAN</strong> membawa tas saat bertugas</li>
			<li>Membawa hand sanitizer dan botol minum sendiri</li>
			<li>Petugas menempati posisi masing-masing yang telah ditentukan dan tidak berpindah tempat</li>
		</ol>
	</div>

	{#snippet footer()}
		<Button onclick={() => (open = false)}>Tutup</Button>
	{/snippet}
</Modal>
