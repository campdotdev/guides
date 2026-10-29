import { defineCollection } from 'astro:content';
import { guideLoader } from './guide/loader.ts';
import { guideFrontmatter } from './guide/schema.ts';

/** The guides the tests own. Production sets GUIDES_DIR to a checkout of the content branch. */
const DEFAULT_GUIDES_DIR = 'tests/fixtures/guides';

export const collections = {
	guides: defineCollection({
		loader: guideLoader(process.env.GUIDES_DIR ?? DEFAULT_GUIDES_DIR),
		schema: guideFrontmatter,
	}),
};
