import type { Link, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import type { ParsedStep } from './parse.ts';
import { parseBlockPointer, type Pointer } from './pointer.ts';
import { isRepoRelative, renderProse, type Html, type ProseContext } from './prose.ts';

/** A link in a step's prose whose target is a repo-relative path with a line range, such as `[the export](src/engine.ts#L70)`. */
interface InlinePointer extends Pointer {
	link: Link;
}

/**
 * Renders a step's prose. Each inline pointer stays a GitHub link and carries its file and lines,
 * so the browser can highlight those lines in the step's code.
 */
export function renderStepProse(step: ParsedStep, context: ProseContext): Html {
	const prose = structuredClone(step.prose);
	for (const pointer of inlinePointers(prose, step.number)) {
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
