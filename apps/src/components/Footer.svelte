<script lang="ts">
	import { env } from '$env/dynamic/public';
	import {
		DarkMode,
		Footer,
		FooterBrand,
		FooterCopyright,
		FooterIcon,
		FooterLink,
		FooterLinkGroup
	} from 'flowbite-svelte';
	import { GithubSolid } from 'flowbite-svelte-icons';
</script>

<Footer footerType="socialmedia" class="bg-transparent text-sm shadow-none">
	<div class="md:flex md:justify-between">
		<div class="mb-6 md:mb-0">
			<FooterBrand
				href="https://github.com/sutanto62/lilium"
				src="/images/lily.svg"
				alt="Lilium Inter Spinas Logo"
				name="Lilium Inter Spinas"
				spanClass="text-lg font-bold text-[#eb4f27]"
			/>
			<ul class="list-unstyled small">
				<li class="mb-2">
					Persembahan untuk Bunda Maria dari
					<a href="https://github.com/sutanto62/lilium/graphs/contributors">kontributor Lilium</a>.
				</li>
				<li class="mb-2">
					Kode dilisensikan <a
						href="https://github.com/sutanto62/lilium/blob/main/LICENSE"
						target="_blank"
						rel="license noopener">Apache 2.0</a
					>.
				</li>
				<li class="mb-2">Versi saat ini v1.0.0.</li>
			</ul>
		</div>
		<div class="flex justify-start gap-8 sm:justify-end">
			<div>
				<h2 class="mb-6 text-sm font-semibold uppercase text-gray-900 dark:text-white">
					Tentang Kami
				</h2>
				<FooterLinkGroup>
					<FooterLink liClass="mb-4" href={env.PUBLIC_SITE_URL || '/'}
						>{env.PUBLIC_SITE_CHURCH || 'Paroki'}</FooterLink
					>
				</FooterLinkGroup>
			</div>
		</div>
	</div>
	<hr class="my-4 border-gray-200 dark:border-gray-700 sm:mx-auto" />
	<div class="sm:flex sm:items-center sm:justify-between">
		<DarkMode />
		<FooterCopyright
			href="https://github.com/sutanto62/lilium"
			by="Lilium Inter Spinas"
			year={2024}
		/>
		<div class="mt-4 flex space-x-6 sm:mt-0 sm:justify-center rtl:space-x-reverse">
			<FooterIcon href="https://github.com/sutanto62/lilium">
				<GithubSolid
					class="h-5 w-5 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
				/>
			</FooterIcon>
		</div>
	</div>
</Footer>
