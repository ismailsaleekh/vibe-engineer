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

Discipline requirements:
- Read the plan discipline extension before implementation; planned schematics are unused until represented in `schematicsUsed` in the Build Result.
- Register missing blocking runners directly in `.vibe/registry/runner-catalog.json`; Do not invent verification-runner or runner-catalog-entry schematics and do not add extra deterministic architecture/code-standard runners.
- Run every blocking Verification Delta item, including `architecture-agent-review`; missing blocking evidence, skipped records, or failed runner output must keep status `failed` or `blocked`.
- Link each blocking verification result through `verificationRuns[].evidencePacketRef` to an Evidence Packet; prose-only summaries are not evidence.

Input reference: $1
Additional constraints: $@

Do not proceed if a required artifact carrier is missing, malformed, outside the current project, or inconsistent with the build protocol.
