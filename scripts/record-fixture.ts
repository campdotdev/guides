// Records the repo file snapshot that the fixture source serves to tests.
//
// Usage:
//   GITHUB_TOKEN=$(gh auth token) pnpm record-fixture tests/fixtures/guides/shaders/264.md
//
// For each guide, the script asks the production GitHub source for the file list between the
// guide's baseSha and headSha, then saves every changed file at both commits where it exists.
// It writes to REPO_FILE_FIXTURES, or tests/fixtures/repo-files by default.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parse } from 'yaml';
import { pullRequestOf, guideFrontmatter } from '../src/guide/schema.ts';
import { comparePath, filePath } from '../src/repo-files/fixture.ts';
import { githubRepoFileSource } from '../src/repo-files/github.ts';
import { DEFAULT_FIXTURE_DIR, type ChangedFile, type PullRequestRef } from '../src/repo-files/index.ts';

const guides = process.argv.slice(2);
if (guides.length === 0) {
	console.error('Usage: pnpm record-fixture <guide file> [<guide file>...]');
	process.exit(2);
}
const token = process.env.GITHUB_TOKEN;
if (!token) {
	console.error('Set GITHUB_TOKEN, for example GITHUB_TOKEN=$(gh auth token).');
	process.exit(2);
}

const outDir = process.env.REPO_FILE_FIXTURES ?? DEFAULT_FIXTURE_DIR;
const source = githubRepoFileSource(token);

for (const guide of guides) {
	const pull = pullRequestOf(guideFrontmatter.parse(readFrontmatter(await readFile(guide, 'utf8'))));
	const files = await source.listChangedFiles(pull);
	await write(comparePath(outDir, pull), `${JSON.stringify(files, null, '\t')}\n`);

	let saved = 0;
	for (const file of files) {
		if (file.status !== 'removed') {
			saved += await save(pull, file, file.path, pull.headSha, file.blobSha);
		}
		if (file.status !== 'added') {
			const basePath = file.previousPath ?? file.path;
			const expectedBlob = file.status === 'removed' ? file.blobSha : undefined;
			saved += await save(pull, file, basePath, pull.baseSha, expectedBlob);
		}
	}
	console.log(`${pull.owner}/${pull.repo}#${pull.pr}: ${files.length} changed files, ${saved} file versions saved to ${outDir}`);
}

function readFrontmatter(markdown: string): unknown {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
	if (!match) throw new Error('The guide has no frontmatter block.');
	return parse(match[1]!);
}

/** Saves one file version and checks it against the blob SHA GitHub listed, when there is one. */
async function save(
	pull: PullRequestRef,
	file: ChangedFile,
	path: string,
	commitSha: string,
	expectedBlob: string | undefined,
): Promise<number> {
	const bytes = await source.readFile(pull, path, commitSha);
	if (bytes === null) throw new Error(`${path} is missing at ${commitSha}, but the compare view lists it as ${file.status}.`);
	if (expectedBlob !== undefined && gitBlobSha(bytes) !== expectedBlob) {
		throw new Error(`${path} at ${commitSha} does not hash to blob ${expectedBlob}.`);
	}
	await write(filePath(outDir, pull, path, commitSha), bytes);
	return 1;
}

/** The SHA that `git hash-object` prints for these bytes. */
function gitBlobSha(bytes: Uint8Array): string {
	return createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
}

async function write(path: string, data: string | Uint8Array): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, data);
}
