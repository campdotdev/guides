/**
 * SHA-283: a guide page accounts for every changed file, images included.
 *
 * The specs read the fixture guides in tests/fixtures/guides, and the build serves each pull request's files from
 * the snapshot in tests/fixtures/repo-files. campdotdev/shaders#264 adds images.
 */
import { expect, test } from './test.ts';

const GUIDE = '/guides/shaders/264/';

/** #264's changed files that no block pointer in the fixture guide names, in GitHub's order, with their line counts. */
const ALSO_CHANGED_264: [path: string, added: number, removed: number][] = [
	['.changeset/fluted-glass.md', 16, 0],
	['GLOSSARY.md', 18, 0],
	['apps/docs-tests/visual/fluted-glass.spec.ts', 254, 0],
	['apps/docs-tests/visual/fluted-glass.spec.ts-snapshots/fluted-glass-default-chromium-darwin.png', 0, 0],
	['apps/docs-tests/visual/fluted-glass.spec.ts-snapshots/fluted-glass-default-chromium-linux.png', 0, 0],
	['apps/docs/public/posters/fluted-glass.jpg', 0, 0],
	['apps/docs/public/posters/fluted-glass.thumb.webp', 0, 0],
	['apps/docs/src/app/components/demo-registry.tsx', 18, 0],
	['apps/docs/src/app/components/fluted-glass/demo.tsx', 90, 0],
	['apps/docs/src/app/components/fluted-glass/params.ts', 21, 0],
	['apps/docs/src/app/components/fluted-glass/scene.tsx', 32, 0],
	['apps/docs/src/app/dev/fluted-glass-benchmark/benchmark-scene.tsx', 75, 0],
	['apps/docs/src/app/dev/fluted-glass-benchmark/page.dev.tsx', 12, 0],
	['apps/docs/src/app/dev/fluted-glass-probe/page.dev.tsx', 11, 0],
	['apps/docs/src/app/dev/fluted-glass-probe/probe-scene.tsx', 76, 0],
	['apps/docs/src/content/components.ts', 5, 0],
	['apps/docs/src/content/taxonomy.ts', 2, 0],
	['docs/adr/0004-effects-resample-by-wrapping-the-sampler.md', 16, 0],
	['packages/shaders/src/components/fluted-glass/fluted-glass.test.tsx', 274, 0],
	['packages/shaders/src/components/fluted-glass/shader.tsx', 326, 0],
	['packages/shaders/src/primitives/flute-surface/flute-surface.test.ts', 53, 0],
	['scripts/build-posters.sh', 10, 2],
];

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


test('"Also changed" lists every changed file that no block pointer covers, with its line counts', async ({ page }) => {
	await page.goto(GUIDE);

	const alsoChanged = page.getByRole('region', { name: 'Steps' }).getByRole('region', { name: 'Also changed' });
	await expect(alsoChanged.getByRole('listitem')).toHaveText(
		ALSO_CHANGED_264.map(
			([path, added, removed]) => new RegExp(`^${escapeRegExp(path)} .*${added} lines added, ${removed} removed$`),
		),
	);
});

test('image files in "Also changed" show as thumbnails', async ({ page }) => {
	await page.goto(GUIDE);

	const alsoChanged = page.getByRole('region', { name: 'Also changed' });
	// #264 adds these images, so each thumbnail is the image at the head commit. The widths are the files' own.
	const thumbnails = [
		['apps/docs-tests/visual/fluted-glass.spec.ts-snapshots/fluted-glass-default-chromium-darwin.png', 560],
		['apps/docs-tests/visual/fluted-glass.spec.ts-snapshots/fluted-glass-default-chromium-linux.png', 560],
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
