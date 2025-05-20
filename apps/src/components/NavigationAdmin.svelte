<script lang="ts">
	import { page } from '$app/stores';
	import { SignIn, SignOut } from '@auth/sveltekit/components';
	import { Navbar, NavBrand, NavHamburger, NavUl } from 'flowbite-svelte';
</script>

<div class="relative px-8">
	<!-- <Navbar color="primary" class="mb-7 py-7 print:hidden" fluid={true} id="navadmin"> -->
	<Navbar
		class="fixed start-0 top-0 z-20 w-full border-b bg-primary-100 px-2 py-2.5 dark:bg-primary-700 sm:px-4"
	>
		<NavBrand href="/">
			<!-- Kidung Agung 2:2 -->
			<img src="/images/lily-amongs-thorns.png" class="size-16" alt="LIS logo" />
			<span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white"
				>Lilium Inter Spinas</span
			>
		</NavBrand>
		<NavHamburger />
		<NavUl class="order-1">
			{#if $page.data.session}
				<span class="signedInText mr-2">
					{$page.data.session.user?.email ?? $page.data.session.user?.name} ({$page.data.session
						.user?.role})
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
</div>
