<script lang="ts">
	import { Footer, FooterCopyright, FooterLinkGroup, FooterLink } from 'flowbite-svelte';
	import { DarkMode } from 'flowbite-svelte';
</script>

<Footer class="bg-primary">
	<hr class="my-3 border-gray-200 dark:border-gray-700 sm:mx-auto lg:my-3" />
	<div class="px-5 sm:flex sm:items-center sm:justify-between">
		<DarkMode />
		<FooterCopyright
			href="https://www.santo-laurensius.org"
			by="IT Servant, St. Laurentius Church, Alam Sutera Parish"
			year={2024}
		/>
		<FooterLinkGroup
			ulClass="flex flex-wrap items-center mt-3 text-sm text-gray-500 dark:text-gray-400 sm:mt-0"
		>
			<FooterLink href="mailto:it.servant2@santo-laurensius.org?subject=LIS" target="_blank">
				Contact
			</FooterLink>
		</FooterLinkGroup>
	</div>
</Footer>
