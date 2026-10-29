import type { ChangedFile, Comparison, PullRequestRef } from './types.ts';

/** A file's path at one commit. */
export interface FileVersion {
	path: string;
	commitSha: string;
}

/** The commits a pull request's diff runs between: the merge base and the head commit. */
export interface DiffCommits {
	baseSha: string;
	headSha: string;
}

/** The commits that a pull request's comparison diffs. */
export function diffCommits(pull: PullRequestRef, comparison: Comparison): DiffCommits {
	return { baseSha: comparison.mergeBaseSha, headSha: pull.headSha };
}

/**
 * A changed file's versions at the base and head commits of a diff. An added file has no base version,
 * and a deleted file has no head version. A renamed or copied file sits at its previous path at the base commit.
 */
export function fileVersions(file: ChangedFile, commits: DiffCommits): { base: FileVersion | null; head: FileVersion | null } {
	return {
		base: file.status === 'added' ? null : { path: file.basePath ?? file.path, commitSha: commits.baseSha },
		head: file.status === 'removed' ? null : { path: file.path, commitSha: commits.headSha },
	};
}
