/**
 * SHA-285: a reader marks files as reviewed, and a mark lasts until the file's content changes.
 *
 * The browser keeps each mark in local storage. Each test starts in a new browser context,
 * so it starts with no marks.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Locator, Page, Route } from '@playwright/test';
import { FIXTURE_BUILD_ENV } from '../fixture-build.ts';
import { expect, test } from './test.ts';

const GUIDE = '/guides/shaders/264/';
const STEP_1 = 'Step 1: Mount FlutedGlass after a Source';
const STEP_2 = 'Step 2: Shape each flute in one primitive';
const ENGINE = 'packages/shaders/src/engine.ts';
const FLUTE_SURFACE = 'packages/shaders/src/primitives/flute-surface/flute-surface.ts';

const reviewed = (page: Page, path: string) => page.getByRole('checkbox', { name: `Reviewed ${path}`, exact: true });

test('a Reviewed mark persists across a reload', async ({ page }) => {
	await page.goto(GUIDE);
	await page.getByRole('button', { name: STEP_2 }).click();
	await reviewed(page, ENGINE).check();

	await page.reload();
	await page.getByRole('button', { name: STEP_2 }).click();

	await expect(reviewed(page, ENGINE)).toBeChecked();
	await expect(reviewed(page, FLUTE_SURFACE)).not.toBeChecked();
});

test('each step block’s header counts its reviewed files', async ({ page }) => {
	await page.goto(GUIDE);
	const step1 = page.getByRole('article', { name: STEP_1 });
	const step2 = page.getByRole('article', { name: STEP_2 });
	await expectCount(step2, '0/2 reviewed', '0 of 2 files reviewed');

	await page.getByRole('button', { name: STEP_2 }).click();
	await reviewed(page, FLUTE_SURFACE).check();
	await expectCount(step2, '1/2 reviewed', '1 of 2 files reviewed');
	await reviewed(page, ENGINE).check();
	await expectCount(step2, '2/2 reviewed', '2 of 2 files reviewed');
	await reviewed(page, ENGINE).uncheck();
	await expectCount(step2, '1/2 reviewed', '1 of 2 files reviewed');

	await expectCount(step1, '0/2 reviewed', '0 of 2 files reviewed');
});

/**
 * tests/fixtures/previous-head holds the same guide pinned to f09b489, the pull request's previous head.
 * The last commit, 84cc417, changed flute-surface.ts and left engine.ts alone,
 * so the refreshed guide in tests/fixtures/guides shows flute-surface.ts at a new blob SHA.
 */
test.describe('after the guide is refreshed to a new head', () => {
	let previousSite: string;

	test.beforeAll(() => {
		test.setTimeout(60_000);
		previousSite = buildSite('tests/fixtures/previous-head');
	});

	test.afterAll(() => {
		rmSync(previousSite, { recursive: true, force: true });
	});

	test('a file with a new blob SHA shows unchecked, and an unchanged file keeps its mark', async ({ page, baseURL }) => {
		const undeploy = await deploy(page, new URL(baseURL!).origin, previousSite);
		await page.goto(GUIDE);
		await expect(page.getByRole('banner').getByRole('link', { name: 'f09b489' })).toBeVisible();
		await page.getByRole('button', { name: STEP_2 }).click();
		await reviewed(page, FLUTE_SURFACE).check();
		await reviewed(page, ENGINE).check();

		await undeploy();
		await page.reload();
		await expect(page.getByRole('banner').getByRole('link', { name: '84cc417' })).toBeVisible();
		await page.getByRole('button', { name: STEP_2 }).click();

		await expect(reviewed(page, FLUTE_SURFACE)).not.toBeChecked();
		await expect(reviewed(page, ENGINE)).toBeChecked();
		await expectCount(page.getByRole('article', { name: STEP_2 }), '1/2 reviewed', '1 of 2 files reviewed');
	});
});

/** The header shows the count as a fraction and tells screen readers the same count in words. */
async function expectCount(step: Locator, shown: string, spoken: string): Promise<void> {
	await expect(step.getByText(shown, { exact: true })).toBeVisible();
	await expect(step.getByText(spoken, { exact: true })).toBeAttached();
}

/** Builds the site from a guides directory into a temporary directory, leaving the served dist/ alone. */
function buildSite(guidesDir: string): string {
	const outDir = mkdtempSync(join(tmpdir(), 'guides-site-'));
	const result = spawnSync('pnpm', ['exec', 'astro', 'build', '--outDir', outDir], {
		env: { ...process.env, ...FIXTURE_BUILD_ENV, GUIDES_DIR: guidesDir },
		encoding: 'utf8',
	});
	if (result.status !== 0) throw new Error(`The build from ${guidesDir} failed:\n${result.stdout}${result.stderr}`);
	return outDir;
}

/**
 * Serves a built site at the preview server's origin, the way a deploy replaces the live site.
 * The origin stays the same, so local storage carries over. The returned function restores the preview server.
 */
async function deploy(page: Page, origin: string, site: string): Promise<() => Promise<void>> {
	const matches = (url: URL) => url.origin === origin;
	const serve = async (route: Route) => {
		const { pathname } = new URL(route.request().url());
		const file = join(site, decodeURIComponent(pathname).replace(/^\/guides/, ''), pathname.endsWith('/') ? 'index.html' : '');
		await (existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404 }));
	};
	await page.route(matches, serve);
	return () => page.unroute(matches, serve);
}
