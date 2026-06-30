---
description: Invoke the generated build skill protocol with a persisted artifact handoff requirement.
argument-hint: "<approved-implementation-plan-path>"
vibe-template-kind: skill-workflow
vibe-skill: build
runtimeExecutionClaim: pending-live
---

Load and follow /skill:build.

Argument contract:

- $1 must be the durable approved-implementation-plan artifact path; raw chat is not accepted for this skill.
- $@ may contain additional constraints; it must not contain secrets or production credentials.
- Persist outputs under `.vibe/work/<work-id>/` and report the exact path written.

Input reference: $1
Additional constraints: $@

Do not proceed if a required artifact carrier is missing, malformed, outside the current project, or inconsistent with the build protocol.
