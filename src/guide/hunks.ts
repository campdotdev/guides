import type { DiffRow, Hunk } from './patch.ts';
import type { LineRange } from './pointer.ts';

/** How many lines a block pointer shows on each side of its range. */
export const CONTEXT_LINES = 3;

/** True when the range touches the head-side lines the hunk covers. */
export function touches(hunk: Hunk, range: LineRange): boolean {
	const last = hunk.newStart + hunk.newLines - 1;
	return range.start <= last && range.end >= hunk.newStart;
}

/**
 * Cuts the rows that a file's block pointers show out of GitHub's hunks.
 * Each pointer keeps the rows from `context` lines before its range to `context` lines after it,
 * plus any deleted rows in between. Pointers whose rows meet or overlap share one hunk.
 */
export function cutHunks(hunks: Hunk[], ranges: LineRange[], context = CONTEXT_LINES): Hunk[] {
	const cut: Hunk[] = [];
	for (const hunk of hunks) {
		const keep = hunk.rows.map(() => false);
		for (const range of ranges) {
			const inWindow = hunk.rows.flatMap((row, index) =>
				row.newLine !== null && row.newLine >= range.start - context && row.newLine <= range.end + context
					? [index]
					: [],
			);
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
