<script lang="ts">
	import type { Section, Zone, Station } from '$core/entities/Facility';
	import { Breadcrumb, BreadcrumbItem, Badge, Heading } from 'flowbite-svelte';

	let { data } = $props();

	const facility = $derived(data.facility);

	// Deserialise Maps sent from the server (SvelteKit serialises Map → [entries])
	const zonesBySection = $derived(new Map(facility.zonesBySection));
	const stationsByZone = $derived(new Map(facility.stationsByZone));

	function zonesFor(section: Section): Zone[] {
		return (zonesBySection.get(section.id) ?? []) as Zone[];
	}

	function stationsFor(zone: Zone): Station[] {
		return (stationsByZone.get(zone.id) ?? []) as Station[];
	}
</script>

<svelte:head>
	<title>Zona &amp; Misa</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/" home>Beranda</BreadcrumbItem>
	<BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
	<BreadcrumbItem>Zona</BreadcrumbItem>
</Breadcrumb>

<Heading tag="h1" class="mb-6 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
	{facility.church.name} — Hierarki Fasilitas
</Heading>

{#if facility.sections.length === 0}
	<p class="text-gray-500">Belum ada seksi yang terdaftar. Tambahkan seksi melalui halaman Pengaturan → Seksi.</p>
{:else}
	<div class="flex flex-col gap-6">
		{#each facility.sections as section (section.id)}
			<div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
				<!-- Section header -->
				<div class="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
					<Badge color="blue" class="shrink-0">{section.code ?? 'S'}</Badge>
					<span class="font-semibold text-gray-900 dark:text-white">{section.name}</span>
					{#if section.description}
						<span class="text-sm text-gray-500">— {section.description}</span>
					{/if}
				</div>

				<!-- Zones under this section -->
				{#if zonesFor(section).length === 0}
					<p class="px-4 py-3 text-sm text-gray-400">Belum ada zona dalam seksi ini.</p>
				{:else}
					<div class="divide-y divide-gray-100 dark:divide-gray-700">
						{#each zonesFor(section) as zone (zone.id)}
							<div class="px-4 py-3">
								<div class="mb-2 flex items-center gap-2">
									<Badge color="green" class="shrink-0">{zone.code ?? 'Z'}</Badge>
									<span class="font-medium text-gray-800 dark:text-gray-200">{zone.name}</span>
								</div>

								<!-- Stations under this zone -->
								{#if stationsFor(zone).length === 0}
									<p class="pl-8 text-sm text-gray-400">Belum ada pos dalam zona ini.</p>
								{:else}
									<ul class="pl-8 text-sm text-gray-600 dark:text-gray-400">
										{#each stationsFor(zone) as station (station.id)}
											<li class="flex items-center gap-2 py-0.5">
												<span class="font-mono text-xs text-gray-400">{station.code ?? '—'}</span>
												<span>{station.name}</span>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<!-- Zones without a section (sectionId = null) -->
{#if zonesBySection.has('__none__')}
	<div class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
			<span class="font-semibold text-gray-900 dark:text-white">Zona tanpa seksi</span>
		</div>
		<div class="divide-y divide-gray-100 dark:divide-gray-700">
			{#each (zonesBySection.get('__none__') ?? []) as zone (zone.id)}
				<div class="px-4 py-3">
					<div class="mb-2 flex items-center gap-2">
						<Badge color="green" class="shrink-0">{zone.code ?? 'Z'}</Badge>
						<span class="font-medium text-gray-800 dark:text-gray-200">{zone.name}</span>
					</div>
					{#if stationsFor(zone).length === 0}
						<p class="pl-8 text-sm text-gray-400">Belum ada pos dalam zona ini.</p>
					{:else}
						<ul class="pl-8 text-sm text-gray-600 dark:text-gray-400">
							{#each stationsFor(zone) as station (station.id)}
								<li class="flex items-center gap-2 py-0.5">
									<span class="font-mono text-xs text-gray-400">{station.code ?? '—'}</span>
									<span>{station.name}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
