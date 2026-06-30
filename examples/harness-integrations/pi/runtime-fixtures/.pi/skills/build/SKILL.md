---
name: build
description: Consume an approved Implementation Plan and produce a Build Result after implementation and verification evidence. Use through /skill:build when the locked DL-03 build protocol is needed.
vibe-protocol: build-result-producer
vibe-input-artifact: approved-implementation-plan
vibe-output-artifact: build-result
runtimeExecutionClaim: pending-live
---

# build

This generated pi skill is a domain-neutral adapter asset for the vibe-engineer locked skill protocol. It gives concrete artifact carrier rules; it still does not claim live pi loading/execution.

## Artifact paths

Use one stable work id, for example `special-change-001`, and keep all skill outputs under:

```txt
.vibe/work/<work-id>/
```

The generated starter also provides verification evidence space under `.vibe/evidence/<work-id>/` and the default runner catalog at `.vibe/registry/runner-catalog.json`.

## Protocol chain

- Input artifact: approved-implementation-plan.
- Output artifact: build-result.
- The skill must persist its output as a UTF-8 JSON or Markdown artifact under the paths above; chat history alone is not a carrier.
- Runtime execution claim: pending-live; live pi loading/execution remains pending until a recorded real loader/executor witness exists.

## Required behavior

- Read exactly one approved Implementation Plan from `.vibe/work/<work-id>/implementation-plan.json`; block if `status` is not `approved`.
- Implement only paths allowed by the plan ownership/scope and preserve unrelated files.
- Run verification for the plan, normally: `vibe-engineer verify --project-root . --implementation-plan .vibe/work/<work-id>/implementation-plan.json --evidence-root .vibe/evidence/<work-id>/verify --run-id <work-id> --runner-catalog .vibe/registry/runner-catalog.json`.
- Capture command output/evidence paths before summarizing results.
- Write `.vibe/work/<work-id>/build-result.json` using `artifactKind: "build_result"`, `schemaVersion: "1.0.0"`, `implementationPlanRef`, `changedFilesSummary`, `verificationRuns` linked to Evidence Packets, `warningsAndBlockers`, `contextDocsUpdates`, and `finalStatusReason`.
- Use `status: "passed"` only when every blocking verification item has evidence; otherwise write `failed` or `blocked` with exact reasons.

## Validation handoff

- JSON artifacts must use the canonical artifact schemas in `packages/artifacts/schemas/*` from vibe-engineer.
- If schema validation tooling is available, validate the persisted file before handing off.
- If validation cannot run, state that explicitly in the handoff and do not claim truth-green.

## Forbidden behavior

- Do not produce or execute ship-packet from this skill.
- Do not produce or execute push from this skill.
- Do not produce or execute pull-request from this skill.
- Do not embed secrets, credentials, project-specific assumptions not present in the input, destructive commands, or external mutations.
- Do not claim selected pi runtime truth-green without a recorded real loader/executor witness.
