---
name: build
description: Consume an approved Implementation Plan and produce a Build Result after implementation and verification evidence. Use through /skill:build when the locked DL-03 build protocol is needed.
vibe-protocol: build-result-producer
vibe-input-artifact: approved-implementation-plan
vibe-output-artifact: build-result
runtimeExecutionClaim: pending-live
---

# build

This generated pi skill is a domain-neutral adapter asset for the vibe-engineer locked skill protocol.

## Protocol chain

- Input artifact: approved-implementation-plan.
- Output artifact: build-result.
- The skill must persist its output through the harness artifact carrier; chat history alone is not a carrier.
- Runtime execution claim: pending-live; live pi loading/execution is not claimed by this fixture.

## Required behavior

Consume an approved Implementation Plan and produce a Build Result after implementation and verification evidence.

## Forbidden behavior

- Do not produce or execute ship-packet from this skill.
- Do not produce or execute push from this skill.
- Do not produce or execute pull-request from this skill.
- Do not embed secrets, credentials, project-specific business assumptions, destructive commands, or external mutations.
- Do not claim selected pi runtime truth-green without a recorded real loader/executor witness.
