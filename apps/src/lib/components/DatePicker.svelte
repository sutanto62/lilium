<script lang="ts">
	import type { DatepickerProps } from 'flowbite-svelte';
	import { Datepicker } from 'flowbite-svelte';

	export let value: Date | undefined = undefined;
	export let placeholder = 'Pilih tanggal';
	export let color: DatepickerProps['color'] = 'green';
	export let locale = 'id';
</script>

<Datepicker
	dateFormat={{
		dateStyle: 'medium'
	}}
	{placeholder}
	{locale}
	bind:value
	{color}
/>
