import { glob, type Loader } from 'astro/loaders';
import { GuideError, guideFile, inGuide } from './errors.ts';
import { parseGuide } from './parse.ts';
import { pullRequestName } from '../repo-files/names.ts';
import { pullRequestOf, type GuideFrontmatter } from './schema.ts';

/**
 * Loads guide files from `base`, where each guide sits at `<repo>/<pr>.md`, such as `shaders/264.md`.
 * An entry's id is that path without `.md`.
 *
 * The collection schema checks the frontmatter. This loader then checks the file's place and the body's structure,
 * so a malformed guide fails the build with an error that names the bad field.
 * Pointers are checked against the pull request's files when the page renders.
 */
export function guideLoader(base: string): Loader {
	const inner = glob({
		// Files at the top level, such as the content branch's README, are not guides.
		pattern: ['**/*.md', '!*.md'],
		base,
		generateId: ({ entry }) => entry.replace(/\.md$/, ''),
	});
	return {
		name: 'guide-loader',
		load: async (context) => {
			await inner.load(context);
			for (const entry of context.store.values()) {
				await inGuide(entry.id, () => {
					checkPlace(entry.id, entry.data as GuideFrontmatter);
					parseGuide(entry.body ?? '');
				});
			}
		},
	};
}

function checkPlace(id: string, frontmatter: GuideFrontmatter): void {
	const pull = pullRequestOf(frontmatter);
	const expected = `${pull.name}/${pull.pr}`;
	if (id !== expected) {
		throw new GuideError(
			'pr',
			`a guide to ${pullRequestName(pull)} belongs at ${guideFile(expected)}, not ${guideFile(id)}.`,
		);
	}
}
