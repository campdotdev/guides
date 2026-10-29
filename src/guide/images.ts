import { fileVersions, type ChangedFile, type DiffCommits, type FileStatus, type FileVersion } from '../repo-files/index.ts';

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

/**
 * The build writes each image version under its guide's page, at `images/<commit>/<path>`.
 * This is the part after `images/`, which is the image route's `file` parameter.
 */
export function imageFileParam(version: FileVersion): string {
	return `${version.commitSha}/${version.path}`;
}

/**
 * The images of a changed image file, before at the merge base and after at the head commit.
 * `pageUrl` is the guide page's URL, ending in `/`.
 */
export function imagePair(file: ChangedFile, diff: DiffCommits, pageUrl: string): ImagePair {
	const { base, head } = fileVersions(file, diff);
	const image = (version: FileVersion, when: 'before' | 'after'): PageImage => ({
		src: `${pageUrl}images/${imageFileParam(version).split('/').map(encodeURIComponent).join('/')}`,
		alt: `${version.path} ${when} the change`,
	});
	return {
		before: base && image(base, 'before'),
		after: head && image(head, 'after'),
	};
}

/** One image file in a step, with the images its block pointer shows. */
export interface StepImage extends ImagePair {
	path: string;
	status: FileStatus;
	blobSha: string;
}
