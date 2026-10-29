// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://campdotdev.github.io',
	base: '/guides',
	output: 'static',
	devToolbar: { enabled: false },
	markdown: {
		shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
	},
});
