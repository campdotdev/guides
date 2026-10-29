/**
 * SHA-282: an inline pointer in a step's explanation highlights the lines it points at.
 *
 * Step 2 of the fixture guide says the engine [exports the primitive](packages/shaders/src/engine.ts#L70-L74).
 * Its block pointer shows engine.ts lines 67-78, so lines 69 and 75 show but stay unhighlighted.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test.ts';

const GUIDE = '/guides/shaders/264/';
const STEP = 'Step 2: Shape each flute in one primitive';

async function openStep(page: Page): Promise<{ pointer: Locator; engine: Locator }> {
	await page.goto(GUIDE);
	await page.getByRole('region', { name: 'Steps' }).getByRole('button', { name: STEP }).click();
	return {
		pointer: page.getByRole('region', { name: 'Explanation' }).getByRole('link', { name: 'exports the primitive' }),
		engine: page.getByRole('table', { name: 'packages/shaders/src/engine.ts' }),
	};
}

/** The rows of a file's diff that the page highlights. */
function highlightedRows(table: Locator): Locator {
	return table.getByRole('row').and(table.page().locator('[data-highlighted]'));
}

async function expectEngineLines70To74(table: Locator): Promise<void> {
	const rows = highlightedRows(table);
	await expect(rows).toHaveCount(5);
	await expect(rows.first()).toHaveAccessibleName("70 added export { fluteSurface } from './primitives/flute-surface/flute-surface.js';");
	await expect(rows.last()).toHaveAccessibleName("74 added } from './primitives/flute-surface/flute-surface.js';");
}

test('an inline pointer renders as a link to its lines on GitHub', async ({ page }) => {
	const { pointer } = await openStep(page);

	await expect(pointer).toHaveAttribute(
		'href',
		'https://github.com/campdotdev/shaders/blob/84cc41703117a566f6e181dd8aec5ec7ce889521/packages/shaders/src/engine.ts#L70-L74',
	);
});

test('hovering an inline pointer highlights its lines, and moving away clears them', async ({ page }) => {
	const { pointer, engine } = await openStep(page);
	await expect(highlightedRows(engine)).toHaveCount(0);

	await pointer.hover();
	await expectEngineLines70To74(engine);

	await page.getByRole('heading', { level: 1 }).hover();
	await expect(highlightedRows(engine)).toHaveCount(0);
});

test('focusing an inline pointer highlights the same lines as hovering it', async ({ page }) => {
	const { pointer, engine } = await openStep(page);

	await pointer.focus();
	await expectEngineLines70To74(engine);

	await pointer.blur();
	await expect(highlightedRows(engine)).toHaveCount(0);
});

test('clicking an inline pointer scrolls its lines into view and keeps them highlighted', async ({ page }) => {
	// A short viewport puts engine.ts below the fold once step 2 is open.
	await page.setViewportSize({ width: 1280, height: 480 });
	const { pointer, engine } = await openStep(page);
	const firstLine = engine.getByRole('row', { name: /^70 added/ });
	const lastLine = engine.getByRole('row', { name: /^74 added/ });
	await expect(firstLine).not.toBeInViewport();

	await pointer.click();

	await expect(firstLine).toBeInViewport();
	await expect(lastLine).toBeInViewport();
	await expect(page.getByRole('button', { name: STEP })).toHaveAttribute('aria-expanded', 'true');
	await expect(page).toHaveURL(/\/guides\/shaders\/264\/$/);

	// The reader moves the mouse to the code, and the lines stay highlighted.
	await firstLine.hover();
	await expectEngineLines70To74(engine);
});

test('the format reference documents inline pointers and their build error', async ({ page }) => {
	await page.goto('/guides/format/');

	await expect(page.getByRole('heading', { level: 2, name: 'Inline pointers', exact: true })).toBeVisible();
	await expect(page.getByRole('cell', { name: 'steps.<n>.inlinePointers.<m>', exact: true })).toBeVisible();
});
