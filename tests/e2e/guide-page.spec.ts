/**
 * SHA-280: a guide file renders as a two-pane page.
 *
 * The specs read the fixture guide at tests/fixtures/guides/shaders/264.md.
 * The build serves #264's files from the snapshot in tests/fixtures/repo-files, so nothing touches the network.
 */
import { expect, test } from './test.ts';

const GUIDE = '/guides/shaders/264/';

test('the right pane shows the overview before any click', async ({ page }) => {
	await page.goto(GUIDE);

	await expect(page.getByRole('heading', { level: 1, name: 'feat(shaders): add FlutedGlass' })).toBeVisible();
	const explanation = page.getByRole('region', { name: 'Explanation' });
	await expect(explanation.getByRole('heading', { name: 'Overview' })).toBeVisible();
	for (const part of ['Why', 'Behavior change', 'Checks', 'Not covered']) {
		await expect(explanation.getByRole('heading', { name: part, exact: true })).toBeVisible();
	}
});

test('the header links the pull request and names the commit the guide describes', async ({ page }) => {
	await page.goto(GUIDE);

	const header = page.getByRole('banner');
	await expect(header.getByRole('link', { name: 'campdotdev/shaders#264' })).toHaveAttribute(
		'href',
		'https://github.com/campdotdev/shaders/pull/264',
	);
	await expect(header.getByRole('link', { name: '84cc417' })).toHaveAttribute(
		'href',
		'https://github.com/campdotdev/shaders/commit/84cc41703117a566f6e181dd8aec5ec7ce889521',
	);
	// The fixture sets afterTheFact: true.
	await expect(header.getByText('Written after the fact from the diff, without the session’s reasoning.')).toBeVisible();
});

test('each step starts as a collapsed block in the left pane', async ({ page }) => {
	await page.goto(GUIDE);

	const steps = page.getByRole('region', { name: 'Steps' });
	const toggles = steps.getByRole('button', { name: /^Step \d+: / });
	await expect(toggles).toHaveText([
		'Step 1: Mount FlutedGlass after a Source',
		'Step 2: Shape each flute in one primitive',
	]);
	for (const toggle of await toggles.all()) {
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	}
	await expect(steps.getByRole('table')).toHaveCount(0);
});

test('clicking a step expands its hunks and shows its explanation', async ({ page }) => {
	await page.goto(GUIDE);
	const steps = page.getByRole('region', { name: 'Steps' });
	const explanation = page.getByRole('region', { name: 'Explanation' });
	const title = 'Step 2: Shape each flute in one primitive';

	await steps.getByRole('button', { name: title }).click();

	await expect(steps.getByRole('button', { name: title })).toHaveAttribute('aria-expanded', 'true');
	const step = steps.getByRole('article', { name: title });
	await expect(step.getByRole('table')).toHaveCount(2);
	await expect(step.getByRole('table', { name: 'packages/shaders/src/primitives/flute-surface/flute-surface.ts' })).toBeVisible();
	await expect(step.getByRole('table', { name: 'packages/shaders/src/engine.ts' })).toBeVisible();
	await expect(explanation.getByRole('heading', { name: title })).toBeVisible();
	await expect(explanation.getByText(/works out how steep the glass is/)).toBeVisible();
	await expect(explanation.getByRole('heading', { name: 'Overview' })).toBeHidden();
	await expect(steps.getByRole('button', { name: /^Step 1: / })).toHaveAttribute('aria-expanded', 'false');
});

test('a block pointer that covers a whole change shows GitHub’s hunk', async ({ page }) => {
	await page.goto(GUIDE);
	await page.getByRole('button', { name: 'Step 2: Shape each flute in one primitive' }).click();

	// engine.ts#L70-L75 covers every added line, so the hunk is the one GitHub shows for #264.
	const engine = page.getByRole('table', { name: 'packages/shaders/src/engine.ts' });
	await expect(engine.getByRole('row', { name: /^@@ -67,6 \+67,12 @@/ })).toBeVisible();
	await expect(
		engine.getByRole('row', { name: "70 added export { fluteSurface } from './primitives/flute-surface/flute-surface.js';" }),
	).toBeVisible();
});

test('a block pointer shows its lines with three lines of context', async ({ page }) => {
	await page.goto(GUIDE);
	await page.getByRole('button', { name: 'Step 1: Mount FlutedGlass after a Source' }).click();

	// fluted-glass.tsx is a new file and the pointer is #L91-L100, so the hunk runs from line 88 to line 103.
	const component = page.getByRole('table', { name: 'packages/shaders/src/components/fluted-glass/fluted-glass.tsx' });
	await expect(component.getByRole('row', { name: /^@@ -0,0 \+88,16 @@/ })).toBeVisible();
	const lines = component.getByRole('row', { name: /^\d+ added/ });
	await expect(lines).toHaveCount(16);
	await expect(lines.first()).toHaveAccessibleName(/^88 added/);
	await expect(lines.last()).toHaveAccessibleName(/^103 added/);
});

test('opening another step closes the open one, and closing a step brings back the overview', async ({ page }) => {
	await page.goto(GUIDE);
	const steps = page.getByRole('region', { name: 'Steps' });
	const explanation = page.getByRole('region', { name: 'Explanation' });
	const first = steps.getByRole('button', { name: /^Step 1: / });
	const second = steps.getByRole('button', { name: /^Step 2: / });

	await first.click();
	await second.click();
	await expect(first).toHaveAttribute('aria-expanded', 'false');
	await expect(explanation.getByRole('heading', { name: /^Step 1: / })).toBeHidden();
	await expect(explanation.getByRole('heading', { name: /^Step 2: / })).toBeVisible();

	await second.click();
	await expect(second).toHaveAttribute('aria-expanded', 'false');
	await expect(explanation.getByRole('heading', { name: 'Overview' })).toBeVisible();
	await expect(explanation.getByRole('heading', { name: /^Step 2: / })).toBeHidden();
});
