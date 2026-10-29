import { controlledElement } from './controls.ts';

/**
 * Diff context: separators hide the lines of a file's diff around and between the hunks a step shows.
 * Clicking a separator shows its lines, and clicking it again hides them.
 */
export function initDiffContext(): void {
	document.addEventListener('click', (event) => {
		const separator = (event.target as Element | null)?.closest<HTMLElement>('[data-diff-context]');
		if (!separator) return;
		const rows = controlledElement(separator);
		if (!rows) return;
		const expand = separator.getAttribute('aria-expanded') !== 'true';
		separator.setAttribute('aria-expanded', String(expand));
		rows.hidden = !expand;
	});
}
