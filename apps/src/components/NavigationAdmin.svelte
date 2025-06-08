<script lang="ts">
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { SignIn, SignOut } from '@auth/sveltekit/components';
	import { Heading, Navbar, NavBrand, NavHamburger, NavUl } from 'flowbite-svelte';
</script>

<!-- <Navbar color="primary" class="mb-7 py-7 print:hidden" fluid={true} id="navadmin"> -->
<Navbar
	class="fixed start-0 top-0 z-20 w-full border-b bg-primary-100 px-2 py-2.5 dark:bg-primary-700 sm:px-4"
>
	<div class="flex items-center gap-4">
		<a href="/">
			<img
				src={env.PUBLIC_SITE_LOGO || '/images/lily-amongs-thorns.png'}
				class="size-16"
				alt="{env.PUBLIC_SITE_TITLE || 'Lilium Inter Spinas'} logo"
			/>
		</a>
		<NavBrand class="flex items-center gap-4 no-underline">
			<div class="flex flex-col">
				<Heading tag="h4" class="mb-0">
					{env.PUBLIC_SITE_TITLE || 'Lilium Inter Spinas'}
				</Heading>
				<span class="text-sm text-gray-600 dark:text-gray-300">
					{env.PUBLIC_SITE_SUB_TITLE || 'Sistem Informasi Gereja'}
				</span>
			</div>
		</NavBrand>
		<NavHamburger />
	</div>
	<NavUl class="order-1">
		{#if $page.data.session}
			<span class="signedInText mr-2">
				{$page.data.session.user?.email ?? $page.data.session.user?.name} ({$page.data.session.user
					?.role})
			</span>

			<SignOut options={{ redirectTo: `/` }}>
				<div slot="submitButton" class="buttonPrimary">Keluar</div>
			</SignOut>
		{:else}
			<SignIn>
				<div slot="submitButton" class="buttonPrimary">Masuk</div>
			</SignIn>
		{/if}
	</NavUl>
</Navbar>
