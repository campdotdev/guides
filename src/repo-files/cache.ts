import { randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { comparePath, filePath, readSnapshotFile } from './fixture.ts';
import type { Comparison, PullRequestRef, RepoFileSource, RepoRef } from './types.ts';

/**
 * Wraps a repo file source with a cache in `dir`.
 * A file at a commit never changes, and neither does the comparison of two commits, so an entry never goes stale.
 * The cache uses the snapshot layout that the fixture source reads.
 *
 * Each read that misses the cache logs one line, so the build log lists every request the build made.
 */
export function cachedRepoFileSource(source: RepoFileSource, dir: string, log: (line: string) => void = console.log): RepoFileSource {
	return {
		async compare(pull: PullRequestRef): Promise<Comparison> {
			const path = comparePath(dir, pull);
			const cached = await readSnapshotFile(path);
			if (cached) return JSON.parse(new TextDecoder().decode(cached)) as Comparison;
			log(`Fetched the files that ${pull.owner}/${pull.repo}#${pull.pr} changes`);
			const comparison = await source.compare(pull);
			await writeCached(path, `${JSON.stringify(comparison, null, '\t')}\n`);
			return comparison;
		},

		async readFile(repo: RepoRef, path: string, commitSha: string): Promise<Uint8Array | null> {
			const cachePath = filePath(dir, repo, path, commitSha);
			const cached = await readSnapshotFile(cachePath);
			if (cached) return cached;
			log(`Fetched ${repo.owner}/${repo.repo} ${path} at ${commitSha.slice(0, 7)}`);
			const bytes = await source.readFile(repo, path, commitSha);
			// The cache keeps no record of a missing path. The renderer reads only paths that the file list names.
			if (bytes !== null) await writeCached(cachePath, bytes);
			return bytes;
		},
	};
}

/** Writes through a temporary file, so a build that stops partway never leaves a truncated entry. */
async function writeCached(path: string, data: string | Uint8Array): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.${randomUUID()}.tmp`;
	await writeFile(temporary, data);
	await rename(temporary, path);
}
