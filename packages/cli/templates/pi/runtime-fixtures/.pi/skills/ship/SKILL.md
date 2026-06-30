---
name: ship
description: Consume a Build Result and produce a Ship Packet; push or PR creation requires explicit approval. Use through /skill:ship when the locked DL-03 ship protocol is needed.
vibe-protocol: ship-packet-producer
vibe-input-artifact: build-result
vibe-output-artifact: ship-packet
runtimeExecutionClaim: pending-live
---

# ship

This generated pi skill is a domain-neutral adapter asset for the vibe-engineer locked skill protocol. It gives concrete artifact carrier rules; it still does not claim live pi loading/execution.

## Artifact paths

Use one stable work id, for example `special-change-001`, and keep all skill outputs under:

```txt
.vibe/work/<work-id>/
```

The generated starter also provides verification evidence space under `.vibe/evidence/<work-id>/` and the default runner catalog at `.vibe/registry/runner-catalog.json`.

## Protocol chain

- Input artifact: build-result.
- Output artifact: ship-packet.
- The skill must persist its output as a UTF-8 JSON or Markdown artifact under the paths above; chat history alone is not a carrier.
- Runtime execution claim: pending-live; live pi loading/execution remains pending until a recorded real loader/executor witness exists.

## Required behavior

- Read exactly one Build Result from `.vibe/work/<work-id>/build-result.json`; block unless `status` is `passed`.
- Rerun or inspect final verification evidence before declaring readiness.
- Write `.vibe/work/<work-id>/ship-packet.json` using `artifactKind: "ship_packet"`, `schemaVersion: "1.0.0"`, `buildResultRef`, `finalVerification`, `contextPreservation`, `commitPreparation`, `prPreparation`, `releaseOrMigrationNotes`, `followUps`, and `noPushWithoutApproval: true`.
- Prepare suggested commit/PR text only; do not perform git push, release, deploy, or PR creation without explicit operator approval in the current turn.

## Validation handoff

- JSON artifacts must use the canonical artifact schemas in `packages/artifacts/schemas/*` from vibe-engineer.
- If schema validation tooling is available, validate the persisted file before handing off.
- If validation cannot run, state that explicitly in the handoff and do not claim truth-green.

## Forbidden behavior

- Do not produce or execute push from this skill.
- Do not produce or execute pull-request from this skill.
- Do not embed secrets, credentials, project-specific assumptions not present in the input, destructive commands, or external mutations.
- Do not claim selected pi runtime truth-green without a recorded real loader/executor witness.
