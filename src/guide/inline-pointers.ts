import type { Link, Root, RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';
import { GuideError } from './errors.ts';
import type { ParsedStep } from './parse.ts';
import { parseBlockPointer, type Pointer } from './pointer.ts';
import { blobUrl, isRepoRelative, renderProse, type Html, type ProseContext } from './prose.ts';
import { lineOn } from './hunks.ts';
import type { StepFile } from './resolve.ts';

/** A link in a step's prose whose target is a repo-relative path with a line range, such as `[the export](src/engine.ts#L70)`. */
interface InlinePointer extends Pointer {
	link: Link;
}

/**
 * Renders a step's prose. Each inline pointer stays a GitHub link and carries its file and lines,
 * so the browser can highlight those lines in the step's code.
 * An inline pointer counts lines the way the file's block pointers do: at the head, or at the merge base in a deleted file.
 *
 * Throws a GuideError when an inline pointer names a line that the step's block pointers do not show.
 */
export function renderStepProse(step: ParsedStep, files: StepFile[], context: ProseContext): Html {
	const prose = structuredClone(step.prose);
	for (const pointer of inlinePointers(prose, step.number)) {
		const file = shownFile(pointer, step.number, files);
		if (file.side === 'base') pointer.link.url = blobUrl(context.repo, context.mergeBaseSha, pointer.link.url);
		pointer.link.data = {
			...pointer.link.data,
			hProperties: {
				dataPointerFile: pointer.path,
				dataPointerStart: pointer.lines.start,
				dataPointerEnd: pointer.lines.end,
			},
		};
	}
	return renderProse(prose, context);
}

/** The inline pointers in a step's prose, in reading order. */
function inlinePointers(prose: RootContent[], step: number): InlinePointer[] {
	const found: InlinePointer[] = [];
	visit({ type: 'root', children: prose } as Root, 'link', (link) => {
		if (!isInlinePointer(link.url)) return;
		// An inline pointer's target has the same syntax as a block pointer's.
		found.push({ ...parseBlockPointer(link.url, `steps.${step}.inlinePointers.${found.length + 1}`), link });
	});
	return found;
}

/** A repo-relative target with a fragment such as `#L70`. A fragment such as `#readme` leaves an ordinary link. */
function isInlinePointer(url: string): boolean {
	return isRepoRelative(url) && /#L\d/.test(url);
}

/**
 * The step's file that the pointer points into. Throws unless the step shows every line the pointer names,
 * as a row of the file's hunks on the side the file's pointers count lines on.
 */
function shownFile(pointer: InlinePointer, step: number, files: StepFile[]): StepFile {
	const file = files.find((candidate) => candidate.path === pointer.path);
	const shown = new Set(file?.hunks.flatMap((hunk) => hunk.rows.flatMap((row) => lineOn(row, file.side) ?? [])));
	const { start, end } = pointer.lines;
	const named = Array.from({ length: end - start + 1 }, (_, index) => start + index);
	if (file && named.every((line) => shown.has(line))) return file;
	const lines = shown.size === 0 ? 'no lines' : `lines ${ranges([...shown])}`;
	throw new GuideError(
		pointer.field,
		`[${toString(pointer.link)}](${pointer.link.url}) points at lines that step ${step} does not show. Step ${step} shows ${lines} of ${pointer.path}.`,
	);
}

/** Line numbers as runs, such as `67-78, 88-103`. */
function ranges(lines: number[]): string {
	const sorted = lines.toSorted((a, b) => a - b);
	const runs: [number, number][] = [];
	for (const line of sorted) {
		const run = runs.at(-1);
		if (run && line === run[1] + 1) run[1] = line;
		else runs.push([line, line]);
	}
	return runs.map(([start, end]) => (start === end ? String(start) : `${start}-${end}`)).join(', ');
}
