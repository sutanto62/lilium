<script lang="ts">
	import { Navbar, NavBrand, NavUl, NavLi, NavHamburger } from 'flowbite-svelte';
	import { page } from '$app/stores';
	import { SignIn, SignOut } from '@auth/sveltekit/components';
</script>

<Navbar color="primary" class="mb-7 py-7 print:hidden" fluid={true} id="navadmin">
	<div class="container flex justify-between sm:px-0 md:px-3">
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
				<span class="signedInText">
					{$page.data.session.user?.email ?? $page.data.session.user?.name} ({$page.data.session
						.user?.role})
				</span>
				<NavLi class="text-l">
					<SignOut options={{ redirectTo: `/` }}>
						<div slot="submitButton" class="buttonPrimary">Keluar</div>
					</SignOut>
				</NavLi>
			{:else}
				<!-- <span class="notSignedInText">You are not signed in</span> -->
				<NavLi class="text-l">
					<SignIn>
						<div slot="submitButton">Masuk</div>
					</SignIn>
				</NavLi>
			{/if}
		</NavUl>
	</div>
</Navbar>
