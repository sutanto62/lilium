<script lang="ts">
	import type { Usher } from '$core/entities/Schedule';

	let { ushers = $bindable<Usher[]>([]) } = $props<{
		ushers?: Usher[];
	}>();
</script>

<span class="flex gap-2">
	<button
		type="button"
		class="text-gray-100 hover:text-black"
		onclick={() => {
			ushers = [
				{ name: 'Satu', isPpg: false, isKolekte: true, sequence: 0 },
				{ name: 'Dua', isPpg: false, isKolekte: true, sequence: 1 },
				{ name: 'Tiga', isPpg: false, isKolekte: true, sequence: 2 },
				{ name: 'Empat', isPpg: true, isKolekte: false, sequence: 3 },
				{ name: 'Lima', isPpg: true, isKolekte: false, sequence: 4 },
				{ name: 'Enam', isPpg: false, isKolekte: false, sequence: 5 }
			];
		}}>&#960;</button
	>
	<button
		type="button"
		class="text-gray-100 hover:text-black"
		onclick={() => {
			ushers = [
				{ name: 'Satu', isPpg: false, isKolekte: true, sequence: 0 },
				{ name: 'Dua', isPpg: false, isKolekte: true, sequence: 1 },
				{ name: 'Tiga', isPpg: false, isKolekte: true, sequence: 2 },
				{ name: 'Empat', isPpg: true, isKolekte: false, sequence: 3 },
				{ name: 'Lima', isPpg: true, isKolekte: false, sequence: 4 },
				{ name: 'Enam', isPpg: false, isKolekte: false, sequence: 5 },
				{ name: 'Tujuh', isPpg: false, isKolekte: false, sequence: 6 },
				{ name: 'Delapan', isPpg: false, isKolekte: false, sequence: 7 }
			];
		}}>&#937;</button
	>
</span>
