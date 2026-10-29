import { defineConfig, devices } from '@playwright/test';
import { FIXTURE_BUILD_ENV } from './tests/fixture-build.ts';

// Set PLAYWRIGHT_PORT when another preview server already holds 4321, such as one in a parallel worktree.
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4321);

export default defineConfig({
	testDir: 'tests/e2e',
	// Specs that run `astro build` share Astro's caches in .astro/ and node_modules/.astro, so run one spec at a time.
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'on-first-retry',
	},
	// Build the real static site, then serve it under its /guides base, the way GitHub Pages does.
	// `--ignore-lock` keeps `astro preview` in the foreground, so Playwright owns and stops it.
	// Without it, Astro 7 moves the server to the background when it detects a coding agent.
	webServer: {
		command: `pnpm build && pnpm preview --port ${PORT} --ignore-lock`,
		env: FIXTURE_BUILD_ENV,
		url: `http://localhost:${PORT}/guides/shaders/264/`,
		reuseExistingServer: false,
		timeout: 120_000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
		},
	],
});
