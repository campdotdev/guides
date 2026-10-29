# guides

Step-by-step guides to campdotdev pull requests, written by the agent that wrote each one. The site is https://campdotdev.github.io/guides/.

The repository has two branches with different jobs:

- `main` holds the renderer, an Astro site. Changes reach it through pull requests.
- `content` holds the guide files, one per pull request at `<repo>/<pr>.md`. Agents push to it directly.

[Guide file format](docs/guide-format.md) documents the guide file. The site serves the same page at `/guides/format/`.

## Run the site locally

You need Node 24 and pnpm 11.

```sh
pnpm install
pnpm exec playwright install chromium   # once, for pnpm test
pnpm dev     # serves the fixture guides at http://localhost:4321/guides/
pnpm build   # writes the static site and its Pagefind search index to dist/
pnpm check   # type-checks the project
pnpm test    # builds the site from the fixtures, serves it, and runs the Playwright specs
```

Search on the home page reads the index that `pnpm build` writes, so `pnpm dev` has no search results. To try search, run `pnpm build && pnpm preview`.

If another server already holds port 4321, pick another port for the tests, such as `PLAYWRIGHT_PORT=4400 pnpm test`.

To build the published guides, check out `content` into `content/` and read the pull requests' files from GitHub:

```sh
git worktree add content content
GUIDES_DIR=content REPO_FILE_SOURCE=github GITHUB_TOKEN=$(gh auth token) pnpm build
```

## Environment variables

| Variable | Default | Effect |
| --- | --- | --- |
| `GUIDES_DIR` | `tests/fixtures/guides` | The directory the build reads guides from. |
| `REPO_FILE_SOURCE` | `fixture` | Where the build reads the pull requests' files. `github` reads the GitHub API, and `fixture` reads a recorded snapshot. |
| `GITHUB_TOKEN` | None | The token the `github` source sends. `REPO_FILE_SOURCE=github` requires it. |
| `REPO_FILE_FIXTURES` | `tests/fixtures/repo-files` | The snapshot the `fixture` source reads. |
| `PLAYWRIGHT_PORT` | `4321` | The port that `pnpm test` serves the build on. |

## Tests

The specs in `tests/e2e` drive the built site in Chromium and assert through roles and accessible names. They read the fixture guides in `tests/fixtures/guides`, which the test suite owns, so the sample guide on `content` can change without breaking them. The search specs query the real Pagefind index that the build writes. Each guide in `tests/fixtures/malformed` must fail the build with an error that names the bad field.

The `fixture` source serves each fixture guide's files from `tests/fixtures/repo-files`, a snapshot of the pull request at its base and head commits. The tests never touch the network. To record the snapshot for a new fixture guide, run:

```sh
GITHUB_TOKEN=$(gh auth token) pnpm record-fixture tests/fixtures/guides/<repo>/<pr>.md
```

The script reads the files through the production `github` source and checks each one against the blob SHA that GitHub lists.

## Deploys

`.github/workflows/deploy.yml` builds `main`'s renderer with the guides on `content` and deploys the site to GitHub Pages. It runs on every push to `main`. Only `main` may deploy to the `github-pages` environment, so a push to `content` runs that branch's `trigger-deploy.yml`, which dispatches `deploy.yml` on `main`.

A malformed guide on `content` fails the deploy build, and the site keeps its last good deployment.

`.github/workflows/ci.yml` type-checks the project and runs the Playwright specs on every pull request to `main`.

## Code layout

| Path | Holds |
| --- | --- |
| `src/content.config.ts` | The `guides` collection, read from `GUIDES_DIR`. |
| `src/guide/` | The guide model. It parses and validates a guide file and resolves its pointers to diff hunks. Components never parse Markdown. |
| `src/repo-files/` | The repo file source: its interface, the `github` and `fixture` sources, and the switch between them. |
| `src/components/` | The page components. |
| `src/client/` | Browser behavior, one module per feature. |
| `src/highlight.ts` | Syntax highlighting with Shiki, one token list per line. |
| `docs/guide-format.md` | The guide format reference. |
| `scripts/record-fixture.ts` | The script that records a fixture snapshot. |
