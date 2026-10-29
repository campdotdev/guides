import type { PullRequestRef } from './types.ts';

/** A pull request's name, such as `campdotdev/shaders#264`. */
export function pullRequestName({ owner, name, pr }: Pick<PullRequestRef, 'owner' | 'name' | 'pr'>): string {
	return `${owner}/${name}#${pr}`;
}

/** The first seven characters of a commit SHA, the way GitHub abbreviates it. */
export function shortSha(sha: string): string {
	return sha.slice(0, 7);
}
