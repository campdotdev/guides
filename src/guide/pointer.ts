import { GuideError } from './errors.ts';
import { isRepoRelative } from './prose.ts';

/** An inclusive range of line numbers, starting at 1. */
export interface LineRange {
	start: number;
	end: number;
}

/** A link to lines of a file at the guide's head commit, such as `packages/shaders/src/engine.ts#L70-L75`. */
export interface Pointer {
	path: string;
	lines: LineRange;
	/** Where the pointer sits in the guide, such as `steps.2.pointers.1`, for error messages. */
	field: string;
}

const LINE_FRAGMENT = /^L(\d+)(?:-L(\d+))?$/;

/** Parses a block pointer's link target. Throws a GuideError that names `field` when the target is malformed. */
export function parseBlockPointer(href: string, field: string): Pointer {
	if (!isRepoRelative(href)) {
		throw new GuideError(field, `"${href}" is not a repo-relative path. A block pointer looks like [](src/file.ts#L10-L20).`);
	}
	const hash = href.indexOf('#');
	const path = decodeURI(hash === -1 ? href : href.slice(0, hash));
	const fragment = hash === -1 ? '' : href.slice(hash + 1);
	if (path === '') throw new GuideError(field, `"${href}" names no file.`);
	if (fragment === '') {
		throw new GuideError(field, `"${href}" has no line range. Add one, such as #L10-L20 or #L10.`);
	}
	const match = LINE_FRAGMENT.exec(fragment);
	if (!match) throw new GuideError(field, `"#${fragment}" is not a line range. Write #L10-L20 or #L10.`);
	const start = Number(match[1]);
	const end = match[2] === undefined ? start : Number(match[2]);
	if (start < 1 || end < start) {
		throw new GuideError(field, `"#${fragment}" is not a line range. Lines start at 1, and the range ends at or after its start.`);
	}
	return { path, lines: { start, end }, field };
}
