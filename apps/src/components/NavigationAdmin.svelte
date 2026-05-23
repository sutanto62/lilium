<script lang="ts">
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { SignOut } from '@auth/sveltekit/components';
	import { themeStore } from '$lib/utils/themeStore';
	import { MoonSolid, SunSolid, CogOutline } from 'flowbite-svelte-icons';

	let isDropdownOpen = $state(false);
	let isBottomSheetOpen = $state(false);

	const session = $derived.by(() => $page.data.session);

	const userInitials = $derived.by(() => {
		const name = session?.user?.name ?? '';
		return name
			.split(' ')
			.map((part) => part.charAt(0).toUpperCase())
			.join('')
			.slice(0, 2);
	});

	const userEmail = $derived.by(() => session?.user?.email ?? '');
	const userName = $derived.by(() => session?.user?.name ?? 'User');
	const userImage = $derived.by(() => {
		const user = session?.user as Record<string, unknown> | undefined;
		return typeof user?.image === 'string' ? user.image : null;
	});

	$effect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (
				!target.closest('[data-dropdown-trigger]') &&
				!target.closest('[data-dropdown-menu]')
			) {
				isDropdownOpen = false;
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				isDropdownOpen = false;
				isBottomSheetOpen = false;
			}
		};

		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	});

	const toggleTheme = () => {
		themeStore.toggle();
	};

	const closeMenus = () => {
		isDropdownOpen = false;
		isBottomSheetOpen = false;
	};
</script>

{#snippet avatar(size: string)}
	{#if userImage}
		<img src={userImage} alt={userName} class="{size} rounded-full object-cover" />
	{:else}
		<div
			class="flex {size} items-center justify-center rounded-full bg-green-500 font-semibold text-white"
		>
			{userInitials}
		</div>
	{/if}
{/snippet}

<nav
	class="fixed start-0 top-0 z-20 w-full border-b bg-white px-2 py-2.5 dark:border-gray-700 dark:bg-gray-800 sm:px-4"
>
	<div class="flex items-center justify-between">
		<!-- Left: Logo and title -->
		<a href="/" class="flex items-center gap-4">
			<img
				src={env.PUBLIC_SITE_LOGO || '/images/lily-amongs-thorns.png'}
				class="size-10"
				alt="{env.PUBLIC_SITE_TITLE || 'Lilium Inter Spinas'} logo"
			/>
			<div class="hidden flex-col sm:flex">
				<h4 class="text-sm font-bold dark:text-white">
					{env.PUBLIC_SITE_TITLE || 'Lilium Inter Spinas'}
				</h4>
				<span class="text-xs text-gray-600 dark:text-gray-400">
					{env.PUBLIC_SITE_SUB_TITLE || 'Sistem Informasi Gereja'}
				</span>
			</div>
		</a>

		<!-- Right: User menu -->
		{#if session}
			<!-- Desktop Dropdown -->
			<div class="hidden items-center md:flex">
				<button
					data-dropdown-trigger
					onclick={() => (isDropdownOpen = !isDropdownOpen)}
					class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
					aria-label="User menu"
					aria-expanded={isDropdownOpen}
				>
					{@render avatar('h-9 w-9')}
					<span class="hidden lg:inline">{userName}</span>
					<svg
						class="h-4 w-4 transition-transform {isDropdownOpen ? 'rotate-180' : ''}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						></path>
					</svg>
				</button>

				<!-- Dropdown Menu -->
				{#if isDropdownOpen}
					<div
						data-dropdown-menu
						class="absolute right-4 top-14 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
						role="menu"
						aria-orientation="vertical"
					>
						<!-- Profile Section -->
						<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-600">
							<div class="flex items-center gap-3">
								{@render avatar('h-10 w-10')}
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium text-gray-900 dark:text-white">
										{userName}
									</p>
									<p class="truncate text-xs text-gray-500 dark:text-gray-400">
										{userEmail}
									</p>
								</div>
							</div>
						</div>

						<!-- Menu Items -->
						<div class="py-2">
							<button
								onclick={toggleTheme}
								class="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
								role="menuitem"
							>
								{#if $themeStore === 'dark'}
									<SunSolid class="h-4 w-4" />
									<span>Light mode</span>
								{:else}
									<MoonSolid class="h-4 w-4" />
									<span>Dark mode</span>
								{/if}
							</button>

							<a
								href="/admin/settings"
								onclick={closeMenus}
								class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
								role="menuitem"
							>
								<CogOutline class="h-4 w-4" />
								<span>Settings</span>
							</a>
						</div>

						<!-- Sign Out -->
						<div class="border-t border-gray-200 px-4 py-2 dark:border-gray-600">
							<SignOut options={{ redirectTo: '/' }}>
								<button
									slot="submitButton"
									class="w-full text-left text-sm font-medium text-red-600 hover:bg-red-50 px-0 py-2 dark:text-red-400 dark:hover:bg-red-900 dark:hover:bg-opacity-20"
									role="menuitem"
									onclick={closeMenus}
								>
									Log out
								</button>
							</SignOut>
						</div>
					</div>
				{/if}
			</div>

			<!-- Mobile Menu Button -->
			<button
				onclick={() => (isBottomSheetOpen = !isBottomSheetOpen)}
				class="md:hidden"
				aria-label="Open menu"
				aria-expanded={isBottomSheetOpen}
			>
				{@render avatar('h-10 w-10')}
			</button>
		{:else}
			<a
				href="/signin"
				class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
			>
				Masuk
			</a>
		{/if}
	</div>
</nav>

<!-- Mobile Bottom Sheet -->
{#if isBottomSheetOpen && session}
	<button
		onclick={() => (isBottomSheetOpen = false)}
		aria-label="Close menu"
		class="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
		style="border: none; padding: 0; background: rgba(0, 0, 0, 0.5);"
	></button>

	<div
		class="fixed bottom-0 left-0 right-0 z-40 rounded-t-lg border-t border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800 md:hidden"
		role="menu"
		aria-orientation="vertical"
	>
		<div class="border-b border-gray-200 px-4 py-4 dark:border-gray-600">
			<div class="flex items-center gap-3">
				{@render avatar('h-12 w-12')}
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
						{userName}
					</p>
					<p class="truncate text-xs text-gray-500 dark:text-gray-400">
						{userEmail}
					</p>
				</div>
			</div>
		</div>

		<div class="px-4 py-2">
			<button
				onclick={toggleTheme}
				class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
				role="menuitem"
			>
				{#if $themeStore === 'dark'}
					<SunSolid class="h-5 w-5" />
					<span>Light mode</span>
				{:else}
					<MoonSolid class="h-5 w-5" />
					<span>Dark mode</span>
				{/if}
			</button>

			<a
				href="/admin/settings"
				onclick={closeMenus}
				class="flex items-center gap-3 rounded-lg px-3 py-3 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
				role="menuitem"
			>
				<CogOutline class="h-5 w-5" />
				<span>Settings</span>
			</a>
		</div>

		<div class="border-t border-gray-200 px-4 py-3 dark:border-gray-600">
			<SignOut options={{ redirectTo: '/' }}>
				<button
					slot="submitButton"
					class="w-full text-left text-sm font-semibold text-red-600 hover:bg-red-50 px-3 py-3 rounded-lg dark:text-red-400 dark:hover:bg-red-900 dark:hover:bg-opacity-20"
					role="menuitem"
					onclick={closeMenus}
				>
					Log out
				</button>
			</SignOut>
		</div>
	</div>
{/if}
