/**
 * Step selection: one step at a time is open in the left pane and explained in the right pane.
 * With no step selected, the right pane shows the overview.
 *
 * Other client features select steps through `selectStep` and follow changes through the
 * `STEP_SELECTED` event, so a click, a key, and a link all select a step the same way.
 */

/** Fired on `document` after the selected step changes. */
export const STEP_SELECTED = 'guide:step-selected';

export interface StepSelectedDetail {
	/** The selected step's number, or null when the overview shows. */
	step: number | null;
}

/** The selected step's number, or null when the overview shows. */
export function selectedStep(): number | null {
	const block = document.querySelector<HTMLElement>('[data-step][data-selected]');
	return block ? Number(block.dataset.step) : null;
}

/** Opens a step's block and shows its explanation, or shows the overview for null. */
export function selectStep(step: number | null): void {
	for (const block of document.querySelectorAll<HTMLElement>('[data-step]')) {
		const selected = Number(block.dataset.step) === step;
		block.toggleAttribute('data-selected', selected);
		const toggle = block.querySelector<HTMLElement>('[data-step-toggle]');
		toggle?.setAttribute('aria-expanded', String(selected));
		const code = document.getElementById(toggle?.getAttribute('aria-controls') ?? '');
		if (code) code.hidden = !selected;
	}
	const explains = step === null ? 'overview' : String(step);
	for (const panel of document.querySelectorAll<HTMLElement>('[data-explains]')) {
		panel.hidden = panel.dataset.explains !== explains;
	}
	document.dispatchEvent(new CustomEvent<StepSelectedDetail>(STEP_SELECTED, { detail: { step } }));
}

/** A click on a step's header opens that step. A click on the open step's header returns to the overview. */
export function initStepSelection(): void {
	document.addEventListener('click', (event) => {
		const toggle = (event.target as Element | null)?.closest('[data-step-toggle]');
		const block = toggle?.closest<HTMLElement>('[data-step]');
		if (!block) return;
		const step = Number(block.dataset.step);
		selectStep(selectedStep() === step ? null : step);
	});
}
