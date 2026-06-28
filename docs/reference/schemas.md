# Schemas reference

> **Source of truth:** `packages/artifacts/src/schema-registry.js` and `packages/artifacts/schemas/*.schema.json`. Curated from actual source; checked by the stale-doc witness.

## Supported version

`SUPPORTED_SCHEMA_VERSION = '1.0.0'`. Every artifact schema and every persisted artifact carries this version.

## Artifact kinds

`ARTIFACT_KINDS` (from `packages/artifacts/src/schema-registry.js`):

| Kind                   | Schema file                                | Role                                   |
| ---------------------- | ------------------------------------------ | -------------------------------------- |
| `work_brief`           | `schemas/work-brief.schema.json`           | Captured intent from an input skill.   |
| `implementation_plan`  | `schemas/implementation-plan.schema.json`  | Plan that embeds a Verification Delta. |
| `verification_delta`   | `schemas/verification-delta.schema.json`   | Required proof items for a plan.       |
| `build_result`         | `schemas/build-result.schema.json`         | Output of `build`.                     |
| `ship_packet`          | `schemas/ship-packet.schema.json`          | Output of `ship`.                      |
| `evidence_packet`      | `schemas/evidence-packet.schema.json`      | One piece of verification evidence.    |
| `agent_registry_entry` | `schemas/agent-registry-entry.schema.json` | Registry entry for an agent.           |
| `context_file_header`  | `schemas/context-file-header.schema.json`  | Header on a context-bearing file.      |
| `schematic_manifest`   | `schemas/schematic-manifest.schema.json`   | Manifest for a schematic.              |
| `skill_manifest`       | `schemas/skill-manifest.schema.json`       | Manifest for a skill.                  |

The `SCHEMA_FILES` map and `schemaPathForKind(kind)` resolve each kind to its canonical schema path inside the package.

## Validation API

```js
import {
  ARTIFACT_KINDS,
  SCHEMA_FILES,
  SUPPORTED_SCHEMA_VERSION,
  schemaPathForKind,
  loadSchema, // (kind) => schema object | undefined
  loadAllSchemas, // () => { [kind]: schema }
  validateArtifact, // (value) => { ok, errors }  (any kind)
  validateArtifactKind, // (kind, value) => { ok, errors }
  validateArtifactFile, // (path, { kind }) => { ok, artifact | errors }
  compileAllArtifactSchemas,
  ValidationErrorCode,
} from "@vibe-engineer/artifacts";
```

Return shape: `{ ok: true }` or `{ ok: false, errors }`. Errors carry stable codes from `ValidationErrorCode` and, where available, JSON-pointer paths.

## How validation is consumed

- The **verification runner** validates the Implementation Plan file and its embedded Verification Delta before executing any item, and validates every Evidence Packet candidate before persistence (`packages/verification/src/index.js`).
- The **context package** uses artifact file validation as a declared provider seam (`__providerSeams.artifactsValidateArtifactFileType`).
- CLI primitives that accept artifact paths use `validateArtifactFile` or package-specific schema validators at their boundary where applicable.

## Adding a new artifact kind

New kinds are added in `packages/artifacts` only:

1. Add the kind to `ARTIFACT_KINDS` and `SCHEMA_FILES`.
2. Add the canonical JSON Schema under `packages/artifacts/schemas/`.
3. Add positive/negative fixtures and a real-boundary witness (see the `real-boundary-witnesses` standard in [Standards](../standards/index.md)).

Kinds must remain domain-neutral (see [DL-20A](../decisions/DL-20A-domain-neutrality-foundation.md)); business-domain vocabulary belongs only in labeled sample/demo fixtures.

## Related

- [Artifact chain](../architecture/artifact-chain.md)
- [DL-02 — Artifact Schemas](../decisions/DL-02-artifact-schemas.md)
