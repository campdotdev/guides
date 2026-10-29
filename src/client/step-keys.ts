/**
 * Step keys: `j` selects the next step and `k` the previous one.
 * Both stop at the first and last step. From the overview, `j` selects step 1.
 * Like a click, a key leaves focus on the selected step's header, which also scrolls the header into view.
 *
 * The keys do nothing while focus is in a form field, such as a checkbox or a search box.
 * Buttons don't count: a click leaves focus on the step's header, and `j` and `k` work from there.
 * A key pressed with Control, Meta, or Alt belongs to the browser.
 */
import { selectStep, selectedStep } from './step-selection.ts';

function inFormField(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && (target.isContentEditable || target.matches('input, select, textarea'));
}

export function initStepKeys(): void {
	document.addEventListener('keydown', (event) => {
		if (event.key !== 'j' && event.key !== 'k') return;
		if (event.ctrlKey || event.metaKey || event.altKey || inFormField(event.target)) return;

		const blocks = [...document.querySelectorAll<HTMLElement>('[data-step]')];
		const current = blocks.findIndex((block) => Number(block.dataset.step) === selectedStep());
		const next = event.key === 'j' ? blocks[current + 1] : current > 0 ? blocks[current - 1] : undefined;
		if (!next) return;
		selectStep(Number(next.dataset.step));
		next.querySelector<HTMLElement>('[data-step-toggle]')?.focus();
	});
}
