/**
 * SHA-284: a reader can link to a step and move between steps with `j` and `k`.
 *
 * A click, a key, and a `#step-<n>` anchor all select a step the same way.
 * The URL's anchor always names the selected step.
 * The specs read the fixture guide at tests/fixtures/guides/shaders/264.md, which has three steps.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test.ts';

const GUIDE = '/guides/shaders/264/';
const STEPS = [
	'Step 1: Mount FlutedGlass after a Source',
	'Step 2: Shape each flute in one primitive',
	'Step 3: Record the default look as a baseline',
];

/** Asserts that step `n` is the one selected step: its block is expanded, its explanation shows, and the URL names it. */
async function expectSelected(page: Page, n: number) {
	const steps = page.getByRole('region', { name: 'Steps' });
	for (const [index, title] of STEPS.entries()) {
		await expect(steps.getByRole('button', { name: title })).toHaveAttribute('aria-expanded', String(index + 1 === n));
	}
	const title = STEPS[n - 1];
	await expect(steps.getByRole('article', { name: title }).getByRole('table').first()).toBeVisible();
	await expect(page.getByRole('region', { name: title })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Overview' })).toBeHidden();
	await expect(page).toHaveURL(new RegExp(`#step-${n}$`));
}

const WAYS_TO_SELECT_STEP_2: Record<string, (page: Page) => Promise<void>> = {
	'opening the guide at #step-2': async (page) => {
		await page.goto(`${GUIDE}#step-2`);
	},
	'clicking its header': async (page) => {
		await page.goto(GUIDE);
		await page.getByRole('button', { name: STEPS[1] }).click();
	},
	'pressing j twice': async (page) => {
		await page.goto(GUIDE);
		await page.keyboard.press('j');
		await page.keyboard.press('j');
	},
};

for (const [way, select] of Object.entries(WAYS_TO_SELECT_STEP_2)) {
	test(`${way} selects step 2 and puts its anchor in the URL`, async ({ page }) => {
		await select(page);
		await expectSelected(page, 2);
	});
}

test('closing the open step removes the anchor from the URL', async ({ page }) => {
	await page.goto(`${GUIDE}#step-2`);

	await page.getByRole('button', { name: STEPS[1] }).click();

	await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
	await expect(page).toHaveURL(new RegExp(`${GUIDE}$`));
});

test('an anchor to a step the guide does not have shows the overview', async ({ page }) => {
	await page.goto(`${GUIDE}#step-9`);

	await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
	for (const title of STEPS) {
		await expect(page.getByRole('button', { name: title })).toHaveAttribute('aria-expanded', 'false');
	}
});

test('changing the anchor selects the step it names, and Back selects the previous one', async ({ page }) => {
	await page.goto(`${GUIDE}#step-1`);

	await page.goto(`${GUIDE}#step-2`);
	await expectSelected(page, 2);

	await page.goBack();
	await expectSelected(page, 1);
});

test('j and k move one step at a time and stop at the first and last step', async ({ page }) => {
	await page.goto(GUIDE);

	// The overview comes before step 1, so k has nowhere to go.
	await page.keyboard.press('k');
	await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

	await page.keyboard.press('j');
	await expectSelected(page, 1);
	await page.keyboard.press('j');
	await expectSelected(page, 2);
	await page.keyboard.press('j');
	await expectSelected(page, 3);
	await page.keyboard.press('j');
	await expectSelected(page, 3);
	await page.keyboard.press('k');
	await expectSelected(page, 2);
	await page.keyboard.press('k');
	await expectSelected(page, 1);
	await page.keyboard.press('k');
	await expectSelected(page, 1);
});

test('j and k typed into a form field leave the selection alone', async ({ page }) => {
	await page.goto(GUIDE);
	// The guide page has no form field of its own, so the spec adds one.
	await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<input aria-label="Note">'));
	const field = page.getByRole('textbox', { name: 'Note' });

	await field.pressSequentially('jk');

	await expect(field).toHaveValue('jk');
	await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
	await expect(page).toHaveURL(new RegExp(`${GUIDE}$`));
});

test('j and k with a modifier key leave the selection alone', async ({ page }) => {
	await page.goto(GUIDE);

	for (const key of ['Control+j', 'Meta+j', 'Control+k', 'Meta+k']) await page.keyboard.press(key);

	await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
});

test('j and k move focus to the selected step’s header, the way a click does', async ({ page }) => {
	await page.goto(GUIDE);

	await page.keyboard.press('j');
	await expect(page.getByRole('button', { name: STEPS[0] })).toBeFocused();
	await page.keyboard.press('j');
	await expect(page.getByRole('button', { name: STEPS[1] })).toBeFocused();
	await page.keyboard.press('k');
	await expect(page.getByRole('button', { name: STEPS[0] })).toBeFocused();
});
