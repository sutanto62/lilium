<script lang="ts">
	import '$src/app.css';
	import posthog from 'posthog-js';
	import { browser } from '$app/environment';
	import { beforeNavigate, afterNavigate } from '$app/navigation';

	if (browser) {
		beforeNavigate(() => posthog.capture('$pageleave'));
		afterNavigate(() => posthog.capture('$pageview'));
	}
</script>

<svelte:head>
	<title>LIS Alam Sutera</title>
	<meta name="description" content="LIS" />
</svelte:head>

<div class="container h-screen max-w-full px-0 py-0" id="main">
	<slot />
</div>
