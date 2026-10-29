/**
 * SHA-280: the guide format reference renders on the site.
 * The page's source is docs/guide-format.md, which the pr-guide skill reads as raw Markdown.
 */
import { expect, test } from './test.ts';

test('the format reference documents the frontmatter, the overview, steps, and block pointers', async ({ page }) => {
	await page.goto('/guides/format/');

	await expect(page.getByRole('heading', { level: 1, name: 'Guide file format' })).toBeVisible();
	for (const section of ['Frontmatter', 'Overview', 'Steps', 'Block pointers']) {
		await expect(page.getByRole('heading', { level: 2, name: section, exact: true })).toBeVisible();
	}
	const frontmatter = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Required' }) });
	for (const field of ['repo', 'pr', 'title', 'scope', 'baseSha', 'headSha', 'afterTheFact']) {
		await expect(frontmatter.getByRole('cell', { name: field, exact: true })).toBeVisible();
	}
});

test('the format reference documents image pointers and the "Also changed" section', async ({ page }) => {
	await page.goto('/guides/format/');

	for (const section of ['Image pointers', 'Also changed']) {
		await expect(page.getByRole('heading', { level: 2, name: section, exact: true })).toBeVisible();
	}
});
