import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	resolve: {
		alias: {
			// Force ws to use its ESM wrapper so { WebSocket } named import works
			// even when 'browser' condition is active (set by svelteTesting for Svelte 5)
			ws: path.resolve('./node_modules/ws/wrapper.mjs')
		}
	},
	optimizeDeps: {
		exclude: ['@auth/drizzle-adapter', '@auth/sveltekit', 'drizzle-orm', 'flowbite-svelte']
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: './vitest.setup.ts',
		include: ['src/**/*.{test,spec}.{js,ts}'],
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
