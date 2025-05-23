<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { MailBoxOutline } from 'flowbite-svelte-icons';
	import type { PageData } from './$types';
	import SigninProvider from './SigninProvider.svelte';

	export let data: PageData;
</script>

<main class="mx-auto min-h-screen bg-gray-50 dark:bg-gray-900">
	<div class="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
		<div class="w-full max-w-md">
			<Card class="mx-auto py-4 shadow-lg">
				<div class="mb-8 flex items-center justify-center gap-3">
					<a href="/" class="transition-transform hover:scale-105">
						<img
							src="/images/lily-amongs-thorns.png"
							class="h-12 w-12 sm:h-16 sm:w-16"
							alt="LIS logo"
						/>
					</a>
					<h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
						Lilium Inter Spinas
					</h1>
				</div>
				<div class="flex w-full flex-col items-center justify-center gap-4">
					{#each data.providers as provider}
						<SigninProvider {provider} />
					{/each}
				</div>
			</Card>
			<p class="mt-6 text-center text-gray-600 dark:text-gray-400">
				Anda harus telah terdaftar sebelumnya. Jika belum, silakan
				<a
					href="/register"
					class="font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-500 dark:hover:text-blue-400"
				>
					daftar di sini
				</a>.
			</p>
			<div
				class="mt-4 flex items-center justify-center gap-2 text-center text-gray-600 dark:text-gray-400"
			>
				<MailBoxOutline size="lg" />
				<a
					href="mailto:it.servant@santo-laurensius.org"
					class="font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-500 dark:hover:text-blue-400"
				>
					it.servant@santo-laurensius.org
				</a>
			</div>
		</div>
	</div>
</main>
