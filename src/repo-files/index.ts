import { fixtureRepoFileSource } from './fixture.ts';
import { githubRepoFileSource } from './github.ts';
import type { RepoFileSource } from './types.ts';

export type { ChangedFile, FileStatus, PullRequestRef, RepoFileSource, RepoRef } from './types.ts';

/** The snapshot the fixture source reads when `REPO_FILE_FIXTURES` is unset. */
export const DEFAULT_FIXTURE_DIR = 'tests/fixtures/repo-files';

/**
 * Picks the repo file source from `REPO_FILE_SOURCE`:
 * `github` reads the GitHub API with `GITHUB_TOKEN`, and `fixture` (the default) reads `REPO_FILE_FIXTURES`.
 */
export function repoFileSource(env: NodeJS.ProcessEnv = process.env): RepoFileSource {
	const kind = env.REPO_FILE_SOURCE ?? 'fixture';
	if (kind === 'fixture') return fixtureRepoFileSource(env.REPO_FILE_FIXTURES ?? DEFAULT_FIXTURE_DIR);
	if (kind === 'github') {
		const token = env.GITHUB_TOKEN;
		if (!token) throw new Error('REPO_FILE_SOURCE=github needs a GITHUB_TOKEN.');
		return githubRepoFileSource(token);
	}
	throw new Error(`REPO_FILE_SOURCE must be "github" or "fixture", not "${kind}".`);
}
