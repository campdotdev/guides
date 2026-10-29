/**
 * SHA-285: the page warns when the pull request has moved past the commit the guide describes.
 *
 * On load, the browser asks the GitHub API for the pull request's head SHA. Each test stubs that request.
 * The fixture guide describes 84cc417.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './test.ts';

const GUIDE = '/guides/shaders/264/';
const PULL_API = 'https://api.github.com/repos/campdotdev/shaders/pulls/264';
const GUIDE_HEAD = '84cc41703117a566f6e181dd8aec5ec7ce889521';
const NEWER_HEAD = '9f0e1d2c3b4a59687766554433221100ffeeddcc';

// GitHub sends this header on every API response, errors included.
const CORS = { 'access-control-allow-origin': '*' };

const staleBanner = (page: Page) => page.getByRole('banner').getByRole('status');

test('a banner names the guide’s commit and links to the pull request when the head has moved', async ({ page }) => {
	await page.route(PULL_API, (route) => route.fulfill({ headers: CORS, json: { head: { sha: NEWER_HEAD } } }));
	await page.goto(GUIDE);

	await expect(staleBanner(page)).toHaveText(
		'The pull request has changed since this guide was written. ' +
			'The guide describes commit 84cc417, and the pull request’s head is now 9f0e1d2. ' +
			'View the pull request on GitHub',
	);
	await expect(staleBanner(page).getByRole('link', { name: 'View the pull request on GitHub' })).toHaveAttribute(
		'href',
		'https://github.com/campdotdev/shaders/pull/264',
	);
});

const noBannerCases: { when: string; respond: Parameters<Page['route']>[1] }[] = [
	{
		when: 'the pull request’s head is the guide’s commit',
		respond: (route) => route.fulfill({ headers: CORS, json: { head: { sha: GUIDE_HEAD } } }),
	},
	{
		when: 'GitHub rate-limits the request',
		respond: (route) =>
			route.fulfill({
				status: 403,
				headers: { ...CORS, 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '0' },
				json: { message: 'API rate limit exceeded for 203.0.113.7.' },
			}),
	},
	{
		when: 'the request fails on the network',
		respond: (route) => route.abort('internetdisconnected'),
	},
];

for (const { when, respond } of noBannerCases) {
	test(`no banner and no error appear when ${when}`, async ({ page }) => {
		const errors: Error[] = [];
		page.on('pageerror', (error) => errors.push(error));
		await page.route(PULL_API, respond);
		const asked = page.waitForRequest(PULL_API);

		await page.goto(GUIDE);
		await asked;
		// Give the page's script time to handle the response before checking that nothing appeared.
		await page.waitForLoadState('networkidle');

		await expect(staleBanner(page)).toBeEmpty();
		expect(errors).toEqual([]);
	});
}
