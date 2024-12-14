import flowbitePlugin from 'flowbite/plugin';

import type { Config } from 'tailwindcss';

export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
	],
	plugins: [require('flowbite/plugin'), require('flowbite-typography')],
	darkMode: 'class',
	theme: {
		extend: {
			container: {
				padding: {
					DEFAULT: '1rem',
					sm: '2rem',
					lg: '4rem',
					xl: '5rem',
					'2xl': '6rem'
				},
				center: true
			},
			colors: {
				// flowbite-svelte
				primary: {
					50: '#FFF5F2',
					100: '#FFF1EE',
					200: '#FFE4DE',
					300: '#FFD5CC',
					400: '#FFBCAD',
					500: '#FE795D',
					600: '#EF562F',
					700: '#EB4F27',
					800: '#CC4522',
					900: '#A5371B'
				},
				secondary: {
					50: '#F0F6FF',
					100: '#E6F0FF',
					200: '#BFDBFF',
					300: '#99C2FF',
					400: '#70A9FF',
					500: '#4790FF',
					600: '#267AFF'
				}
			}
		}
	}
} as Config;
