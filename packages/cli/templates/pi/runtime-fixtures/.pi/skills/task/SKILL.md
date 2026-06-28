---
name: task
description: Normalize a concrete request and persist one Work Brief for plan intake. Use through /skill:task when the locked DL-03 task protocol is needed.
vibe-protocol: work-brief-producer
vibe-input-artifact: raw-intent
vibe-output-artifact: work-brief
runtimeExecutionClaim: pending-live
---

# task

This generated pi skill is a domain-neutral adapter asset for the vibe-engineer locked skill protocol.

## Protocol chain

- Input artifact: raw-intent.
- Output artifact: work-brief.
- The skill must persist its output through the harness artifact carrier; chat history alone is not a carrier.
- Runtime execution claim: pending-live; live pi loading/execution is not claimed by this fixture.

## Required behavior

Normalize a concrete request and persist one Work Brief for plan intake.

## Forbidden behavior

- Do not produce or execute implementation-plan from this skill.
- Do not produce or execute build-result from this skill.
- Do not produce or execute ship-packet from this skill.
- Do not produce or execute push from this skill.
- Do not produce or execute pull-request from this skill.
- Do not embed secrets, credentials, project-specific business assumptions, destructive commands, or external mutations.
- Do not claim selected pi runtime truth-green without a recorded real loader/executor witness.
