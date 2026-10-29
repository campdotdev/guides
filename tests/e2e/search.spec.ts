/**
 * SHA-286: the home page searches the prose of every guide.
 *
 * `pnpm build` runs Pagefind over the built site, so these specs query the real index, the way the shaders docs search spec does.
 * Other specs add fixture guides too, so these specs check for the guides they name, never the number of results.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test.ts';

const searchbox = (page: Page) => page.getByRole('searchbox', { name: 'Search guides' });
const results = (page: Page) => page.getByRole('list', { name: 'Search results' });

/** Waits for the browser to load the Pagefind bundle from under the site's /guides base. */
const pagefindLoaded = (page: Page) =>
	page.waitForResponse((response) => new URL(response.url()).pathname === '/guides/pagefind/pagefind.js');

test('a word from a guide’s prose finds that guide, and the result opens it', async ({ page }) => {
	await page.goto('/guides/');
	const loaded = pagefindLoaded(page);

	// Only the overview of shaders/264.md says "reeded".
	await searchbox(page).fill('reeded');

	expect((await loaded).ok()).toBe(true);
	await results(page).getByRole('link', { name: 'feat(shaders): add FlutedGlass' }).click();
	await expect(page).toHaveURL('/guides/shaders/264/');
	await expect(page.getByRole('heading', { level: 1, name: 'feat(shaders): add FlutedGlass' })).toBeVisible();
});

test('a word that several guides use finds each of them, across repos', async ({ page }) => {
	await page.goto('/guides/');

	// shaders/264.md says the package index "exports" the component, and bones/23.md names the package's `exports` map.
	await searchbox(page).fill('exports');

	await expect(results(page).getByRole('link', { name: 'feat(shaders): add FlutedGlass' })).toBeVisible();
	await expect(results(page).getByRole('link', { name: 'fix: build bones before demo to fix Vercel build' })).toBeVisible();
});

test('search covers the prose, not the code', async ({ page }) => {
	await page.goto('/guides/');

	// `refraction` appears in both hunks of step 1 in shaders/264.md, and in no guide's prose.
	await searchbox(page).fill('refraction');

	await expect(page.getByRole('status')).toHaveText('No guides match “refraction”.');
	await expect(results(page).getByRole('listitem')).toHaveCount(0);
});
