<!-- <script lang="ts" context="module">
	declare const window: Window & typeof globalThis;
</script> -->

<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { statsigService } from '$src/lib/application/StatsigService.js';
	import { tracker } from '$src/lib/utils/analytics';
	import { formatDate } from '$src/lib/utils/dateUtils';
	import { Button, Card, P, Toast } from 'flowbite-svelte';
	import {
		ArchiveSolid,
		CashSolid,
		DownloadSolid,
		ExclamationCircleSolid,
		TrashBinOutline
	} from 'flowbite-svelte-icons';
	const { lingkungan } = $props();

	let isDeleteConfirmation = $state(false);
	let isSubmitting = $state(false);

	const cardId = $derived(`card-${lingkungan.lingkungan}-${lingkungan.zone}`);

	const createdAt = $derived(lingkungan.ushers[0]?.createdAt ?? null);
	const submitted = $derived(
		createdAt ? formatDate(createdAt, 'datetime', 'id-ID', 'Asia/Jakarta') : '—'
	);

	async function captureSnapshot(): Promise<void> {
		if (typeof window !== 'undefined') {
			const cardToCapture = window.document.getElementById(cardId);
			if (cardToCapture) {
				const { default: html2canvas } = await import('html2canvas');
				const canvas = await html2canvas(cardToCapture);
				const image = canvas.toDataURL('image/png');
				const link = window.document.createElement('a');
				link.href = image;
				link.download = `tatib_${lingkungan.lingkungan}_${lingkungan.zone}.png`;
				link.click();

				const metadata = {
					lingkungan_id: lingkungan.id,
					lingkungan_name: lingkungan.name,
					zone: lingkungan.zone,
					usher_count: lingkungan.ushers.length
				};
				await Promise.all([
					statsigService.logEvent('admin_jadwal_detail_snapshot_download', 'click', page.data.session || undefined, metadata),
					tracker.track('admin_jadwal_detail_snapshot_download', { event_type: 'snapshot_download', ...metadata }, page.data.session, page)
				]).catch(() => {});
			}
		}
	}
</script>

<Card shadow="sm" id={cardId} class="flex h-full flex-col bg-gray-50 p-2 text-black">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold">{lingkungan.name}</h1>
			<h3 class="text-sm font-light">{lingkungan.wilayah}</h3>
			<h3 class="text-sm font-light">Zona {lingkungan.zone}</h3>
		</div>
		<div class="flex items-center gap-2">
			<Button
				class="flex items-center justify-center rounded-full bg-red-200 p-2 text-gray-600 hover:bg-gray-300"
				onclick={() => {
					isDeleteConfirmation = true;
				}}
				id="delete-jadwal-konfirmasi"
			>
				<TrashBinOutline class="size-4" />
			</Button>
			<Button
				class="flex items-center justify-center rounded-full bg-gray-200 p-2 text-gray-600 hover:bg-gray-300"
				onclick={captureSnapshot}
				id="download-jadwal-konfirmasi"
			>
				<DownloadSolid class="btn-primary size-4" />
			</Button>
		</div>
	</div>
	<div class="mt-2 flex-1">
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
	<div class="mt-auto border-t border-gray-200 pt-2 text-right text-sm font-light">
		konfirmasi pada {submitted}
	</div>
</Card>

{#if isDeleteConfirmation}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<Toast align={false} color="red" class="w-auto" dismissable={false}>
			{#snippet icon()}
				<ExclamationCircleSolid class="size-8" />
			{/snippet}
			<div class="ms-6">
				<h1 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Penghapusan Data</h1>
				<P class="mb-3 text-sm font-light">
					Data konfirmasi dari <strong>{lingkungan.name}</strong> tidak akan dapat dipulihkan kembali.
				</P>
				<form
					method="POST"
					action="?/deleteEventUsher"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ result, update }) => {
							isSubmitting = false;
							if (result.type === 'success') {
								isDeleteConfirmation = false;
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="lingkungan" value={lingkungan.id} />
					<div class="flex gap-2">
						<Button size="sm" type="submit" disabled={isSubmitting}>
							{#if isSubmitting}
								Menghapus...
							{:else}
								Ya! Saya yakin
							{/if}
						</Button>
						<Button
							size="sm"
							type="button"
							color="alternative"
							disabled={isSubmitting}
							onclick={() => (isDeleteConfirmation = false)}
						>
							Batal
						</Button>
					</div>
				</form>
			</div>
		</Toast>
	</div>
{/if}
