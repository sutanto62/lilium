import type { Config } from 'tailwindcss';

export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte-icons/**/*.{html,js,svelte,ts}'
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
					50: '#E6F2FF',
					100: '#CCE5FF',
					200: '#99CCFF',
					300: '#66B2FF',
					400: '#3399FF',
					500: '#007ACC',
					600: '#0066B3',
					700: '#005299',
					800: '#003D80',
					900: '#002966'
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
