import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pullRequestName } from './names.ts';
import type { Comparison, PullRequestRef, RepoFileSource, RepoRef } from './types.ts';

/**
 * Where a recorded snapshot keeps the comparison of a base and head pair: the merge base and the changed files.
 * `scripts/record-fixture.ts` writes to the same paths.
 */
export function comparePath(dir: string, pull: PullRequestRef): string {
	return join(dir, pull.owner, pull.name, 'compare', `${pull.baseSha}...${pull.headSha}.json`);
}

/** Where a recorded snapshot keeps one file's bytes at one commit. */
export function filePath(dir: string, repo: RepoRef, path: string, commitSha: string): string {
	return join(dir, repo.owner, repo.name, 'files', commitSha, path);
}

/** Serves files from a snapshot that `scripts/record-fixture.ts` recorded. It never touches the network. */
export function fixtureRepoFileSource(dir: string): RepoFileSource {
	return {
		async compare(pull: PullRequestRef): Promise<Comparison> {
			const path = comparePath(dir, pull);
			const json = await readFile(path, 'utf8').catch((error: NodeJS.ErrnoException) => {
				if (error.code !== 'ENOENT') throw error;
				throw new Error(
					`No fixture snapshot for ${pullRequestName(pull)} at ${path}. Record one with \`pnpm record-fixture <guide file>\`.`,
				);
			});
			return JSON.parse(json) as Comparison;
		},

		async readFile(repo: RepoRef, path: string, commitSha: string): Promise<Uint8Array | null> {
			return readSnapshotFile(filePath(dir, repo, path, commitSha));
		},
	};
}

/** The bytes of a file in a snapshot, or null when the snapshot has no file at `path`. */
export async function readSnapshotFile(path: string): Promise<Uint8Array | null> {
	try {
		return new Uint8Array(await readFile(path));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw error;
	}
}
