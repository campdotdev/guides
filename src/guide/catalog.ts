import type { CollectionEntry } from 'astro:content';
import { sitePath } from '../site.ts';
import type { GuideFrontmatter } from './schema.ts';

/** One repo's guides, for the home page and the repo's page. */
export interface RepoGuides {
	/** The repo as `owner/name`, such as `campdotdev/shaders`. */
	repo: string;
	/** The repo's route segment, such as `shaders`. */
	slug: string;
	/** Newest first, by pull request number. */
	guides: GuideFrontmatter[];
	/** The scopes the repo's guides use, in name order. */
	scopes: string[];
}

/** Groups the guides by repo. Repos sort by name, and each repo's guides run newest first. */
export function guidesByRepo(entries: CollectionEntry<'guides'>[]): RepoGuides[] {
	const repos = new Map<string, RepoGuides>();
	for (const { data } of entries) {
		const slug = guideParams(data).repo;
		const group = repos.get(slug) ?? { repo: data.repo, slug, guides: [], scopes: [] };
		group.guides.push(data);
		repos.set(slug, group);
	}
	for (const group of repos.values()) {
		group.guides.sort((a, b) => b.pr - a.pr);
		group.scopes = [...new Set(group.guides.flatMap((guide) => guide.scope ?? []))].sort();
	}
	return [...repos.values()].sort((a, b) => a.repo.localeCompare(b.repo));
}

/** The URL of the home page, `/guides/`. */
export function homeUrl(): string {
	return sitePath('');
}

/** The URL of a repo's page, such as `/guides/shaders/`. */
export function repoUrl(slug: string): string {
	return sitePath(`${slug}/`);
}

/** The route of a guide page: `/<repo>/<pr>/`. */
export function guideParams(meta: GuideFrontmatter): { repo: string; pr: string } {
	return { repo: meta.repo.split('/')[1]!, pr: String(meta.pr) };
}

/** The URL of a guide's page, such as `/guides/shaders/264/`. */
export function guideUrl(meta: GuideFrontmatter): string {
	const { repo, pr } = guideParams(meta);
	return sitePath(`${repo}/${pr}/`);
}
