# Guide file format

A guide file walks through one pull request in steps. It is Markdown with YAML frontmatter, and it holds prose and pointers, never pasted code. The renderer reads the code for each pointer from GitHub at the commits the frontmatter names, so a guide always shows the code that the pull request changed.

## File location

Guides live on the `content` branch of `campdotdev/guides`, at `<repo>/<pr>.md`. The guide to `campdotdev/shaders#264` is `shaders/264.md`, and its page is `https://campdotdev.github.io/guides/shaders/264/`.

Markdown files at the top level of the branch, such as `README.md`, are not guides.

## Frontmatter

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repo` | string | Yes | The repository, as `owner/name`. The name is the folder the file sits in. |
| `pr` | positive integer | Yes | The pull request number. The file's name is this number plus `.md`. |
| `title` | string | Yes | The pull request title, which is a Conventional Commit. The page shows it as its heading. |
| `scope` | string | No | The Conventional Commit scope of the title. The repo's page can filter its guides by scope. |
| `baseSha` | commit SHA | Yes | The commit the pull request is based on. |
| `headSha` | commit SHA | Yes | The head commit the guide describes. Pointer line numbers refer to this commit. |
| `afterTheFact` | boolean | No | `true` when the guide was written from the diff after the session ended. The page then says it lacks the session's reasoning. Defaults to `false`. |

A commit SHA is the full 40-character lowercase hex SHA. A field the table does not list fails the build.

```yaml
---
repo: campdotdev/shaders
pr: 264
title: "feat(shaders): add FlutedGlass"
scope: shaders
baseSha: 60b67b513ab1a21d2e33abc9dbf7b7b342c775aa
headSha: 84cc41703117a566f6e181dd8aec5ec7ce889521
afterTheFact: true
---
```

## Body

The body is a list of second-level sections. `## Overview` comes first, and every section after it is a step. The body has no text before `## Overview` and no first-level heading.

Raw HTML does not render.

The site's search indexes the overview and the steps' prose. It does not index the code that block pointers show.

## Overview

The `## Overview` section holds four parts, each a third-level heading with text under it, in this order:

| Heading | Holds |
| --- | --- |
| `### Why` | Why the change exists. |
| `### Behavior change` | What a user or caller sees differently after the change. |
| `### Checks` | The checks the agent ran, and what they showed. |
| `### Not covered` | What the pull request leaves out. |

The overview does not list what changed. The steps do that. The overview has no block pointers.

The page shows the overview in the right pane until the reader opens a step.

## Steps

Each second-level section after the overview is a step, and its heading is the step's title. The page numbers the steps from 1, in file order. Step `n` has the anchor `#step-<n>`, so `https://campdotdev.github.io/guides/shaders/264/#step-2` opens that guide at step 2.

A step holds two things:

- Prose that explains the step. The right pane shows it when the reader opens the step.
- One or more block pointers. The left pane shows their hunks when the reader opens the step.

The prose and the block pointers can sit in any order. The left pane groups a step's hunks by file, in the order the step first points at each file. A step can use third-level headings in its prose.

## Block pointers

A block pointer is a Markdown link with no text, alone on its line:

```markdown
[](packages/shaders/src/engine.ts#L70-L75)
```

The link target has two parts:

- The path, relative to the repository root, with no leading `/` or `./`. The file must be one the pull request changes between `baseSha` and `headSha`, and GitHub must show a text diff for it.
- The line range, as `#L<start>-L<end>` or `#L<line>`. The lines are numbered in the file at `headSha`, and the range includes both ends. It must lie inside the file and overlap the diff.

The page shows the diff rows from three lines before the range to three lines after it. The rows come from GitHub's hunks for the file, so they match the pull request's diff on GitHub. The page shows no rows outside those hunks. Two pointers into one file in the same step share one table, and rows they both show appear once.

A block pointer cannot name deleted lines. To show a deletion, point at the lines around it.

## Inline pointers

An inline pointer is a link inside a step's prose. Its text is a phrase, and its target is a repository-relative path with a line range:

```markdown
The engine [exports the primitive](packages/shaders/src/engine.ts#L70-L74) for Mode 2.
```

The path and the line range follow the block pointer rules. In a step's prose, any repository-relative target whose fragment starts with `L` and a digit is an inline pointer, so a malformed range, such as `#L10-20`, fails the build.

Every line in the range must be one that the step's own block pointers show, context lines included. An inline pointer fails the build when it names a line that only another step shows, or a line past a block pointer's context. An inline pointer cannot name deleted lines.

On the page, an inline pointer is a phrase with a dotted underline:

- Hovering or focusing the phrase highlights its lines in the step's code.
- Clicking the phrase opens the step's block if it is closed and scrolls the lines into view. The lines stay highlighted until the phrase loses focus.
- The link's target is the lines on GitHub at `headSha`. A modified click, such as Cmd-click, opens it.

The overview has no code to highlight, so a link there with a line range renders as a link to the lines on GitHub. To link lines that no step shows, such as unchanged code, use a full GitHub URL.

## Other links

A link with text and a repository-relative target with no line range renders as a link to that path on GitHub at `headSha`.

Any other link, such as a link to a glossary entry or an ADR, renders as an ordinary link.

A link with no text fails the build unless it is a block pointer alone on its line.

## Build errors

The build fails on a malformed guide. The error names the file, by its path on the `content` branch, and the field:

```text
Invalid guide shaders/264.md: steps.2.pointers.1: packages/shaders/src/index.ts is not a file that campdotdev/shaders#264 changes.
```

A frontmatter error names the field the same way, such as `headSha: Expected a full 40-character lowercase commit SHA`.

| Field | Where the problem is |
| --- | --- |
| A frontmatter field, such as `headSha` | The frontmatter. |
| `pr` | The file's location does not match `repo` and `pr`. |
| `body` | The text before `## Overview`, or a first-level heading. |
| `overview` | The overview's parts. |
| `steps` | The guide has no steps. |
| `steps.<n>` | Step `n`'s title or prose. |
| `steps.<n>.pointers` | Step `n` has no block pointer. |
| `steps.<n>.pointers.<m>` | Block pointer `m` in step `n`. |
| `steps.<n>.inlinePointers.<m>` | Inline pointer `m` in step `n`, counted in reading order. |

Step and pointer numbers start at 1, like the step numbers on the page.

## Example

```markdown
---
repo: campdotdev/shaders
pr: 264
title: "feat(shaders): add FlutedGlass"
scope: shaders
baseSha: 60b67b513ab1a21d2e33abc9dbf7b7b342c775aa
headSha: 84cc41703117a566f6e181dd8aec5ec7ce889521
afterTheFact: true
---

## Overview

### Why

The homepage's Composable card stacks a Source, FlutedGlass, and Grain. Shaders had no reeded-glass Effect to put in the middle.

### Behavior change

`<FlutedGlass />` is a new Effect. Mount it after a Source inside a `<ShaderScene>`.

### Checks

- Unit tests for the component and for `fluteSurface`.

### Not covered

A UV warp mounted before FlutedGlass hands the glass a coordinate it already moved.

## Shape each flute in one primitive

`fluteSurface` works out how steep the glass is and how far it moves the image, in one call. The engine [exports it](packages/shaders/src/engine.ts#L70-L74) for Mode 2.

[](packages/shaders/src/primitives/flute-surface/flute-surface.ts#L108-L115)

[](packages/shaders/src/engine.ts#L70-L75)
```
