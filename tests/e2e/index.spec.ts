/**
 * SHA-286: the home page lists each repo that has guides, and each repo page lists its guides newest first.
 *
 * The specs name the fixture guides shaders/264.md (scope `shaders`), shaders/241.md (scope `docs`), and bones/23.md (no scope).
 * Other specs add fixture guides too, so these specs check the guides they name and the order, never the total count.
 */
import { expect, test } from './test.ts';

test('the home page lists each repo that has guides and links to its page', async ({ page }) => {
	await page.goto('/guides/');

	await expect(page.getByRole('heading', { level: 1, name: 'Guides' })).toBeVisible();
	const repos = page.getByRole('list', { name: 'Repositories' });
	await expect(repos.getByRole('link', { name: 'campdotdev/bones' })).toBeVisible();

	await repos.getByRole('link', { name: 'campdotdev/shaders' }).click();

	await expect(page).toHaveURL('/guides/shaders/');
	await expect(page.getByRole('heading', { level: 1, name: 'campdotdev/shaders' })).toBeVisible();
});

test('a repo page lists its guides newest first, each with its title, number, and scope', async ({ page }) => {
	await page.goto('/guides/shaders/');

	const guides = page.getByRole('list', { name: 'Guides' }).getByRole('listitem');
	const flutedGlass = guides.filter({ has: page.getByRole('link', { name: 'feat(shaders): add FlutedGlass' }) });
	await expect(flutedGlass).toContainText('#264');
	await expect(flutedGlass).toContainText('Scope: shaders');
	const posterSizes = guides.filter({
		has: page.getByRole('link', { name: 'refactor(docs): remove POSTER_SIZES, which does nothing while images are unoptimized' }),
	});
	await expect(posterSizes).toContainText('#241');
	await expect(posterSizes).toContainText('Scope: docs');

	const numbers = (await guides.getByText(/^#\d+$/).allTextContents()).map((text) => Number(text.slice(1)));
	expect(numbers.indexOf(264)).toBeLessThan(numbers.indexOf(241));
	expect(numbers).toEqual(numbers.toSorted((a, b) => b - a));

	await flutedGlass.getByRole('link').click();
	await expect(page).toHaveURL('/guides/shaders/264/');
	await expect(page.getByRole('heading', { level: 1, name: 'feat(shaders): add FlutedGlass' })).toBeVisible();
});

test('a guide page links back to its repo page, and the repo page links back to the home page', async ({ page }) => {
	await page.goto('/guides/shaders/264/');

	const guideTrail = page.getByRole('banner').getByRole('navigation', { name: 'Breadcrumb' });
	await expect(guideTrail.getByRole('link', { name: 'Guides', exact: true })).toHaveAttribute('href', '/guides/');
	await guideTrail.getByRole('link', { name: 'campdotdev/shaders', exact: true }).click();
	await expect(page).toHaveURL('/guides/shaders/');

	await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Guides', exact: true }).click();
	await expect(page).toHaveURL('/guides/');
	await expect(page.getByRole('heading', { level: 1, name: 'Guides' })).toBeVisible();
});

test('a guide without a scope lists no scope', async ({ page }) => {
	await page.goto('/guides/bones/');

	const guide = page
		.getByRole('list', { name: 'Guides' })
		.getByRole('listitem')
		.filter({ has: page.getByRole('link', { name: 'fix: build bones before demo to fix Vercel build' }) });
	await expect(guide).toContainText('#23');
	await expect(guide).not.toContainText('Scope:');
});
