<script lang="ts">
	import { page } from '$app/state';

	const menuItems = [
		{ label: 'Misa', href: '/admin/settings/data-misa' },
		{ label: 'Zona', href: '/admin/settings/data-zona' },
		{ label: 'Group Zona', href: '/admin/settings/data-zona-group' },
		{ label: 'Posisi', href: '/admin/settings/data-posisi' },
		{ label: 'Zona Misa', href: '/admin/settings/data-zona-misa' }
	];

	function isActive(href: string): boolean {
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="flex gap-6">
	<aside class="w-56 flex-shrink-0">
		<nav class="sticky top-24 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
			<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
				<span class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pengaturan</span>
			</div>
			<ul class="p-2">
				{#each menuItems as item}
					<li>
						<a
							href={item.href}
							class="flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive(item.href)
								? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
								: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>

	<div class="min-w-0 flex-1">
		<slot />
	</div>
</div>
