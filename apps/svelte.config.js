import adapter from '@sveltejs/adapter-node';
import path from 'path';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		// Configure the adapter with specific options
        adapter: adapter({
            // The directory where the production build will be created
            out: 'build',
            // You can specify the entry point if needed
            entryPoint: 'index.js',
            // Precompress static files
            precompress: true,
            // Configure the production environment
            env: {
                path: 'SOCKET_PATH',
                host: 'HOST',
                port: 'PORT'
            }
        }),
		alias: {
			$components: path.resolve('./src/components'),
			$core: path.resolve('./src/core'),
			$adapters: path.resolve('./src/adapters'),
			$src: path.resolve('./src')
		}
	}
};

export default config;
