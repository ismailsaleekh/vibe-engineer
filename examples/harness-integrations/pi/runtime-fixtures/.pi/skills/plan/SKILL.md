---
name: plan
description: Consume exactly one Work Brief and produce an Implementation Plan with Verification Delta. Use through /skill:plan when the locked DL-03 plan protocol is needed.
vibe-protocol: implementation-plan-producer
vibe-input-artifact: work-brief
vibe-output-artifact: implementation-plan-with-verification-delta
runtimeExecutionClaim: pending-live
---

# plan

This generated pi skill is a domain-neutral adapter asset for the vibe-engineer locked skill protocol. It gives concrete artifact carrier rules; it still does not claim live pi loading/execution.

## Artifact paths

Use one stable work id, for example `special-change-001`, and keep all skill outputs under:

```txt
.vibe/work/<work-id>/
```

The generated starter also provides verification evidence space under `.vibe/evidence/<work-id>/` and the default runner catalog at `.vibe/registry/runner-catalog.json`.

## Protocol chain

- Input artifact: work-brief.
- Output artifact: implementation-plan-with-verification-delta.
- The skill must persist its output as a UTF-8 JSON or Markdown artifact under the paths above; chat history alone is not a carrier.
- Runtime execution claim: pending-live; live pi loading/execution remains pending until a recorded real loader/executor witness exists.

## Required behavior

- Read exactly one Work Brief from `.vibe/work/<work-id>/work-brief.json`; reject raw chat or multiple competing briefs.
- Write `.vibe/work/<work-id>/implementation-plan.json` using `artifactKind: "implementation_plan"` and `schemaVersion: "1.0.0"`.
- Default `status` to `draft`; set `approved` only after explicit operator approval for this exact persisted plan.
- Include canonical plan fields: `workBriefRef`, `objective`, `scope`, `nonScope`, `contextClosure`, `affectedAreas`, `implementationSteps`, `acceptanceCriteria`, `definitionOfDone`, `risks`, `openBlockers`, and embedded `verificationDelta`.
- The embedded Verification Delta must include `requiredItems` for changed surfaces. Use layers from the canonical catalog: `safety_hooks`, `typecheck`, `lint_format`, `mechanical_gate`, `unit`, `integration`, `contract_adapter`, `e2e`, `ui_verification`, `ai_eval`, `build_package`, `context_drift`, `observability`, `advisory_review`, `final_dod`, `schema_validation`.
- For the generated starter default runner catalog, `typecheck`, `lint_format`, `unit`, and `build_package` can resolve through `.vibe/registry/runner-catalog.json`; mark other layers `not_applicable` with rationale or add runner catalog entries before requiring them.

## Validation handoff

- JSON artifacts must use the canonical artifact schemas in `packages/artifacts/schemas/*` from vibe-engineer.
- If schema validation tooling is available, validate the persisted file before handing off.
- If validation cannot run, state that explicitly in the handoff and do not claim truth-green.

## Forbidden behavior

- Do not produce or execute build-result from this skill.
- Do not produce or execute ship-packet from this skill.
- Do not produce or execute push from this skill.
- Do not produce or execute pull-request from this skill.
- Do not embed secrets, credentials, project-specific assumptions not present in the input, destructive commands, or external mutations.
- Do not claim selected pi runtime truth-green without a recorded real loader/executor witness.
