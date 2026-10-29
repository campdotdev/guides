import type { ChangedFile, Comparison, FileStatus, PullRequestRef, RepoFileSource, RepoRef } from './types.ts';

const API = 'https://api.github.com';

/** GitHub's compare endpoint lists at most this many files. */
const COMPARE_FILE_CAP = 300;

interface DiffEntry {
	filename: string;
	previous_filename?: string;
	status: FileStatus;
	sha: string;
	additions: number;
	deletions: number;
	patch?: string;
}

/**
 * Reads files from the GitHub REST API.
 * The file list comes from `compare/{base}...{head}`, which never changes for fixed SHAs.
 * The PR's own files endpoint always follows the PR's current head instead.
 * Compare diffs the head against the merge base of the two commits, so the source returns that commit too.
 */
export function githubRepoFileSource(token: string): RepoFileSource {
	async function get(path: string, accept: string): Promise<Response> {
		return fetch(`${API}${path}`, {
			headers: {
				Accept: accept,
				Authorization: `Bearer ${token}`,
				'User-Agent': 'campdotdev-guides',
				'X-GitHub-Api-Version': '2022-11-28',
			},
		});
	}

	return {
		async compare(pull: PullRequestRef): Promise<Comparison> {
			const path = `/repos/${pull.owner}/${pull.name}/compare/${pull.baseSha}...${pull.headSha}`;
			const response = await get(path, 'application/vnd.github+json');
			if (!response.ok) throw await requestError(path, response);
			const body = (await response.json()) as { merge_base_commit: { sha: string }; files?: DiffEntry[] };
			const files = body.files ?? [];
			if (files.length >= COMPARE_FILE_CAP) {
				throw new Error(
					`${path} lists ${files.length} files, which is GitHub's cap for compare. The guide renderer cannot tell whether files are missing.`,
				);
			}
			return { mergeBaseSha: body.merge_base_commit.sha, files: files.map(toChangedFile) };
		},

		async readFile(repo: RepoRef, filePath: string, commitSha: string): Promise<Uint8Array | null> {
			// The Contents API serves a symlink's target in place of the link, but its `sha` names the path's own blob.
			// Read that blob, so a symlink comes back as the link and hashes to the blob SHA that compare lists.
			const encoded = filePath.split('/').map(encodeURIComponent).join('/');
			const contentsPath = `/repos/${repo.owner}/${repo.name}/contents/${encoded}?ref=${commitSha}`;
			const contents = await get(contentsPath, 'application/vnd.github.object');
			if (contents.status === 404) return null;
			if (!contents.ok) throw await requestError(contentsPath, contents);
			const { sha } = (await contents.json()) as { sha: string };
			const blobPath = `/repos/${repo.owner}/${repo.name}/git/blobs/${sha}`;
			const blob = await get(blobPath, 'application/vnd.github.raw');
			if (!blob.ok) throw await requestError(blobPath, blob);
			return new Uint8Array(await blob.arrayBuffer());
		},
	};
}

function toChangedFile(entry: DiffEntry): ChangedFile {
	const file: ChangedFile = {
		path: entry.filename,
		status: entry.status,
		blobSha: entry.sha,
		additions: entry.additions,
		deletions: entry.deletions,
	};
	if (entry.previous_filename !== undefined) file.basePath = entry.previous_filename;
	if (entry.patch !== undefined) file.patch = entry.patch;
	return file;
}

async function requestError(path: string, response: Response): Promise<Error> {
	const text = await response.text();
	return new Error(`GitHub API GET ${path} returned ${response.status}: ${text.slice(0, 300)}`);
}
