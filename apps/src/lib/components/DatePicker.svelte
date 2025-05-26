<script lang="ts">
	import type { DatepickerProps } from 'flowbite-svelte';
	import { Datepicker } from 'flowbite-svelte';

	export let value: Date | undefined = undefined;
	export let placeholder = 'Pilih tanggal';
	export let color: DatepickerProps['color'] = 'green';
	export let locale = 'id';
	export let required = false;
	export let onselect: ((date: Date | { from?: Date; to?: Date }) => void) | undefined = undefined;
</script>

<!-- Wrap the datepicker to accommodate default format for local -->
<Datepicker
	dateFormat={{
		dateStyle: 'medium'
	}}
	{placeholder}
	{locale}
	bind:value
	{color}
	{required}
	{onselect}
/>
