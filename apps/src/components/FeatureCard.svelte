<script lang="ts">
	import { Button, P } from 'flowbite-svelte';
	import { FeatureItem } from 'flowbite-svelte-blocks';
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let title: string;
	export let description: string;
	export let buttonHref: string;
	export let buttonText: string = 'Kelola'; // default value
	export let buttonColor:
		| 'red'
		| 'yellow'
		| 'green'
		| 'purple'
		| 'blue'
		| 'light'
		| 'dark'
		| 'primary'
		| 'none'
		| 'alternative' = 'primary';
</script>

<hr class="my-4 block h-px border-0 bg-gray-200 dark:bg-gray-700 lg:hidden" />
<FeatureItem>
	<svelte:fragment slot="icon">
		<svelte:component this={icon} size="xl" class="text-primary-600 dark:text-primary-300" />
	</svelte:fragment>
	<svelte:fragment slot="h3">{title}</svelte:fragment>
	<svelte:fragment slot="paragraph">
		<P size="sm">{description}</P>
		<div class="mt-4">
			<Button size="sm" href={buttonHref} color={buttonColor}>{buttonText}</Button>
		</div>
	</svelte:fragment>
</FeatureItem>
