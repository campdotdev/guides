/**
 * Step links: every step has an anchor, `#step-<n>`.
 * Opening a guide at a step's anchor selects that step.
 * Selecting a step any other way writes its anchor to the URL, so the address bar always links to the current step.
 */
import { STEP_SELECTED, type StepSelectedDetail, selectStep } from './step-selection.ts';

/** The step an anchor such as `#step-2` names, or null when the anchor names no step on this page. */
function stepInHash(hash: string): number | null {
	const match = /^#step-(\d+)$/.exec(hash);
	if (!match || !document.querySelector(`[data-step="${match[1]}"]`)) return null;
	return Number(match[1]);
}

/** Replaces the URL's anchor without a history entry or a scroll. */
function writeHash(step: number | null): void {
	const url = new URL(location.href);
	url.hash = step === null ? '' : `step-${step}`;
	if (url.href !== location.href) history.replaceState(history.state, '', url);
}

export function initStepLinks(): void {
	const step = stepInHash(location.hash);
	if (step !== null) selectStep(step);

	// A link on the page, an edit in the address bar, or Back and Forward. An empty anchor means the overview.
	// Any other anchor, such as a heading's, leaves the selection alone.
	window.addEventListener('hashchange', () => {
		const step = stepInHash(location.hash);
		if (step !== null || location.hash === '') selectStep(step);
	});

	document.addEventListener(STEP_SELECTED, (event) => {
		writeHash((event as CustomEvent<StepSelectedDetail>).detail.step);
	});
}
