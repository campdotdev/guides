/** The element that a control names in its `aria-controls`, such as the code that a step's toggle opens. */
export function controlledElement(control: Element | null | undefined): HTMLElement | null {
	return document.getElementById(control?.getAttribute('aria-controls') ?? '');
}
