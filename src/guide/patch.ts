/** One line of a diff, numbered on each side it exists on. */
export interface DiffRow {
	kind: 'context' | 'add' | 'del';
	/** The line number at the base commit, or null for an added line. */
	oldLine: number | null;
	/** The line number at the head commit, or null for a deleted line. */
	newLine: number | null;
	text: string;
}

/** A unified-diff hunk with numbered rows. */
export interface Hunk {
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	/** The text GitHub prints after the second `@@`, usually the enclosing declaration. */
	section: string;
	rows: DiffRow[];
}

const HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/;

/**
 * Parses the `patch` text GitHub returns for a file into hunks.
 * The renderer uses GitHub's hunks instead of computing its own, so its rows match what GitHub shows for the PR.
 */
export function parsePatch(patch: string): Hunk[] {
	const hunks: Hunk[] = [];
	let hunk: Hunk | undefined;
	let oldLine = 0;
	let newLine = 0;
	let oldLeft = 0;
	let newLeft = 0;

	for (const line of patch.split('\n')) {
		const header = HEADER.exec(line);
		if (header) {
			hunk = {
				oldStart: Number(header[1]),
				oldLines: header[2] === undefined ? 1 : Number(header[2]),
				newStart: Number(header[3]),
				newLines: header[4] === undefined ? 1 : Number(header[4]),
				section: header[5] ?? '',
				rows: [],
			};
			hunks.push(hunk);
			oldLine = hunk.oldStart;
			newLine = hunk.newStart;
			oldLeft = hunk.oldLines;
			newLeft = hunk.newLines;
			continue;
		}
		// The header's counts say where a hunk ends. Anything past them, such as a trailing
		// empty line or "\ No newline at end of file", is not a row.
		if (!hunk || (oldLeft === 0 && newLeft === 0) || line.startsWith('\\')) continue;
		const text = line.slice(1);
		if (line.startsWith('+')) {
			hunk.rows.push({ kind: 'add', oldLine: null, newLine: newLine++, text });
			newLeft--;
		} else if (line.startsWith('-')) {
			hunk.rows.push({ kind: 'del', oldLine: oldLine++, newLine: null, text });
			oldLeft--;
		} else {
			hunk.rows.push({ kind: 'context', oldLine: oldLine++, newLine: newLine++, text });
			oldLeft--;
			newLeft--;
		}
	}
	return hunks;
}

/** The `@@ -a,b +c,d @@` line for a hunk. */
export function hunkHeader(hunk: Hunk): string {
	const range = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
	return hunk.section ? `${range} ${hunk.section}` : range;
}
