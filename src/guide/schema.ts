import { z } from 'astro/zod';
import type { PullRequestRef } from '../repo-files/index.ts';

const commitSha = z
	.string()
	.regex(/^[0-9a-f]{40}$/, 'Expected a full 40-character lowercase commit SHA');

/**
 * A guide file's frontmatter. `docs/guide-format.md` documents each field.
 * Unknown keys fail, so a misspelled field names itself in the build error.
 */
export const guideFrontmatter = z.strictObject({
	repo: z
		.string()
		.regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'Expected owner/name, such as campdotdev/shaders'),
	pr: z.number().int().positive(),
	title: z.string().min(1),
	scope: z.string().min(1).optional(),
	baseSha: commitSha,
	headSha: commitSha,
	afterTheFact: z.boolean().default(false),
});

export type GuideFrontmatter = z.infer<typeof guideFrontmatter>;

export function pullRequestOf(frontmatter: GuideFrontmatter): PullRequestRef {
	const [owner, repo] = frontmatter.repo.split('/') as [string, string];
	return { owner, repo, pr: frontmatter.pr, baseSha: frontmatter.baseSha, headSha: frontmatter.headSha };
}
