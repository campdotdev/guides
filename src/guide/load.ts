import type { CollectionEntry } from 'astro:content';
import { repoFileSource, type ChangedFile, type RepoFileSource } from '../repo-files/index.ts';
import { inGuide } from './errors.ts';
import { OVERVIEW_PARTS, parseGuide, type OverviewKey } from './parse.ts';
import { renderProse, type Html } from './prose.ts';
import { PullRequestFiles, type StepFile } from './resolve.ts';
import { pullRequestOf, type GuideFrontmatter } from './schema.ts';

/** Everything a guide page renders. */
export interface Guide {
	meta: GuideFrontmatter;
	overview: { key: OverviewKey; heading: string; html: Html }[];
	steps: Step[];
	/** Every file the pull request changes, whether or not a step points at it. */
	changedFiles: ChangedFile[];
}

export interface Step {
	/** The step's number on the page, starting at 1. */
	number: number;
	title: string;
	html: Html;
	files: StepFile[];
	/** Added and removed lines across the hunks the step shows. */
	additions: number;
	deletions: number;
}

/**
 * Builds the page model for one guide entry: parses the body, renders the prose, and resolves
 * each block pointer to hunks from the repo file source. A bad pointer fails the build here.
 */
export async function loadGuide(
	entry: CollectionEntry<'guides'>,
	source: RepoFileSource = repoFileSource(),
): Promise<Guide> {
	const meta = entry.data;
	return inGuide(entry.id, async () => {
		const parsed = parseGuide(entry.body ?? '');
		const files = await PullRequestFiles.load(pullRequestOf(meta), source);
		const context = { repo: meta.repo, headSha: meta.headSha };
		const steps = await Promise.all(
			parsed.steps.map(async (step): Promise<Step> => {
				const stepFiles = await files.stepFiles(step);
				const rows = stepFiles.flatMap((file) => file.hunks.flatMap((hunk) => hunk.rows));
				return {
					number: step.number,
					title: step.title,
					html: renderProse(step.prose, context),
					files: stepFiles,
					additions: rows.filter((row) => row.kind === 'add').length,
					deletions: rows.filter((row) => row.kind === 'del').length,
				};
			}),
		);
		return {
			meta,
			overview: OVERVIEW_PARTS.map((part) => ({ ...part, html: renderProse(parsed.overview[part.key], context) })),
			steps,
			changedFiles: files.changed,
		};
	});
}

/** The route of a guide page: `/<repo>/<pr>/`. */
export function guideParams(meta: GuideFrontmatter): { repo: string; pr: string } {
	return { repo: meta.repo.split('/')[1]!, pr: String(meta.pr) };
}
