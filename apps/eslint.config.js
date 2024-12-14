import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelteParser from 'svelte-eslint-parser';
import sveltePlugin from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
	// Base ESLint recommended rules
	eslint.configs.recommended,

	// TypeScript recommended rules
	{
		files: ['**/*.{ts,tsx}'],
		plugins: {
			'@typescript-eslint': tseslint
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: true,
				extraFileExtensions: ['.svelte']
			}
		},
		rules: {
			...tseslint.configs.recommended.rules
		}
	},

	// Svelte rules
	{
		files: ['**/*.svelte'],
		plugins: {
			svelte: sveltePlugin
		},
		processor: 'svelte/svelte',
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser
			}
		},
		rules: {
			'svelte/valid-compile': 'error',
			'svelte/no-unused-svelte-ignore': 'error'
		}
	},

	// Prettier rules (should be last)
	prettier,

	// ...svelte.configs['flat/prettier'],
	// {
	// 	languageOptions: {
	// 		globals: {
	// 			...globals.browser,
	// 			...globals.node
	// 		}
	// 	}
	// },
	// {
	// 	files: ['**/*.svelte'],
	// 	languageOptions: {
	// 		parserOptions: {
	// 			parser: ts.parser
	// 		}
	// 	}
	// },

	// Ignore patterns
	{
		ignores: [
			'**/node_modules/**',
			'**/build/**',
			'**/.svelte-kit/**',
			'**/dist/**',
			'**/drizzle/**',
			'**/*.config.ts',
			'**/*.setup.ts'
		]
	}
];
