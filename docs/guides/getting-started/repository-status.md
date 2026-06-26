# Repository status

This page preserves the detailed status and governance context that should not crowd the short product README.

## Status summary

`vibe-engineer` is in foundation and implementation progress. Treat the repository as governance, decisions, docs, workspace skeleton, and lane-owned partial implementation evidence unless a specific lane report proves a live behavior.

The public package, released CLI, generated/reference starter, skill runtime, docs site, install/create flow, release automation, and full end-to-end workflow are not claimed as live by this docs lane.

## What is currently safe to claim

The repository has documented and decision-locked direction for:

- product/package/CLI name: `vibe-engineer`;
- harness repo name: `vibe-engineer`;
- generated/reference starter repo name: `vibe-engineer-starter`;
- six user-facing skills: `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
- artifact chain: raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet;
- `plan` ownership of the Verification Delta;
- `build` and `ship` automatic verification/context/evidence responsibilities;
- schematics as internal/agent-facing helpers;
- CLI as deterministic primitive layer;
- domain-neutral core boundary;
- Markdown-first documentation source with future VitePress rendering;
- source-derived generated/reference docs policy;
- no push/PR without explicit approval.

## What is not live yet

Unless later lane evidence supersedes this page, do not claim these as available:

- npm package installation;
- public package publication;
- runnable `vibe-engineer` CLI commands;
- `vibe-engineer create` or generated starter creation;
- `brainstorm`, `grill-me`, `task`, `plan`, `build`, or `ship` as executable user commands;
- automatic verification/context/evidence runtime;
- generated starter repository output;
- public VitePress documentation site;
- generated API/CLI/schema/package reference pages;
- release automation, CI release publication, or push/PR automation.

This is why current docs avoid install, create, or usage snippets. Runnable examples must wait for real binary/package/API/starter witnesses.

## Current repository materials

### Governance files

- [License](../../../LICENSE) — MIT, with copyright metadata still requiring final public-release metadata.
- [Contributing](../../../CONTRIBUTING.md) — contribution expectations, review, DCO sign-off, and evidence requirements.
- [Code of Conduct](../../../CODE_OF_CONDUCT.md) — conduct expectations and enforcement policy; private contact must be finalized before public solicitation.
- [Security](../../../SECURITY.md) — vulnerability reporting policy; real private reporting channel is a release blocker.
- [Changelog](../../../CHANGELOG.md) — Keep a Changelog / SemVer structure.

### Documentation

- [Project README](../../../README.md) — concise product front door.
- [Documentation index](../../README.md) — current docs map.
- [Workflow guide](./workflow.md) — detailed workflow and artifact model.
- [Architecture overview](../../architecture/index.md) — high-level harness/starter boundaries.
- [Decision records](../../decisions/DL-21-documentation-system.md) — documentation system and related locked decisions.

### Package/workspace metadata

The root `package.json` currently identifies a private workspace and includes Prettier, TypeScript, ESLint, Turbo, and workspace witness scripts. That is not the same as a released public CLI package.

Active package lanes may add or refine package source under their own ownership. This status page does not mark package lanes complete unless their independent validations pass.

## Release blockers

Public release, package publication, and external contributor solicitation remain blocked until at least these are resolved by owning lanes:

1. **Governance metadata**
   - real copyright holder/year in [LICENSE](../../../LICENSE);
   - real private conduct-reporting contact in [CODE_OF_CONDUCT.md](../../../CODE_OF_CONDUCT.md);
   - real private vulnerability reporting channel in [SECURITY.md](../../../SECURITY.md);
   - repository hosting URL and package metadata.

2. **Package and CLI proof**
   - actual package manifests and workspace graph validated;
   - public `vibe-engineer` package/binary implemented;
   - machine-readable CLI envelope and exit behavior proven by real spawn/binary witnesses;
   - no fake live command claims.

3. **Starter proof**
   - generated/reference starter consumes the harness rather than copied harness logic;
   - create/import behavior is proven through actual package/CLI/starter seams;
   - generated config and selected agentic harness behavior are witnessed.

4. **Verification and context proof**
   - verification runner, evidence packets, failure routing, mechanical gates, and context/drift behavior are implemented where claimed;
   - `build` and `ship` prove automatic verification/context/evidence behavior at real boundaries.

5. **Docs proof**
   - docs links resolve;
   - Markdown/docs formatting gates run where tooling exists;
   - generated references are source-derived or clearly blocked;
   - runnable snippets are doc-tested against actual binaries/APIs/packages;
   - future VitePress public site build/link/render proof exists before claiming a public docs site.

## Documentation/tooling status

The docs source of truth is Markdown in the repository. VitePress is the selected future renderer, but this docs lane does not add site config, root scripts, package dependencies, CI, or generated reference tooling.

The target package metadata currently includes Prettier but no declared markdownlint script/dependency. Markdown lint remains pending-tooling/advisory unless a future owned lane adds tooling.

## Active-lane caveat

This repository is a dirty-tree, multi-orchestrator workspace. Other implementation lanes may be active or partially complete. This docs lane is intentionally path-disjoint from package/root/lockfile/CI work and does not normalize unrelated dirty files.

For this DOC-README lane, the only product files edited are:

- `README.md`;
- `docs/README.md`;
- `docs/guides/getting-started/workflow.md`;
- `docs/guides/getting-started/repository-status.md`.

## How to read current docs

- Treat workflow descriptions as intended protocol unless a page says a command is live and links evidence.
- Treat decision records as locked planning/governance sources, not runtime proof.
- Treat package/source behavior as live only when actual implementation reports and independent validations prove the producer/carrier/consumer seam.
- Treat generated/reference docs as placeholders unless they identify their source and freshness check.

## Related decisions

- [DL-01 — Repository and Package Structure](../../decisions/DL-01-repo-package-structure.md)
- [DL-03 — Skill Protocols](../../decisions/DL-03-skill-protocols.md)
- [DL-07 — CLI Primitives](../../decisions/DL-07-cli-primitives.md)
- [DL-20A — Domain-Neutrality Foundation](../../decisions/DL-20A-domain-neutrality-foundation.md)
- [DL-21 — Documentation System](../../decisions/DL-21-documentation-system.md)
- [DL-24A — Planning Output Discipline](../../decisions/DL-24A-planning-output-discipline.md)
