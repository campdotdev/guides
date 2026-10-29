/** A GitHub repository, such as campdotdev/shaders. */
export interface RepoRef {
	owner: string;
	repo: string;
}

/**
 * A pull request pinned to the base and head commits that a guide describes.
 * The diff starts from the merge base of the two commits, which `Comparison` names.
 */
export interface PullRequestRef extends RepoRef {
	pr: number;
	baseSha: string;
	headSha: string;
}

/** GitHub's DiffEntry statuses. */
export type FileStatus =
	| 'added'
	| 'removed'
	| 'modified'
	| 'renamed'
	| 'copied'
	| 'changed'
	| 'unchanged';

/** One file that a pull request changes, as GitHub's compare view lists it. */
export interface ChangedFile {
	path: string;
	/** The path at the base commit. GitHub sets it only for renamed and copied files. */
	previousPath?: string;
	status: FileStatus;
	/** The blob SHA at the head commit, or the deleted blob's SHA for a removed file. */
	blobSha: string;
	additions: number;
	deletions: number;
	/** GitHub's unified-diff hunks. GitHub leaves it out for binary files and pure renames. */
	patch?: string;
}

/** GitHub's compare view of a pull request's base and head commits. */
export interface Comparison {
	/**
	 * The commit the diff starts from: the merge base of `baseSha` and `headSha`.
	 * It is `baseSha` unless the base branch moved on after the pull request's branch left it.
	 */
	mergeBaseSha: string;
	/** The files that changed between the merge base and the head commit. */
	files: ChangedFile[];
}

/**
 * Where the renderer reads a pull request's files from.
 * Production reads the GitHub API. Tests read a recorded snapshot.
 */
export interface RepoFileSource {
	/** Compares the pull request's base and head commits. */
	compare(pull: PullRequestRef): Promise<Comparison>;
	/** Returns a file's bytes at a commit, or null when the path does not exist at that commit. */
	readFile(repo: RepoRef, path: string, commitSha: string): Promise<Uint8Array | null>;
}
