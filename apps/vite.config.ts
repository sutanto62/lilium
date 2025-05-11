import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [sveltekit()],
		optimizeDeps: {
			exclude: ['@auth/drizzle-adapter', '@auth/sveltekit', 'drizzle-orm']
		},
		// Expose env variables to the client
		define: {
			'process.env': env
		},
		test: {
			globals: true,
			environment: 'jsdom',
			setupFiles: './vitest.setup.ts',
			include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
			exclude: [
				'**/*.config.{js,ts}',
				'**/.svelte-kit/**',
				'**/node_modules/**',
				'**/dist/**',
				'**/cypress/**',
				'**/.{idea,git,cache,output,temp}/**',
				'./src/config/**'
			],
			coverage: {
				exclude: ['./src/config']
			}
		}
	};
});
