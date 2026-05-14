<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	const menuItems = [
		{ label: 'Misa', href: '/admin/settings/data-misa' },
		{ label: 'Zona', href: '/admin/settings/data-zona' },
		{ label: 'Group Zona', href: '/admin/settings/data-zona-group' },
		{ label: 'Posisi', href: '/admin/settings/data-posisi' },
		{ label: 'Zona Misa', href: '/admin/settings/data-zona-misa' }
	];

	// Parent admin layout provides featurePreference and session
	const { data, children } = $props<{
		data: import('./$types').LayoutData;
		children: import('svelte').Snippet;
	}>();

	const isAdmin = $derived(data.session?.user?.role === 'admin');
	const featurePreference = $derived(data.featurePreference);
	const isOptedIn = $derived(featurePreference === 'new_domain');

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

			{#if isAdmin}
				<div class="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
					<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
						Fitur Baru
					</p>
					<form
						method="POST"
						action="/admin/settings?/updateFeaturePreference"
						use:enhance
					>
						<input
							type="hidden"
							name="preference"
							value={isOptedIn ? '' : 'new_domain'}
						/>
						<button
							type="submit"
							class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
							title={isOptedIn ? 'Nonaktifkan arsitektur domain baru' : 'Aktifkan arsitektur domain baru'}
						>
							<!-- Toggle indicator -->
							<span
								class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors {isOptedIn
									? 'bg-primary-600'
									: 'bg-gray-300 dark:bg-gray-600'}"
							>
								<span
									class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform {isOptedIn
										? 'translate-x-4'
										: 'translate-x-1'}"
								></span>
							</span>
							<span class="text-xs">Domain Baru</span>
						</button>
					</form>
				</div>
			{/if}
		</nav>
	</aside>

	<div class="min-w-0 flex-1">
		{@render children()}
	</div>
</div>
