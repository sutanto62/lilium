<script lang="ts">
	import Footer from '$components/Footer.svelte';
	import NavigationAdmin from '$components/NavigationAdmin.svelte';
</script>

<NavigationAdmin />
<div class="container">
	<slot />
</div>
<Footer />
