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
export function githubRepoFileSource(token: string, fetchImpl: typeof fetch = fetch): RepoFileSource {
	async function get(path: string, accept: string): Promise<Response> {
		return fetchImpl(`${API}${path}`, {
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
			const encoded = filePath.split('/').map(encodeURIComponent).join('/');
			const path = `/repos/${repo.owner}/${repo.name}/contents/${encoded}?ref=${commitSha}`;
			const response = await get(path, 'application/vnd.github.raw');
			if (response.status === 404) return null;
			if (!response.ok) throw await requestError(path, response);
			return new Uint8Array(await response.arrayBuffer());
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
	if (entry.previous_filename !== undefined) file.previousPath = entry.previous_filename;
	if (entry.patch !== undefined) file.patch = entry.patch;
	return file;
}

async function requestError(path: string, response: Response): Promise<Error> {
	const text = await response.text();
	return new Error(`GitHub API GET ${path} returned ${response.status}: ${text.slice(0, 300)}`);
}
