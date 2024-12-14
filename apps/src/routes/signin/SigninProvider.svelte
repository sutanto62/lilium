<script lang="ts">
	import { SignIn } from '@auth/sveltekit/components';
	import { Button } from 'flowbite-svelte';

	type ProviderResponse = {
		id: string;
		name: string;
	};

	export let provider: ProviderResponse;

	const PROVIDER_ICONS = {
		google: '/images/sso_google.png',
		'microsoft-entra-id': '/images/sso_microsoft.png'
	} as const;

	const PROVIDER_NAMES = {
		'microsoft-entra-id': 'Email St. Laurensius',
		google: 'Google'
	} as const;

	function getProviderIcon(providerId: string): string {
		const id = providerId.toLowerCase();
		return PROVIDER_ICONS[id as keyof typeof PROVIDER_ICONS] || '';
	}

	function mapProviderName(providerId: string): string {
		const id = providerId.toLowerCase();
		return PROVIDER_NAMES[id as keyof typeof PROVIDER_NAMES] || '';
	}
</script>

<Button class="w-full">
	<SignIn provider={provider.id} className="w-full">
		<div slot="submitButton" class="flex w-full items-center">
			<div class="mr-2 flex-shrink-0">
				<img src={getProviderIcon(provider.id)} alt={`${provider.name} icon`} class="h-6 w-6" />
			</div>
			<span class="flex-gro text-center">
				{mapProviderName(provider.id)}
			</span>
		</div>
	</SignIn>
</Button>
