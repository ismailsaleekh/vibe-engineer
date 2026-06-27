# Context and memory model

Context preservation lets future agents answer: what exists, why it exists, who owns it, what depends on it, and how to change it safely. This page describes the context architecture as implemented in `packages/context/src/index.js`.

## What context answers

For every artifact and package surface, the context model is designed to answer:

- **what exists** — the artifact/file and its kind.
- **why it exists** — the producing lane, rationale, and linking decision.
- **who owns it** — the `ownership.ownerLane` and `ownedWritePaths`.
- **what depends on it** — links and subject references.
- **how to verify changes safely** — the verification delta/evidence that covers it.

## Context header

Every context-bearing file carries a **Context File Header** (artifact kind `context_file_header`, schema `schemas/context-file-header.schema.json`). The header is produced by `createContextHeader` and records a `producer` block, timestamps, ownership, links, and optional extensions.

```js
import { createContextHeader, defaultProducer } from "@vibe-engineer/context";

const header = createContextHeader({
  artifactKind: "implementation_plan",
  producer: defaultProducer(),
  ownership: {
    ownerLane: "my-lane",
    ownedWritePaths: ["packages/example/src/**"]
  }
});
```

`defaultProducer()` returns the standard producer block (`kind`, `id`, `name`, `version`, `runId`) used across context headers and Evidence Packets.

Constants: `CONTEXT_SCHEMA_VERSION = '1.0.0'`, `CONTEXT_INDEX_VERSION = '1.0.0'`, and `CONTEXT_SCHEMA_IDS` map (source: `packages/context/src/index.js`).

## Context project and index

- **`writeContextProject(options)`** — writes the context graph and headers for a project under its root, atomically and containment-checked.
- **`buildContextIndex(options)`** — builds an index over the context graph (headers + entries), with `generatedAt`, `producer`, and graph/index paths.
- **`retrieveContextClosure(projectRoot, request, options)`** — returns the closure of context relevant to a request (linked artifacts, owners, evidence) so an agent can load only what it needs.

## Drift detection

Context drift is the difference between what an artifact/header claims and what is actually true on disk (missing files, broken links, stale ownership, changed paths). The package exposes:

- **`validateContextProject(projectRoot, options)`** — full validation of a project's context graph; returns a `ContextValidationResult` with typed findings.
- **`checkContextDrift(projectRoot, options)`** — runs the drift checks and returns findings of the same shape.
- **`classifyFindings(findings)`** — reduces a finding list to a severity: `clean | major-local | minor-local`.

`build` and `ship` are intended to run context validation/drift automatically (locked direction; the runtime wiring is `pending-live`).

## Severity model

Findings classify into the same severity ladder used across the harness:

| Severity | Meaning |
| --- | --- |
| `clean` | No findings. |
| `minor-local` | Citation/wording/path issue; does not unblock dependents incorrectly. |
| `major-local` | Repairable within a lane's owned paths but blocks downstream closure. |

(Critical findings are blocking and surface as `major-local` or higher at the context layer; critical severity is reserved for the top-level verification/audit policy.)

## Provider seam

The context package consumes `@vibe-engineer/artifacts` for artifact file validation. This is declared explicitly as a provider seam:

```js
export const __providerSeams = Object.freeze({
  artifactsValidateArtifactFileType: "..."
});
```

Real-boundary proof that context validation actually calls artifact validation is provided by the context package's own witnesses, not by this doc.

## Related

- [Artifact chain](./artifact-chain.md)
- [DL-09 — Context and Memory Drift](../decisions/DL-09-context-memory-drift.md)
- [DL-17 — Bootstrap Context Generation](../decisions/DL-17-bootstrap-context-generation.md)
