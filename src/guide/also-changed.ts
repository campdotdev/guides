import type { ChangedFile, PullRequestRef } from '../repo-files/index.ts';
import { imagePair, isImagePath, type PageImage } from './images.ts';
import type { ParsedStep } from './parse.ts';

/** A changed file that no block pointer names. */
export interface AlsoChangedFile extends ChangedFile {
	/** For an image file, the image after the change, or before it for a deleted image. */
	thumbnail: PageImage | null;
}

/**
 * The changed files that no block pointer names, in the order GitHub lists them.
 * The renderer works this out from the pull request's file list, so the page shows every file the guide skips.
 */
export function alsoChanged(
	steps: ParsedStep[],
	changed: ChangedFile[],
	pull: PullRequestRef,
	pageUrl: string,
): AlsoChangedFile[] {
	const covered = new Set(steps.flatMap((step) => step.pointers.map((pointer) => pointer.path)));
	return changed
		.filter((file) => !covered.has(file.path))
		.map((file) => {
			if (!isImagePath(file.path)) return { ...file, thumbnail: null };
			const { before, after } = imagePair(file, pull, pageUrl);
			return { ...file, thumbnail: after ?? before };
		});
}
