import type { ChangedFile, FileStatus, PullRequestRef, RepoFileSource } from '../repo-files/index.ts';
import { GuideError } from './errors.ts';
import { cutHunks, hiddenRuns, splitLines, touches, wholeFileRows } from './hunks.ts';
import { parsePatch, type DiffRow, type Hunk } from './patch.ts';
import type { ParsedStep } from './parse.ts';
import type { Pointer } from './pointer.ts';

/** One file in a step, with the hunks its block pointers cut from the diff. */
export interface StepFile {
	path: string;
	/** The path at the base commit, which differs from `path` for a renamed file. */
	basePath: string;
	status: FileStatus;
	blobSha: string;
	/** The file's text at the base commit, or null when it does not exist there. */
	base: string | null;
	/** The file's text at the head commit, or null when it does not exist there. */
	head: string | null;
	hunks: Hunk[];
	/**
	 * The rows of the file's diff that `hunks` leave out, which separators hide until the reader expands them.
	 * `gaps[i]` comes before `hunks[i]`, and the last entry comes after the last hunk. A gap can be empty.
	 */
	gaps: DiffRow[][];
}

/** Reads a pull request's files once per page and resolves each step's block pointers to hunks. */
export class PullRequestFiles {
	readonly pull: PullRequestRef;
	readonly changed: ChangedFile[];
	readonly #source: RepoFileSource;
	readonly #texts = new Map<string, Promise<string | null>>();

	private constructor(pull: PullRequestRef, source: RepoFileSource, changed: ChangedFile[]) {
		this.pull = pull;
		this.#source = source;
		this.changed = changed;
	}

	static async load(pull: PullRequestRef, source: RepoFileSource): Promise<PullRequestFiles> {
		return new PullRequestFiles(pull, source, await source.listChangedFiles(pull));
	}

	/** The files a step's block pointers touch, in the order the step first points at them. */
	async stepFiles(step: ParsedStep): Promise<StepFile[]> {
		const byPath = new Map<string, Pointer[]>();
		for (const pointer of step.pointers) byPath.set(pointer.path, [...(byPath.get(pointer.path) ?? []), pointer]);
		return Promise.all([...byPath].map(([path, pointers]) => this.#stepFile(path, pointers)));
	}

	async #stepFile(path: string, pointers: Pointer[]): Promise<StepFile> {
		const [first] = pointers as [Pointer];
		const changed = this.changed.find((file) => file.path === path);
		if (!changed) {
			throw new GuideError(first.field, `${path} is not a file that ${this.#name()} changes.`);
		}
		if (changed.patch === undefined) {
			throw new GuideError(first.field, `GitHub shows no text diff for ${path}, so a line range cannot point into it.`);
		}
		const basePath = changed.previousPath ?? path;
		const [base, head] = await Promise.all([
			changed.status === 'added' ? null : this.#text(basePath, this.pull.baseSha),
			changed.status === 'removed' ? null : this.#text(path, this.pull.headSha),
		]);
		const lineCount = head === null ? 0 : splitLines(head).length;
		const hunks = parsePatch(changed.patch);
		for (const pointer of pointers) {
			const { start, end } = pointer.lines;
			if (end > lineCount) {
				throw new GuideError(pointer.field, `${path} has ${lineCount} lines at the head commit, so #L${start}-L${end} runs past its end.`);
			}
			if (!hunks.some((hunk) => touches(hunk, pointer.lines))) {
				const covered = hunks.map((hunk) => `${hunk.newStart}-${hunk.newStart + hunk.newLines - 1}`).join(', ');
				throw new GuideError(pointer.field, `lines ${start}-${end} of ${path} are outside the diff, which covers lines ${covered}.`);
			}
		}
		const visible = cutHunks(hunks, pointers.map((pointer) => pointer.lines));
		return {
			path,
			basePath,
			status: changed.status,
			blobSha: changed.blobSha,
			base,
			head,
			hunks: visible,
			gaps: hiddenRuns(wholeFileRows(hunks, head), visible),
		};
	}

	#text(path: string, commitSha: string): Promise<string | null> {
		const key = `${commitSha}:${path}`;
		let text = this.#texts.get(key);
		if (!text) {
			text = this.#source.readFile(this.pull, path, commitSha).then((bytes) => (bytes === null ? null : new TextDecoder().decode(bytes)));
			this.#texts.set(key, text);
		}
		return text;
	}

	#name(): string {
		return `${this.pull.owner}/${this.pull.repo}#${this.pull.pr}`;
	}
}
