/**
 * Inline pointers: a phrase in a step's explanation that points at lines of that step's code.
 * Hovering or focusing the phrase highlights those lines in the left pane.
 * A click opens the step's block if it is closed and scrolls the lines into view.
 *
 * The build marks each inline pointer's link with `data-pointer-file`, `data-pointer-start`, and `data-pointer-end`,
 * and each diff row with the line it shows at the head commit, `data-head-line`.
 */
import { selectedStep, selectStep } from './step-selection.ts';

const POINTER = 'a[data-pointer-file]';

/** The pointer under the mouse wins over the focused one, so moving off a phrase brings back the focused phrase's lines. */
let hovered: HTMLElement | null = null;
let focused: HTMLElement | null = null;

export function initInlinePointers(): void {
	for (const link of document.querySelectorAll<HTMLAnchorElement>(POINTER)) {
		link.addEventListener('mouseenter', () => {
			hovered = link;
			highlight();
		});
		link.addEventListener('mouseleave', () => {
			hovered = null;
			highlight();
		});
		link.addEventListener('focus', () => {
			focused = link;
			highlight();
		});
		link.addEventListener('blur', () => {
			focused = null;
			highlight();
		});
		link.addEventListener('click', (event) => {
			// A modified click, such as Cmd-click, still opens the lines on GitHub.
			if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			event.preventDefault();
			const step = stepOf(link);
			if (selectedStep() !== step) selectStep(step);
			// Focus keeps the lines highlighted while the reader moves the mouse to the code.
			link.focus({ preventScroll: true });
			scrollTo(linesOf(link));
		});
	}
}

/** Highlights the lines of the hovered or focused pointer, and clears every other highlight. */
function highlight(): void {
	const link = hovered ?? focused;
	for (const row of document.querySelectorAll('[data-highlighted]')) row.removeAttribute('data-highlighted');
	for (const row of link ? linesOf(link) : []) row.setAttribute('data-highlighted', '');
}

/** The number of the step whose explanation holds the link. */
function stepOf(link: HTMLElement): number {
	return Number(link.closest<HTMLElement>('[data-explains]')?.dataset.explains);
}

/** The diff rows, in the link's own step, that show the lines the link points at. */
function linesOf(link: HTMLElement): HTMLElement[] {
	const step = String(stepOf(link));
	const block = [...document.querySelectorAll<HTMLElement>('[data-step]')].find((el) => el.dataset.step === step);
	const file = [...(block?.querySelectorAll<HTMLElement>('[data-file]') ?? [])].find(
		(el) => el.dataset.file === link.dataset.pointerFile,
	);
	const start = Number(link.dataset.pointerStart);
	const end = Number(link.dataset.pointerEnd);
	return [...(file?.querySelectorAll<HTMLElement>('[data-head-line]') ?? [])].filter((row) => {
		const line = Number(row.dataset.headLine);
		return line >= start && line <= end;
	});
}

/** Centers the rows in the viewport when they fit, and otherwise scrolls the first row to the top. */
function scrollTo(rows: HTMLElement[]): void {
	const first = rows[0];
	const last = rows.at(-1);
	if (!first || !last) return;
	const height = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
	const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
	if (height <= window.innerHeight) rows[Math.floor(rows.length / 2)]!.scrollIntoView({ block: 'center', behavior });
	else first.scrollIntoView({ block: 'start', behavior });
}
