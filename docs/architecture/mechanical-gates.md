# Mechanical gates model

Mechanical gates are deterministic, fast, reviewable checks that block bad work early. This page describes the model and how it connects to the verification runner and standards catalog.

## What a mechanical gate is

A mechanical gate is a **deterministic** check that can be run mechanically (no judgment, no model) and that blocks the lane when it fails. The bar:

- **deterministic** — same input, same result, no network/flakiness.
- **mechanical** — expressible as a typed rule, not prose review.
- **blocking** — failure stops the workflow rather than producing a warning that is ignored.
- **reviewable** — the rule and its fixtures are inspectable in the repo.

Advisory review (e.g. human or model review) is **not** a mechanical gate and must never replace one.

## Where gates live

Mechanical gates are expressed as runner specs in the Verification Delta's `mechanical_gate` layer (one of the runner `LAYERS` in `packages/verification/src/index.js`). A gate is executed the same way as any other required item: the runner resolves a matching spec from the `runnerCatalog`, executes it, and emits a typed Evidence Packet.

This means a gate failure produces a real Evidence Packet with a stable classification:

```txt
mechanical_gate_failure
```

…and routes through the same aggregate-status precedence (`blocked` > `failed (blocking)` > `advisory_warning` > `passed`). See [Verification model](./verification-model.md).

## Gate families

The harness targets a fixed set of mechanical-gate families (locked direction, encoded in the standards catalog and `packages/mechanical-gates`):

- **P0 — domain/aggregates**: domain-neutrality and aggregate surface checks.
- **P1 — ratchet/test-scanner**: ratchet regressions and test-presence scanning.
- **P2 — code-smell framework**: mechanical code-smell detection.

> The mechanical-gates package (`packages/mechanical-gates`) owns fixtures and surfaces for these families. Treat the per-family detail as `pending-live` unless a family lane report proves a specific gate is wired into a Verification Delta runner catalog.

## Standards that govern gates

The `@vibe-engineer/standards` catalog defines the standards mechanical gates enforce. The load-bearing ones for gating:

| Standard                   | Requirement ids                                   | What it gates                                                                         |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `typed-boundary-contracts` | `named-runtime-contract`, `fail-closed-boundary`  | Carriers enter through named typed contracts; malformed input fails closed.           |
| `real-boundary-witnesses`  | `actual-consumer`, `negative-boundary`            | A seam is green only after real producer+consumer run; negative fixtures must reject. |
| `domain-neutral-core`      | `core-vocabulary`, `sample-boundary`              | Core surfaces use generic vocabulary; sample/demo is isolated.                        |
| `dependency-hygiene`       | `declared-imports`, `no-package-manager-mutation` | Only declared imports; no install/add mutations.                                      |
| `deterministic-schematics` | `typed-manifest`, `dry-run-first`                 | Schematic manifests are typed; dry-run before apply.                                  |

See [Standards](../standards/index.md) for the full requirement text (sourced from `packages/standards/src/catalog-data.js`).

## Deterministic vs advisory

| Property               | Deterministic gate                                           | Advisory review     |
| ---------------------- | ------------------------------------------------------------ | ------------------- |
| Runs mechanically      | yes                                                          | no                  |
| Blocks on failure      | yes                                                          | no (warning)        |
| Result class           | `deterministic`                                              | `advisory`          |
| Failure classification | `mechanical_gate_failure`, `schema_or_contract_failure`, ... | `advisory_findings` |
| Replaces the other     | never                                                        | never               |

Advisory findings can accompany deterministic proof, but a green deterministic gate is required before any "done" claim.

## Related

- [Verification model](./verification-model.md)
- [Standards](../standards/index.md)
- [DL-15 — Mechanical Engine](../decisions/DL-15-mechanical-engine.md)
