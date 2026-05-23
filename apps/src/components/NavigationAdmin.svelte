<script lang="ts">
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { SignOut } from '@auth/sveltekit/components';
	import { themeStore } from '$lib/utils/themeStore';
	import { MoonSolid, SunSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';

	let isDropdownOpen = $state(false);
	let isBottomSheetOpen = $state(false);
	let isMobile = $state(false);
	let currentTheme = $state<'light' | 'dark'>('light');

	const session = $derived.by(() => $page.data.session);

	// Get user initials
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
	const userImage = $derived.by(() => (session?.user as any)?.image ?? null);

	onMount(() => {
		// Subscribe to theme store changes
		const unsubscribe = themeStore.subscribe((newTheme) => {
			currentTheme = newTheme;
		});

		// Check if mobile on mount
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);

		// Close dropdown on outside click
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (
				!target.closest('[data-dropdown-trigger]') &&
				!target.closest('[data-dropdown-menu]')
			) {
				isDropdownOpen = false;
			}
		};

		document.addEventListener('click', handleClickOutside);

		// Close dropdown on Escape
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				isDropdownOpen = false;
				isBottomSheetOpen = false;
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			unsubscribe();
			window.removeEventListener('resize', checkMobile);
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
					<!-- Avatar -->
					{#if userImage}
						<img
							src={userImage}
							alt={userName}
							class="h-9 w-9 rounded-full object-cover"
						/>
					{:else}
						<div
							class="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 font-semibold text-white"
						>
							{userInitials}
						</div>
					{/if}
					<span class="hidden lg:inline">{userName}</span>
					<svg
						class="h-4 w-4 transition-transform {isDropdownOpen ? 'rotate-180' : ''}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"
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
								{#if userImage}
									<img
										src={userImage}
										alt={userName}
										class="h-10 w-10 rounded-full object-cover"
									/>
								{:else}
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 font-semibold text-white"
									>
										{userInitials}
									</div>
								{/if}
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
							<!-- Theme Toggle -->
							<button
								onclick={toggleTheme}
								class="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
								role="menuitem"
							>
								{#if currentTheme === 'dark'}
									<SunSolid class="h-4 w-4" />
									<span>Light mode</span>
								{:else}
									<MoonSolid class="h-4 w-4" />
									<span>Dark mode</span>
								{/if}
							</button>

							<!-- Settings -->
							<a
								href="/admin/settings"
								onclick={closeMenus}
								class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
								role="menuitem"
							>
								<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 8.59l.94-2.82h2.97l-2.41 1.75.94 2.82-2.44-1.76zm0 0L11.06 5.77H8.09l2.41 1.75-.94 2.82 2.44-1.75z" /><path d="M19.86 13.95a6.75 6.75 0 0 0 .05-.95 6.75 6.75 0 0 0-.05-.95l1.69-1.31c.15-.12.19-.33.1-.51l-1.6-2.77c-.1-.16-.31-.2-.49-.1l-1.99 1.58a6.71 6.71 0 0 0-1.64-.95l-.3-2.1c-.02-.2-.19-.35-.4-.35h-3.2c-.21 0-.39.15-.4.35l-.3 2.1c-.59.23-1.13.57-1.64.95l-1.99-1.58c-.18-.1-.39-.05-.49.1l-1.6 2.77c-.1.16-.05.39.1.51l1.69 1.31a6.75 6.75 0 0 0-.05.95c0 .32.02.63.05.95l-1.69 1.31c-.15.12-.19.33-.1.51l1.6 2.77c.1.16.31.2.49.1l1.99-1.58c.51.37 1.05.72 1.64.95l.3 2.1c.02.2.19.35.4.35h3.2c.21 0 .39-.15.4-.35l.3-2.1c.59-.23 1.13-.57 1.64-.95l1.99 1.58c.18.1.39.05.49-.1l1.6-2.77c.1-.16.05-.39-.1-.51l-1.69-1.31zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
								</svg>
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
				{#if userImage}
					<img
						src={userImage}
						alt={userName}
						class="h-10 w-10 rounded-full object-cover"
					/>
				{:else}
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 font-semibold text-white">
						{userInitials}
					</div>
				{/if}
			</button>
		{:else}
			<!-- Sign In -->
			<a href="/signin" class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
				Masuk
			</a>
		{/if}
	</div>
</nav>

<!-- Mobile Bottom Sheet -->
{#if isBottomSheetOpen && session}
	<!-- Backdrop -->
	<button
		onclick={() => (isBottomSheetOpen = false)}
		aria-label="Close menu"
		class="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
		style="border: none; padding: 0; background: rgba(0, 0, 0, 0.5);"
	></button>

	<!-- Bottom Sheet -->
	<div
		class="fixed bottom-0 left-0 right-0 z-40 rounded-t-lg border-t border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800 md:hidden"
		role="menu"
		aria-orientation="vertical"
	>
		<!-- Header -->
		<div class="border-b border-gray-200 px-4 py-4 dark:border-gray-600">
			<div class="flex items-center gap-3">
				{#if userImage}
					<img
						src={userImage}
						alt={userName}
						class="h-12 w-12 rounded-full object-cover"
					/>
				{:else}
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 font-semibold text-white"
					>
						{userInitials}
					</div>
				{/if}
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

		<!-- Menu Items -->
		<div class="px-4 py-2">
			<!-- Theme Toggle -->
			<button
				onclick={toggleTheme}
				class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
				role="menuitem"
			>
				{#if currentTheme === 'dark'}
					<SunSolid class="h-5 w-5" />
					<span>Light mode</span>
				{:else}
					<MoonSolid class="h-5 w-5" />
					<span>Dark mode</span>
				{/if}
			</button>

			<!-- Settings -->
			<a
				href="/admin/settings"
				onclick={closeMenus}
				class="flex items-center gap-3 rounded-lg px-3 py-3 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
				role="menuitem"
			>
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12 8.59l.94-2.82h2.97l-2.41 1.75.94 2.82-2.44-1.76zm0 0L11.06 5.77H8.09l2.41 1.75-.94 2.82 2.44-1.75z" /><path d="M19.86 13.95a6.75 6.75 0 0 0 .05-.95 6.75 6.75 0 0 0-.05-.95l1.69-1.31c.15-.12.19-.33.1-.51l-1.6-2.77c-.1-.16-.31-.2-.49-.1l-1.99 1.58a6.71 6.71 0 0 0-1.64-.95l-.3-2.1c-.02-.2-.19-.35-.4-.35h-3.2c-.21 0-.39.15-.4.35l-.3 2.1c-.59.23-1.13.57-1.64.95l-1.99-1.58c-.18-.1-.39-.05-.49.1l-1.6 2.77c-.1.16-.05.39.1.51l1.69 1.31a6.75 6.75 0 0 0-.05.95c0 .32.02.63.05.95l-1.69 1.31c-.15.12-.19.33-.1.51l1.6 2.77c.1.16.31.2.49.1l1.99-1.58c.51.37 1.05.72 1.64.95l.3 2.1c.02.2.19.35.4.35h3.2c.21 0 .39-.15.4-.35l-.3-2.1c.59-.23 1.13-.57 1.64-.95l1.99 1.58c.18.1.39.05.49-.1l1.6-2.77c.1-.16.05-.39-.1-.51l-1.69-1.31zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
				</svg>
				<span>Settings</span>
			</a>
		</div>

		<!-- Sign Out -->
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
