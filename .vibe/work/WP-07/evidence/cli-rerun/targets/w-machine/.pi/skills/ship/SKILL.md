---
name: ship
description: Consume a Build Result and produce a Ship Packet; push or PR creation requires explicit approval. Use through /skill:ship when the locked DL-03 ship protocol is needed.
vibe-protocol: ship-packet-producer
vibe-input-artifact: build-result
vibe-output-artifact: ship-packet
runtimeExecutionClaim: pending-live
---

# ship

This generated pi skill is a domain-neutral adapter asset for the vibe-engineer locked skill protocol.

## Protocol chain

- Input artifact: build-result.
- Output artifact: ship-packet.
- The skill must persist its output through the harness artifact carrier; chat history alone is not a carrier.
- Runtime execution claim: pending-live; live pi loading/execution is not claimed by this fixture.

## Required behavior

Consume a Build Result and produce a Ship Packet; push or PR creation requires explicit approval.

## Forbidden behavior

- Do not produce or execute push from this skill.
- Do not produce or execute pull-request from this skill.
- Do not embed secrets, credentials, project-specific business assumptions, destructive commands, or external mutations.
- Do not claim selected pi runtime truth-green without a recorded real loader/executor witness.
