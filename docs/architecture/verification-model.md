# Verification model

`vibe-engineer` is built on **evidence over assertion**. This page describes the verification architecture as it is actually implemented in `packages/verification/src/index.js` and the contracts it depends on.

## Core principle

Deterministic checks block when they fail. Advisory review never replaces deterministic proof. Every claim that "it works" is backed by an Evidence Packet produced by the real runner against the real artifact, not by shape-only inspection.

> **Shape-green is not truth-green.** A schema-valid artifact only proves shape. Load-bearing producer→consumer seams require a real-boundary witness: the actual provider/API/spawn/writer/carrier/consumer running together. The verification runner is the deterministic spine for those seams.

## The Verification Delta

The **Verification Delta** is an artifact embedded inside an Implementation Plan. It declares the set of items that must be proven for the plan to be considered built. Each `requiredItem` has:

- `id` — stable artifact id segment.
- `layer` — one of the runner's layers (see below).
- `action` — one of `add | update | reuse | not_applicable | blocked`.
- `rationale` — human-readable reason (redacted before persistence).

Source: `packages/verification/src/index.js` (`DELTA_ACTIONS`, `LAYERS`, `readRequiredItems`).

### Runner layers

The runner recognizes these layers (`LAYERS`):

```txt
safety_hooks, typecheck, lint_format, mechanical_gate, unit, integration,
contract_adapter, e2e, ui_verification, ai_eval, build_package, context_drift,
observability, advisory_review, final_dod, schema_validation
```

## Running a plan

The public entry point is `runVerificationPlan` (async):

```js
import { runVerificationPlan } from "@vibe-engineer/verification";

const summary = await runVerificationPlan({
  implementationPlanPath, // absolute path to an approved Implementation Plan
  evidenceRoot, // directory where Evidence Packets are written
  projectRoot, // containment root for all paths
  runId, // stable lowercase artifact id segment
  runnerCatalog, // array of typed runner specs
});
```

What the runner actually does (from `runVerificationPlan`):

1. Validates `implementationPlanPath` is contained under `projectRoot`.
2. Validates the Implementation Plan file with `validateArtifactFile({ kind: 'implementation_plan' })`.
3. Rejects unless `plan.status === 'approved'`.
4. Validates the embedded Verification Delta with `validateArtifactKind('verification_delta', ...)`.
5. For each required item, resolves matching runners from `runnerCatalog` and executes them.
6. Persists one Evidence Packet per outcome atomically under `evidenceRoot` (temp file + `rename`, contained-path checked).
7. Returns a typed summary with an aggregate `status`.

### Runner kinds

Runners in the catalog are one of two kinds (`RUNNER_KINDS`):

- **`command`** — spawns a typed, allowlisted Node runtime script under strict safety policy (see [Security](../architecture/security-architecture.md) where applicable; authoritative source: `packages/verification/src/index.js`, `validateCommandSafety`). Denies `shell:true`, denies shell-string commands, denies git/rm/curl/wget/ssh/gh/pulumi/docker/touch and package-manager executables, requires absolute `process.execPath` (or its realpath), requires typed argv (`publicArgs` / `scalarArgs` / `argPaths`), caps timeout and stdout/stderr/output bytes, and allowlists env keys.
- **`validator`** — an in-process typed validator such as `validateArtifactFile`.

### Item actions

| Action           | Behavior                                                 |
| ---------------- | -------------------------------------------------------- |
| `add` / `update` | Resolve and execute runners; emit real Evidence Packets. |
| `reuse`          | Recorded as skipped (`not_run`), no execution.           |
| `not_applicable` | Recorded as skipped (`not_run`), no execution.           |
| `blocked`        | Recorded as `blocked`; blocks the aggregate status.      |

If no runner resolves for an `add`/`update` item, the runner emits a `MISSING_RUNNER_OR_PREREQUISITE` blocked packet.

## Statuses and results

Aggregate statuses (`VERIFICATION_STATUSES`):

```txt
passed, failed, blocked, advisory_warning
```

Aggregate precedence (from `aggregateStatus`): `blocked` > `failed (blocking)` > `advisory_warning` > `passed`.

Per-packet results (`EVIDENCE_RESULTS`):

```txt
pass, fail, blocked, advisory, skipped
```

### Failure classifications

Every failed/blocked packet carries `failureDetails.classification` from `EVIDENCE_FAILURE_CLASSIFICATIONS`:

```txt
deterministic_product_or_code_failure, schema_or_contract_failure,
safety_or_security_policy_failure, mechanical_gate_failure,
test_assertion_failure, test_bug, environment_issue,
timing_or_flaky_suspicion, external_dependency_drift, advisory_finding,
missing_evidence, missing_runner_or_prerequisite,
skipped_required_delta_category, blocked_prerequisite,
runner_internal_error, classification_unknown
```

These classifications are how failures route to the right owner (product bug vs test bug vs environment vs flake vs drift) instead of being lumped as "red".

## Evidence Packet shape

Each Evidence Packet (schema `evidence_packet`, version `1.0.0`) records: `producer`, `status`, `evidenceClass`, `layer`, `subjectRefs` (links to the plan and delta), `commandOrTool`, `startedAt`/`endedAt`, `exitStatus`, `result`, `blocking`, `artifacts`, `warnings`, and optional `failureDetails`, `rerunOf`, `stdoutRef`/`stderrRef`/`logsRef`. Command output is written to redacted sidecar logs under `evidenceRoot/sidecars/`.

## Safety policy (command runners)

Command runners are the only spawning seam, and they are locked down (source: `validateCommandSafety`, `buildEnvironment`, `validateTypedArgPolicy`):

- No `shell:true`; no shell-string commands; explicit string argv only.
- Executable must be `process.execPath` or its exact realpath.
- Denied executables: `git`, `rm`, `curl`, `wget`, `ssh`, `scp`, `gh`, `pulumi`, `terraform`, `docker`, `touch`, and package managers.
- Every argv value must be declared as a typed path, public literal, or narrow non-secret scalar.
- No raw `process.env` pass-through; env keys must be allowlisted and non-secret-like.
- Timeouts and stream/output byte caps are required and bounded (`MAX_TIMEOUT_MS = 30000`, `MAX_STREAM_BYTES = 1MiB`, `MAX_OUTPUT_BYTES = 2MiB`).
- `expectedArtifacts` must be inside `evidenceRoot` or declared `allowedWriteRoots`, never protected project paths (`docs`, `scripts`, `infra`, `.git`, manifests, etc.).

See [Security architecture](./security-architecture.md) and [DL-22](../decisions/DL-22-security-safety-model.md).

## Related

- [Artifact chain](./artifact-chain.md)
- [Mechanical gates model](./mechanical-gates.md)
- [DL-10 — Verification Implementation](../decisions/DL-10-verification-implementation.md)
