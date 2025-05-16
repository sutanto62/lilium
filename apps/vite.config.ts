import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['@auth/drizzle-adapter', '@auth/sveltekit', 'drizzle-orm',]
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
});
