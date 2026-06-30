---
name: grill-me
description: Pressure-test assumptions and persist one Work Brief for plan intake. Use through /skill:grill-me when the locked DL-03 grill-me protocol is needed.
vibe-protocol: work-brief-producer
vibe-input-artifact: raw-intent
vibe-output-artifact: work-brief
runtimeExecutionClaim: pending-live
---

# grill-me

This generated pi skill is a domain-neutral adapter asset for the vibe-engineer locked skill protocol. It gives concrete artifact carrier rules; it still does not claim live pi loading/execution.

## Artifact paths

Use one stable work id, for example `special-change-001`, and keep all skill outputs under:

```txt
.vibe/work/<work-id>/
```

The generated starter also provides verification evidence space under `.vibe/evidence/<work-id>/` and the default runner catalog at `.vibe/registry/runner-catalog.json`.

## Protocol chain

- Input artifact: raw-intent.
- Output artifact: work-brief.
- The skill must persist its output as a UTF-8 JSON or Markdown artifact under the paths above; chat history alone is not a carrier.
- Runtime execution claim: pending-live; live pi loading/execution remains pending until a recorded real loader/executor witness exists.

## Required behavior

- Ask only clarifying questions needed to remove plan-blocking ambiguity, then capture the final input at `.vibe/work/<work-id>/raw-intent.md`.
- Write exactly one Work Brief JSON artifact at `.vibe/work/<work-id>/work-brief.json` using `artifactKind: "work_brief"` and `schemaVersion: "1.0.0"`.
- Include challenged assumptions in `risksAndUnknowns` and concrete acceptance notes in `acceptanceNotes`.
- Do not proceed to planning when the operator has not resolved a blocking assumption.

## Validation handoff

- JSON artifacts must use the canonical artifact schemas in `packages/artifacts/schemas/*` from vibe-engineer.
- If schema validation tooling is available, validate the persisted file before handing off.
- If validation cannot run, state that explicitly in the handoff and do not claim truth-green.

## Forbidden behavior

- Do not produce or execute implementation-plan from this skill.
- Do not produce or execute build-result from this skill.
- Do not produce or execute ship-packet from this skill.
- Do not produce or execute push from this skill.
- Do not produce or execute pull-request from this skill.
- Do not embed secrets, credentials, project-specific assumptions not present in the input, destructive commands, or external mutations.
- Do not claim selected pi runtime truth-green without a recorded real loader/executor witness.
