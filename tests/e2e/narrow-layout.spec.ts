/**
 * SHA-284: on a narrow screen, the two panes stack, and each step's explanation sits above its code.
 *
 * The specs read the fixture guide at tests/fixtures/guides/shaders/264.md.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test.ts';

const GUIDE = '/guides/shaders/264/';
const STEP_2 = 'Step 2: Shape each flute in one primitive';
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

/** True when `upper` ends at or above the line where `lower` starts. */
async function isAbove(upper: Locator, lower: Locator): Promise<boolean> {
	const [a, b] = await Promise.all([upper.boundingBox(), lower.boundingBox()]);
	return !!a && !!b && a.y + a.height <= b.y;
}

/** True when `inner` lies between `column`'s left and right edges. */
async function isInColumn(inner: Locator, column: Locator): Promise<boolean> {
	const [a, b] = await Promise.all([inner.boundingBox(), column.boundingBox()]);
	return !!a && !!b && a.x >= b.x && a.x + a.width <= b.x + b.width;
}

/** True when `right` starts at or right of the line where `left` ends. */
async function isBeside(left: Locator, right: Locator): Promise<boolean> {
	const [a, b] = await Promise.all([left.boundingBox(), right.boundingBox()]);
	return !!a && !!b && a.x + a.width <= b.x;
}

async function scrollsSideways(page: Page): Promise<boolean> {
	return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

/** The parts of step 2 that the layout arranges: its block, its header, its explanation, and its first file's code. */
function step2(page: Page) {
	return {
		block: page.getByRole('article', { name: STEP_2 }),
		header: page.getByRole('button', { name: STEP_2 }),
		explanation: page.getByRole('region', { name: STEP_2 }),
		code: page.getByRole('article', { name: STEP_2 }).getByRole('table').first(),
	};
}

test.describe('on a narrow viewport', () => {
	test.use({ viewport: PHONE });

	test('the overview sits above the steps, and the page does not scroll sideways', async ({ page }) => {
		await page.goto(GUIDE);
		const overview = page.getByRole('region', { name: 'Overview' });
		const steps = page.getByRole('region', { name: 'Steps' });

		await expect.poll(() => isInColumn(overview, steps)).toBe(true);
		await expect.poll(() => isAbove(overview, steps)).toBe(true);
		expect(await scrollsSideways(page)).toBe(false);
	});

	test('a selected step’s explanation sits between its header and its code', async ({ page }) => {
		await page.goto(GUIDE);
		const { block, header, explanation, code } = step2(page);

		await header.click();

		await expect(explanation).toBeVisible();
		await expect.poll(() => isInColumn(explanation, block)).toBe(true);
		await expect.poll(() => isAbove(header, explanation)).toBe(true);
		await expect.poll(() => isAbove(explanation, code)).toBe(true);
		expect(await scrollsSideways(page)).toBe(false);
	});
});

test('a window that narrows stacks the panes, and one that widens puts them side by side again', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto(GUIDE);
	const { block, header, explanation, code } = step2(page);
	await header.click();
	await expect.poll(() => isBeside(code, explanation)).toBe(true);

	await page.setViewportSize(PHONE);
	await expect.poll(() => isInColumn(explanation, block)).toBe(true);
	await expect.poll(() => isAbove(explanation, code)).toBe(true);

	await page.setViewportSize(DESKTOP);
	await expect.poll(() => isBeside(code, explanation)).toBe(true);
});
