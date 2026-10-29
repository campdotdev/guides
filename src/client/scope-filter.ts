/**
 * Scope filter: hides the guides in a repo's list whose Conventional Commit scope differs from the chosen one.
 * The select names its list in `aria-controls`, and each list item carries its guide's scope in `data-scope`.
 */
export function initScopeFilter(select: HTMLSelectElement): void {
	const list = document.getElementById(select.getAttribute('aria-controls') ?? '');
	if (!list) return;

	function apply(): void {
		for (const item of list!.querySelectorAll<HTMLElement>(':scope > li')) {
			item.hidden = select.value !== '' && item.dataset.scope !== select.value;
		}
	}

	select.addEventListener('change', apply);
	// A browser can restore the chosen scope when the reader comes back to the page.
	apply();
	// The page renders the filter hidden, because it does nothing without this script.
	select.form!.hidden = false;
}
