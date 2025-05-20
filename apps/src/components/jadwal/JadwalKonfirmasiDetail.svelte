<script lang="ts" context="module">
	declare const window: Window & typeof globalThis;
</script>

<script lang="ts">
	import { Button, Card } from 'flowbite-svelte';
	import { ArchiveSolid, CashSolid, DownloadSolid } from 'flowbite-svelte-icons';
	import html2canvas from 'html2canvas';

	export let lingkungan: any;

	function captureSnapshot(): void {
		if (typeof window !== 'undefined') {
			const cardToCapture = window.document.getElementById(cardId);
			if (cardToCapture) {
				html2canvas(cardToCapture).then((canvas) => {
					const image = canvas.toDataURL('image/png');
					const link = window.document.createElement('a');
					link.href = image;
					link.download = `tatib_${lingkungan.lingkungan}_${lingkungan.zone}.png`;
					link.click();
				});
			}
		}
	}

	$: cardId = `card-${lingkungan.lingkungan}-${lingkungan.zone}`;
</script>

<Card shadow="sm" id={cardId} class="bg-gray-50 p-2 text-black">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold">{lingkungan.name}</h1>
			<h3 class="text-sm font-light">Zona {lingkungan.zone}</h3>
		</div>
		<div>
			<Button
				class="flex items-center justify-center rounded-full bg-gray-200 p-2 text-gray-600 hover:bg-gray-300"
				onclick={captureSnapshot}
				id=""
			>
				<DownloadSolid class="size-4" />
			</Button>
		</div>
	</div>
	<div class="mt-2">
		<table class="w-full border-collapse text-left">
			<thead>
				<tr class="h-8 border-b border-t border-gray-200">
					<th class="text-sm font-semibold">Nama</th>
					<th class="text-right text-sm font-semibold">Posisi</th>
				</tr>
			</thead>
			<tbody>
				{#each lingkungan.ushers as usher}
					<tr>
						<td class="text-sm font-light">{usher.name}</td>
						<td class="flex items-center justify-end text-right text-sm font-light">
							{#if usher.isPpg}
								<ArchiveSolid class="mr-1 size-4 text-orange-300" />
							{:else if usher.isKolekte}
								<CashSolid class="mr-1 size-4 text-orange-300" />
							{/if}
							<span>{usher.position}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
