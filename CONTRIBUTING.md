# Contributing to vibe-engineer

Thank you for your interest in `vibe-engineer`. This project is governed as an open-source, domain-neutral harness. Contributions must preserve the locked architecture, verification, context, and governance boundaries.

## Ways to contribute

You may contribute by opening public issues or pull requests for bugs, docs, tests, governance improvements, or domain-neutral harness features. Sensitive security matters must follow [SECURITY.md](./SECURITY.md) instead of public discussion.

## Issue expectations

A useful issue includes:

- the affected surface;
- observed behavior;
- expected behavior;
- reproduction steps or context where applicable;
- whether the topic is a bug, feature, documentation, hardening, or governance proposal;
- any evidence already collected.

## Pull-request expectations

Pull requests should:

- link the relevant issue or explain the motivation;
- list the changed surfaces and ownership assumptions;
- include positive, negative, and regression evidence appropriate to the changed surface;
- update docs, changelog entries, and migration or release notes when public behavior changes;
- avoid unrelated formatting sweeps or broad rewrites;
- preserve domain-neutral core behavior.

## Maintainer review and merges

All external pull requests require maintainer review before merge. External contributors do not merge their own changes. Maintainers may request additional deterministic evidence, independent validation, or narrower ownership before approving a change.

Changes that affect contracts, schemas, CLI behavior, prompts, governance, security, releases, package metadata, or public APIs require explicit maintainer attention and recorded evidence.

## Developer Certificate of Origin

This project uses the Developer Certificate of Origin 1.1. All external pull-request commits must include a DCO sign-off using a `Signed-off-by:` commit trailer, for example:

```txt
Signed-off-by: Your Name <you@example.com>
```

By signing off, you certify that you have the right to submit the contribution under this project's MIT license terms. A future repository bot or maintainer check may enforce this mechanically; until then, maintainers must reject unsigned external commits or require correction before merge.

## Evidence expectations

For code, docs, governance, schema, prompt, or security changes, evidence should show what actually ran or what was inspected. Good evidence names commands, artifacts, paths, expected failures, and final status. Narrative claims without inspection or command output are not enough for significant changes.

No contributor or maintainer should be the sole validator of their own significant change. Independent review is part of the quality bar.

## Changelog and release notes

Public behavior changes should update [CHANGELOG.md](./CHANGELOG.md) under `Unreleased`. Breaking changes require migration notes and must follow the project's SemVer policy once package metadata and release tooling exist.

## Security reporting

Do not include sensitive vulnerability details, secrets, bypass instructions, or exploit material in public issues or pull requests. Follow [SECURITY.md](./SECURITY.md) for private vulnerability reporting.
