/**
 * Guide search: queries the Pagefind index that `pnpm build` writes to dist/pagefind/ and lists the matching guides.
 * The index holds only elements marked `data-pagefind-body`, which on a guide page is the prose.
 * `astro dev` serves no index, so search works only on a built site.
 */

/** The parts of a Pagefind result that the list shows. */
interface PagefindResultData {
	/** The page's URL. Pagefind adds the site's /guides base, because it loads from under it. */
	url: string;
	/** Text around the match, as HTML with the matched words in `<mark>`. Pagefind escapes the page text. */
	excerpt: string;
	meta: { title?: string };
}

interface Pagefind {
	search(query: string): Promise<{ results: { data(): Promise<PagefindResultData> }[] }>;
}

/** How many results the list shows. Pagefind fetches each shown result's data separately. */
const MAX_SHOWN = 20;

const BUNDLE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/pagefind/pagefind.js`;

let pagefind: Promise<Pagefind> | undefined;

/** Loads the Pagefind bundle once, on first use. */
function loadPagefind(): Promise<Pagefind> {
	pagefind ??= import(/* @vite-ignore */ BUNDLE) as Promise<Pagefind>;
	return pagefind;
}

/** Shows the search form, which the page renders hidden because it does nothing without this script. */
export function initSearch(root: HTMLElement): void {
	const form = root.querySelector('form')!;
	const input = root.querySelector('input')!;
	const status = root.querySelector<HTMLElement>('[role="status"]')!;
	const list = root.querySelector<HTMLElement>('[data-search-results]')!;
	let latest = 0;

	async function search(): Promise<void> {
		const query = input.value.trim();
		const run = ++latest;
		if (query === '') {
			status.textContent = '';
			list.replaceChildren();
			return;
		}
		try {
			const { results } = await (await loadPagefind()).search(query);
			const shown = await Promise.all(results.slice(0, MAX_SHOWN).map((result) => result.data()));
			// A newer query may have finished first. Its results win.
			if (run !== latest) return;
			status.textContent = describe(results.length, shown.length, query);
			list.replaceChildren(...shown.map(resultItem));
		} catch {
			if (run !== latest) return;
			status.textContent = 'Search is unavailable. It needs the built site and its Pagefind index.';
			list.replaceChildren();
		}
	}

	input.addEventListener('focus', () => void loadPagefind().catch(() => {}), { once: true });
	input.addEventListener('input', () => void search());
	form.addEventListener('submit', (event) => {
		event.preventDefault();
		void search();
	});
	root.hidden = false;
}

function describe(total: number, shown: number, query: string): string {
	if (total === 0) return `No guides match “${query}”.`;
	const matches = `${total} ${total === 1 ? 'guide matches' : 'guides match'} “${query}”.`;
	return shown < total ? `${matches} Showing the first ${shown}.` : matches;
}

function resultItem(data: PagefindResultData): HTMLLIElement {
	const item = document.createElement('li');
	const link = document.createElement('a');
	link.href = data.url;
	link.textContent = data.meta.title ?? data.url;
	const excerpt = document.createElement('p');
	excerpt.className = 'search-excerpt';
	excerpt.innerHTML = data.excerpt;
	item.append(link, excerpt);
	return item;
}
