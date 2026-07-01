---
description: Invoke the generated plan skill protocol with a persisted artifact handoff requirement.
argument-hint: "<work-brief-path>"
vibe-template-kind: skill-workflow
vibe-skill: plan
runtimeExecutionClaim: pending-live
---

Load and follow /skill:plan.

Argument contract:

- $1 must be the durable work-brief artifact path; raw chat is not accepted for this skill.
- $@ may contain additional constraints; it must not contain secrets or production credentials.
- Persist outputs under `.vibe/work/<work-id>/` and report the exact path written.

Discipline requirements:
- Require applicable schematics: fill `extensions.dev.vibe.plan-build-discipline.schematicPlan.applicable`, `schematicPlan.noneJustification`, and `schematicPlan.gaps`; do not leave schematic gaps implicit.
- Classify verification in `verificationPlan.classifications`, include selected-harness implications, and add a blocking `architecture-agent-review` item for backend, web, or mobile scope.
- Use `build-must-register` for blocking Verification Delta items that need runner registration in `.vibe/registry/runner-catalog.json`.
- Do not invent verification-runner or runner-catalog-entry schematics; register runners directly and do not add extra deterministic architecture/code-standard runners.

Input reference: $1
Additional constraints: $@

Do not proceed if a required artifact carrier is missing, malformed, outside the current project, or inconsistent with the plan protocol.
