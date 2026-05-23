import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

function createThemeStore() {
	// Check localStorage and system preference
	const getInitialTheme = (): Theme => {
		if (typeof window === 'undefined') return 'light';

		const stored = localStorage.getItem('theme') as Theme | null;
		if (stored) return stored;

		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	};

	const { subscribe, set } = writable<Theme>(getInitialTheme());

	const toggle = () => {
		let newTheme: Theme;
		subscribe((current) => {
			newTheme = current === 'dark' ? 'light' : 'dark';
		})();

		set(newTheme!);
		localStorage.setItem('theme', newTheme!);
		updateDOM(newTheme!);
	};

	const set_theme = (theme: Theme) => {
		set(theme);
		localStorage.setItem('theme', theme);
		updateDOM(theme);
	};

	const updateDOM = (theme: Theme) => {
		const html = document.documentElement;
		if (theme === 'dark') {
			html.classList.add('dark');
		} else {
			html.classList.remove('dark');
		}
	};

	// Initialize DOM on store creation
	const initial = getInitialTheme();
	if (typeof window !== 'undefined') {
		updateDOM(initial);
	}

	return {
		subscribe,
		toggle,
		set: set_theme
	};
}

export const themeStore = createThemeStore();
