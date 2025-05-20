<script lang="ts">
	import FeatureCard from '$components/FeatureCard.svelte';
	import { FeatureDefault } from 'flowbite-svelte-blocks';
</script>

<FeatureDefault class="mb-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
	<FeatureCard
		title="Jadwal Tata Tertib"
		description="Kelola jadwal tata tertib lingkungan. Melihat kelengkapan petugas per misa. Cetak daftar petugas."
		buttonHref="/admin/jadwal"
		buttonText="Kelola"
		buttonColor="alternative"
	/>
	<FeatureCard
		title="Jadwal Misa"
		description="Melihat dan membuat jadwal misa. Buka sebulan sekali untuk membuat jadwal satu bulan penuh."
		buttonHref="/admin/misa"
		buttonText="Misa"
		buttonColor="alternative"
	/>
</FeatureDefault>
