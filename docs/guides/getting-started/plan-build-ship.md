# Plan, build, ship

> **Status:** The skill runtime (`plan`, `build`, `ship`) is **not wired** as runnable user commands. The artifact schemas, verification runner, and context APIs that this workflow depends on **are** present and usable programmatically. This guide describes the intended user workflow and points to the actual APIs you can call today.

## The loop

```txt
Work Brief  →  plan  →  Implementation Plan (+ Verification Delta)
                              ↓
                          build  →  Build Result + Evidence Packets + context
                              ↓
                          ship  →  Ship Packet   (no push/PR without approval)
```

See [Artifact chain](../../architecture/artifact-chain.md) and [Verification model](../../architecture/verification-model.md).

## plan

`plan` consumes one **Work Brief** and produces an **Implementation Plan** that embeds a **Verification Delta**. The plan must reach `status: "approved"` before verification can run — the runner rejects any non-approved plan (`runVerificationPlan`, `PLAN_NOT_APPROVED`).

The Verification Delta declares the proof items (one per required concern), each with:

- `action`: `add | update | reuse | not_applicable | blocked`
- `layer`: a runner layer such as `typecheck`, `unit`, `e2e`, `mechanical_gate`, `schema_validation`, ... (full list in [Verification model](../../architecture/verification-model.md#runner-layers))
- `id`, `rationale`

## build

`build` runs the Verification Delta. The actual entry point is the verification runner:

```js
import { runVerificationPlan } from "@vibe-engineer/verification";

const summary = await runVerificationPlan({
  implementationPlanPath, // approved plan, contained under projectRoot
  evidenceRoot,           // Evidence Packets are written here
  projectRoot,
  runId,                  // stable lowercase id
  runnerCatalog           // typed runner specs
});

// summary.status ∈ passed | failed | blocked | advisory_warning
```

What you get back (from `runVerificationPlan`):

- `status` — aggregate status.
- `evidencePackets` — paths to persisted Evidence Packets.
- `executedItems` / `recordedItems` / `blockedItems`.
- `failures` — typed failure details with `classification`.
- `warnings`.

Every Evidence Packet is schema-validated before persistence and written atomically under `evidenceRoot`. Command output is redacted into sidecar logs under `evidenceRoot/sidecars/`.

### Writing a Build Result

A Build Result artifact (`build_result` schema) records the outcome of `build`. Validate it with the artifacts boundary:

```js
import { validateArtifactKind } from "@vibe-engineer/artifacts";
const result = validateArtifactKind("build_result", buildResultObject);
```

### Updating context

`build` is intended to update context automatically. Today you can drive the context APIs directly:

```js
import { writeContextProject, checkContextDrift, classifyFindings } from "@vibe-engineer/context";

await writeContextProject({ projectRoot, /* graph, headers, ... */ });
const drift = await checkContextDrift(projectRoot);
const severity = classifyFindings(drift.findings); // clean | major-local | minor-local
```

## ship

`ship` consumes a Build Result, runs final proof, and produces a **Ship Packet** (`ship_packet` schema). It does **not** push, PR, or release without explicit approval. Validate a Ship Packet:

```js
import { validateArtifactKind } from "@vibe-engineer/artifacts";
validateArtifactKind("ship_packet", shipPacketObject);
```

## Interpreting failures

Failures carry a `classification` that routes them to the right owner instead of "red":

| Classification | Means |
| --- | --- |
| `deterministic_product_or_code_failure` | Real product/code bug. |
| `test_assertion_failure` / `test_bug` | Test is correct / test is wrong. |
| `environment_issue` | Environment, not code. |
| `timing_or_flaky_suspicion` | Likely flake. |
| `schema_or_contract_failure` | Artifact/contract violation. |
| `safety_or_security_policy_failure` | Safety policy denied the run. |
| `mechanical_gate_failure` | A mechanical gate failed. |
| `missing_evidence` / `missing_runner_or_prerequisite` | No evidence produced / no runner. |
| `blocked_prerequisite` | A required item is blocked. |

Full list in [Verification model](../../architecture/verification-model.md#failure-classifications).

## What to do until the skills are live

- Author and validate artifacts with `@vibe-engineer/artifacts`.
- Drive verification with `runVerificationPlan` and a typed `runnerCatalog`.
- Drive context with `@vibe-engineer/context`.
- Track the skill-runtime lane for the user-facing `plan`/`build`/`ship` commands.

## Related

- [Verification model](../../architecture/verification-model.md)
- [Context and memory model](../../architecture/context-memory.md)
- [CLI reference](../../reference/cli.md)
