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

Input reference: $1
Additional constraints: $@

Do not proceed if a required artifact carrier is missing, malformed, outside the current project, or inconsistent with the plan protocol.
