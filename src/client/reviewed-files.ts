/**
 * Reviewed marks: a reader checks Reviewed on a file, and local storage keeps the mark.
 *
 * Each mark has its own key, built from the pull request, the file's path, and the file's blob SHA:
 * `guides:reviewed:campdotdev/shaders#264:packages/shaders/src/engine.ts@<blob SHA>`.
 * A refreshed guide that shows the file at a new blob SHA looks up a different key,
 * so the file shows unchecked until the reader reviews it again, the way GitHub's Viewed checkbox works.
 *
 * Every checkbox with `data-reviewed`, `data-path`, and `data-blob-sha` takes part.
 * The page names its pull request in a `data-pull` attribute, such as `campdotdev/shaders#264`.
 * A step block's `data-reviewed-count` element counts the checked boxes inside the step.
 */

/** The local storage key for one file's mark. */
export function reviewedKey(pull: string, path: string, blobSha: string): string {
	return `guides:reviewed:${pull}:${path}@${blobSha}`;
}

/** A step's count, as the header shows it and as a screen reader reads it. */
export function reviewedCount(done: number, total: number): { shown: string; spoken: string } {
	return { shown: `${done}/${total} reviewed`, spoken: `${done} of ${total} ${total === 1 ? 'file' : 'files'} reviewed` };
}

export function initReviewedFiles(): void {
	const pull = document.querySelector<HTMLElement>('[data-pull]')?.dataset.pull;
	if (!pull) return;
	const keyOf = (box: HTMLInputElement) => reviewedKey(pull, box.dataset.path!, box.dataset.blobSha!);

	for (const box of document.querySelectorAll<HTMLInputElement>('input[data-reviewed]')) {
		box.checked = read(keyOf(box));
	}
	renderCounts();
	document.addEventListener('change', (event) => {
		const box = event.target;
		if (!(box instanceof HTMLInputElement) || !box.hasAttribute('data-reviewed')) return;
		write(keyOf(box), box.checked);
		renderCounts();
	});
}

function renderCounts(): void {
	for (const count of document.querySelectorAll<HTMLElement>('[data-reviewed-count]')) {
		const boxes = [...(count.closest('[data-step]')?.querySelectorAll<HTMLInputElement>('input[data-reviewed]') ?? [])];
		const { shown, spoken } = reviewedCount(boxes.filter((box) => box.checked).length, boxes.length);
		const [shownText, spokenText] = count.children;
		shownText!.textContent = shown;
		spokenText!.textContent = spoken;
	}
}

// Local storage throws when the browser blocks it. The checkboxes then work until the reader leaves the page.
function read(key: string): boolean {
	try {
		return localStorage.getItem(key) !== null;
	} catch {
		return false;
	}
}

function write(key: string, reviewed: boolean): void {
	try {
		if (reviewed) localStorage.setItem(key, '1');
		else localStorage.removeItem(key);
	} catch {
		// The mark lasts until the page closes.
	}
}
