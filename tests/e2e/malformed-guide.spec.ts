/**
 * SHA-280: a malformed guide fails the build with an error that names the bad field.
 *
 * Each case builds the site from its own guides directory under tests/fixtures/malformed.
 * The cases cover the three places a guide is checked: the frontmatter schema, the body's structure,
 * and the pointers against the pull request's files.
 * Each build writes to a temporary directory, so the dist/ that the preview server serves stays put.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { FIXTURE_BUILD_ENV } from '../fixture-build.ts';

function build(guidesDir: string): { status: number | null; output: string } {
	const outDir = mkdtempSync(join(tmpdir(), 'guides-malformed-'));
	try {
		const result = spawnSync('pnpm', ['exec', 'astro', 'build', '--outDir', outDir], {
			env: { ...process.env, ...FIXTURE_BUILD_ENV, GUIDES_DIR: guidesDir },
			encoding: 'utf8',
		});
		// Playwright sets FORCE_COLOR, so strip the color codes Astro adds around field names.
		const output = `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, '');
		return { status: result.status, output };
	} finally {
		rmSync(outDir, { recursive: true, force: true });
	}
}

const cases = [
	{
		guide: 'a headSha that is not a full commit SHA',
		dir: 'short-head-sha',
		error: /headSha: Expected a full 40-character lowercase commit SHA/,
	},
	{
		guide: 'a block pointer whose range ends before it starts',
		dir: 'backward-range',
		error: /Invalid guide shaders\/264\.md: steps\.1\.pointers\.2: "#L39-L37" is not a line range/,
	},
	{
		guide: 'a block pointer to a file the pull request does not change',
		dir: 'unchanged-file',
		error: /Invalid guide shaders\/264\.md: steps\.2\.pointers\.1: packages\/shaders\/src\/index\.ts is not a file that campdotdev\/shaders#264 changes/,
	},
];

for (const { guide, dir, error } of cases) {
	test(`a guide with ${guide} fails the build and names the field`, () => {
		test.setTimeout(60_000);
		const result = build(`tests/fixtures/malformed/${dir}`);
		expect(result.status).not.toBe(0);
		expect(result.output).toMatch(error);
	});
}
