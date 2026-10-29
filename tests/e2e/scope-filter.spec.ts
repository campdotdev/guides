/**
 * SHA-286: the scope filter narrows a repo page to the guides with one Conventional Commit scope.
 *
 * The specs name the fixture guides shaders/264.md (scope `shaders`) and shaders/241.md (scope `docs`).
 * Other specs add fixture guides too, so these specs check the guides they name, never the total count.
 */
import { expect, test } from './test.ts';

test('the scope filter shows only the guides with the chosen scope', async ({ page }) => {
	await page.goto('/guides/shaders/');
	const scope = page.getByRole('combobox', { name: 'Scope' });
	const guides = page.getByRole('list', { name: 'Guides' }).getByRole('listitem');
	const flutedGlass = guides.filter({ has: page.getByRole('link', { name: 'feat(shaders): add FlutedGlass' }) });
	const posterSizes = guides.filter({ hasText: '#241' });
	await expect(flutedGlass).toBeVisible();
	await expect(posterSizes).toBeVisible();

	await scope.selectOption('docs');

	await expect(flutedGlass).toBeHidden();
	await expect(posterSizes).toBeVisible();
	for (const guide of await guides.all()) await expect(guide).toContainText('Scope: docs');

	await scope.selectOption({ label: 'All scopes' });

	await expect(flutedGlass).toBeVisible();
	await expect(posterSizes).toBeVisible();
});
