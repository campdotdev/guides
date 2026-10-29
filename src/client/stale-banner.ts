/**
 * The stale banner: on load, the page asks the GitHub API for the pull request's current head SHA.
 * If the head differs from the commit the guide describes, the banner says so and links to the pull request.
 *
 * The request is one unauthenticated `fetch` with no custom headers, so the browser sends no CORS preflight.
 * GitHub allows 60 such requests per hour from one IP address. A failed request, a rate limit included,
 * shows no banner and no error.
 *
 * The page renders an empty `data-stale-banner` status region that names the API URL and the guide's head SHA,
 * and a `data-stale-banner-template` with the banner's text.
 */
export async function initStaleBanner(): Promise<void> {
	const region = document.querySelector<HTMLElement>('[data-stale-banner]');
	const template = document.querySelector<HTMLTemplateElement>('template[data-stale-banner-template]');
	if (!region || !template) return;
	const head = await currentHead(region.dataset.pullApi!);
	if (head === null || head === region.dataset.headSha) return;
	const banner = template.content.cloneNode(true) as DocumentFragment;
	banner.querySelector('[data-current-head]')!.textContent = head.slice(0, 7);
	region.append(banner);
}

/** The pull request's head SHA, or null when GitHub does not answer with one. */
async function currentHead(pullApi: string): Promise<string | null> {
	try {
		const response = await fetch(pullApi);
		if (!response.ok) return null;
		const sha: unknown = (await response.json())?.head?.sha;
		return typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha) ? sha : null;
	} catch {
		return null;
	}
}
