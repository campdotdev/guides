import { bundledLanguages, codeToTokens, type BundledLanguage, type ThemedToken } from 'shiki';

const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

/** Shiki's language for a path, picked by its extension. Unknown extensions render as plain text. */
function languageOf(path: string): BundledLanguage | 'text' {
	const extension = path.split('/').at(-1)!.split('.').at(-1)!.toLowerCase();
	return extension in bundledLanguages ? (extension as BundledLanguage) : 'text';
}

const cache = new Map<string, Promise<ThemedToken[][]>>();

/**
 * Highlights a whole file once and returns its tokens per line, where index 0 is line 1.
 * Highlighting the whole file keeps state such as an open comment right on every row a hunk shows.
 */
export function highlightLines(text: string, path: string): Promise<ThemedToken[][]> {
	const lang = languageOf(path);
	const key = `${lang}\0${text}`;
	let lines = cache.get(key);
	if (!lines) {
		lines = codeToTokens(text, { lang, themes: THEMES }).then((result) => result.tokens);
		cache.set(key, lines);
	}
	return lines;
}

/** A token's inline style, with the light color and the `--shiki-dark` color that the stylesheet swaps in. */
export function tokenStyle(token: ThemedToken): string {
	return Object.entries(token.htmlStyle ?? {})
		.map(([property, value]) => `${property}:${value}`)
		.join(';');
}
