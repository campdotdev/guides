/**
 * SHA-279: the code in a guide always matches the code in the pull request.
 *
 * GitHub's compare view diffs the head commit against the merge base of `baseSha` and `headSha`.
 * When the base branch moves on, `baseSha` can be a later commit than the merge base, and its files no longer
 * match the diff. The #241 fixture guide names main after the pull request merged, and the merge base is a7dac51.
 */
import { expect, test } from './test.ts';

test('removed lines show the file at the merge base when baseSha is a later commit', async ({ page }) => {
	await page.goto('/guides/shaders/241/');
	await page.getByRole('button', { name: 'Step 2: Delete POSTER_SIZES' }).click();

	// At 5da3e8d, favorites-list.tsx already lacks these lines, and its line 33 is a type declaration.
	const list = page.getByRole('table', { name: 'apps/docs/src/components/favorites/favorites-list.tsx' });
	await expect(
		list.getByRole('row', { name: "31 removed // The width each poster renders at, per the grid's columns in" }),
	).toBeVisible();
	await expect(
		list.getByRole('row', { name: "33 removed const POSTER_SIZES = '(width < 40rem) 100vw, (width < 64rem) 50vw, 25vw';" }),
	).toBeVisible();
});
