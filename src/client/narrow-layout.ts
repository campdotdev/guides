/**
 * Narrow layout: on a narrow screen, the two panes stack, and each step's explanation sits above its code.
 *
 * GuidePage.astro's CSS stacks the panes. This module moves the DOM to match: the explanation pane, which shows
 * the overview, goes before the steps, and each step's explanation goes into its block, between the header and
 * the code. Moving the elements, instead of reordering them with CSS, keeps the tab order and the screen reader's
 * reading order the same as the order on screen. When the screen widens, the elements move back.
 */

import { controlledElement } from './controls.ts';

/** The same width as the `@media` query in GuidePage.astro. */
const NARROW = '(width < 800px)';

export function initNarrowLayout(): void {
	const stepsPane = document.querySelector<HTMLElement>('[data-pane="steps"]');
	const explanationPane = document.querySelector<HTMLElement>('[data-pane="explanation"]');
	if (!stepsPane || !explanationPane) return;
	const explanations = [...document.querySelectorAll<HTMLElement>('[data-explains]:not([data-explains="overview"])')];

	// In a step's block, the block's header already names the step, so the explanation's heading is only for screen readers.
	const hideHeadings = (hidden: boolean) => {
		for (const explanation of explanations) explanation.querySelector('h2')?.classList.toggle('visually-hidden', hidden);
	};
	const stack = () => {
		stepsPane.before(explanationPane);
		for (const explanation of explanations) {
			const toggle = stepsPane.querySelector(`[data-step="${explanation.dataset.explains}"] [data-step-toggle]`);
			controlledElement(toggle)?.before(explanation);
		}
		hideHeadings(true);
	};
	const unstack = () => {
		stepsPane.after(explanationPane);
		explanationPane.append(...explanations);
		hideHeadings(false);
	};

	const narrow = window.matchMedia(NARROW);
	if (narrow.matches) stack();
	narrow.addEventListener('change', () => (narrow.matches ? stack() : unstack()));
}
