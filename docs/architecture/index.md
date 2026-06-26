# Architecture Overview

`vibe-engineer` is planned as a domain-neutral harness that helps agentic software work move through explicit artifacts, deterministic checks, and preserved context.

This page describes the intended boundaries at a high level. Package source, CLI commands, schemas, adapters, generated starter files, CI, and reference docs are future lane-owned and are not claimed as implemented by this baseline.

## Repository roles

The planning model separates two roles:

- **Harness repository**: owns the reusable `vibe-engineer` package/CLI surface, skills, schemas, schematics, standards, verification, context, registry, security, observability, and agentic harness adapters once implemented.
- **Generated/reference starter**: consumes the harness instead of copying its logic. Starter generation and reference fixtures are future implementation work.

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

Input skills produce a Work Brief. `plan` consumes a Work Brief and produces an Implementation Plan. `build` consumes an approved Implementation Plan and produces a Build Result. `ship` consumes a Build Result and produces a Ship Packet. Later implementation lanes own the concrete schemas, writers, validators, and runtime joins for those artifacts.

## Verification and context principles

The harness is designed around evidence over assertion:

- deterministic checks block when available;
- advisory review does not replace deterministic proof;
- `build` and `ship` run verification and context updates automatically once implemented;
- reports and evidence paths must record what ran, what changed, and what remains blocked;
- real producer/carrier/consumer seams must be proven with actual on-disk or runtime artifacts, not shape-only substitutes.

Context preservation is expected to answer what exists, why it exists, who owns it, what depends on it, and how to verify changes safely. The concrete `.vibe/context` graph is future lane-owned and is not created by this baseline.

## Domain-neutral boundary

Core harness surfaces must stay generic: packages, modules, contracts, adapters, tests, standards, context, plans, verification, schematics, skills, agents, registries, and evidence. Consuming-project vocabulary belongs in explicit project-owned extensions or clearly labeled sample/reference fixtures, never hidden harness defaults.

## Ownership boundaries

Current baseline ownership is limited to root governance files, this docs index, this architecture overview, and lane-owned work evidence.

Future lane ownership remains separate:

- workspace/package skeleton and root package metadata are not owned here;
- package source and CLI implementation are not owned here;
- generated starter/reference fixtures are not owned here;
- CI, scripts, and release automation are not owned here;
- later reference docs, guides, standards docs, security docs, API docs, observability docs, and site docs are not owned here;
- decision-lock artifacts under `docs/decisions` remain read-only.

No push, PR, publish, or release automation is introduced by this architecture baseline.

## Related docs

- [Project README](../../README.md)
- [Documentation index](../README.md)
- [Contributing](../../CONTRIBUTING.md)
- [Security](../../SECURITY.md)
