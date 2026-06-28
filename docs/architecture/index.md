# Architecture Overview

`vibe-engineer` is a domain-neutral harness that helps agentic software work move through explicit artifacts, deterministic checks, and preserved context.

## Repository roles

- **Harness repository**: this repo. It owns the `vibe-engineer` CLI package, public `@vibe-engineer/*` packages, artifact schemas, schematics, verification, context, security, orchestration, skills runtime primitives, standards, agentic harness adapters, governance, and docs.
- **Generated/reference starter**: produced by `vibe-engineer create`. It consumes the harness through package dependencies and generated assets; it is not a forked copy of harness implementation logic.

## v0.1 public runtime

The v0.1 public runtime is built with `tsup` into `dist` and published as:

- `vibe-engineer` — CLI package and public binary;
- `@vibe-engineer/artifacts`;
- `@vibe-engineer/config`;
- `@vibe-engineer/context`;
- `@vibe-engineer/orchestration`;
- `@vibe-engineer/schematics`;
- `@vibe-engineer/security`;
- `@vibe-engineer/skills`;
- `@vibe-engineer/verification`;
- `@vibe-engineer/adapter-pi`.

Private workspace packages remain source/test/tooling only and are not runtime dependencies of public packages.

## Skill and artifact flow

The user-facing skill set remains:

```txt
brainstorm
grill-me
task
plan
build
ship
```

The core artifact flow remains:

```txt
raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet
```

These six skills are harness-native assets. They are installed into supported harness environments (pi in v0.1) and are not public CLI commands.

## CLI role

The CLI is the deterministic primitive layer. The v0.1 binary exposes:

```txt
help version create import doctor config verify security schematic
```

Deferred command families (`context`, `registry`, `update`, `init`) fail closed. Skill names fail as unknown CLI commands.

## Verification and context principles

The harness is designed around evidence over assertion:

- deterministic checks block when required;
- advisory review does not replace deterministic proof;
- real producer/carrier/consumer seams must be proven with actual on-disk or runtime artifacts;
- package/create/starter paths are proven locally from packed packages;
- hosted CI, live pi runtime loading, Pulumi deploys, mobile device E2E, and full visual baselines remain pending-live until separately evidenced.

Context preservation answers what exists, why it exists, who owns it, what depends on it, and how to verify changes safely. Generated starters receive `.vibe/context`, `.vibe/work`, `.vibe/evidence`, and `.vibe/registry` scaffolding.

## Domain-neutral boundary

Core harness surfaces stay generic: packages, modules, contracts, adapters, tests, standards, context, plans, verification, schematics, skills, agents, registries, and evidence. Consuming-project vocabulary belongs in explicit project-owned extensions or clearly labeled sample/reference fixtures, never hidden harness defaults.

## Related docs

- [System overview](./system-overview.md)
- [Artifact chain](./artifact-chain.md)
- [Verification model](./verification-model.md)
- [Context and memory](./context-memory.md)
- [CLI reference](../reference/cli.md)
- [Package exports](../reference/packages.md)
