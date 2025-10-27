<script lang="ts">
	import { page } from '$app/state';
	import { posthogService } from '$src/lib/application/PostHogService';
	import { Button } from 'flowbite-svelte';

	/**
	 * Example component demonstrating PostHog event tracking
	 * This shows how to track custom events in your application
	 */

	async function trackButtonClick(buttonName: string) {
		await posthogService.trackEvent(
			'button_clicked',
			{
				button_name: buttonName,
				page: page.route.id,
				user_role: page.data.session?.user?.role,
				timestamp: new Date().toISOString()
			},
			page.data.session || undefined
		);

		console.log(`PostHog: Button ${buttonName} clicked`);
	}

	async function trackCustomEvent() {
		await posthogService.trackEvent(
			'custom_event',
			{
				event_type: 'user_action',
				description: 'User performed a custom action',
				page: page.route.id
			},
			page.data.session || undefined
		);

		console.log('PostHog: Custom event tracked');
	}
</script>

<div class="rounded-lg bg-white p-4 shadow">
	<h3 class="mb-4 text-lg font-semibold">PostHog Analytics Demo</h3>
	<p class="mb-4 text-gray-600">
		This component demonstrates how to track events with PostHog. Check your browser console and
		PostHog dashboard to see the events.
	</p>

	<div class="space-x-2">
		<Button onclick={() => trackButtonClick('demo_button')}>Track Button Click</Button>

		<Button color="green" onclick={trackCustomEvent}>Track Custom Event</Button>
	</div>

	<div class="mt-4 text-sm text-gray-500">
		<p>Events being tracked:</p>
		<ul class="list-inside list-disc">
			<li>button_clicked - When demo buttons are clicked</li>
			<li>custom_event - When custom event button is clicked</li>
			<li>$pageview - Automatic page view tracking</li>
		</ul>
	</div>
</div>
