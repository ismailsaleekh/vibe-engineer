# System overview

This page is a source-linked overview of the `vibe-engineer` harness repository as it exists for the published v0.1 release line.

## Repository layout

The workspace is a pnpm + Turborepo monorepo. Root scripts include:

| Script                  | Command                                  |
| ----------------------- | ---------------------------------------- |
| `build`                 | `pnpm exec turbo run build`              |
| `typecheck`             | `pnpm exec turbo run typecheck`          |
| `test`                  | `pnpm exec turbo run test`               |
| `quality`               | `node scripts/quality/run-quality.mjs`   |
| `release:pack`          | `node scripts/release/pack.mjs`          |
| `release:install-smoke` | `node scripts/release/install-smoke.mjs` |
| `release:check`         | `node scripts/release/check.mjs`         |
| `release:publish`       | `node scripts/release/publish.mjs`       |

## Public package roles

The publishable v0.1 package graph is:

- **`vibe-engineer` (`packages/cli`)** — public binary, command loader, result envelope, starter templates, and pi asset templates.
- **`@vibe-engineer/artifacts`** — canonical JSON Schemas and fail-closed artifact validators.
- **`@vibe-engineer/config`** — project config schema, defaults, and loaders.
- **`@vibe-engineer/context`** — context graph headers, index, drift detection, and closure retrieval.
- **`@vibe-engineer/verification`** — verification runner and Evidence Packet production.
- **`@vibe-engineer/security`** — security policy, command/env/external-integration safety evaluation, and redaction.
- **`@vibe-engineer/orchestration`** — work-plan DAG parsing, durable run state, scheduling, and validated-output joins.
- **`@vibe-engineer/schematics`** — manifest-driven schematic engine.
- **`@vibe-engineer/skills`** — build/ship skill runtime primitives used by harness-native workflows.
- **`@vibe-engineer/adapter-pi`** — pi adapter capability metadata, generated-file manifest, and create/import asset selection validation.

Private workspace packages such as registry, standards, testing, observability, mechanical gates, presets, and Pulumi scaffolding remain source/test/tooling surfaces and are not public runtime dependencies.

## Two-repo direction

- **Harness repo** — this repository. Owns schemas, CLI primitives, schematics, skills runtime primitives, orchestration, verification, context, security, adapters, governance, and docs.
- **Generated/reference starter repo** — produced by `vibe-engineer create`. It consumes the harness through dependencies and generated assets rather than copying harness internals.

## What is wired vs pending-live

| Surface                                     | Status                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Public package graph                        | Locally proven through `npm pack` + clean external install.                                          |
| Installed CLI binary                        | Locally proven through real `.bin/vibe-engineer` invocation.                                         |
| v0.1 CLI primitives                         | Wired: `help`, `version`, `create`, `import`, `doctor`, `config`, `verify`, `security`, `schematic`. |
| Deferred CLI families                       | `context`, `registry`, `update`, `init` fail closed as unsupported.                                  |
| Skill names as CLI commands                 | Not registered; fail as unknown commands.                                                            |
| Full starter create                         | Locally proven from installed package.                                                               |
| Pi skill/prompt assets                      | Static generated-file proof green; live pi runtime discovery remains pending-live.                   |
| Generated starter local proof               | Green for install, typecheck, lint, format, unit tests, build, and quick quality.                    |
| Hosted harness CI                           | Pending hosted run evidence.                                                                         |
| Hosted generated-starter CI                 | Pending hosted run evidence.                                                                         |
| Pulumi deploy, mobile E2E, visual baselines | Pending-live and not claimed by v0.1 local proof.                                                    |

## Domain-neutral boundary

Per [DL-20A](../decisions/DL-20A-domain-neutrality-foundation.md), core harness surfaces must stay generic. Business-domain vocabulary belongs only in explicitly labeled sample/demo/reference fixtures or negative examples, never in core defaults.

## Related

- [Artifact chain](./artifact-chain.md)
- [Verification model](./verification-model.md)
- [Context and memory model](./context-memory.md)
- [Mechanical gates model](./mechanical-gates.md)
- [CLI reference](../reference/cli.md)
- [Package exports](../reference/packages.md)
