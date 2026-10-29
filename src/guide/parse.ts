import type { Heading, Link, Root, RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { GuideError } from './errors.ts';
import { parseBlockPointer, type Pointer } from './pointer.ts';

/** The overview's four parts, in the order a guide must write them. */
export const OVERVIEW_PARTS = [
	{ key: 'why', heading: 'Why' },
	{ key: 'behaviorChange', heading: 'Behavior change' },
	{ key: 'checks', heading: 'Checks' },
	{ key: 'notCovered', heading: 'Not covered' },
] as const;

export type OverviewKey = (typeof OVERVIEW_PARTS)[number]['key'];

/** A guide body split into its sections, still as Markdown syntax trees. */
export interface ParsedGuide {
	overview: Record<OverviewKey, RootContent[]>;
	steps: ParsedStep[];
}

export interface ParsedStep {
	/** The step's number on the page, starting at 1. */
	number: number;
	title: string;
	/** The explanation, with the block pointers taken out. */
	prose: RootContent[];
	/** The block pointers, in the order the guide lists them. */
	pointers: Pointer[];
}

const OVERVIEW_HEADING = 'Overview';

/** Parses a guide body (the Markdown after the frontmatter) and checks its structure. */
export function parseGuide(body: string): ParsedGuide {
	const tree = unified().use(remarkParse).use(remarkGfm).parse(body) as Root;
	const sections = splitSections(tree.children, 2);

	if (sections.lead.some(isContent)) {
		throw new GuideError('body', `the body has text before "## ${OVERVIEW_HEADING}", which must come first.`);
	}
	const [first] = sections.sections;
	if (!first || toString(first.heading) !== OVERVIEW_HEADING) {
		throw new GuideError('overview', `the body must start with "## ${OVERVIEW_HEADING}".`);
	}

	const overview = parseOverview(first.children);
	rejectStrayPointers(first.children, 'overview');
	const steps = sections.sections.slice(1).map((section, index) => parseStep(section, index + 1));
	if (steps.length === 0) throw new GuideError('steps', 'the guide has no steps. Add a "## <step title>" section after the overview.');
	return { overview, steps };
}

function parseStep(section: Section, number: number): ParsedStep {
	const field = `steps.${number}`;
	const title = toString(section.heading).trim();
	if (title === '') throw new GuideError(field, 'the step heading has no title.');

	const prose: RootContent[] = [];
	const pointers: Pointer[] = [];
	for (const node of section.children) {
		const link = blockPointerLink(node);
		if (link) pointers.push(parseBlockPointer(link.url, `${field}.pointers.${pointers.length + 1}`));
		else prose.push(node);
	}
	rejectStrayPointers(prose, field);
	if (!prose.some(isContent)) throw new GuideError(field, `"${title}" has no explanation.`);
	if (pointers.length === 0) {
		throw new GuideError(`${field}.pointers`, `"${title}" has no block pointer. Add one on its own line, such as [](src/file.ts#L10-L20).`);
	}
	return { number, title, prose, pointers };
}

/** A block pointer is a paragraph that holds only a link with no text: `[](src/file.ts#L10-L20)`. */
function blockPointerLink(node: RootContent): Link | undefined {
	if (node.type !== 'paragraph' || node.children.length !== 1) return undefined;
	const [child] = node.children;
	return child?.type === 'link' && isEmptyLink(child) ? child : undefined;
}

/** An empty link anywhere but alone on its line is a block pointer in the wrong place. */
function rejectStrayPointers(nodes: RootContent[], field: string): void {
	visit({ type: 'root', children: nodes } as Root, 'link', (link) => {
		if (isEmptyLink(link)) {
			throw new GuideError(field, `the link [](${link.url}) has no text. A block pointer sits alone on its own line, and an inline pointer needs link text.`);
		}
	});
}

function isEmptyLink(link: Link): boolean {
	return toString(link).trim() === '';
}

function parseOverview(nodes: RootContent[]): ParsedGuide['overview'] {
	const { lead, sections } = splitSections(nodes, 3);
	if (lead.some(isContent)) {
		throw new GuideError('overview', `put the overview's text under its "### ${OVERVIEW_PARTS[0].heading}" heading.`);
	}
	const found = sections.map((section) => toString(section.heading));
	const expected = OVERVIEW_PARTS.map((part) => part.heading);
	if (found.join('\n') !== expected.join('\n')) {
		throw new GuideError(
			'overview',
			`expected the parts ${expected.map((h) => `"### ${h}"`).join(', ')} in that order, but found ${
				found.length ? found.map((h) => `"### ${h}"`).join(', ') : 'none'
			}.`,
		);
	}

	const overview = {} as ParsedGuide['overview'];
	OVERVIEW_PARTS.forEach((part, index) => {
		const children = sections[index]!.children;
		if (!children.some(isContent)) throw new GuideError('overview', `"### ${part.heading}" is empty.`);
		overview[part.key] = children;
	});
	return overview;
}

interface Section {
	heading: Heading;
	children: RootContent[];
}

/** Splits nodes at each heading of `depth`. `lead` holds the nodes before the first one. */
function splitSections(nodes: RootContent[], depth: number): { lead: RootContent[]; sections: Section[] } {
	const lead: RootContent[] = [];
	const sections: Section[] = [];
	for (const node of nodes) {
		if (node.type === 'heading' && node.depth === depth) sections.push({ heading: node, children: [] });
		else if (node.type === 'heading' && node.depth < depth) {
			throw new GuideError('body', `"${'#'.repeat(node.depth)} ${toString(node)}" is a heading level the format does not use here.`);
		} else (sections.at(-1)?.children ?? lead).push(node);
	}
	return { lead, sections };
}

/** Raw HTML never renders, so it does not count as content. */
function isContent(node: RootContent): boolean {
	return node.type !== 'html';
}
