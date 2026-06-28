---
name: plan
description: Consume exactly one Work Brief and produce an Implementation Plan with Verification Delta. Use through /skill:plan when the locked DL-03 plan protocol is needed.
vibe-protocol: implementation-plan-producer
vibe-input-artifact: work-brief
vibe-output-artifact: implementation-plan-with-verification-delta
runtimeExecutionClaim: pending-live
---

# plan

This generated pi skill is a domain-neutral adapter asset for the vibe-engineer locked skill protocol.

## Protocol chain

- Input artifact: work-brief.
- Output artifact: implementation-plan-with-verification-delta.
- The skill must persist its output through the harness artifact carrier; chat history alone is not a carrier.
- Runtime execution claim: pending-live; live pi loading/execution is not claimed by this fixture.

## Required behavior

Consume exactly one Work Brief and produce an Implementation Plan with Verification Delta.

## Forbidden behavior

- Do not produce or execute build-result from this skill.
- Do not produce or execute ship-packet from this skill.
- Do not produce or execute push from this skill.
- Do not produce or execute pull-request from this skill.
- Do not embed secrets, credentials, project-specific business assumptions, destructive commands, or external mutations.
- Do not claim selected pi runtime truth-green without a recorded real loader/executor witness.
