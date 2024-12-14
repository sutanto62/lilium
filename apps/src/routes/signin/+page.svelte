<script lang="ts">
	import type { PageData } from './$types';
	import SigninProvider from './SigninProvider.svelte';
	import { Card } from 'flowbite-svelte';
	import { MailBoxOutline } from 'flowbite-svelte-icons';

	export let data: PageData;
</script>

<div class="flex h-screen items-center justify-center">
	<div class="w-full max-w-md">
		<Card class="mx-auto">
			<div class="mb-6 flex items-center justify-center gap-2">
				<a href="/">
					<img
						src="/images/lily-amongs-thorns.png"
						class="h-12 w-12 sm:h-16 sm:w-16"
						alt="LIS logo"
					/></a
				>
				<h2 class="text-xl font-bold sm:text-2xl">Lilium Inter Spinas</h2>
			</div>
			<div class="flex w-full flex-col items-center justify-center gap-4">
				{#each data.providers as provider}
					<SigninProvider {provider} />
				{/each}
			</div>
		</Card>
		<p class="mt-4 text-center">
			Anda harus telah terdaftar sebelumnya. Jika belum, silakan <a
				href="/register"
				class="text-blue-600 hover:underline">daftar di sini</a
			>.
		</p>
		<div class="mt-4 flex items-center justify-center gap-2 text-center">
			<MailBoxOutline size="lg" /><span
				><a href="mailto:it.servant@santo-laurensius.org" class="text-blue-600 hover:underline"
					>it.servant@santo-laurensius.org</a
				></span
			>
		</div>
	</div>
</div>
