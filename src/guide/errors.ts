/**
 * A problem in a guide file, named by the field it sits in, such as `headSha` or `steps.2.pointers.1`.
 * Step and pointer numbers start at 1, like the step numbers on the page.
 */
export class GuideError extends Error {
	readonly field: string;

	constructor(field: string, message: string) {
		super(`${field}: ${message}`);
		this.name = 'GuideError';
		this.field = field;
	}
}

/** A guide's path inside the guides directory, which is also its path on the content branch. */
export function guideFile(id: string): string {
	return `${id}.md`;
}

/**
 * Runs `check` on the guide with collection id `id`, such as `shaders/264`,
 * and prefixes any GuideError with the guide's file, so the build log names both.
 */
export async function inGuide<T>(id: string, check: () => T | Promise<T>): Promise<T> {
	try {
		return await check();
	} catch (error) {
		if (error instanceof GuideError) throw new Error(`Invalid guide ${guideFile(id)}: ${error.message}`);
		throw error;
	}
}
