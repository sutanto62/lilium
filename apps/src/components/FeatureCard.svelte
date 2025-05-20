<script lang="ts">
	import { Button, Card } from 'flowbite-svelte';

	export let title: string;
	export let description: string;
	export let buttonHref: string;
	export let buttonText: string;
	export let buttonColor:
		| 'red'
		| 'yellow'
		| 'green'
		| 'purple'
		| 'blue'
		| 'light'
		| 'dark'
		| 'primary'
		| 'alternative'
		| 'secondary'
		| 'gray'
		| 'orange'
		| 'amber'
		| 'lime'
		| 'emerald'
		| 'teal'
		| 'cyan' = 'primary';
</script>

<Card class="p-4 sm:p-6 md:p-8">
	<h5 class="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h5>
	<p class="mb-3 font-normal leading-tight text-gray-700 dark:text-gray-400">
		{description}
	</p>
	<Button class="w-fit" href={buttonHref} color={buttonColor}>{buttonText}</Button>
</Card>
