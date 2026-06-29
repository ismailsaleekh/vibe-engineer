# Reference

This section is the reference index for `vibe-engineer`. Reference pages are **curated from actual source** and carry a source-of-truth note. Per [DL-21](../decisions/DL-21-documentation-system.md), hand-maintained references that can drift from source are not authoritative; the [stale-doc witness](#freshness) must keep them current.

> **Freshness.** <a name="freshness"></a> Every reference page below is checked against actual source by the stale-doc witness at `.vibe/work/I-24-docs-reference-governance-polish/witnesses/stale-doc-witness.mjs`. If a referenced export, command, schema, or standard id is removed or renamed in source, the witness fails.

## Pages

| Page                                       | Source of truth                                                       | What it covers                                               |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Package exports](./packages.md)           | `packages/*/src/index.*`                                              | Public exports of each `@vibe-engineer/*` workspace package. |
| [CLI reference](./cli.md)                  | `packages/cli/src/**`                                                 | CLI commands, result envelope, statuses, exit codes.         |
| [Schemas reference](./schemas.md)          | `packages/artifacts/src/schema-registry.js` + `schemas/*.schema.json` | Artifact kinds, schema versions, validation API.             |
| [Standards catalog](../standards/index.md) | `packages/standards/src/catalog-data.js`                              | Domain-neutral standards and requirements.                   |

## Implementation status

The v0.1 CLI/package/create/starter path is locally proven from packed packages. Live pi runtime loading, provider-agnostic Pulumi Cloud preview/up, web visual baselines, and iOS Maestro+Detox mobile smoke have local evidence. Hosted CI proof is tracked separately. See [Repository status](../guides/getting-started/repository-status.md).
