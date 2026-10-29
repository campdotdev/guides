/**
 * SHA-281: block pointers into new, deleted, and renamed files render as that kind of change.
 *
 * #264 adds files, #193 deletes files, #169 renames a file and edits it, and #232 renames a file without edits.
 * The expected rows come from the recorded snapshots in tests/fixtures/repo-files.
 */
import { expect, test } from './test.ts';

/** Rows for unchanged lines carry both line numbers. Rows for changed lines carry one, then "added" or "removed". */
const UNCHANGED_ROW = /^\d+ \d+( |$)/;
const ADDED_ROW = /^\d+ added( |$)/;
const REMOVED_ROW = /^\d+ removed( |$)/;

test('a pointer into a new file shows only added lines', async ({ page }) => {
	await page.goto('/guides/shaders/264/');
	await page.getByRole('button', { name: 'Step 1: Mount FlutedGlass after a Source' }).click();

	// fluted-glass.tsx has 120 lines, and the pointer shows lines 88 to 103.
	const component = page.getByRole('table', { name: 'packages/shaders/src/components/fluted-glass/fluted-glass.tsx' });
	await expect(component).toHaveAccessibleDescription('New file');
	await expect(component.getByRole('row', { name: ADDED_ROW })).toHaveCount(16);
	await expect(component.getByRole('row', { name: UNCHANGED_ROW })).toHaveCount(0);
	await expect(component.getByRole('row', { name: REMOVED_ROW })).toHaveCount(0);

	await component.getByRole('button', { name: '87 more added lines' }).click();
	await expect(component.getByRole('row', { name: "1 added 'use client';" })).toBeVisible();
	await expect(component.getByRole('button', { name: '17 more added lines' })).toBeVisible();
});

test('a pointer into a deleted file shows only removed lines, numbered at the base commit', async ({ page }) => {
	await page.goto('/guides/shaders/193/');
	await page.getByRole('button', { name: 'Step 1: Delete LiveDemo' }).click();

	// LiveDemo.tsx had 82 lines at the base commit, and the pointer is #L13-L19 there, so rows 10 to 22 show.
	const demo = page.getByRole('table', { name: 'apps/docs/src/components/LiveDemo.tsx' });
	await expect(demo).toHaveAccessibleDescription('Deleted file');
	await expect(demo.getByRole('row', { name: /^@@ -10,13 \+0,0 @@/ })).toBeVisible();
	await expect(demo.getByRole('row', { name: REMOVED_ROW })).toHaveCount(13);
	await expect(demo.getByRole('row', { name: '13 removed export function LiveDemo({' })).toBeVisible();
	await expect(demo.getByRole('row', { name: UNCHANGED_ROW })).toHaveCount(0);
	await expect(demo.getByRole('row', { name: ADDED_ROW })).toHaveCount(0);
	await expect(demo.getByRole('button', { name: '9 more removed lines' })).toBeVisible();
	await expect(demo.getByRole('button', { name: '60 more removed lines' })).toBeVisible();
});

test('a pointer into a renamed file shows both paths and the edits', async ({ page }) => {
	await page.goto('/guides/shaders/169/');
	await page.getByRole('button', { name: 'Step 2: Rename the review-feedback skill' }).click();

	const skill = page.getByRole('table', { name: '.agents/skills/resolve-pr-feedback/SKILL.md' });
	await expect(skill).toHaveAccessibleDescription('Renamed from .agents/skills/resolve-coderabbit-feedback/SKILL.md');
	await expect(skill.getByRole('row', { name: '2 removed name: resolve-coderabbit-feedback' })).toBeVisible();
	await expect(skill.getByRole('row', { name: '2 added name: resolve-pr-feedback' })).toBeVisible();
	await expect(skill.getByRole('row', { name: '1 1 ---' })).toBeVisible();
});

test('a pointer into a file renamed without edits shows its lines as unchanged', async ({ page }) => {
	await page.goto('/guides/shaders/232/');
	await page.getByRole('button', { name: 'Step 1: Rename the glossary' }).click();

	// GitHub shows no diff for a pure rename. GLOSSARY.md has 85 lines, and the pointer is #L1-L3.
	const glossary = page.getByRole('table', { name: 'GLOSSARY.md' });
	await expect(glossary).toHaveAccessibleDescription('Renamed from CONTEXT.md');
	await expect(glossary.getByRole('row', { name: /^@@ -1,6 \+1,6 @@/ })).toBeVisible();
	await expect(glossary.getByRole('row', { name: UNCHANGED_ROW })).toHaveCount(6);
	await expect(glossary.getByRole('row', { name: '1 1 # Shaders' })).toBeVisible();
	await expect(glossary.getByRole('row', { name: /^\d+ (added|removed)( |$)/ })).toHaveCount(0);
	await expect(glossary.getByRole('button', { name: '79 unchanged lines' })).toBeVisible();
});

test('the format reference says how pointers behave in new, deleted, and renamed files', async ({ page }) => {
	await page.goto('/guides/format/');

	await expect(page.getByRole('heading', { level: 2, name: 'New, deleted, and renamed files' })).toBeVisible();
	const kinds = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Line numbers' }) });
	for (const kind of ['New', 'Deleted', 'Renamed', 'Renamed without edits']) {
		await expect(kinds.getByRole('cell', { name: kind, exact: true })).toBeVisible();
	}
});
