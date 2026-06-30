# Add a mechanical gate

A mechanical gate is a deterministic, reviewable check that blocks bad work early. This guide describes how a gate is expressed through the verification runner and the standards it enforces.

## What qualifies as a gate

A gate must be:

- **deterministic** — same input, same result;
- **mechanical** — a typed rule, not prose/advisory review;
- **blocking** — failure stops the workflow;
- **reviewable** — the rule and fixtures live in the repo.

Advisory review can accompany a gate but can never replace one. See [Mechanical gates model](../../architecture/mechanical-gates.md).

## A gate is a runner spec

Gates are expressed in the Verification Delta's `mechanical_gate` layer (one of the runner `LAYERS` in `packages/verification/src/index.js`). A gate is a runner catalog entry of kind `command` or `validator`, executed by `runVerificationPlan` exactly like any other required item:

```js
import { runVerificationPlan } from "@vibe-engineer/verification";

await runVerificationPlan({
  implementationPlanPath,
  evidenceRoot,
  projectRoot,
  runId,
  runnerCatalog: [
    {
      id: "mechanical_gate:domain-purity",
      kind: "command", // or "validator"
      layer: "mechanical_gate",
      evidenceClass: "deterministic",
      blocking: true,
      // command-runner fields (typed argv, safety, expectedArtifacts, ...)
    },
  ],
});
```

A gate failure produces a real Evidence Packet with classification `mechanical_gate_failure` and routes through the standard aggregate precedence (`blocked` > `failed (blocking)` > `advisory_warning` > `passed`).

## Command-runner safety (required)

If your gate is a `command` runner, it must satisfy the command safety policy (`validateCommandSafety`):

- no `shell:true`; explicit string argv only;
- executable must be `process.execPath` or its exact realpath;
- denied executables include `git`, `rm`, `curl`, `wget`, `ssh`, `gh`, `pulumi`, `docker`, `touch`, and package managers;
- every argv value declared as a typed path, public literal, or narrow non-secret scalar;
- env keys allowlisted and non-secret-like;
- timeout and stdout/stderr/output byte caps set and bounded;
- `expectedArtifacts` inside `evidenceRoot` or declared `allowedWriteRoots`.

See [Verification model — Safety policy](../../architecture/verification-model.md#safety-policy-command-runners).

## Steps to add a gate

1. **Pick the standard** your gate enforces. Common gates map to [`typed-boundary-contracts`](../../standards/index.md#typed-boundary-contracts), [`domain-neutral-core`](../../standards/index.md#domain-neutral-core), [`dependency-hygiene`](../../standards/index.md#dependency-hygiene), or [`real-boundary-witnesses`](../../standards/index.md#real-boundary-witnesses).
2. **Write the gate** as a Node script or in-process validator under your lane's owned paths.
3. **Register a runner spec** in the relevant Verification Delta `runnerCatalog` with `layer: "mechanical_gate"`, `evidenceClass: "deterministic"`, `blocking: true`.
4. **Provide fixtures**: a positive case (passes) and negative cases (each must fail with a stable classification).
5. **Witness the join**: run `runVerificationPlan` with the real catalog and assert the gate emits a passing Evidence Packet on green and a `mechanical_gate_failure` packet on red.

## Gate families in the harness

The harness targets fixed gate families (see [Mechanical gates model](../../architecture/mechanical-gates.md#gate-families)):

- **P0** domain/aggregates;
- **P1** ratchet/test-scanner;
- **P2** code-smell framework.

Treat per-family wiring as `pending-live` until the family lane proves it in a runner catalog.

## Related

- [Mechanical gates model](../../architecture/mechanical-gates.md)
- [Verification model](../../architecture/verification-model.md)
- [Standards](../../standards/index.md)
- [DL-15 — Mechanical Engine](../../decisions/DL-15-mechanical-engine.md)
