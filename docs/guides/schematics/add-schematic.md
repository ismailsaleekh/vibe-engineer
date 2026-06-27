# Add a schematic

> **Status:** `pending-live`. Schematics are governed by the `deterministic-schematics` standard and the `schematic_manifest` artifact schema, both of which **are** present. The schematic runtime/engine is a `pending-live` package (`packages/schematics`). This guide describes the manifest contract and the standard a schematic must satisfy.

## What a schematic is

A schematic is a deterministic generator: typed manifest in, planned/generated paths out. It must be predictable and inspectable **before** files are written. The governing standard is [`deterministic-schematics`](../../standards/index.md#deterministic-schematics):

- `typed-manifest` — declare inputs, generated paths, conflict policy, and verification expectations in a strict manifest.
- `dry-run-first` – dry-run reports planned changes without writing; apply refuses conflicting files.

## The manifest contract

A schematic is described by a **Schematic Manifest** (artifact kind `schematic_manifest`, schema `packages/artifacts/schemas/schematic-manifest.schema.json`). Validate a manifest with the real boundary:

```js
import { validateArtifactKind } from "@vibe-engineer/artifacts";

const result = validateArtifactKind("schematic_manifest", manifest);
// result.ok === true | { ok: false, errors }
```

Per the standard and the schema, a manifest must declare its inputs, the paths it generates, its conflict policy, and its verification expectations. Unknown fields, missing path policy, and unsupported versions are rejected.

## Steps to add a schematic

1. **Author a manifest** of kind `schematic_manifest`. Use generic, domain-neutral names (`ExampleModule`, `ReferenceFlow`). Business-domain defaults are forbidden in core schematics (see [`domain-neutral-core`](../../standards/index.md#domain-neutral-core)).
2. **Validate the manifest** with `validateArtifactKind("schematic_manifest", ...)`.
3. **Provide a dry-run path** that reports planned writes without writing.
4. **Provide an apply path** that refuses conflicting files (fail-closed).
5. **Provide fixtures** for dry-run, apply, repeat-apply, and conflict cases at the real engine boundary (the `dry-run-first` verification requirement).
6. **Declare a Verification Delta item** in the `mechanical_gate` or `schema_validation` layer for the schematic's own real-boundary witness.

## Conflict and safety

Apply must be fail-closed on conflict: it refuses rather than overwrites. This mirrors the harness-wide discipline that agents never perform destructive operations and never request a clean tree ([`dirty-tree-ownership`](../../standards/index.md#dirty-tree-ownership)).

## Until the engine is live

- Validate manifests with `@vibe-engineer/artifacts`.
- Author positive/negative fixtures under your lane's owned paths.
- Track the `packages/schematics` lane for the engine witness.

## Related

- [Standards — deterministic-schematics](../../standards/index.md#deterministic-schematics)
- [Schemas reference](../../reference/schemas.md)
- [DL-08 — Schematics System](../../decisions/DL-08-schematics-system.md)
