import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';
import { getCollection } from 'astro:content';
import { imageFileParam, imageType, imageVersions, isImagePath } from '../../../../guide/images.ts';
import { guideParams } from '../../../../guide/catalog.ts';
import { pullRequestOf } from '../../../../guide/schema.ts';
import { diffCommits, pullRequestName, repoFileSource } from '../../../../repo-files/index.ts';

/**
 * Writes each changed image of each guide's pull request into the build, at the merge base and the head commit where
 * it exists, so the page shows images from its own site: `/<repo>/<pr>/images/<commit>/<path>`.
 */
export const getStaticPaths = (async () => {
	const source = repoFileSource();
	const entries = await getCollection('guides');
	const routes = await Promise.all(
		entries.map(async (entry) => {
			const pull = pullRequestOf(entry.data);
			const comparison = await source.compare(pull);
			const diff = diffCommits(pull, comparison);
			return comparison.files
				.filter((file) => isImagePath(file.path))
				.flatMap((file) => {
					const { base, head } = imageVersions(file, diff);
					return [base, head].filter((version) => version !== null);
				})
				.map((version) => ({
					params: { ...guideParams(entry.data), file: imageFileParam(version) },
					props: { pull, version },
				}));
		}),
	);
	return routes.flat();
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({ props: { pull, version } }) => {
	const bytes = await repoFileSource().readFile(pull, version.path, version.commitSha);
	if (bytes === null) {
		throw new Error(`${version.path} is missing at ${version.commitSha}, but ${pullRequestName(pull)} lists it as changed.`);
	}
	// The copy is backed by an ArrayBuffer, which is the only kind of buffer Response's types accept.
	return new Response(bytes.slice(), { headers: { 'Content-Type': imageType(version.path)! } });
};
