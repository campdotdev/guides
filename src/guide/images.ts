import type { ChangedFile, PullRequestRef } from '../repo-files/index.ts';

/** The image files a guide shows as images, by extension, with the media type of each. */
const IMAGE_TYPES: Record<string, string> = {
	'.avif': 'image/avif',
	'.gif': 'image/gif',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
};

/** The media type of an image file, or undefined when the path is not an image. */
export function imageType(path: string): string | undefined {
	const dot = path.lastIndexOf('.');
	return dot === -1 ? undefined : IMAGE_TYPES[path.slice(dot).toLowerCase()];
}

export function isImagePath(path: string): boolean {
	return imageType(path) !== undefined;
}

/** An image file's path at one commit. */
export interface ImageVersion {
	commitSha: string;
	path: string;
}

/** An image the page shows. */
export interface PageImage {
	src: string;
	alt: string;
}

/** A changed image before and after the change. A new image has no before, and a deleted image has no after. */
export interface ImagePair {
	before: PageImage | null;
	after: PageImage | null;
}

/** The versions of a changed image file at the pull request's base and head commits, where it exists. */
export function imageVersions(
	file: ChangedFile,
	pull: PullRequestRef,
): { before: ImageVersion | null; after: ImageVersion | null } {
	return {
		before: file.status === 'added' ? null : { commitSha: pull.baseSha, path: file.previousPath ?? file.path },
		after: file.status === 'removed' ? null : { commitSha: pull.headSha, path: file.path },
	};
}

/**
 * The build writes each image version under its guide's page, at `images/<commit>/<path>`.
 * This is the part after `images/`, which is the image route's `file` parameter.
 */
export function imageFileParam(version: ImageVersion): string {
	return `${version.commitSha}/${version.path}`;
}

/** The images of a changed image file. `pageUrl` is the guide page's URL, ending in `/`. */
export function imagePair(file: ChangedFile, pull: PullRequestRef, pageUrl: string): ImagePair {
	const { before, after } = imageVersions(file, pull);
	const image = (version: ImageVersion, when: 'before' | 'after'): PageImage => ({
		src: `${pageUrl}images/${imageFileParam(version).split('/').map(encodeURIComponent).join('/')}`,
		alt: `${version.path} ${when} the change`,
	});
	return {
		before: before && image(before, 'before'),
		after: after && image(after, 'after'),
	};
}
