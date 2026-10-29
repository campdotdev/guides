/**
 * SHA-283: a guide page accounts for every changed file, images included.
 *
 * The specs read the fixture guides in tests/fixtures/guides, and the build serves each pull request's files from
 * the snapshot in tests/fixtures/repo-files. campdotdev/shaders#264 adds images, #235 changes them, and #243 deletes one.
 */
import { createHash } from 'node:crypto';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test.ts';

const GUIDE = '/guides/shaders/264/';

/**
 * #264's changed files that no block pointer in the fixture guide names, in GitHub's order, with their line counts.
 * GitHub counts no lines in a binary file.
 */
const ALSO_CHANGED_264: [path: string, lines: [added: number, removed: number] | 'binary'][] = [
	['.changeset/fluted-glass.md', [16, 0]],
	['GLOSSARY.md', [18, 0]],
	['apps/docs-tests/visual/fluted-glass.spec.ts-snapshots/fluted-glass-default-chromium-darwin.png', 'binary'],
	['apps/docs/public/posters/fluted-glass.jpg', 'binary'],
	['apps/docs/public/posters/fluted-glass.thumb.webp', 'binary'],
	['apps/docs/src/app/components/demo-registry.tsx', [18, 0]],
	['apps/docs/src/app/components/fluted-glass/demo.tsx', [90, 0]],
	['apps/docs/src/app/components/fluted-glass/params.ts', [21, 0]],
	['apps/docs/src/app/components/fluted-glass/scene.tsx', [32, 0]],
	['apps/docs/src/app/dev/fluted-glass-benchmark/benchmark-scene.tsx', [75, 0]],
	['apps/docs/src/app/dev/fluted-glass-benchmark/page.dev.tsx', [12, 0]],
	['apps/docs/src/app/dev/fluted-glass-probe/page.dev.tsx', [11, 0]],
	['apps/docs/src/app/dev/fluted-glass-probe/probe-scene.tsx', [76, 0]],
	['apps/docs/src/content/components.ts', [5, 0]],
	['apps/docs/src/content/taxonomy.ts', [2, 0]],
	['docs/adr/0004-effects-resample-by-wrapping-the-sampler.md', [16, 0]],
	['packages/shaders/src/components/fluted-glass/fluted-glass.test.tsx', [274, 0]],
	['packages/shaders/src/components/fluted-glass/shader.tsx', [326, 0]],
	['packages/shaders/src/primitives/flute-surface/flute-surface.test.ts', [53, 0]],
	['scripts/build-posters.sh', [10, 2]],
];

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The SHA that `git hash-object` prints for the file an image shows, which tells which commit's version it is. */
async function blobShaOf(page: Page, image: Locator): Promise<string> {
	const response = await page.request.get(new URL((await image.getAttribute('src'))!, page.url()).href);
	const bytes = await response.body();
	return createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
}

test('"Also changed" lists every changed file that no block pointer covers, with its line counts', async ({ page }) => {
	await page.goto(GUIDE);

	const alsoChanged = page.getByRole('region', { name: 'Steps' }).getByRole('region', { name: 'Also changed' });
	await expect(alsoChanged.getByRole('listitem')).toHaveText(
		ALSO_CHANGED_264.map(([path, lines]) =>
			lines === 'binary'
				? new RegExp(`^${escapeRegExp(path)} added Binary$`)
				: new RegExp(`^${escapeRegExp(path)} .*${lines[0]} lines added, ${lines[1]} removed$`),
		),
	);
});

test('image files in "Also changed" show as thumbnails', async ({ page }) => {
	await page.goto(GUIDE);

	const alsoChanged = page.getByRole('region', { name: 'Also changed' });
	// #264 adds these images, so each thumbnail is the image at the head commit. The widths are the files' own.
	const thumbnails = [
		['apps/docs-tests/visual/fluted-glass.spec.ts-snapshots/fluted-glass-default-chromium-darwin.png', 560],
		['apps/docs/public/posters/fluted-glass.jpg', 1792],
		['apps/docs/public/posters/fluted-glass.thumb.webp', 124],
	] as const;
	await expect(alsoChanged.getByRole('img')).toHaveCount(thumbnails.length);
	for (const [path, width] of thumbnails) {
		const thumbnail = alsoChanged.getByRole('listitem').filter({ hasText: path }).getByRole('img', { name: `${path} after the change` });
		await thumbnail.scrollIntoViewIfNeeded();
		await expect(thumbnail).toHaveJSProperty('naturalWidth', width);
	}
});

test('a block pointer to a new image shows only the image after the change', async ({ page }) => {
	await page.goto(GUIDE);
	const title = 'Step 3: Record the default look as a baseline';
	await page.getByRole('button', { name: title }).click();

	const path = 'apps/docs-tests/visual/fluted-glass.spec.ts-snapshots/fluted-glass-default-chromium-linux.png';
	const image = page.getByRole('article', { name: title }).getByRole('group', { name: path });
	// The baseline is a 560 by 374 PNG.
	await expect(image.getByRole('img', { name: `${path} after the change` })).toHaveJSProperty('naturalWidth', 560);
	await expect(image.getByRole('img')).toHaveCount(1);
});

test('a block pointer to a changed image shows it before and after the change', async ({ page }) => {
	await page.goto('/guides/shaders/235/');
	const title = "Step 1: Regenerate Aurora's baselines";
	await page.getByRole('button', { name: title }).click();

	const path = 'apps/docs-tests/visual/aurora.spec.ts-snapshots/aurora-default-chromium-linux.png';
	const image = page.getByRole('article', { name: title }).getByRole('group', { name: path });
	const before = image.getByRole('img', { name: `${path} before the change` });
	const after = image.getByRole('img', { name: `${path} after the change` });
	await expect(before).toHaveJSProperty('naturalWidth', 560);
	await expect(after).toHaveJSProperty('naturalWidth', 560);
	// GitHub's blob SHAs for the baseline at #235's merge base and head commit.
	expect(await blobShaOf(page, before)).toBe('1374a86cfbee6729c50480295b10a9a0f48128cc');
	expect(await blobShaOf(page, after)).toBe('e337458767ddf429a3a0f8ddfe0e4d3a2c8e60e1');
});

test('a block pointer to a deleted image shows only the image before the change', async ({ page }) => {
	await page.goto('/guides/shaders/243/');
	const title = 'Step 1: Draw the card in code instead of an image';
	await page.getByRole('button', { name: title }).click();

	const path = 'apps/docs/public/features/performant.png';
	const image = page.getByRole('article', { name: title }).getByRole('group', { name: path });
	// The deleted image is a 624 by 618 PNG.
	await expect(image.getByRole('img', { name: `${path} before the change` })).toHaveJSProperty('naturalWidth', 624);
	await expect(image.getByRole('img')).toHaveCount(1);
});

test('an image file in a step has a Reviewed checkbox, and the step counts it', async ({ page }) => {
	await page.goto(GUIDE);
	const title = 'Step 3: Record the default look as a baseline';
	const step = page.getByRole('article', { name: title });
	const path = 'apps/docs-tests/visual/fluted-glass.spec.ts-snapshots/fluted-glass-default-chromium-linux.png';
	const reviewed = page.getByRole('checkbox', { name: `Reviewed ${path}`, exact: true });
	await expect(step.getByText('0 of 2 files reviewed', { exact: true })).toBeAttached();

	await page.getByRole('button', { name: title }).click();
	await reviewed.check();
	await expect(step.getByText('1 of 2 files reviewed', { exact: true })).toBeAttached();

	// The click wrote #step-3 to the URL, so the reload opens step 3 again.
	await page.reload();
	await expect(page.getByRole('button', { name: title })).toHaveAttribute('aria-expanded', 'true');
	await expect(reviewed).toBeChecked();
});
