import type { ChangedFile } from '../repo-files/index.ts';
import type { PageImage } from './images.ts';

/** A changed file that no block pointer names. */
export interface AlsoChangedFile extends ChangedFile {
	/** For an image file, the image after the change, or before it for a deleted image. */
	thumbnail: PageImage | null;
	/** True for a binary file, whose line counts GitHub leaves at 0. */
	binary: boolean;
}

/**
 * GitHub sends a binary file with no patch and no line counts.
 * A file renamed without edits has no patch either, but its counts of 0 are true.
 */
export function isBinary(file: ChangedFile): boolean {
	return file.patch === undefined && file.additions + file.deletions === 0 && file.status !== 'renamed';
}
