<script lang="ts">
	import type { PageData } from './$types';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
	import { Button } from 'flowbite-svelte';
	import { Section, HeroHeader, FeatureDefault, FeatureItem } from 'flowbite-svelte-blocks';
	import { BookmarkSolid, CalendarMonthSolid } from 'flowbite-svelte-icons';

	// Props
	export let data: PageData;
</script>

<NavigationAdmin />
<Section name="feature">
	<HeroHeader
		class="mb-8 max-w-screen-md lg:mb-16"
		h2Class="mb-4 text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white"
		pClass="text-gray-500 sm:text-xl dark:text-gray-400"
	>
		<svelte:fragment slot="h2">Selamat Melayani</svelte:fragment>
		<svelte:fragment slot="paragraph"
			>Sistem informasi pelayanan Paroki Alam Sutera. Hanya untuk kalangan sendiri.</svelte:fragment
		>
	</HeroHeader>
	<FeatureDefault divClass="grid grid-cols-1 md:grid-cols-3 gap-4 ">
		{#if data.isAdmin}
			<FeatureItem>
				<svelte:fragment slot="icon"
					><CalendarMonthSolid
						size="xl"
						class="text-primary-600 dark:text-primary-300"
					/></svelte:fragment
				>
				<svelte:fragment slot="h3">Jadwal Tata Tertib</svelte:fragment>
				<svelte:fragment slot="paragraph"
					>Kelola jadwal tata tertib lingkungan. Hanya dapat diakses oleh admin.
					<div class="mt-4">
						<Button size="sm" href="/admin/jadwal">Kelola</Button>
					</div>
				</svelte:fragment>
			</FeatureItem>
		{/if}
		<hr class="my-4 block h-px border-0 bg-gray-200 dark:bg-gray-700 lg:hidden" />
		<FeatureItem>
			<svelte:fragment slot="icon"
				><CalendarMonthSolid
					size="xl"
					class="text-primary-600 dark:text-primary-300"
				/></svelte:fragment
			>
			<svelte:fragment slot="h3">Tugas Tata Tertib</svelte:fragment>
			<svelte:fragment slot="paragraph"
				>Konfirmasi kehadiran tugas tata tertib lingkungan. Jadwal konfirmasi hanya dibuka setiap
				Senin s.d. Kamis.
				<div class="mt-4">
					<Button size="sm" href="/f/tatib">Konfirmasi</Button>
				</div>
			</svelte:fragment>
		</FeatureItem>
		<hr class="my-4 block h-px border-0 bg-gray-200 dark:bg-gray-700 lg:hidden" />
		<FeatureItem>
			<svelte:fragment slot="icon"
				><BookmarkSolid size="xl" class="text-primary-600 dark:text-primary-300" /></svelte:fragment
			>
			<svelte:fragment slot="h3">Petunjuk Pemakaian</svelte:fragment>
			<svelte:fragment slot="paragraph"
				>Aturan, tata cara, dan hal penting lain yang perlu diketahui selama mempergunakan sistem.
				<div class="mt-4">
					<Button size="sm" href="/f/petunjuk">Baca</Button>
				</div>
			</svelte:fragment>
		</FeatureItem>
	</FeatureDefault>
</Section>
