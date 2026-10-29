/**
 * Step keys: `j` selects the next step and `k` the previous one.
 * Both stop at the first and last step. From the overview, `j` selects step 1.
 * Like a click, a key leaves focus on the selected step's header, which also scrolls the header into view.
 *
 * The keys work only while focus is inside the guide's `main` element, such as on a step's header or a Reviewed
 * checkbox. Elsewhere, including on the page itself right after it loads, `j` and `k` do nothing, so a stray key or a
 * dictated word that lands outside the guide never changes the step. WCAG 2.1.4, Character Key Shortcuts,
 * allows a single-letter shortcut that works only while its component has focus.
 *
 * The keys also do nothing while focus is in a field that takes typed letters: a text input, a select, a textarea,
 * or editable content. Buttons, checkboxes, and other inputs that take no letters don't count, so `j` and `k`
 * still work after a click on a step's header or on a Reviewed checkbox.
 * A key pressed with Control, Meta, or Alt belongs to the browser.
 */
import { selectStep, selectedStep } from './step-selection.ts';

/** The input types that take no typed letters. */
const LETTERLESS_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit']);

function takesLetters(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target instanceof HTMLInputElement) return !LETTERLESS_INPUTS.has(target.type);
	return target.isContentEditable || target.matches('select, textarea');
}

export function initStepKeys(): void {
	// A key reaches this listener only when focus is inside the guide, because keydown fires on the focused element.
	document.querySelector('main')?.addEventListener('keydown', (event) => {
		if (event.key !== 'j' && event.key !== 'k') return;
		if (event.ctrlKey || event.metaKey || event.altKey || takesLetters(event.target)) return;

		const blocks = [...document.querySelectorAll<HTMLElement>('[data-step]')];
		const current = blocks.findIndex((block) => Number(block.dataset.step) === selectedStep());
		const next = event.key === 'j' ? blocks[current + 1] : current > 0 ? blocks[current - 1] : undefined;
		if (!next) return;
		selectStep(Number(next.dataset.step));
		next.querySelector<HTMLElement>('[data-step-toggle]')?.focus();
	});
}
