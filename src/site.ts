/** The site's base path without its trailing slash: `/guides`. */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** A path under the site's base path, such as `/guides/shaders/` for `shaders/`. */
export function sitePath(path: string): string {
	return `${BASE}/${path}`;
}
