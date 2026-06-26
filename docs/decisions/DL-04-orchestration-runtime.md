# DL-04 — Orchestration Runtime

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-04 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-04-orchestration-runtime.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-04-orchestration-runtime/DL-04-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §4 `Orchestration runtime`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.1 `Harness repo package hypothesis`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`, row `DL-04-orchestration-runtime`; §6.1/§6.2 `Decision DAG` and `Implementation DAG`; §8 `Pass sizing and allocation`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`, rows `DL-*`, `I-03`, `I-06`, `I-21`, `I-22`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity rules.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 backlog coverage row 4; §§5, 7, 9, 10 for DAG safety, real-boundary doctrine, severity, and launch recommendation.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`; `Validation plan and severity policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§3–5 for design rules, artifact flow, and skill responsibilities; §§9–10 for verification/context preservation; §15 success criteria; §16 locked defaults.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§5, 8, 10 for generated config defaults, automatic verification/context, and verification-layer decisions.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1–4 verification principles/artifact flow/Verification Delta; §6 `Orchestration model`; §7 `Planning orchestrator design`; §8 `Build orchestrator design`; §9 `Failure routing and fixing`; §11 `Agent registry`; §12 `Meta-agents outside normal orchestration`; §13 `Harness configuration`; §14 `Blocking policy summary`; §16 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1, 7, 11–13 for deterministic evidence, wiring integrity, verification fit, and final invariant.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§0, 5.1–5.4, 6, 8, 10–12 for orchestration doctrine, triads, sizing, spawning, blockers, real-boundary truth, and dirty-tree safety.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger.md` and `status.md` — current concurrency and decision-wave context only.

## Decision summary

The orchestration runtime is a durable, domain-neutral DAG scheduler/resumer and evidence router for harness work. It owns orchestration state, dependency readiness, bounded parallel scheduling, validator/fixer iteration control, ownership/path conflict prevention, result joins, retry/resume semantics, and runtime hooks into verification/failure routing. It does not own exact artifact schemas, skill protocols, registry formats, adapter spawn mechanics, CLI output contracts, context storage, verification taxonomy/evidence formats, mechanical-gate implementations, or security policy; those remain with their owner decisions while DL-04 defines the required runtime semantics they must support.

Locked runtime defaults are preserved unchanged:

- `maxParallelAgents: 8`
- `maxValidationFixIterations: 3`
- `agenticWorkPackageTargetHours: 6`

## Decision details

### Runtime scope and non-scope

The runtime owns:

1. Creating and maintaining a durable execution DAG for each orchestration run.
2. Checking dependency readiness, acyclicity, blocked prerequisites, and ownership/path claims before scheduling work.
3. Scheduling ready nodes up to the configured parallel cap, defaulting to `maxParallelAgents: 8`.
4. Enforcing the validator/fixer loop cap, defaulting to `maxValidationFixIterations: 3`.
5. Enforcing work-package sizing policy around `agenticWorkPackageTargetHours: 6` before a node is launched.
6. Persisting node status transitions, evidence links, ownership claims, failure-routing hooks, retry/resume checkpoints, and join results.
7. Joining only independently validated outputs into downstream inputs.
8. Blocking conflicts rather than silently merging competing claims or stale state.
9. Providing runtime interfaces that skills, CLI, adapters, registry, verification, context, and mechanical gates can call without forcing those surfaces to duplicate scheduler logic.

The runtime does not own:

- exact artifact file format, versioning, or validation schema (`DL-02`);
- exact skill input/output protocols or prompt contracts (`DL-03`);
- exact agent registry/meta-agent metadata format or recommendation-only authority (`DL-05`);
- adapter/live spawn implementation or selected harness mechanics (`DL-06`);
- CLI command surface or machine-readable output contract (`DL-07`);
- context graph, storage, retrieval, drift mechanics, or compression (`DL-09`);
- verification runner implementation, failure taxonomy, evidence packet schema, rerun strategy, or advisory/hard result representation (`DL-10`);
- security/safety policy for command execution, destructive operations, secrets, environment access, or sandboxing (`DL-22`);
- production implementation. This decision authorizes no code changes.

### Orchestration state model requirements

`I-03` must implement durable orchestration state with at least these semantic fields. `DL-02` owns exact schema names and file formats, but it must encode these semantics or an explicit compatible superset:

- run identity: stable run id, started/updated timestamps, runtime version, config snapshot, and source artifact references;
- global run status: draft, ready, running, paused/interrupted, blocked, failed, passed, or an equivalent unambiguous state model;
- node table: one record per DAG node with stable node id, node kind, owner lane/agent role, input artifact references, output artifact targets, dependencies, required prerequisites, status, attempt count, validation/fix iteration count, and evidence links;
- dependency edges: explicit upstream node/artifact dependencies, including dependency type and readiness condition;
- ownership claims: owned write paths, read-only paths, untouchable paths, serialized/shared handoff notes, and conflict status;
- work-package metadata: estimated agentic hours, split decision, assigned agent kind, parallel-safety flag, context-closure reference, and required validator/fixer links;
- blocked/pending-live states: exact blocker reason, blocking dependency, owner expected to resolve it, and whether dependent closure is `pending-live/BLOCKED`;
- failure-routing hooks: verification/failure result reference, failure classification reference when supplied by `DL-10` components, routed fixer target, and cap-exhaustion escalation state;
- join metadata: validated upstream artifacts consumed, merge/integration node decision, rejected conflicts, and downstream artifact references;
- resume cursor/checkpoints: last committed scheduler decision, active/running nodes, interrupted nodes, idempotency proof or blocker, and state integrity marker.

State must be written before launching a node, after every meaningful transition, and after every join/failure-routing decision. In-memory scheduler state is only a cache; on-disk durable state is the source of truth.

### Execution DAG representation

The runtime DAG must be a directed acyclic graph over explicit work and validation nodes. It must support at least these node classes semantically:

- scoping/allocation nodes;
- implementation/specialist nodes;
- validator nodes;
- fixer nodes;
- verification-runner nodes;
- context/evidence update nodes;
- join/integration nodes;
- final acceptance/summary nodes.

A node is schedulable only when:

1. all upstream dependencies are passed or otherwise explicitly allowed by the DAG;
2. no upstream prerequisite is blocked, failed, unresolved, or `pending-live/BLOCKED` for this closure;
3. the node's owned write paths do not overlap with any running or already-claimed incompatible node;
4. its input artifacts exist and are schema-valid under the artifact validator available for that stage;
5. work-package size is within policy or has been pre-split;
6. required validator/fixer/registry references can be resolved;
7. scheduling it would not exceed the active-agent cap.

The runtime must reject or block:

- cycles;
- missing dependency nodes or missing dependency artifacts;
- dangling output references;
- unresolved blocked prerequisites;
- ownership/path overlaps not covered by a serialized handoff;
- ambiguous shared writes;
- default scheduling above `8` parallel agents;
- validation/fix loops above `3` iterations;
- work packages that exceed the `6 agentic hours` target without a pre-split rule.

### Scoping, allocation, and work-package split policy

Every large orchestration run begins with explicit scoping/allocation work before specialist work launches:

1. scoper identifies the complete work implied by the input artifact;
2. allocator groups work into bounded packages;
3. dependency-DAG builder records ordering and parallel-safety;
4. agent allocator assigns package type, validator, fixer, and evidence obligations;
5. runtime validates size, dependencies, ownership, and required artifacts.

No execution node may be launched if it is estimated to exceed `agenticWorkPackageTargetHours: 6` unless the DAG includes a documented pre-split into smaller dependency-valid nodes. Splitting is a pre-launch planning action; a running agent must not improvise a hidden split that changes ownership or dependency semantics.

### Parallel execution policy

The runtime must preserve the locked default `maxParallelAgents: 8`. The scheduler may run fewer agents when dependencies, ownership claims, external provider capacity, or safety policy require it. It must not run more than the configured cap by default, and any future per-repo override must be explicit in configuration and still validated by safety/security policy.

Parallelism is allowed only for nodes with no blocking dependency relation and non-overlapping write claims. Read-only overlap is allowed when it does not create context contamination or external resource mutation. Shared/root paths require serialized owner handoff and cannot be written by parallel nodes.

### Validator/fixer loop policy

No node validates itself as the sole gate. Runtime orchestration must model the pattern:

```txt
producer node → validator node → fixer node if needed → validator node, up to cap → join only after validation passes
```

The default cap is `maxValidationFixIterations: 3`. At cap exhaustion, the runtime must stop that path, persist evidence, mark the node/run blocked or failed with exact reason, and route through `DL-10` failure-routing hooks or a registered escalation/meta-agent path. Silent indefinite loops are forbidden.

### Result merge/join policy

Validated outputs become upstream inputs only through an explicit join rule:

- a downstream node may consume an upstream output only when the upstream node status is validated/passed or explicitly marked as an allowed non-blocking advisory result;
- join nodes must record every input artifact, validation evidence link, conflict check, and produced downstream artifact;
- if two outputs claim the same path, incompatible artifact, inconsistent dependency result, or contradictory instruction, the runtime must mark the join blocked and route for human/operator or owner-lane decision as applicable;
- unvalidated, failed, blocked, or interrupted outputs must not be treated as inputs to downstream work;
- integration nodes may combine disjoint validated outputs only when their own ownership and validation obligations are explicit.

Conflicting outputs are never silently merged. A conflict is a first-class blocked state with evidence.

### Conflict handling and ownership claims

Before scheduling any write-capable node, the runtime must verify its path claims against:

- the DAG's current active claims;
- existing run state from interrupted/resumed runs;
- known multi-orchestrator ownership records when available;
- lane-owned write/read-only/untouchable declarations.

A node may write only owned paths. It may inspect read-only paths. It must treat untouchable and unspecified paths as unavailable. Concrete conflicts stop scheduling and persist a blocked record with exact paths, claimant nodes/lanes if known, and the ruling needed. The runtime must never use `git stash`, `git reset`, `git clean`, `git checkout`, or `git restore` as a conflict-resolution mechanism.

### Retry, resume, and idempotency policy

The runtime must be safe to resume after interruption:

1. durable state is read as the source of truth;
2. state integrity and referenced artifacts/evidence are checked;
3. passed/validated nodes are not rerun unless their artifacts are missing, invalid, or explicitly invalidated by a later owner-approved decision;
4. running-at-interruption nodes are treated as interrupted/unknown until their artifacts and ownership state are inspected;
5. retry occurs only when the node declares idempotent outputs or when owned paths can be safely overwritten by the same node/run under a recorded policy;
6. stale artifacts, unowned dirty files, mismatched run ids, or ambiguous ownership claims block retry rather than being reused;
7. retry increments attempt counts and preserves prior evidence.

A retry must never mask a failed dependency, overwrite unowned work, or convert unknown state into green by narrative.

### Failure-routing interface and DL-10 boundary

The runtime must provide hooks for verification and failure routing but must not define the final taxonomy or evidence schema. Boundaries:

- runtime owns when a failure blocks scheduling, which node is affected, whether the validator/fixer cap is exhausted, and which handler slot is requested;
- `DL-10` owns failure categories, evidence packet format, deterministic/advisory result representation, rerun strategy, and verification-runner behavior;
- runtime must accept `DL-10` outputs as structured evidence/classification artifacts once available;
- until `DL-10` is locked and implementation exists, `I-03` may implement only lane-approved transitional hooks and must not claim final verification/failure semantics;
- build/ship orchestration cannot close unless actual verification/failure routing consumes real evidence and blocks intentional violations.

If failure routing needs command execution, destructive action decisions, secret handling, sandboxing, or environment policy, implementation closure also depends on `DL-22`.

### Evidence, reporting, and state persistence requirements

Every orchestration run must emit recoverable evidence:

- durable run state with transition history;
- per-node input/output artifact references;
- validator and fixer reports;
- verification command/evidence links where verification ran;
- ownership/path claim checks;
- conflict/blocker records;
- retry/resume decisions;
- join decisions;
- final run summary with passed/failed/blocked/pending-live nodes.

Evidence must be concrete enough for independent validators to inspect actual changed/owned files and artifacts. Exact evidence packet schemas are owned by `DL-02`/`DL-10`; DL-04 requires these evidence categories to exist.

### Context contamination prevention rules

The orchestrator must keep its context narrow:

- specialists receive explicit context closures and owned paths rather than the whole run history;
- orchestrator consumes summaries, statuses, artifact references, and evidence links, not full specialist conversation state;
- validated artifacts, not raw chat, are the only durable join carrier;
- downstream nodes receive only dependency-approved artifacts and needed context references;
- context updates are invoked through `DL-09`-owned context mechanisms when available, not by ad hoc runtime memory mutation;
- failed/interrupted node context must not be leaked into unrelated ready nodes as if it were validated truth.

## Alternatives considered

### Single giant orchestrator prompt

- decision: rejected
- rationale: contradicts verification-layer §6 and HLO playbook sizing/triad doctrine; it overloads context, encourages self-validation, and hides dependency/ownership state.
- consequences: runtime must coordinate specialized nodes through durable artifacts and validators.

### Serial-only execution

- decision: rejected
- rationale: backlog §4 and verification-layer §8 require parallel subagent execution where safe; final strategy requires maximal safe parallelism with disjoint ownership.
- consequences: runtime schedules parallel ready nodes while preserving the cap and conflicts.

### In-memory-only orchestration state

- decision: rejected
- rationale: backlog §4 requires resumability after interruption, and quality-bar/report discipline requires recoverable state.
- consequences: durable state is mandatory; memory is only a cache.

### Unlimited retries or unlimited parallelism

- decision: rejected
- rationale: locked defaults require `8` parallel agents, `3` validation/fix iterations, and bounded work packages.
- consequences: caps are hard scheduling rules unless a future explicit decision changes them.

### Runtime directly mutating unowned files

- decision: rejected
- rationale: dirty-tree and multi-orchestrator rules forbid out-of-license writes and silent conflict resolution.
- consequences: all writes require node ownership claims; conflicts block.

### Runtime owning exact schemas, skill protocols, registry, CLI, context, and verification details

- decision: rejected
- rationale: those are separate decision owners. DL-04 must define runtime semantics without usurping `DL-02`, `DL-03`, `DL-05`, `DL-07`, `DL-09`, or `DL-10`.
- consequences: this decision locks required orchestration semantics and declares owner dependencies.

### Selected durable DAG + bounded triad orchestration approach

- decision: accepted
- rationale: satisfies backlog §4, preserves locked defaults, enables safe parallelism, supports interruption recovery, keeps producer/validator/fixer separation, and creates concrete `I-03` implementation requirements without deciding external schemas/protocols.
- consequences: `I-03` can implement a runtime around durable DAG state and real producer/carrier/consumer witnesses.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision template, dependency format, evidence checklist, validator checklist, real-boundary policy, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core/extension/sample-demo boundary, vocabulary rules, and checklist for this decision and future core runtime.
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy is safe for decision-lock execution and no critical/major MST finding remains.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: Backlog, README, locked decisions, verification layer, mechanical gates, playbook, strategy, and quality bar define the required orchestration policy.
  blocks:
    - id: I-03-orchestration-runtime
      reason: I-03 must implement the durable DAG/runtime semantics, caps, ownership checks, join rules, and resume model defined here.
    - id: I-06-plan-skill-verification-delta
      reason: Plan orchestration must consume this runtime model for specialist planning and artifact joins.
    - id: I-21-build-skill-orchestration
      reason: Build orchestration must use runtime scheduling, validation/fix loops, failure routing hooks, evidence, and context safeguards.
    - id: I-22-ship-skill-orchestration
      reason: Ship orchestration depends on final verification/context/evidence orchestration and validated Build Result intake.
    - id: I-09-verification-runner-evidence-failure-routing
      reason: Verification/failure routing integration must plug into runtime hooks without conflicting ownership.
  blocked_dependents:
    - id: I-03-orchestration-runtime
      blocked_until: DL-04 and DL-10 are locked and I-00 prerequisites are satisfied per final strategy.
      relying_on: durable DAG state, scheduler/resumer, conflict rejection, caps, and failure-routing hooks.
    - id: I-06-plan-skill-verification-delta
      blocked_until: I-03 runtime and required artifact/skill/registry/verification dependencies are available.
      relying_on: specialist planning orchestration, validated joins, context contamination prevention.
    - id: I-21-build-skill-orchestration
      blocked_until: I-03/I-06/I-08/I-09/I-14/I-15/I-20 dependencies are clean per final strategy.
      relying_on: runtime scheduling, failure routing, evidence, context preservation, Build Result production.
    - id: I-22-ship-skill-orchestration
      blocked_until: I-21 and verification/context/CI dependencies are clean.
      relying_on: final runtime orchestration over Build Result to Ship Packet.
    - id: DL-10-verification-implementation / I-09 integration
      blocked_until: DL-10 defines verification implementation details and failure taxonomy.
      relying_on: runtime hook boundary and evidence/failure carrier expectations.
  required_before_finalizing:
    - id: DL-02-artifact-schemas
      required_content: Exact artifact schema must encode DL-04 state/DAG/evidence semantics or an explicit compatible superset.
    - id: DL-03-skill-protocols
      required_content: Skill handoffs must identify how runtime nodes consume/produce skill artifacts without redefining skill protocols here.
    - id: DL-05-agent-registry-validation-meta
      required_content: Registry entries must provide validator/fixer/specialist metadata needed by the scheduler.
    - id: DL-06-agentic-harness-integrations
      required_content: Adapter/live-spawn capability and provider limits required for actual agent launching.
    - id: DL-07-cli-primitives
      required_content: CLI entry/output contracts for invoking runtime and reporting machine-readable status.
    - id: DL-09-context-memory-drift
      required_content: Context storage/retrieval/update/drift mechanics used by runtime hooks.
    - id: DL-10-verification-implementation
      required_content: Verification runner, evidence/failure taxonomy, rerun strategy, and advisory/hard representation.
    - id: DL-22-security-safety-model
      required_content: Command, destructive-action, secret, environment, and sandbox policy if runtime invokes tools or commands.
  deferrals: []
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-04-orchestration-runtime.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-04-orchestration-runtime/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/**
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/**
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-04 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - production package/source paths
    - root config files
    - CI files
    - CLI/schema/adapter/skill/verification/context/mechanical-gate/starter files
    - non-owned decision artifacts and non-owned .vibe/work paths
    - /Users/lizavasilyeva/work/harness-starter/**
  handoff_notes:
    - from: DL-04
      to: I-03-orchestration-runtime
      condition: After DL-04 independent validation is clean and I-03 prerequisites are satisfied.
      shared_path_policy: disjoint
    - from: DL-04
      to: DL-02/DL-03/DL-05/DL-06/DL-07/DL-09/DL-10/DL-22
      condition: Owner decisions encode/consume runtime requirements in their own artifacts.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-03-orchestration-runtime`: blocked until this decision is independently validated clean and `DL-10`/implementation prerequisites are satisfied. It must implement durable DAG state, scheduler/resumer, conflict rejection, caps, join rules, and runtime hooks.
- `I-06-plan-skill-verification-delta`: blocked on runtime availability plus artifact/skill/registry/verification dependencies. It must use the runtime model for specialist planning and Verification Delta production without context contamination.
- `I-21-build-skill-orchestration`: blocked on runtime, plan, verification, context, adapter, starter, and CI dependencies. It must consume Implementation Plan, run verification/context/evidence through runtime/failure routing, and write Build Result.
- `I-22-ship-skill-orchestration`: blocked on build orchestration and verification/context/CI dependencies. It must consume Build Result and run final verification/context checks without push/PR without approval.
- `I-09-verification-runner-evidence-failure-routing` and `DL-10` integration: blocked until failure taxonomy/evidence/runner details are locked and implemented by their owner.
- `I-14`/adapter live spawn seams: blocked or `pending-live/BLOCKED` when actual provider/spawn proof is unavailable.
- `DL-20B` and `DL-24B`: later audits must include this decision in domain-neutrality and output-discipline checks.

## Verification/witness consequences

- deterministic checks affected: future DAG validation, state integrity validation, path-claim conflict checks, cap enforcement, retry/resume checks, join validation, and failure-routing hook checks.
- positive witnesses required downstream:
  - valid acyclic DAG schedules only dependency-ready nodes;
  - durable state is written before launch and updated after transitions;
  - `maxParallelAgents: 8`, `maxValidationFixIterations: 3`, and `agenticWorkPackageTargetHours: 6` are preserved;
  - validated outputs become downstream inputs through explicit join metadata;
  - interruption resumes from durable state without rerunning passed nodes unnecessarily.
- negative witnesses required downstream:
  - cycle, missing dependency, unresolved blocked prerequisite, shared ownership conflict, stale/unowned dirty artifact, >8 default parallel agents, >3 validation/fix iterations, and oversized unsplit work package are rejected or blocked;
  - conflicting outputs are not silently merged;
  - shape-only mocked scheduler proof cannot close a load-bearing orchestration seam.
- regression witnesses required downstream:
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet;
  - `plan` owns risk analysis and Verification Delta;
  - `build` and `ship` automatically trigger verification, evidence, context updates, and drift checks;
  - schematics remain agent-facing/internal;
  - deterministic checks remain hard blockers and advisory review is not the sole blocker;
  - `DL-10` remains owner of verification implementation details and failure taxonomy;
  - decision-only work does not authorize production implementation.
- real_boundary_required: yes for later implementation seams; no live runtime seam is created by this decision artifact.
- real_boundary_status: required_before_closure for `I-03`, `I-06`, `I-21`, `I-22`, `I-09`/`DL-10` integration, and adapter/live spawn seams; not_applicable for this decision artifact itself.
- earliest `I-03` real-boundary proof:
  - producer: actual orchestration runtime API/entrypoint consuming a real on-disk orchestration DAG/work-plan artifact in the `DL-02` schema or a lane-approved transitional schema;
  - carrier: durable on-disk orchestration state containing node statuses, ownership claims, dependency results, failure-routing hooks, evidence links, and resume cursor/checkpoints;
  - consumer: actual scheduler/resumer/failure-router component reading durable state, scheduling dependency-ready nodes only, rejecting cycles/ownership conflicts, respecting caps, resuming after interruption, and emitting evidence/status;
  - closure rule: valid DAG schedules and writes resumable state; cycle/shared ownership/unmet dependency blocks; `8`/`3`/`6` regressions preserved; actual files are consumed and produced.
- downstream real-boundary consequences:
  - `I-06`: actual `plan` orchestrator uses runtime model and writes Implementation Plan/Verification Delta without context contamination;
  - `I-21`: actual `build` orchestrator consumes approved Implementation Plan, runs verification/context/evidence through runtime/failure routing, and writes Build Result;
  - `I-22`: actual `ship` orchestrator consumes Build Result and runs final checks without pushing/opening PR without approval;
  - adapter/live spawn: actual provider/carrier/consumer proof depends on `DL-06`/`I-14`; unavailable live proof remains `pending-live/BLOCKED`.
- if no live seam: this DL-04 artifact is a decision document only; it does not implement the runtime or claim live behavior.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-04-orchestration-runtime.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-04-orchestration-runtime/**`
- read_only_paths:
  - required source docs and orchestration artifacts in `/Users/lizavasilyeva/work/harness-starter/**`;
  - prior decision artifacts/reports for `DL-24A` and `DL-20A`;
  - `/Users/lizavasilyeva/work/vibe-engineer/**` outside DL-04 owned paths for inventory/source consistency only.
- untouchable_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.git/**`;
  - all production package/source, root config, CI, CLI, schema, adapter, skill, verification, context, mechanical-gate, starter, and non-owned docs paths;
  - all non-owned decisions and `.vibe/work/**` paths;
  - all `/Users/lizavasilyeva/work/harness-starter/**` files.
- serialized/shared ownership notes:
  - no shared file is owned by DL-04;
  - future implementation lanes must record serialized handoffs before touching shared/root paths;
  - runtime implementation in `I-03` owns `packages/orchestration/**` only after its own gate opens.

## Domain-neutrality check

- DL-20A status consulted: LOCKED and independently validated PASS.
- domain-neutrality rule references: `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`; `Validation plan and severity policy`.
- affected surfaces:
  - this artifact: decision artifact;
  - future implementation: core harness orchestration runtime, scheduler/resumer, agents/prompts, registry integration, adapter integration, verification hooks, context hooks, CLI hooks, mechanical-gate/docs surfaces.
- classification:
  - runtime orchestration policy is core harness policy and must remain generic;
  - consuming-project specialization must occur through explicit extension/config/artifact boundaries;
  - sample/demo content is not chosen by DL-04 and must be labeled/isolated by future owner lanes.
- allowed vocabulary used: DAG, node, dependency, artifact, evidence, agent, validator, fixer, scheduler, runtime, state, context, verification, skill, package, module, contract, adapter, schema, run, status, report.
- project/business terms: none used as core policy. Terms forbidden by DL-20A such as ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout, product catalog, and customer order remain negative examples only and are not encoded in DL-04 runtime policy.
- deterministic enforcement mapping:
  - future core-domain neutrality checks remain owned by `DL-15`/`I-10`, `I-04`, `I-07`, `I-15`, `I-24`, `DL-20B`, and `FINAL-BUGHUNT` per DL-20A;
  - DL-04 does not claim those checks are implemented.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes
- conflicts discovered: none. Before creating the decision artifact, visible DL-04 owned work contained only the DL-04 execution report, and the DL-04 decision artifact did not exist. Sibling D1 decision workdirs are disjoint and were not edited.

## Deferral rationale

Not applicable to this decision status. DL-04 is `LOCKED` and contains no deferred runtime decision required by `I-03`.

Externally owned details are dependencies, not hidden deferrals:

- exact artifact schema names/files/versions: `DL-02`;
- exact skill protocols: `DL-03`;
- exact registry/meta-agent format and authority: `DL-05`;
- adapter/live spawn capability: `DL-06`;
- CLI command/output contracts: `DL-07`;
- context storage/retrieval/drift: `DL-09`;
- verification implementation, evidence/failure taxonomy, rerun strategy, advisory/hard representation: `DL-10`;
- command/destructive/security/sandbox policy: `DL-22`.

If any downstream implementation tries to proceed without an owner-provided detail it relies on, that implementation remains blocked or must use a lane-approved transitional contract with real-boundary proof and explicit dependency mapping.

## Evidence checklist

1. Report artifact was created first at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-04-orchestration-runtime/DL-04-execution-report.md` before this decision artifact.
2. DL-24A was consulted and is `LOCKED` with independent validation `PASS`; DL-20A was consulted and is `LOCKED` with independent validation `PASS`.
3. Exact source files inspected are listed in the execution report and cited above by path and section heading.
4. Files changed by this decision pass are limited to:
   - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-04-orchestration-runtime/DL-04-execution-report.md`;
   - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-04-orchestration-runtime.md`.
5. No production/package/root/config/CI/CLI/schema/adapter/skill/verification/context/mechanical-gate/starter files were touched.
6. This artifact produces exactly one output class: `locked_decision_document`.
7. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
8. No deferred runtime decision is hidden; externally owned details are mapped to owner decisions and blocked dependents.
9. Verification/witness consequences list positive, negative, regression, and real-boundary proof obligations.
10. Real-boundary status is stated: this decision creates no live seam; later implementation seams require actual producer/carrier/consumer proof.
11. Ownership/path consequences are explicit and dirty-tree-safe.
12. DL-20A domain-neutrality check is present and self-applied.
13. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, `plan` Verification Delta, automatic `build`/`ship` verification/context/evidence, mechanical gate families, and no push/PR without approval.
14. Locked orchestration defaults remain unchanged: `maxParallelAgents: 8`, `maxValidationFixIterations: 3`, `agenticWorkPackageTargetHours: 6`.
15. Downstream dependents cannot finalize without the required runtime semantics and external owner decisions.
16. Validation checklist and severity policy are included below.

## Validation plan and severity policy

Independent Triad-B validation must inspect this decision artifact, the execution report, actual changed/owned files, and any available diff. It must not self-validate implementation and must not run production implementation for this decision-only pass.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-04-orchestration-runtime.md` and uses the DL-24A schema with exactly one output class.
- Backlog §4 topics are resolved: scoping, allocation, DAG creation, parallel subagent execution, validator/fixer loops, result merging, conflict handling, failure routing, evidence collection, and resumability after interruption.
- Locked defaults are preserved: `8` max parallel agents, `3` validation/fix iterations, `6 agentic hours` work-package target.
- Durable DAG/state requirements are concrete enough for `I-03` to implement without inventing hidden runtime semantics.
- Failure routing is bounded to runtime hooks while `DL-10` keeps taxonomy/evidence-format ownership.
- Dependencies are mapped to `DL-02`, `DL-03`, `DL-05`, `DL-06`, `DL-07`, `DL-09`, `DL-10`, and `DL-22`.
- DL-20A domain-neutrality checklist is applied using generic harness vocabulary.

### Negative witnesses

- A DAG with a cycle, missing dependency, unresolved blocked prerequisite, or dangling artifact must be rejected/blocked.
- A work package exceeding `6 agentic hours` without a pre-split rule must be rejected/blocked.
- A scheduler running more than `8` parallel agents by default must be rejected.
- A validator/fixer loop silently exceeding `3` iterations or looping indefinitely must be rejected.
- Retry using stale/unowned dirty files or mutating unowned paths must be rejected.
- Silent merge of competing writes to the same path must be rejected.
- Claiming live spawning/resume/failure-routing behavior without later real-boundary proof must be rejected or marked `pending-live/BLOCKED`.
- Project/business vocabulary leakage in core orchestration policy must be rejected unless explicitly a DL-20A negative example.

### Regression witnesses

- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- `plan` remains owner of risk analysis and Verification Delta.
- `build` and `ship` still trigger verification, evidence, context updates, and drift checks automatically.
- Schematics remain agent-facing/internal, not user-facing skills.
- Deterministic checks remain hard blockers; advisory review is not the sole hard blocker.
- DL-24A output discipline and DL-20A domain-neutrality remain prerequisites.
- DL-10 remains owner of verification implementation details and failure taxonomy.
- Production implementation remains unauthorized by this decision.

### Sibling/blast-radius checks

- Check consistency against final strategy §§3–11 and §§14–18.
- Check consistency against README §§3–5, §§9–10, and §15.
- Check `docs/verification-layer.md` §§6–9 for orchestration, no self-validation, failure routing, and meta-agent safety.
- Check `docs/locked-decisions.md` §§5, 8, 10 for locked defaults and automatic verification/context behavior.
- Check `docs/mechanical-verification-gates.md` §§1, 7, 11–13 for deterministic evidence and wiring implications.
- Check DL-24A and DL-20A compliance.
- Check no non-owned target paths, production files, source docs, or git metadata were edited.

### Severity policy

- `critical`: locked default contradiction; DL-24A/DL-20A noncompliance; out-of-license write; production implementation; missing dependency/blocker mapping; missing durable state/resume requirement; unbounded parallelism/retries; self-validation; false real-boundary closure; domain-specific core leakage; unsafe dirty-tree conflict policy. Blocks DL-04 and dependents.
- `major-local`: incomplete runtime subtopic coverage, unclear owner boundary with `DL-02`/`DL-03`/`DL-05`/`DL-07`/`DL-09`/`DL-10`, incomplete witness plan, or ambiguous conflict/resume/evidence policy repairable in DL-04 paths. Blocks DL-04 direct dependents.
- `minor-local`: wording/citation clarity issue that does not weaken gates.
- `clean`: all requirements and witnesses satisfied.

## Known ambiguities / future owners

- `DL-02` owns exact artifact schemas and versions. It must encode DL-04's state/DAG/evidence semantics or an explicit compatible superset.
- `DL-03` owns exact skill protocols. It must define how skills hand artifacts to and from runtime orchestration.
- `DL-05` owns registry/meta-agent validation and recommendation-only safety. It must provide agent metadata usable by scheduler allocation without giving meta-agents silent mutation authority.
- `DL-06` owns adapter/harness integration and live spawn capability. Live spawn proof remains pending on adapter implementation if unavailable.
- `DL-07` owns CLI primitives and machine-readable output contracts for invoking/reporting runtime behavior.
- `DL-09` owns context graph/storage/retrieval/update/drift details.
- `DL-10` owns verification runner implementation, evidence/failure taxonomy, rerun strategy, and advisory/hard representation; DL-04 owns only runtime hooks and scheduling consequences.
- `DL-22` owns security/safety model for command execution, destructive actions, secrets, environment access, and sandboxing.
- Future `I-03` must not close on shape-only tests; actual runtime producer/carrier/consumer files are required.
