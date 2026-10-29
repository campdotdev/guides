import { z } from 'astro/zod';
import type { PullRequestRef } from '../repo-files/index.ts';

const commitSha = z
	.string()
	.regex(/^[0-9a-f]{40}$/, 'Expected a full 40-character lowercase commit SHA');

/** A Conventional Commit subject: a type, an optional scope in parentheses, an optional `!`, a colon, and a description. */
const CONVENTIONAL_COMMIT = /^[a-z]+(?:\(([^()\s]+)\))?!?: \S/;

/**
 * A guide file's frontmatter. `docs/guide-format.md` documents each field.
 * Unknown keys fail, so a misspelled field names itself in the build error.
 */
export const guideFrontmatter = z
	.strictObject({
		repo: z
			.string()
			.regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'Expected owner/name, such as campdotdev/shaders'),
		pr: z.number().int().positive(),
		title: z.string().regex(CONVENTIONAL_COMMIT, 'Expected a Conventional Commit, such as "feat(shaders): add FlutedGlass"'),
		scope: z.string().min(1).optional(),
		baseSha: commitSha,
		headSha: commitSha,
		afterTheFact: z.boolean().default(false),
	})
	.superRefine(({ title, scope }, context) => {
		const titleScope = CONVENTIONAL_COMMIT.exec(title)?.[1];
		if (scope === titleScope) return;
		context.addIssue({
			code: 'custom',
			path: ['scope'],
			message: titleScope === undefined ? 'Expected no scope, because the title has none' : `Expected "${titleScope}", the scope in the title`,
		});
	});

export type GuideFrontmatter = z.infer<typeof guideFrontmatter>;

export function pullRequestOf(frontmatter: GuideFrontmatter): PullRequestRef {
	const [owner, name] = frontmatter.repo.split('/') as [string, string];
	return { owner, name, pr: frontmatter.pr, baseSha: frontmatter.baseSha, headSha: frontmatter.headSha };
}
