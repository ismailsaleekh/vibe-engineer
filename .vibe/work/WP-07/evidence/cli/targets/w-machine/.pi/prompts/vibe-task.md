---
description: Invoke the generated task skill protocol with a persisted artifact handoff requirement.
argument-hint: "<artifact-or-request-ref>"
vibe-template-kind: skill-workflow
vibe-skill: task
runtimeExecutionClaim: pending-live
---
Load and follow /skill:task.

Argument contract:
- $1 must be a durable artifact path, work reference, or raw user request appropriate for the skill protocol.
- $@ may contain additional constraints; it must not contain secrets or production credentials.

Input reference: $1
Additional constraints: $@

Do not proceed if the required artifact carrier is missing, malformed, or outside the current owned path scope.
