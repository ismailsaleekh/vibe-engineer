# System overview

This page is a source-linked overview of the `vibe-engineer` harness repository as it exists today. It describes what is actually present in the source tree and marks anything that is not yet wired as `pending-live`. It is the detailed companion to the [architecture index](./index.md), which is owned by a different lane and must not be edited here.

> **Current implementation truth.** The repository is a pnpm + Turborepo monorepo in foundation and partial-implementation state. Governance, decisions, docs, the workspace/package skeleton, and a set of early package lanes are present. A released CLI, generated starter, skill runtime, and public docs site are **not** claimed as live. Treat every "live" claim below as gated by an actual lane report.

## Repository layout (actual)

The workspace is declared in `pnpm-workspace.yaml` and orchestrated by `turbo.json`. The root `package.json` defines workspace scripts:

| Script | Command | Source |
| --- | --- | --- |
| `build` | `pnpm exec turbo run build` | `package.json` |
| `typecheck` | `pnpm exec turbo run typecheck` | `package.json` |
| `test` | `pnpm exec turbo run test` | `package.json` |
| `quality` | `node scripts/quality/run-quality.mjs` | `package.json` |
| `workspace:graph` | `pnpm -r list --depth -1 --json` | `package.json` |
| `workspace:surface` | `node .vibe/work/I-00A-.../workspace-surface-witness.mjs --root .` | `package.json` |

The harness packages live under `packages/`. Each package owns its `src/`, schemas, fixtures, and tests. The package set (from `packages/`) is:

```txt
adapters   artifacts     cli         config      context     contracts
mechanical-gates   observability   orchestration   presets   registry
schematics   security   skills   standards   testing   verification
```

## Package roles

The package source defines the actual public surface. Roles below are derived from each package's `package.json` description and its `src/index` exports:

- **`vibe-engineer` (`packages/cli`)** — the public package. Exposes the CLI entrypoint, the machine result envelope, and the command loader. See [CLI reference](../reference/cli.md).
- **`@vibe-engineer/artifacts`** — canonical JSON Schemas and typed validation for every artifact kind. See [Schemas reference](../reference/schemas.md).
- **`@vibe-engineer/config`** — project config schema (`vibe-engineer.config.v1`), defaults, loading.
- **`@vibe-engineer/context`** — context graph headers, index, drift detection, closure retrieval.
- **`@vibe-engineer/verification`** — verification runner that executes a Verification Delta and emits Evidence Packets.
- **`@vibe-engineer/security`** — security policy, command/env/external-integration safety evaluation, redaction.
- **`@vibe-engineer/orchestration`** — work plan DAG parsing, durable run state, ready-node scheduling, validated-output joins.
- **`@vibe-engineer/registry`** — agent/skill registry discovery, validation, locked skill/product/flow constants.
- **`@vibe-engineer/standards`** — domain-neutral standards catalog and validation.
- **`@vibe-engineer/observability`** — observability capture/export primitives.
- **`@vibe-engineer/testing`** — ephemeral workspace + typed-result assertion helpers for witnesses.

Packages marked `foundation` or with no listed exports are skeleton/pending-live and are not claimed as behaviorally complete.

## Two-repo direction

`vibe-engineer` targets a two-repo direction (locked, not yet generated):

- **Harness repo** — this repository (`vibe-engineer`). Owns schemas, CLI primitives, schematics, skills, orchestration, verification, context, registries, standards, adapters, governance, and docs.
- **Generated/reference starter repo** — `vibe-engineer-starter` (`pending-live`). It is intended to consume the harness through package/config/generated assets rather than copying harness logic.

## Domain-neutral boundary

Per [DL-20A](../decisions/DL-20A-domain-neutrality-foundation.md), core harness surfaces must stay generic: `harness`, `package`, `app`, `module`, `contract`, `schema`, `adapter`, `verification`, `evidence`, `context`, `drift`, `skill`, `agent`, `schematic`, `standard`, `docs`, `API`, `CLI`, `starter`, `example`, `sample`, `reference`, `migration`, `contribution`, `security`, `observability`. Business-domain vocabulary belongs only in explicitly labeled `sample`/`demo`/`reference` fixtures or negative examples, never in core defaults. The `@vibe-engineer/standards` catalog encodes this as the `domain-neutral-core` standard (see [Standards](../standards/index.md)).

## What is wired vs pending-live

| Surface | Status | Evidence |
| --- | --- | --- |
| Artifact JSON Schemas + validation | Present | `packages/artifacts/src/schema-registry.js`, 10 schema files |
| Config schema + loader | Present | `packages/config/src/index.js` |
| Context header/index/drift/closure | Present | `packages/context/src/index.js` |
| Verification runner + Evidence Packets | Present | `packages/verification/src/index.js` |
| Security policy + safety evaluation | Present | `packages/security/src/index.js` |
| Orchestration DAG + run state | Present | `packages/orchestration/src/index.ts` |
| Registry discovery + locked constants | Present | `packages/registry/src/index.js` |
| Standards catalog + validation | Present | `packages/standards/src/index.js` |
| CLI foundation (help/version/foundation) | Wired | `packages/cli/src/command-loader/loader.js` |
| CLI user commands (create/build/ship/...) | Source present, **not wired** (`pending-live`) | see [CLI reference](../reference/cli.md) |
| Skill runtime (`brainstorm`...`ship`) | `pending-live` | no skill orchestrator wired |
| Generated starter | `pending-live` | no generator wired |
| Public VitePress site | Config present, build `pending-live` | `docs/.vitepress/config.ts` |

## Related

- [Artifact chain](./artifact-chain.md)
- [Verification model](./verification-model.md)
- [Context and memory model](./context-memory.md)
- [Mechanical gates model](./mechanical-gates.md)
