import { cachedRepoFileSource } from './cache.ts';
import { fixtureRepoFileSource } from './fixture.ts';
import { githubRepoFileSource } from './github.ts';
import type { RepoFileSource } from './types.ts';

export type { ChangedFile, Comparison, FileStatus, PullRequestRef, RepoFileSource, RepoRef } from './types.ts';
export { pullRequestName, shortSha } from './names.ts';
export { diffCommits, fileVersions, type DiffCommits, type FileVersion } from './versions.ts';

/** The snapshot the fixture source reads when `REPO_FILE_FIXTURES` is unset. */
export const DEFAULT_FIXTURE_DIR = 'tests/fixtures/repo-files';

/**
 * Picks the repo file source from `REPO_FILE_SOURCE`:
 * `github` reads the GitHub API with `GITHUB_TOKEN`, and `fixture` (the default) reads `REPO_FILE_FIXTURES`.
 * When `REPO_FILE_CACHE` names a directory, the source caches every file it reads there.
 */
export function repoFileSource(): RepoFileSource {
	const source = uncachedSource();
	const cache = process.env.REPO_FILE_CACHE;
	return cache ? cachedRepoFileSource(source, cache) : source;
}

function uncachedSource(): RepoFileSource {
	const kind = process.env.REPO_FILE_SOURCE ?? 'fixture';
	if (kind === 'fixture') return fixtureRepoFileSource(process.env.REPO_FILE_FIXTURES ?? DEFAULT_FIXTURE_DIR);
	if (kind === 'github') {
		const token = process.env.GITHUB_TOKEN;
		if (!token) throw new Error('REPO_FILE_SOURCE=github needs a GITHUB_TOKEN.');
		return githubRepoFileSource(token);
	}
	throw new Error(`REPO_FILE_SOURCE must be "github" or "fixture", not "${kind}".`);
}
