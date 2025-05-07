# CLI Style Guide

Based on the patterns observed and best practices, I recommend adopting the following consistent style guide for your CLI tools:

| Element              | Convention                                                                                                                                    | Rationale / Examples                                                                                           |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **CLI Commands**     | `verb-noun` in `kebab-case`. Use the shortest unambiguous verb (`ls`, `get`, `create`, `add`, `exec`, `search`).                              | `export-space`, `list-pages`                                                                                   |
| **CLI Options**      | `--kebab-case`. Be specific (e.g., `--space-key`, not just `--key`).                                                                          | `--space-key`, `--output-dir`, `--format`                                                                      |
| **Boolean Args**     | Use verb prefixes for clarity (`includeXxx`, `launchBrowser`). Avoid bare adjectives (`--https`).                                             | `includeAttachments: boolean`, `flatStructure: boolean`                                                        |
| **Array Args**       | Use plural names (`spaceKeys`, `pageIds`, `statuses`).                                                                                        | `pageIds: string[]`, `excludedLabels: string[]`                                                                |
| **Descriptions**     | **Start with an imperative verb.** Keep the first sentence concise (≤120 chars). Add 1-2 sentences detail. Mention pre-requisites/notes last. | `Export Confluence pages from a specified space. Saves content locally. Requires valid Atlassian credentials.` |
| **Arg Descriptions** | Start lowercase, explain purpose clearly. Mention defaults or constraints.                                                                    | `the key of the Confluence space to export (e.g., "MYSPACE"). Required.`                                       |
| **ID/Key Naming**    | Use consistent suffixes like `Id`, `Key`, `Slug` where appropriate.                                                                           | `spaceKey`, `pageId`                                                                                           |

Adopting this guide will make the CLI more predictable and easier for users to understand and use correctly.
