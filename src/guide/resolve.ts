import {
	diffCommits,
	fileVersions,
	pullRequestName,
	type ChangedFile,
	type DiffCommits,
	type FileStatus,
	type FileVersion,
	type PullRequestRef,
	type RepoFileSource,
} from '../repo-files/index.ts';
import { isBinary, type AlsoChangedFile } from './also-changed.ts';
import { GuideError } from './errors.ts';
import { cutHunks, hiddenRuns, linesOn, splitLines, touches, unchangedHunk, wholeFileRows, type Side } from './hunks.ts';
import { imagePair, isImagePath, type StepImage } from './images.ts';
import { parsePatch, type DiffRow, type Hunk } from './patch.ts';
import type { ParsedStep } from './parse.ts';
import type { Pointer } from './pointer.ts';

/** One file in a step, with the hunks its block pointers cut from the diff. */
export interface StepFile {
	path: string;
	/** The path at the merge base, which differs from `path` for a renamed or copied file. */
	basePath: string;
	status: FileStatus;
	blobSha: string;
	/** The commit whose line numbers the file's pointers use: the head, or the merge base for a deleted file. */
	side: Side;
	/** The file's text at the merge base, or null when it does not exist there. */
	base: string | null;
	/** The file's text at the head commit, or null when it does not exist there. */
	head: string | null;
	hunks: Hunk[];
	/**
	 * The rows of the file's diff that `hunks` leave out, which separators hide until the reader expands them.
	 * `hidden[i]` comes before `hunks[i]`, and the last entry comes after the last hunk. A run can be empty.
	 */
	hidden: DiffRow[][];
}

/**
 * Reads a pull request's files once per page and resolves each step's block pointers to hunks.
 * GitHub diffs the head commit against the merge base, so the base side of every file comes from the merge base.
 */
export class PullRequestFiles {
	readonly pull: PullRequestRef;
	/** The merge base and the head commit. */
	readonly diff: DiffCommits;
	readonly changed: ChangedFile[];
	readonly #source: RepoFileSource;
	readonly #texts = new Map<string, Promise<string | null>>();

	private constructor(pull: PullRequestRef, source: RepoFileSource, diff: DiffCommits, changed: ChangedFile[]) {
		this.pull = pull;
		this.#source = source;
		this.diff = diff;
		this.changed = changed;
	}

	static async load(pull: PullRequestRef, source: RepoFileSource): Promise<PullRequestFiles> {
		const comparison = await source.compare(pull);
		return new PullRequestFiles(pull, source, diffCommits(pull, comparison), comparison.files);
	}

	/** The files a step's block pointers touch, in the order the step first points at them. */
	async stepFiles(step: ParsedStep): Promise<StepFile[]> {
		const byPath = new Map<string, Pointer[]>();
		for (const pointer of step.pointers) byPath.set(pointer.path, [...(byPath.get(pointer.path) ?? []), pointer]);
		return Promise.all([...byPath].map(([path, pointers]) => this.#stepFile(path, pointers)));
	}

	/**
	 * The image files a step's image pointers name, once per file, in the order the step first points at each one.
	 * `pageUrl` is the guide page's URL, ending in `/`.
	 */
	stepImages(step: ParsedStep, pageUrl: string): StepImage[] {
		const images = new Map<string, StepImage>();
		for (const pointer of step.images) {
			if (images.has(pointer.path)) continue;
			const file = this.#changedFile(pointer.path, pointer.field);
			images.set(pointer.path, {
				path: file.path,
				status: file.status,
				blobSha: file.blobSha,
				...imagePair(file, this.diff, pageUrl),
			});
		}
		return [...images.values()];
	}

	/**
	 * The changed files that no block pointer names, in the order GitHub lists them.
	 * The list comes from the pull request's files, so the page shows every file the guide skips.
	 */
	alsoChanged(steps: ParsedStep[], pageUrl: string): AlsoChangedFile[] {
		const covered = new Set(steps.flatMap((step) => [...step.pointers, ...step.images].map((pointer) => pointer.path)));
		return this.changed
			.filter((file) => !covered.has(file.path))
			.map((file) => {
				const images = isImagePath(file.path) ? imagePair(file, this.diff, pageUrl) : null;
				return { ...file, thumbnail: images && (images.after ?? images.before), binary: isBinary(file) };
			});
	}

	/** The changed file at `path`. Throws a GuideError that names `field` when the pull request does not change it. */
	#changedFile(path: string, field: string): ChangedFile {
		const changed = this.changed.find((file) => file.path === path);
		if (!changed) throw new GuideError(field, `${path} is not a file that ${this.#name()} changes.`);
		return changed;
	}

	async #stepFile(path: string, pointers: Pointer[]): Promise<StepFile> {
		const [first] = pointers as [Pointer];
		const changed = this.#changedFile(path, first.field);
		// GitHub sends no patch for a binary file or for a file renamed without edits.
		const pureRename = changed.basePath !== undefined && changed.additions + changed.deletions === 0;
		if (changed.patch === undefined && !pureRename) {
			throw new GuideError(first.field, `GitHub shows no text diff for ${path}, so a line range cannot point into it.`);
		}
		const versions = fileVersions(changed, this.diff);
		const [base, head] = await Promise.all([versions.base && this.#text(versions.base), versions.head && this.#text(versions.head)]);
		// A deleted file has no lines at the head commit, so its pointers count lines at the merge base.
		const side: Side = changed.status === 'removed' ? 'base' : 'head';
		const text = side === 'head' ? head : base;
		const lineCount = text === null ? 0 : splitLines(text).length;
		const hunks = changed.patch === undefined ? [unchangedHunk(head ?? '')] : parsePatch(changed.patch);
		for (const pointer of pointers) {
			const { start, end } = pointer.lines;
			if (end > lineCount) {
				throw new GuideError(pointer.field, `${path} has ${lineCount} lines at the ${side} commit, so #L${start}-L${end} runs past its end.`);
			}
			if (!hunks.some((hunk) => touches(hunk, pointer.lines, side))) {
				const covered = hunks.map((hunk) => linesOn(hunk, side)).map((lines) => `${lines.start}-${lines.end}`).join(', ');
				throw new GuideError(pointer.field, `lines ${start}-${end} of ${path} are outside the diff, which covers lines ${covered}.`);
			}
		}
		const visible = cutHunks(hunks, pointers.map((pointer) => pointer.lines), side);
		return {
			path,
			basePath: versions.base?.path ?? path,
			status: changed.status,
			blobSha: changed.blobSha,
			side,
			base,
			head,
			hunks: visible,
			hidden: hiddenRuns(wholeFileRows(hunks, head), visible),
		};
	}

	#text({ path, commitSha }: FileVersion): Promise<string | null> {
		const key = `${commitSha}:${path}`;
		let text = this.#texts.get(key);
		if (!text) {
			text = this.#source.readFile(this.pull, path, commitSha).then((bytes) => (bytes === null ? null : new TextDecoder().decode(bytes)));
			this.#texts.set(key, text);
		}
		return text;
	}

	#name(): string {
		return pullRequestName(this.pull);
	}
}
