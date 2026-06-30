# DL-10 — Verification Implementation Details

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-10 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-10-verification-implementation/reports/decision-lock-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.1 `Harness repo package hypothesis`; §5.2 row `DL-10-verification-implementation`; §6.2 `Implementation DAG`; §9.2 `Decision triad ownership`; §10 rows `DL-*`, `I-09`, `I-20`, `I-21`, `I-22`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity rules.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §7 `Verification and real-boundary witness check`; §8 `Coverage by product surface`; §9 `Severity gate and closure criteria check`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md` — `Evidence Packet`; `Verification Delta`; `Validation and type-generation consequences`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-04-orchestration-runtime.md` — `Failure-routing interface and DL-10 boundary`; `Retry, resume, and idempotency policy`; `Evidence, reporting, and state persistence requirements`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-05-agent-registry-validation-meta.md` — `Meta-agent policy`; `Agent validation requirements`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` — `CLI surface matrix`; `Machine-readable output and error contract`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§3–4 design rules and workflow; §§7, 9–10 CLI, verification, and context; §15 success criteria.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§6–11 skills, automatic verification/context, E2E stack, verification layer, and mechanical gates.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1–5 verification principles, artifact flow, Verification Delta, and catalog; §§8–9 build orchestration and failure routing; §§12–16 meta-agents, config, blocking policy, success criteria, and final invariant.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1, 5, 7, 11–13 deterministic doctrine, schema/contract strictness, wiring integrity, verification fit, priority, and invariant.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §10 `Verification implementation details`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2 and 10 for Triad-B evidence-bound validation, report discipline, dirty-tree safety, and real-boundary truth.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

`vibe-engineer` v1 verification is a domain-neutral verification runner model that consumes an approved Implementation Plan and its machine-readable Verification Delta, resolves required layers/runners, executes deterministic and advisory checks through one semantic runner path, records standalone Evidence Packets, classifies failures machine-readably, supports safe rerun/resume, and exposes hard-blocking status to build, ship, and CI.

Deterministic failures, missing evidence, missing runners, skipped required Verification Delta categories, blocked prerequisites, and unsafe quarantine are not green. Advisory review findings are recorded and routed but do not solely hard-block unless the approved plan or deterministic evidence promotes them to a task-specific blocking criterion.

This decision locks verification semantics and handoffs only. Exact artifact schema syntax remains owned by `DL-02`; exact CLI/public command contracts by `DL-07`; orchestration runtime mechanics by `DL-04`; registry/meta-agent policy by `DL-05`; test-runner tooling by `DL-11`/`DL-12`/`DL-13`; mechanical-gate implementation by `DL-15`; CI workflow details by `DL-18`; security and observability details by `DL-22`/`DL-23`.

## Decision details

1. Verification is an automatic build/ship responsibility, not an optional user ritual.
2. The canonical verification input is an approved Implementation Plan containing a complete Verification Delta.
3. The canonical verification output is a verification run result plus Evidence Packet references; exact schema fields are owned by `DL-02`, but the semantic requirements in this decision are mandatory for `I-09` and consumers.
4. Verification execution must resolve every required Verification Delta item to a runner, a reuse decision, a not-applicable decision with rationale, or a blocked state. Silent omission is a failure.
5. Deterministic layers hard-block by default. Advisory layers are captured, routed, and summarized but are not the sole hard blocker unless promoted by plan-specific criteria or deterministic evidence.
6. Rerun/resume must preserve lineage and prior failures; it may reuse evidence only when the scoped inputs and runner contracts are unchanged.
7. Failure classification is a first-class machine-readable result used for specialist routing, build/ship blocking, rerun decisions, CI parity, and meta-agent recommendations.
8. Flaky-test handling is classification and investigation, not a mechanism for hiding product failures.
9. The same semantic verification runner path must be used locally, by `build`/`ship`, and by CI; provider/workflow mechanics are delegated to `DL-18`/`I-20`.
10. This decision creates no live runner. Later implementation lanes must prove actual producer/carrier/consumer boundaries before closing.

## Alternatives considered

### One aggregate `verify` with no layer/rerun model

- decision: rejected
- rationale: build, ship, CI, and failure routing need layer-level status, evidence, rerun lineage, and specialist routing.
- consequences: v1 requires aggregate and layer-addressable semantics.

### Separate unrelated local, CI, build, and ship verification paths

- decision: rejected
- rationale: mechanical-gate wiring integrity and verification-layer doctrine require local/CI/build/ship parity; divergent paths create fake green.
- consequences: workflow details may differ, but all consumers invoke the same semantic runner and consume the same evidence/status model.

### Advisory review as a hard gate by default

- decision: rejected
- rationale: locked verification doctrine says deterministic checks block and advisory review does not solely block.
- consequences: advisory findings are evidence and may trigger routing/escalation, but need deterministic or task-specific promotion to hard-block alone.

### Flaky quarantine as success

- decision: rejected
- rationale: quarantine can hide real product defects and violates evidence-over-assertion.
- consequences: quarantine is a blocked/investigation status unless the relevant test-tooling owner defines a safe policy and evidence proves product behavior remains covered.

### Semantic evidence requirements here, exact schemas in DL-02

- decision: accepted
- rationale: DL-10 must guide implementation without usurping schema syntax/versioning owned by DL-02.
- consequences: `I-09` is blocked if DL-02/I-01 cannot encode DL-10-required machine-readable classifications and lineage in `EvidencePacketV1`/compatible schema structures.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision template, dependency declaration format, evidence checklist, real-boundary policy, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core/extension/sample-demo checklist for verification core categories and examples.
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms the final strategy has no unresolved critical/major planning findings.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: Strategy, README, locked decisions, verification layer, mechanical gates, backlog, playbook, and quality bar define verification requirements.
  blocks:
    - id: I-09-verification-runner-evidence-failure-routing
      reason: Needs command semantics, evidence responsibilities, failure taxonomy, rerun/resume, hard/advisory model, and meta-agent escalation hooks.
    - id: I-20-ci-local-parity-wiring
      reason: Needs local/CI parity requirements and aggregate runner/evidence expectations.
    - id: I-21-build-skill-orchestration
      reason: Build must select and consume verifiers from Verification Delta, block failures, route specialists, and write Build Result evidence.
    - id: I-22-ship-skill-orchestration
      reason: Ship must run final verification, consume evidence, block intentional violations, and produce Ship Packet evidence.
    - id: final closure
      reason: Final closure requires actual verification runner evidence, blocking behavior, CI parity, and build/ship consumption.
  blocked_dependents:
    - id: I-09-verification-runner-evidence-failure-routing
      blocked_until: DL-10, DL-02, DL-04, DL-05, DL-07, and DL-22 prerequisites are green and aligned for implementation.
      relying_on: verification runner model, evidence semantics, taxonomy, rerun/resume, hard/advisory status, registry routing, CLI boundary, and security policy.
    - id: I-20-ci-local-parity-wiring
      blocked_until: I-09 runner and DL-18 CI/CD defaults are available.
      relying_on: same semantic runner path and evidence/status carrier used locally and in CI.
    - id: I-21-build-skill-orchestration
      blocked_until: I-03/I-06/I-08/I-09/I-14/I-15/I-20 dependencies are clean per final strategy.
      relying_on: build verifier selection, failure blocking/routing, and Evidence Packet/Build Result links.
    - id: I-22-ship-skill-orchestration
      blocked_until: I-21 plus verification/context/CI dependencies are clean.
      relying_on: final verification evidence and hard-blocking status.
  required_before_finalizing:
    - id: DL-02-artifact-schemas / I-01-artifact-schemas-config
      required_content: Evidence Packet and Verification Delta schemas/validators must encode command/runner identity, input refs, scope, layer results, blocking/advisory status, failure classification, timestamps, artifacts, warnings, and rerun lineage.
    - id: DL-04-orchestration-runtime / I-03-orchestration-runtime
      required_content: Runtime must persist verification node state, rerun/resume hooks, failure routing hooks, and cap-exhaustion blockers without redefining DL-10 taxonomy.
    - id: DL-05-agent-registry-validation-meta / I-04-agent-registry-validation-meta
      required_content: Specialist fixers, validators, flaky-test investigator, verification-gap detector, and postmortem/meta-agent hooks must resolve through validated registry entries.
    - id: DL-07-cli-primitives / I-02/I-09
      required_content: Exact `vibe-engineer verify` CLI contract and machine result envelope must carry DL-10 status/evidence semantics.
    - id: DL-11/DL-12/DL-13
      required_content: Exact unit/integration/E2E/UI runner choices and tool-specific flake mechanics must integrate with DL-10 classifications.
    - id: DL-15 / I-10-I-13
      required_content: Mechanical gates must emit results/evidence consumable by the verification runner.
    - id: DL-18 / I-20
      required_content: CI/local workflow details must invoke the same semantic runner and preserve evidence artifacts.
    - id: DL-22
      required_content: Verification command safety, secrets, destructive-operation, environment, and external-provider policies.
    - id: DL-23
      required_content: Observability verification details for logs/metrics/traces/correlation evidence.
  deferrals:
    - deferred_question: Exact Evidence Packet schema syntax and versioning.
      rationale: Owned by DL-02/I-01; DL-10 locks semantic evidence requirements.
      future_owner: DL-02-artifact-schemas / I-01-artifact-schemas-config
      allowed_now: true
      blocked_dependents:
        - I-09-verification-runner-evidence-failure-routing if machine-readable classification/lineage cannot be encoded
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact CLI flag names/output payload syntax for verification commands.
      rationale: Owned by DL-07/I-09; DL-10 locks command semantics only.
      future_owner: DL-07-cli-primitives / I-09-verification-runner-evidence-failure-routing
      allowed_now: true
      blocked_dependents:
        - I-09 and command-family implementation until CLI contract is aligned
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact test runner and flake-tool mechanics.
      rationale: Owned by DL-11/DL-12/DL-13; DL-10 locks classification and quarantine policy.
      future_owner: DL-11-test-runner-tooling / DL-12-mobile-e2e-details / DL-13-ui-verification-stack
      allowed_now: true
      blocked_dependents:
        - affected runner implementation lanes
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-10-verification-implementation/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** sibling and prerequisite decisions
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** sibling and prerequisite reports
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-10 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - production package/source paths
    - root config files
    - CI files
    - CLI/schema/adapter/skill/verification/context/mechanical-gate/starter files
    - any decision/report/work path not owned by DL-10
    - /Users/lizavasilyeva/work/harness-starter/**
  handoff_notes:
    - from: DL-10
      to: I-09-verification-runner-evidence-failure-routing
      condition: After DL-10 independent validation is clean and implementation prerequisites are green.
      shared_path_policy: disjoint
    - from: DL-10
      to: DL-02/DL-04/DL-05/DL-07/DL-11/DL-15/DL-18/DL-22/DL-23
      condition: Peer owners encode or consume DL-10 requirements without weakening their own boundaries.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-09-verification-runner-evidence-failure-routing`: blocked until this decision is independently validated and peer dependencies can encode evidence, CLI, registry, runtime, and safety semantics.
- `I-20-ci-local-parity-wiring`: blocked until an actual I-09 runner exists and `DL-18`/CI implementation can invoke the same semantic path.
- `I-21-build-skill-orchestration`: blocked until actual build can consume Implementation Plan/Verification Delta, run verification, block failures, and write Build Result evidence.
- `I-22-ship-skill-orchestration`: blocked until actual ship can consume Build Result/evidence, run final verification, and hard-block intentional violations.
- `FINAL-BUGHUNT`/final closure: blocked until verification runner, CI parity, build/ship consumption, and real-boundary witnesses are clean or explicitly `pending-live/BLOCKED`.

## Verification command model

DL-10 locks the semantic command/primitive families required by the verification layer. Exact published CLI spelling and payload syntax remain under `DL-07`/`I-09`.

Required semantic families:

1. `verify run` / aggregate verification:
   - consumes project root, approved Implementation Plan or explicit Verification Delta, governed scope, runner/layer selection, output evidence path, and machine-mode result destination;
   - executes required deterministic and advisory layers;
   - emits overall status plus Evidence Packet links.
2. Layer-targeted verification:
   - executes one or more selected layers/runners for affected-scope or debugging use;
   - cannot mark the whole task green unless all required Verification Delta items are satisfied or safely reused.
3. Affected-scope verification:
   - resolves changed paths/artifact refs/context refs to required layers using the Verification Delta and runner catalog;
   - any unresolved affected category is `blocked`, not skipped.
4. Evidence-only listing/inspection:
   - lists available runners, layers, required prerequisites, prior run ids, and evidence locations for debugging/CI without changing product source.
5. Rerun/resume:
   - resumes a prior run id, records lineage, reuses only valid unchanged evidence, and re-executes invalidated layers.
6. Runner catalog validation:
   - validates that each named runner has identity, layer, prerequisites, blocking policy, output evidence contract, owner, and registry links.

Every machine invocation must classify final status as `passed`, `failed`, `blocked`, or `advisory_warning`/equivalent compatible DL-02/DL-07 status, with deterministic hard-blocking status visible to consumers.

## Evidence packet requirements

Exact Evidence Packet schema syntax is owned by `DL-02`. DL-10 requires every verification run to record these semantics in schema-valid, machine-readable evidence:

- verification run id and, for layer entries, stable layer result id;
- command/primitive identity, normalized non-secret arguments, working directory/project root, invocation id, and runner catalog version;
- runner identity: runner id, version, layer, implementation owner, validator/fixer owner where applicable;
- input artifact links: Work Brief/Implementation Plan/Verification Delta/Build Result/Ship Packet refs as applicable;
- governed scope: paths, packages/apps/modules/contracts/adapters/tests/context artifacts, and rationale for affected selection;
- timestamps: started, ended, duration, and producer id;
- environment summary sufficient for debugging without leaking secrets, subject to `DL-22`;
- per-layer result: `pass`, `fail`, `blocked`, `advisory`, `skipped/not_run` only when semantically allowed, and blocking boolean;
- deterministic/advisory class and hard-blocking effect;
- machine-readable failure classification from the DL-10 taxonomy when result is fail/blocked/advisory;
- exit code/tool status and stable error/diagnostic codes;
- artifacts: stdout/stderr/log refs, test reports, screenshots, traces, metrics, mechanical reports, context/drift reports, or advisory review reports;
- warnings and unresolved advisory findings with accepted/fixed/deferred disposition;
- rerun lineage: prior run id, reused layer evidence ids, invalidated evidence ids, invalidation reason, retry attempt, and cap/exhaustion state;
- missing evidence/prerequisite/runner records as blocking evidence, not absent data;
- links to Build Result and Ship Packet consumers when used by build/ship.

If current DL-02 structures cannot encode any required DL-10 semantic field, `I-01`/`I-09` must stop blocked for schema alignment. They must not substitute prose, regex extraction, or untyped side files for load-bearing evidence.

## Failure classification taxonomy

V1 verification classifications are domain-neutral and machine-readable. Exact enum names may be schema-owned, but these categories and routing expectations are required:

| Category                              | Blocking default                                                 | Typical route                                                |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| deterministic_product_or_code_failure | hard block                                                       | owning implementation specialist or product/code fixer       |
| schema_or_contract_failure            | hard block                                                       | schema/contract fixer; `DL-02`/contract owner where relevant |
| safety_or_security_policy_failure     | hard block                                                       | security/safety fixer and `DL-22` policy owner               |
| mechanical_gate_failure               | hard block unless explicitly advisory/ratcheted by `DL-15`       | mechanical gate owner/fixer                                  |
| test_assertion_failure                | hard block                                                       | relevant test/product fixer                                  |
| test_bug                              | hard block for green closure until repaired or covered elsewhere | test-runner/test-quality fixer                               |
| environment_issue                     | blocked, not pass                                                | environment/CI/local parity owner                            |
| timing_or_flaky_suspicion             | blocked/investigate, not pass                                    | flaky-test investigator and relevant runner owner            |
| external_dependency_drift             | blocked or failure depending on policy                           | adapter/integration/environment owner                        |
| advisory_finding                      | advisory by default                                              | reviewer/fixer or meta-agent recommendation path             |
| missing_evidence                      | hard block                                                       | evidence/runner/build/ship owner                             |
| missing_runner_or_prerequisite        | blocked                                                          | runner catalog/prerequisite owner                            |
| skipped_required_delta_category       | hard block                                                       | planner/Verification Delta or runner selection owner         |
| blocked_prerequisite                  | blocked                                                          | prerequisite owner/runtime router                            |
| runner_internal_error                 | failure/blocker                                                  | verification runner owner                                    |
| classification_unknown                | blocked until classified                                         | failure classifier owner                                     |

Failure evidence must preserve both original failed layer and current routed owner. Reclassification requires new evidence and lineage; it must not overwrite or erase the original finding.

## Rerun and resume strategy

- Every verification invocation gets a stable run id. Resumed invocations link to `rerunOf`/lineage rather than overwriting prior evidence.
- Layer results get stable ids derived from run id, runner id/version, governed scope, input artifact ids, and relevant config fingerprints.
- Evidence may be reused only when all load-bearing inputs are unchanged: source/artifact ids, relevant file content fingerprints, runner version, config, environment prerequisites, schema/catalog versions, and blocking policy.
- Invalidation triggers include changed governed files, changed Implementation Plan/Verification Delta, changed runner version, changed config, changed schema/catalog version, missing artifacts, stale context, security policy change, or prior classification requiring investigation.
- Partial failures resume by rerunning failed/blocked/invalidated layers and preserving passed unchanged layers as reused evidence. A reused pass must still be linked explicitly.
- Repeated failures obey `maxValidationFixIterations: 3` through the orchestration/runtime policy. Cap exhaustion becomes `blocked`/`failed` with evidence and escalation hooks.
- A rerun must not convert an intermittent pass into final green when the same layer has unresolved flaky suspicion or missing root-cause classification.
- Resume after interruption treats running/unknown layers as unknown until evidence is inspected. Unknown is blocked, not pass.
- Quarantine or skip state cannot erase required Verification Delta coverage. It either blocks, routes to test-tooling owners, or requires alternate deterministic coverage with evidence.

## Deterministic hard blockers vs advisory results

- Hard blockers by default: safety/security policy, schema/contract validation, typecheck, lint/format/boundary, mechanical hard gates, unit/integration/contract/E2E deterministic tests, deterministic UI checks, build/package verification, required context/drift checks, required observability checks, final DoD, missing evidence, missing runner, skipped required Verification Delta category, blocked prerequisite.
- Advisory by default: LLM/reviewer findings, subjective visual critique, low-confidence smell findings when `DL-15` marks them advisory, and meta-agent recommendations.
- Advisory findings may become hard blockers only when:
  1. the approved Implementation Plan/Verification Delta names them as task-specific blocking criteria;
  2. deterministic evidence confirms the underlying issue;
  3. a locked decision/policy explicitly marks the class hard-blocking.
- Overall verification status cannot be `passed` when any required deterministic layer failed, is blocked, is missing evidence, or is unclassified unknown.
- `advisory_warning`/equivalent status is allowed only when all required hard blockers pass and one or more advisory findings remain recorded with disposition.

## Build verifier selection from Verification Delta

`plan` owns the Verification Delta. `build` must consume it; `build` must not invent a reduced verifier set silently.

Selection algorithm semantics:

1. Validate the Implementation Plan status is approved and the embedded Verification Delta is schema-valid.
2. Confirm every verification catalog category appears with action `add`, `update`, `reuse`, `not_applicable`, or `blocked` and rationale.
3. For each item with `add`/`update`, resolve one or more runner catalog entries capable of producing required evidence.
4. For `reuse`, verify existing evidence is current under rerun/resume invalidation rules.
5. For `not_applicable`, record the planner rationale and allow validators to reject weak rationales.
6. For `blocked`, propagate blocked status to Build Result; do not continue as green.
7. If a required runner/prerequisite is missing, classify as `missing_runner_or_prerequisite` or `blocked_prerequisite`.
8. Run required deterministic layers before accepting build completion; advisory layers may run in parallel/afterward but their findings must be recorded.
9. Write Build Result references to Evidence Packets for every verification claim.

A Build Result with `passed` status is invalid if any required Verification Delta item lacks evidence, has failed hard-blocking evidence, or was skipped without a valid `not_applicable` rationale.

## CI/local parity implications

- Local verification, `build`, `ship`, and CI must invoke the same semantic verification runner path and consume the same evidence/status model.
- `DL-18` and `I-20` own provider-specific workflows, caching, matrices, path filters, artifact upload, and CI UI details.
- `I-20` must prove local aggregate verification and CI workflow reference the same aggregate runner semantics, not parallel bespoke scripts.
- CI may shard or cache layers, but final status must join into the same DL-10 evidence model and preserve rerun/reuse lineage.
- CI missing a required runner, path filter, dependency, evidence upload, or governed surface is a wiring failure/blocker, not success.
- Local-only or CI-only failures must be classified (`environment_issue`, `external_dependency_drift`, deterministic failure, etc.) and routed; neither environment may silently override the other.

## Artifact storage and retention expectations

Exact storage naming and retention schema are owned by `DL-02`, `DL-09`, `DL-18`, and implementation lanes. DL-10 requires these storage semantics:

- Verification evidence is written under explicit lane/work/evidence paths, normally a lane-owned `.vibe/work/<lane>/.../evidence` path or an approved `.vibe/evidence/<lane>/<run-id>` path.
- Build and ship artifacts must link to Evidence Packet ids and paths; narrative summaries are not enough.
- CI must preserve evidence artifacts or links sufficiently for independent validation and final bug hunt.
- Evidence must be immutable per run id after finalization; supersession uses lineage/new artifacts rather than in-place mutation.
- Large artifacts such as traces, screenshots, videos, logs, and metrics may be sidecar files referenced by Evidence Packets.
- Context/drift evidence handoff to `DL-09`/`I-08` must preserve what changed, why it changed, and how future agents retrieve proof.
- Security-sensitive evidence redaction/retention is owned by `DL-22`; observability artifact details by `DL-23`.

## Flaky-test classification and quarantine policy

- Flaky suspicion is a classification, not a pass.
- A suspected flaky result remains blocking until classified as product failure, test bug, environment issue, timing/flakiness, external dependency drift, or advisory-only runner limitation with safe alternative coverage.
- Quarantine may be proposed only with evidence, owner, expiry/review condition, and alternate coverage or blocked-dependent mapping.
- Quarantine cannot hide a required Verification Delta item or allow Build Result/Ship Packet `passed` when behavior lacks deterministic proof.
- Test-runner-specific flake detection, retry counts, isolation, device/browser behavior, and quarantine mechanics are owned by `DL-11`, `DL-12`, and `DL-13`.
- Repeated flaky suspicion must trigger the flaky-test investigator meta-agent recommendation path, but that meta-agent remains recommendation-only unless a later explicit decision changes it.

## Meta-agent escalation hooks

Verification must expose recommendation hooks for registry-validated meta-agents from `DL-05`:

- verification-gap detector for repeated missing/insufficient verification;
- flaky-test investigator for timing/flaky/environment/external drift suspicion;
- postmortem learner after failed builds or escaped defects;
- test-debt detector when behavior lacks adequate verification coverage;
- context-decay detector when evidence/context is stale or missing;
- observability-gap detector when required observability evidence is absent;
- UI-verifier-gap detector when recurring UI defects evade current verifiers;
- agent-quality regression detector when specialist/fixer/validator outputs degrade.

Escalation triggers include repeated same classification, cap exhaustion, missing runner class, repeated skipped Verification Delta categories, recurring flaky suspicion, escaped defect evidence, or post-ship/final-bughunt gaps.

Meta-agents may recommend new runners, tests, gates, agents, schematics, standards, or context updates. They must not silently mutate harness/starter files, registry entries, verification config, quarantine lists, baselines, or CI workflows unless a later explicit decision changes recommendation-only safety.

## Verification/witness consequences

- deterministic checks affected: future verification runner tests, runner catalog validation, Evidence Packet validation, failure classifier tests, rerun/resume tests, build/ship consumption tests, and CI/local parity wiring tests.
- positive witnesses required downstream:
  - `I-09`: actual `vibe-engineer verify` invokes local runners/gates, writes evidence, and classifies pass/fail/block/advisory.
  - `I-09`: passing deterministic layer records schema-valid evidence with runner identity, scope, status, timestamps, and artifacts.
  - `I-09`: failing deterministic layer exits/returns blocking status and writes failure classification.
  - `I-21`: actual build consumes an approved Implementation Plan/Verification Delta, selects runners, and writes Build Result with evidence refs.
  - `I-22`: actual ship consumes Build Result/evidence, runs final verification, and blocks intentional violations.
  - `I-20`: local and CI aggregate paths invoke the same semantic runner and preserve evidence artifacts.
- negative witnesses required downstream:
  - deterministic failure cannot be represented as advisory green;
  - missing evidence, missing runner, blocked prerequisite, skipped required Verification Delta category, and unknown interrupted layer are blocked/failing, not success;
  - advisory-only LLM review cannot be the sole hard blocker unless promoted by deterministic/task-specific criteria;
  - flaky classification/quarantine cannot hide a real product failure;
  - unresolved schema/CLI/test-tool/mechanical/security/observability details block their dependents rather than being improvised.
- regression witnesses required downstream:
  - `build` and `ship` automatically run verification, evidence capture, context updates, and drift checks;
  - `plan` remains owner of Verification Delta;
  - six skills, artifact flow, fixed starter stack/E2E choices, deterministic hard-block policy, and mechanical gate families remain unchanged;
  - meta-agents remain recommendation-only unless a later explicit decision changes policy;
  - DL-24A, DL-20A, DL-20B, and DL-24B roles remain intact.
- real_boundary_required: yes for later implementation seams; no live runtime seam is created by this decision artifact.
- real_boundary_status: not_applicable for this decision artifact; required_before_closure for `I-09`, `I-20`, `I-21`, and `I-22`.
- earliest required proof:
  - Producer: actual `vibe-engineer verify` implementation / verification runner from `I-09`.
  - Carrier: on-disk Evidence Packet plus exit/blocking status.
  - Consumers: build failure router (`I-21`), ship/final verification path (`I-22`), and CI/local parity wiring (`I-20`).
  - Closure rule: intentional violation must hard-block with evidence; if live proof cannot run, closure is `pending-live/BLOCKED`, not shape-green.
- if no live seam: DL-10 is a decision-design unit only and does not implement or claim runtime proof.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-10-verification-implementation/**`
- read_only_paths:
  - all cited source docs and orchestration artifacts in `/Users/lizavasilyeva/work/harness-starter/**`;
  - prerequisite and sibling decisions/reports in `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/**` and `.vibe/work/**`;
  - target repo inventory outside DL-10 owned paths.
- untouchable_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.git/**`;
  - production package/source paths, root config, CI workflows/scripts, CLI code, schema code, mechanical gate code, skill/orchestration code, generated starter files;
  - any decision/report/work path not owned by DL-10;
  - all `/Users/lizavasilyeva/work/harness-starter/**` paths.
- serialized/shared ownership notes:
  - no shared source/root/config path is owned by DL-10;
  - future implementation writes to `packages/verification/**` and `packages/cli/src/commands/verify/**` belong to `I-09` only after its prerequisites and handoffs are green;
  - CI/root writes belong to `I-20` after serialized ownership handoff.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected: this decision artifact and future core verification runner, runner catalog, evidence/failure taxonomy, prompts, registry hooks, docs, and examples.
- surface classification: verification core is core harness policy; consuming-project verification extensions are explicit project extension/config; sample/demo evidence must be labeled and isolated.
- allowed generic vocabulary: layers, runners, evidence, artifacts, contexts, contracts, adapters, tests, skills, agents, gates, failures, schemas, packages, modules, commands, plans, build, ship, CI.
- project/business terms: no business-domain terms are core verification categories or examples. DL-20A-forbidden examples such as ecommerce, inventory, fashion, Billz, Telegram, Instagram, and equivalent project concepts remain forbidden core leakage except as negative examples or sample/demo labels.
- extension boundary: project-specific verification rules belong in consuming-project extensions/config and may not become default core runners/categories.
- sample/demo boundary: future examples must be explicitly labeled sample/demo/reference and not required by core defaults.
- deterministic enforcement mapping: domain-neutrality enforcement remains with DL-15/I-10, I-04, I-07/I-15 where applicable, I-24 docs, DL-20B audit, and final bug hunt.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes
- conflicts discovered: none.
- evidence: before the first DL-10 write, `docs/decisions/DL-10-verification-implementation.md` did not exist and `.vibe/work/DL-10-verification-implementation/` did not exist. The report was created first. Later inventory showed sibling decision/work paths in progress or completed; all were treated as read-only and not edited.

## Evidence checklist

1. Report artifact was created first at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-10-verification-implementation/reports/decision-lock-execution-report.md`.
2. Required source files were inspected and are cited above by path and section heading.
3. Files changed by this lane are limited to this decision artifact and the DL-10 execution report.
4. No production/package/root/config/CI/generated starter/CLI/schema/mechanical/skill/orchestration files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Backlog §10 questions are resolved at decision level or assigned to named future owners with blocked dependents.
7. Evidence packet responsibilities and required fields are stated semantically while exact schemas remain with `DL-02`.
8. Command semantics are stated while exact CLI contracts remain with `DL-07`.
9. Failure taxonomy, rerun/resume, deterministic/advisory representation, build verifier selection, CI/local parity, artifact storage, flaky quarantine, and meta-agent hooks are present.
10. Dependencies and handoffs to `DL-02`, `DL-04`, `DL-05`, `DL-07`, `DL-11`, `DL-15`, `DL-18`, `DL-22`, and `DL-23` are mapped.
11. Verification/witness consequences include positive, negative, regression, and real-boundary obligations.
12. DL-20A domain-neutrality check is applied using generic harness vocabulary.
13. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, `plan` Verification Delta, automatic `build`/`ship` verification/context/evidence, fixed starter stack/E2E choices, mechanical gates, and no push/PR without approval.
14. No live runtime proof is claimed by this decision.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and available diffs, not just this artifact or report.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md` and report exists at the required report path.
- Artifact follows DL-24A template and has exactly one output class.
- Backlog §10 items are resolved, safely handed off, or block named dependents.
- Command model, evidence requirements, taxonomy, rerun/resume, hard/advisory representation, build selection, CI/local parity, storage, flake policy, meta-agent hooks, and real-boundary obligations are present.
- Handoffs to `DL-02`, `DL-04`, `DL-05`, `DL-07`, `DL-11`, `DL-15`, `DL-18`, `DL-22`, and `DL-23` are coherent.
- DL-20A domain-neutrality checklist is applied.

### Negative witnesses

- A failing deterministic layer must be blocking, not advisory green.
- Missing Evidence Packet, missing runner, missing prerequisite, skipped required Verification Delta category, or unknown interrupted layer must be blocked/failing, not success.
- Advisory-only LLM review must not be the sole hard blocker unless promoted by deterministic/task-specific criteria.
- Flaky classification/quarantine must not hide a real product failure.
- Exact schema/CLI/test-tool/mechanical/CI/security/observability choices unresolved here must keep dependent implementation blocked or routed to the named owner.
- Business-domain leakage in core verification taxonomy/examples is rejected unless explicitly negative-example or sample/demo-labeled.

### Regression witnesses

- `build` and `ship` still automatically run verification, evidence capture, context updates, and drift checks.
- `plan` still owns Verification Delta.
- Six skills, artifact flow, starter stack/E2E choices, deterministic hard-block policy, and mechanical gate families remain unchanged.
- Meta-agents remain recommendation-only unless later explicitly changed.
- `DL-24A`, `DL-20A`, `DL-20B`, and `DL-24B` roles remain intact.

### Sibling/blast-radius checks

- Check consistency with `docs/verification-layer.md`, especially catalog, build/ship responsibilities, failure routing, meta-agents, and blocking policy.
- Check consistency with `docs/mechanical-verification-gates.md` so mechanical evidence/wiring is not weakened.
- Check consistency with final strategy dependencies and owned paths for `I-09`, `I-20`, `I-21`, and `I-22`.
- Check existing sibling decisions, especially `DL-02`, `DL-04`, `DL-05`, and `DL-07`, for ownership contradictions.
- Confirm no unowned decision artifacts, production source, CLI code, CI workflows, schemas, mechanical gates, or `.git/**` were written.

### Severity policy

- `critical`: locked-decision contradiction; out-of-license write; missing artifact/report; missing evidence/failure taxonomy; deterministic failures represented as advisory green; silent fallback/quarantine; false real-boundary closure; missing dependency/blocker mapping for unresolved load-bearing choices; domain-specific core leakage.
- `major-local`: incomplete command/evidence/rerun/failure-routing decision that blocks direct dependents but is repairable in DL-10 paths.
- `minor-local`: wording/citation clarity issue that does not weaken downstream gates.
- `clean`: all source, schema, ownership, dependency, witness, and domain-neutrality requirements satisfied.

## Known ambiguities / future owners

- `DL-02` owns exact artifact schemas, Evidence Packet field names, schema versioning, validation errors, and migrations. DL-10 requires semantic fields and blocks `I-09` if machine-readable classification/lineage cannot be encoded.
- `DL-04` owns orchestration runtime DAG, retry/resume state, scheduling, join, and failure-routing hooks. DL-10 owns classification/evidence semantics.
- `DL-05` owns registry, validator/fixer/meta-agent metadata, and recommendation-only safety. DL-10 owns when verification routes recommendations/escalations.
- `DL-07` owns exact CLI contracts, public/internal surface, envelope syntax, and exit code integration. DL-10 owns verification command needs.
- `DL-11`, `DL-12`, and `DL-13` own exact test runner tooling and runner-specific flake mechanics. DL-10 owns classification/quarantine semantics.
- `DL-15` owns mechanical gate implementation, hard/advisory calibration, and aggregate quality tool details. DL-10 owns ingestion of their results as evidence/failures.
- `DL-18`/`I-20` own CI provider/workflow implementation. DL-10 owns parity requirements and evidence/status expectations.
- `DL-22` owns secrets, command safety, destructive operations, env, sandbox, and redaction policy for verification.
- `DL-23` owns exact observability evidence details; DL-10 preserves observability verification as a layer when required.
- `DL-09`/`I-08` own context/drift storage and retrieval; DL-10 requires verification evidence links to preserve context/drift proof.
