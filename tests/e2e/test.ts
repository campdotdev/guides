import { expect, test as base } from '@playwright/test';

/**
 * Every spec runs offline: the browser may reach only the preview server.
 * A spec that needs a third-party response, such as the PR's head SHA, stubs it with `page.route`,
 * which takes precedence over this context-wide route.
 */
export const test = base.extend<{ localOnly: void }>({
	localOnly: [
		async ({ context, baseURL }, use) => {
			const origin = new URL(baseURL!).origin;
			await context.route(
				(url) => url.origin !== origin,
				(route) => route.abort('internetdisconnected'),
			);
			await use();
		},
		{ auto: true },
	],
});

export { expect };
