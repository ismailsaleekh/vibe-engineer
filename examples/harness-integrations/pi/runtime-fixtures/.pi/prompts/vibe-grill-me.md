---
description: Invoke the generated grill-me skill protocol with a persisted artifact handoff requirement.
argument-hint: "<raw-request-or-raw-intent-path>"
vibe-template-kind: skill-workflow
vibe-skill: grill-me
runtimeExecutionClaim: pending-live
---

Load and follow /skill:grill-me.

Argument contract:

- $1 may be a raw operator request or a durable raw-intent artifact path.
- $@ may contain additional constraints; it must not contain secrets or production credentials.
- Persist outputs under `.vibe/work/<work-id>/` and report the exact path written.

Input reference: $1
Additional constraints: $@

Do not proceed if a required artifact carrier is missing, malformed, outside the current project, or inconsistent with the grill-me protocol.
