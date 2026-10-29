import type { DiffRow, Hunk } from './patch.ts';
import type { LineRange } from './pointer.ts';

/** How many lines a block pointer shows on each side of its range. */
const CONTEXT_LINES = 3;

/**
 * The commit whose line numbers a pointer uses. Pointers count lines at the head commit,
 * except in a deleted file, which has lines only at the base commit.
 */
export type Side = 'base' | 'head';

const LINE_OF = { base: 'oldLine', head: 'newLine' } as const;

/** The row's line number on `side`, or null when the row has no line there, such as an added row at the base. */
export function lineOn(row: DiffRow, side: Side): number | null {
	return row[LINE_OF[side]];
}

/** The lines a hunk covers on `side`. */
export function linesOn(hunk: Hunk, side: Side): LineRange {
	const [start, count] = side === 'head' ? [hunk.newStart, hunk.newLines] : [hunk.oldStart, hunk.oldLines];
	return { start, end: start + count - 1 };
}

/** True when the range touches the lines the hunk covers on `side`. */
export function touches(hunk: Hunk, range: LineRange, side: Side): boolean {
	const covered = linesOn(hunk, side);
	return range.start <= covered.end && range.end >= covered.start;
}

/**
 * Cuts the rows that a file's block pointers show out of GitHub's hunks.
 * Each pointer keeps the rows from three lines before its range to three lines after it,
 * plus any rows from the other side in between. Pointers whose rows meet or overlap share one hunk.
 */
export function cutHunks(hunks: Hunk[], ranges: LineRange[], side: Side): Hunk[] {
	const cut: Hunk[] = [];
	for (const hunk of hunks) {
		const keep = hunk.rows.map(() => false);
		for (const range of ranges) {
			const inWindow = hunk.rows.flatMap((row, index) => {
				const line = lineOn(row, side);
				return line !== null && line >= range.start - CONTEXT_LINES && line <= range.end + CONTEXT_LINES ? [index] : [];
			});
			if (inWindow.length === 0) continue;
			keep.fill(true, inWindow[0], inWindow.at(-1)! + 1);
		}
		for (let start = 0; start < keep.length; start++) {
			if (!keep[start]) continue;
			let end = start;
			while (end < keep.length && keep[end]) end++;
			cut.push(subHunk(hunk, start, end));
			start = end;
		}
	}
	return cut;
}

/** The rows `start` to `end` (exclusive) of a hunk, with its header numbers recounted. */
function subHunk(hunk: Hunk, start: number, end: number): Hunk {
	const rows = hunk.rows.slice(start, end);
	const oldRowsBefore = countLines(hunk.rows.slice(0, start), 'oldLine');
	const newRowsBefore = countLines(hunk.rows.slice(0, start), 'newLine');
	const oldLines = countLines(rows, 'oldLine');
	const newLines = countLines(rows, 'newLine');
	// Unified diff numbers an empty side by the line before it, so an added file's base side is 0.
	const oldStart = oldLines === 0 ? Math.max(0, hunk.oldStart + oldRowsBefore - 1) : hunk.oldStart + oldRowsBefore;
	const newStart = newLines === 0 ? Math.max(0, hunk.newStart + newRowsBefore - 1) : hunk.newStart + newRowsBefore;
	return { oldStart, oldLines, newStart, newLines, section: hunk.section, rows };
}

function countLines(rows: DiffRow[], side: 'oldLine' | 'newLine'): number {
	return rows.filter((row) => row[side] !== null).length;
}

/**
 * A file's whole diff as rows: GitHub's hunks, with the unchanged lines between and around them
 * filled in from the file at the head commit.
 */
export function wholeFileRows(hunks: Hunk[], head: string | null): DiffRow[] {
	const lines = head === null ? [] : splitLines(head);
	const rows: DiffRow[] = [];
	let oldNext = 1;
	let newNext = 1;
	const unchangedUntil = (newEnd: number) => {
		while (newNext <= newEnd) {
			rows.push({ kind: 'context', oldLine: oldNext++, newLine: newNext, text: lines[newNext - 1] ?? '' });
			newNext++;
		}
	};
	for (const hunk of hunks) {
		unchangedUntil(firstLine(hunk.newStart, hunk.newLines) - 1);
		rows.push(...hunk.rows);
		oldNext = firstLine(hunk.oldStart, hunk.oldLines) + hunk.oldLines;
		newNext = firstLine(hunk.newStart, hunk.newLines) + hunk.newLines;
	}
	unchangedUntil(lines.length);
	return rows;
}

/** The diff of a file that a pull request renames without editing: one hunk in which every line is unchanged. */
export function unchangedHunk(text: string): Hunk {
	const rows = wholeFileRows([], text);
	return { oldStart: 1, oldLines: rows.length, newStart: 1, newLines: rows.length, section: '', rows };
}

/**
 * The rows of a file's whole diff that its visible hunks leave out, as one run before each hunk
 * and one after the last. `runs[i]` comes before `visible[i]`. A run can be empty.
 */
export function hiddenRuns(whole: DiffRow[], visible: Hunk[]): DiffRow[][] {
	const runs: DiffRow[][] = [[]];
	let index = 0;
	for (const hunk of visible) {
		const first = rowKey(hunk.rows[0]!);
		while (index < whole.length && rowKey(whole[index]!) !== first) runs.at(-1)!.push(whole[index++]!);
		index += hunk.rows.length;
		runs.push([]);
	}
	runs.at(-1)!.push(...whole.slice(index));
	return runs;
}

/** Unified diff numbers an empty side by the line before it, so its first line is one later. */
function firstLine(start: number, count: number): number {
	return count === 0 ? start + 1 : start;
}

function rowKey(row: DiffRow): string {
	return `${row.oldLine}:${row.newLine}`;
}

/** A file's lines, without the empty string a final newline would add. */
export function splitLines(text: string): string[] {
	if (text === '') return [];
	const lines = text.split('\n');
	if (text.endsWith('\n')) lines.pop();
	return lines;
}
