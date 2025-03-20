<script lang="ts">
	import FeatureCard from '$components/FeatureCard.svelte';
	import { P } from 'flowbite-svelte';
	import { FeatureDefault } from 'flowbite-svelte-blocks';
	import { ClipboardListSolid } from 'flowbite-svelte-icons';
</script>

<P size="sm" class="mb-3">
	Menu khusus untuk admin sistem. Hanya dapat diakses oleh pengguna dengan hak akses admin.
</P>
<FeatureDefault divClass="grid grid-cols-1 md:grid-cols-4 gap-4">
	<FeatureCard
		icon={ClipboardListSolid}
		title="Jadwal Tata Tertib"
		description="Kelola jadwal tata tertib lingkungan. Melihat kelengkapan petugas per misa. Cetak daftar petugas."
		buttonHref="/admin/jadwal"
		buttonText="Kelola"
	/>
	<!-- <FeatureCard
			icon={UserCircleSolid}
			title="PIC PETA"
			description="Setiap minggu petugas PETA akan bergantian menjadi PIC pada setiap misa. PIC harus sudah terdaftar."
			buttonHref="/admin/pic"
			buttonText="Atur PIC"
		/> -->
</FeatureDefault>
