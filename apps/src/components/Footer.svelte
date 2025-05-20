<script lang="ts">
	import { DarkMode, Footer, FooterCopyright, FooterLink, FooterLinkGroup } from 'flowbite-svelte';
	import { MailBoxOutline } from 'flowbite-svelte-icons';
</script>

<Footer>
	<div class="px-5 sm:flex sm:items-center sm:justify-between">
		<DarkMode />
		<FooterCopyright
			href="https://www.santo-laurensius.org"
			by="IT Servant, St. Laurentius Church, Alam Sutera Parish"
			year={2024}
		/>
		<FooterLinkGroup
			class="mt-3 flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0"
		>
			<FooterLink href="mailto:it.servant2@santo-laurensius.org?subject=LIS" target="_blank">
				<div class="flex items-center justify-end gap-2">
					<MailBoxOutline size="lg" />
					<span>Contact</span>
				</div>
			</FooterLink>
		</FooterLinkGroup>
	</div>
</Footer>
