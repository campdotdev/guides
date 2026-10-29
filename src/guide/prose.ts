import type { Root, RootContent } from 'mdast';
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * HTML rendered from a guide's Markdown. Agents push guides without review, so raw HTML is dropped
 * and the output passes through GitHub's sanitize schema, which strips links such as `javascript:` URLs.
 */
export type Html = string;

export interface ProseContext {
	/** owner/name of the repository the guide describes. */
	repo: string;
	/** The commit that relative links resolve against. */
	headSha: string;
}

/**
 * GitHub's schema, plus the attributes that `renderStepProse` puts on an inline pointer's link.
 * The allowed URL protocols stay GitHub's, so a `javascript:` link still loses its href.
 */
const schema: SanitizeSchema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		a: [...(defaultSchema.attributes?.a ?? []), 'dataPointerFile', 'dataPointerStart', 'dataPointerEnd'],
	},
};

const processor = unified().use(remarkRehype).use(rehypeSanitize, schema).use(rehypeStringify);

/**
 * Renders guide prose to HTML.
 * A relative link points into the repository the guide describes, so it becomes a GitHub link at the guide's head commit.
 */
export function renderProse(nodes: RootContent[], context: ProseContext): Html {
	const tree: Root = { type: 'root', children: structuredClone(nodes) };
	visit(tree, 'link', (link) => {
		if (isRepoRelative(link.url)) link.url = `https://github.com/${context.repo}/blob/${context.headSha}/${link.url}`;
	});
	return processor.stringify(processor.runSync(tree));
}

/** True for a path such as `src/engine.ts#L1-L5`, false for a URL, an absolute path, or a same-page anchor. */
export function isRepoRelative(url: string): boolean {
	return !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('/') && !url.startsWith('#');
}
