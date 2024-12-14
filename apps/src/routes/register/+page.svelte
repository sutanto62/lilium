<script lang="ts">
	import { Button, Card, Label, Input, P, Alert } from 'flowbite-svelte';
	import { MailBoxOutline } from 'flowbite-svelte-icons';

	let email = '';
	let name = '';
	let lingkungan = '';

	export let data;

	function handleSubmit() {
		// logger.info(`Registration request submitted for ${name} (${email})`);
		// Here you would typically send this data to your backend
		// For now, we'll just log it
	}
</script>

<div class="flex h-screen items-center justify-center">
	<div class="w-full max-w-md">
		<Card class="mx-auto">
			<form on:submit|preventDefault={handleSubmit} class="flex flex-col space-y-6">
				<div class="mb-6 flex items-center justify-center gap-2">
					<img
						src="/images/lily-amongs-thorns.png"
						class="h-12 w-12 sm:h-16 sm:w-16"
						alt="LIS logo"
					/>
					<h2 class="text-xl font-bold sm:text-2xl">Lilium Inter Spinas</h2>
				</div>

				{#if data.error}
					<Alert>
						<span class="font-medium">{data.error}!</span>
					</Alert>
				{/if}

				<Label class="space-y-2">
					<span>Nama</span>
					<Input type="text" bind:value={name} required />
				</Label>

				<Label class="space-y-2">
					<span>Email</span>
					<Input type="email" bind:value={email} required />
				</Label>

				<Label class="space-y-2">
					<span>Wilayah/Lingkungan</span>
					<Input type="text" bind:value={lingkungan} required />
				</Label>

				<Button type="submit">Kirim</Button>
			</form>
		</Card>

		<P class="mt-4 text-center">
			Permohonan pendaftaran Anda akan diperiksa oleh admin. Kami akan segera menghubungi Anda.
		</P>

		<div class="mt-4 flex items-center justify-center gap-2 text-center">
			<MailBoxOutline size="lg" /><span
				><a href="mailto:it.servant@santo-laurensius.org" class="text-blue-600 hover:underline"
					>it.servant@santo-laurensius.org</a
				></span
			>
		</div>
	</div>
</div>
