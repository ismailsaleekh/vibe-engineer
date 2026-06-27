# Reference

This section is the reference index for `vibe-engineer`. Reference pages are **curated from actual source** and carry a source-of-truth note. Per [DL-21](../decisions/DL-21-documentation-system.md), hand-maintained references that can drift from source are not authoritative; the [stale-doc witness](#freshness) must keep them current.

> **Freshness.** <a name="freshness"></a> Every reference page below is checked against actual source by the stale-doc witness at `.vibe/work/I-24-docs-reference-governance-polish/witnesses/stale-doc-witness.mjs`. If a referenced export, command, schema, or standard id is removed or renamed in source, the witness fails.

## Pages

| Page | Source of truth | What it covers |
| --- | --- | --- |
| [Package exports](./packages.md) | `packages/*/src/index.*` | Public exports of each `@vibe-engineer/*` workspace package. |
| [CLI reference](./cli.md) | `packages/cli/src/**` | CLI commands, result envelope, statuses, exit codes. |
| [Schemas reference](./schemas.md) | `packages/artifacts/src/schema-registry.js` + `schemas/*.schema.json` | Artifact kinds, schema versions, validation API. |
| [Standards catalog](../standards/index.md) | `packages/standards/src/catalog-data.js` | Domain-neutral standards and requirements. |

## Implementation status

The repository is in foundation and partial-implementation state. Where a reference page marks a surface `pending-live`, the source exists as a skeleton or partial lane but is not wired into a runnable runtime; do not treat it as released behavior. See [Repository status](../guides/getting-started/repository-status.md).
