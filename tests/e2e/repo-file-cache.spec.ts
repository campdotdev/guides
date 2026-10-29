/**
 * SHA-281: a file at a given commit never changes, so the build caches what it reads from the repo file source.
 *
 * Both builds share one REPO_FILE_CACHE directory. The second build reads from an empty snapshot,
 * so any read that misses the cache fails the build or shows in its log.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { FIXTURE_BUILD_ENV } from '../fixture-build.ts';

const GUIDE_PAGES = ['shaders/169', 'shaders/193', 'shaders/232', 'shaders/264'];

function build(env: Record<string, string>): { status: number | null; output: string; pages: string[] } {
	const outDir = mkdtempSync(join(tmpdir(), 'guides-cache-build-'));
	try {
		const result = spawnSync('pnpm', ['exec', 'astro', 'build', '--outDir', outDir], {
			env: { ...process.env, ...FIXTURE_BUILD_ENV, ...env },
			encoding: 'utf8',
		});
		const output = `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, '');
		const pages = result.status === 0 ? GUIDE_PAGES.map((page) => readFileSync(join(outDir, page, 'index.html'), 'utf8')) : [];
		return { status: result.status, output, pages };
	} finally {
		rmSync(outDir, { recursive: true, force: true });
	}
}

test('a second build reads every file from the cache and fetches nothing', () => {
	test.setTimeout(120_000);
	const cache = mkdtempSync(join(tmpdir(), 'guides-repo-file-cache-'));
	const emptySnapshot = mkdtempSync(join(tmpdir(), 'guides-empty-snapshot-'));
	try {
		const first = build({ REPO_FILE_CACHE: cache });
		expect(first.status, first.output).toBe(0);
		expect(first.output).toContain('Fetched the files that campdotdev/shaders#264 changes');
		expect(first.output).toContain('Fetched campdotdev/shaders packages/shaders/src/engine.ts at 84cc417');
		expect(first.output).toContain('Fetched campdotdev/shaders packages/shaders/src/engine.ts at 60b67b5');

		const second = build({ REPO_FILE_CACHE: cache, REPO_FILE_FIXTURES: emptySnapshot });
		expect(second.status, second.output).toBe(0);
		expect(second.output).not.toContain('Fetched');
		expect(second.pages).toEqual(first.pages);
	} finally {
		rmSync(cache, { recursive: true, force: true });
		rmSync(emptySnapshot, { recursive: true, force: true });
	}
});
