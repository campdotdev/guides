/**
 * SHA-281: "N unchanged lines" separators above, below, and between the hunks a step shows.
 *
 * The expected counts and lines come from the recorded snapshots in tests/fixtures/repo-files.
 */
import { expect, test } from './test.ts';

test('a hunk has a separator above and below it that counts the hidden lines', async ({ page }) => {
	await page.goto('/guides/shaders/264/');
	await page.getByRole('button', { name: 'Step 2: Shape each flute in one primitive' }).click();

	// engine.ts has 130 lines at the head commit, and the pointer shows GitHub's hunk, lines 67 to 78.
	const engine = page.getByRole('table', { name: 'packages/shaders/src/engine.ts' });
	const above = engine.getByRole('button', { name: '66 unchanged lines' });
	const below = engine.getByRole('button', { name: '52 unchanged lines' });
	await expect(above).toHaveAttribute('aria-expanded', 'false');
	await expect(below).toHaveAttribute('aria-expanded', 'false');
	await expect(engine.getByRole('row', { name: /^1 1 / })).toHaveCount(0);
});

test('clicking a separator shows the real lines, and clicking it again hides them', async ({ page }) => {
	await page.goto('/guides/shaders/264/');
	await page.getByRole('button', { name: 'Step 2: Shape each flute in one primitive' }).click();
	const engine = page.getByRole('table', { name: 'packages/shaders/src/engine.ts' });
	const first = engine.getByRole('row', {
		name: '1 1 // The framework-free half of @camp-dev/shaders: TSL primitives, the renderer,',
	});
	const last = engine.getByRole('row', {
		name: "124 130 export type { SchedulerTick, SchedulerClient } from './runtime/frame-scheduler/frame-scheduler.js';",
	});

	await engine.getByRole('button', { name: '66 unchanged lines' }).click();
	await expect(engine.getByRole('button', { name: '66 unchanged lines' })).toHaveAttribute('aria-expanded', 'true');
	await expect(first).toBeVisible();
	await expect(
		engine.getByRole('row', { name: "66 66 export { signedDistanceFieldCross } from './primitives/sdf-cross/sdf-cross.js';" }),
	).toBeVisible();
	await expect(last).toBeHidden();

	// Below the hunk, the base and head line numbers differ by the 6 lines the hunk adds.
	await engine.getByRole('button', { name: '52 unchanged lines' }).click();
	await expect(engine.getByRole('row', { name: "73 79 export { elapsedTime } from './primitives/time/time.js';" })).toBeVisible();
	await expect(last).toBeVisible();

	await engine.getByRole('button', { name: '66 unchanged lines' }).click();
	await expect(engine.getByRole('button', { name: '66 unchanged lines' })).toHaveAttribute('aria-expanded', 'false');
	await expect(first).toBeHidden();
});

test('a pointer range that spans two hunks shows both, with a separator between them', async ({ page }) => {
	await page.goto('/guides/shaders/169/');
	await page.getByRole('button', { name: 'Step 1: Pass the shape to the shader' }).click();

	// dot-field.tsx#L75-L92 spans GitHub's second hunk (head lines 72-78) and its third (89-95).
	// The rows above the second hunk hold the first hunk, with 22 added and 2 removed lines.
	const component = page.getByRole('table', { name: 'packages/shaders/src/components/dot-field/dot-field.tsx' });
	await expect(component.getByRole('row', { name: /^@@ |^\d+ (unchanged|more) / })).toHaveText([
		'73 more lines, 24 changed',
		/^@@ -52,6 \+72,7 @@ export interface DotFieldProps \{/,
		'10 unchanged lines',
		/^@@ -68,6 \+89,7 @@ export function DotField\(\{/,
		'3 unchanged lines',
	]);

	await component.getByRole('button', { name: '10 unchanged lines' }).click();
	await expect(component.getByRole('row', { name: '58 79 speed = 0.45,' })).toBeVisible();
	await expect(component.getByRole('row', { name: '67 88 center={center}' })).toBeVisible();
});

test('the format reference explains what each separator hides', async ({ page }) => {
	await page.goto('/guides/format/');

	await expect(page.getByRole('heading', { level: 2, name: 'Separators' })).toBeVisible();
	const separators = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Separator' }) });
	for (const label of ['12 unchanged lines', '87 more added lines', '60 more removed lines', '73 more lines, 24 changed']) {
		await expect(separators.getByRole('cell', { name: label, exact: true })).toBeVisible();
	}
});
