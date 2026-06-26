# DL-12 — Mobile E2E Implementation Details

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-12 adjudication-authorized decision-lock finisher
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-12-mobile-e2e-details.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-12-mobile-e2e-details/DL-12-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/dl-11-12-blocker-adjudication.md` — `Final verdict`; `Exact finisher license — DL-12 EXTEND`; `Ordered remainder spec — DL-12`; `Validation implications after finishers complete`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-12-brief-generated.md` — `Deliverable and non-goals`; `Required decision artifact schema/format`; `Required decision substance and evidence requirements`; `Real-boundary witness requirement`; `Domain-neutrality constraints from DL-20A`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-12-brief-validation.md` — `Verdict`; `Coverage matrix`; `Dependency audit`; `Validation plan for independent Triad-B validator`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.2 `Generated starter kit hypothesis`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 row `DL-12-mobile-e2e-details`; §6 `Dependency DAG with scheduler gates`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity rules.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §7 `Verification and real-boundary witness check`; §8 `Coverage by product surface`; §9 `Severity gate and closure criteria check`; §10 `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §11 `Test runner and quality tooling choices`; §12 `Mobile E2E implementation details`; §13 `UI verification stack`; §18 `CI/CD provider defaults`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §3 `Starter kit stack`; §9 `E2E stack`; §10 `Verification-layer decisions`.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §1 `Core principles`; §3 `Responsibilities by skill/orchestrator`; §4 `Verification Delta`; §5.7 `E2E behavior tests`; §5.8 `UI verification tests`; §9 `Failure routing and fixing`; §12.5 `Flaky-test investigator`; §13 `Harness configuration`; §14 `Blocking policy summary`; §16 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §1 `Core verification doctrine`; §7 `Quality wiring-integrity gate`; §9 `Test anti-pattern scanner`; §11 `How this fits the verification layer`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§2–4 two repositories, design rules, and workflow; §9 `Verification model`; §12 `Starter kit shape`; §15 `Success criteria`; §16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Verification and witness consequences`; `Validation plan and severity policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md` — `Evidence packet requirements`; `Failure classification taxonomy`; `Flaky-test classification and quarantine policy`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-10-verification-implementation/reports/decision-lock-validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-13-ui-verification-stack.md` — `Decision summary`; `UI verification stack requirements`; `Deterministic vs advisory boundary`; `Known ambiguities / future owners` as read-only sibling context, not as a dependency for DL-12 closure.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§0, 5.2, 6, 8, 10, 11 for triad discipline, owned paths, blocker handling, dirty-tree policy, and real-boundary proof.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

React Native mobile behavior E2E in `vibe-engineer` v1 uses both Maestro and Detox. Maestro is the default generated mobile user-flow layer for black-box, readable, agent-friendly behavior flows. Detox is required for synchronization-heavy, app-control-heavy, lifecycle-heavy, permission/deep-link/push/background, deterministic state-control, native-module, or internals-sensitive React Native flows.

Generated mobile E2E must select `maestro`, `detox`, or `both` using structured metadata. A scenario that only proves user-observable behavior defaults to Maestro. A scenario that needs app internals or deterministic platform/app control must include Detox. A high-risk scenario with both user-journey acceptance intent and synchronization/app-control risk must be split into complementary Maestro and Detox coverage rather than weakening one tool.

This decision sets mobile E2E policy and downstream proof obligations only. It does not implement tests, mobile app files, CI workflows, package scripts, runners, devices, schemas, or evidence collectors.

## Decision details

1. Mobile E2E is hard verification when required by a Verification Delta. It is not manual/advisory QA.
2. Web E2E remains Playwright and is out of DL-12 scope except for I-17 dependency mapping.
3. UI verification remains separate from behavior E2E; visual/accessibility/layout baseline policy is owned by DL-13/I-17, though DL-12 mobile runs must provide screenshots, logs, videos, and metadata that UI verification can consume when applicable.
4. The mobile E2E runner decision is made per scenario using metadata and the selection rules below; agents must not choose a runner by prose convention, filename heuristics, or implicit defaults hidden from validators.
5. Runner conflicts fail generation/validation. A generated scenario whose metadata says `runner: maestro` while requiring app internals, deterministic state reset, native-module synchronization, or app lifecycle control is invalid.
6. Rerun, quarantine, skip, and pending-live states must preserve original failure evidence. A rerun pass does not erase a deterministic failure or flaky suspicion.
7. Local and CI mobile E2E must use the same semantic verification/evidence model defined by DL-10. Provider/workflow syntax is delegated to DL-18/I-20.
8. If actual simulator/emulator/device execution cannot run in a later implementation lane, the affected closure is `pending-live/BLOCKED`, not green.

## Alternatives considered

### Maestro-only mobile E2E

- decision: rejected
- rationale: locked decisions require Maestro + Detox. Maestro is excellent for black-box user journeys, but it cannot be the only v1 mobile E2E layer because some React Native flows require synchronization, app internals, deterministic state control, or native-module/app-lifecycle handling.
- consequences: Maestro remains the default, but Detox remains required and supported.

### Detox-only mobile E2E

- decision: rejected
- rationale: Detox is too internals-heavy as the only default for generated acceptance/user-flow tests. The source direction explicitly names Maestro as simpler, readable, black-box, and agent-friendly for generated flows.
- consequences: Detox is required for targeted categories, not used to replace readable black-box Maestro flow coverage.

### Advisory/manual mobile QA only

- decision: rejected
- rationale: verification-layer doctrine requires evidence-backed deterministic gates for E2E behavior. Manual/advisory review may inform diagnosis but cannot substitute for required mobile E2E proof.
- consequences: manual notes may be evidence context only; they do not close required E2E items.

### Final-live-proof-only

- decision: rejected
- rationale: real-boundary doctrine forbids deferring the only live proof to the final step. I-17 must prove earliest mobile E2E seams where environment support exists, and I-23 reruns combined proof later.
- consequences: later implementation lanes must produce early real mobile runner/app/device/evidence witnesses or mark mobile proof `pending-live/BLOCKED`.

### Unclassified retries-as-green

- decision: rejected
- rationale: DL-10 and verification-layer flake policy require classification. A rerun success cannot hide a prior deterministic failure, timing issue, environment issue, test bug, or external/tooling drift.
- consequences: retries are diagnostic evidence; green closure requires classification, stable evidence, and no unresolved hard-blocking failure.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies output template, dependency declaration, evidence checklist, validation discipline, real-boundary policy, and dirty-tree rules.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies core/extension/sample-demo boundary and vocabulary policy for generated mobile E2E defaults.
    - id: DL-10-verification-implementation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies verification evidence semantics, failure taxonomy, rerun/resume, flake/quarantine policy, and hard/advisory representation used by DL-12 mobile E2E.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, backlog, strategy, playbook, and quality bar define mobile E2E requirements.
  blocks:
    - id: I-17-web-mobile-e2e-ui-verification
      reason: Needs Maestro/Detox runner split, generated-test selection metadata, local/device/CI requirements, artifacts, flake handling, and pending-live rules.
    - id: I-23-end-to-end-real-boundary-witness
      reason: Must rerun generated React Native mobile app with actual Maestro/Detox and evidence consumers where device support exists.
    - id: mobile portions of I-20/I-21/I-22/I-24 where applicable
      reason: CI/build/ship/docs consumers must preserve mobile E2E evidence, failures, and pending-live semantics.
  blocked_dependents:
    - id: I-17-web-mobile-e2e-ui-verification
      blocked_until: DL-11, DL-12, DL-13, I-15, and I-16 prerequisites are green per strategy, and this decision is independently validated.
      relying_on: mobile runner split, generated selection rules, device/local/CI proof, artifacts, and flake policy.
    - id: I-20-ci-local-parity-wiring
      blocked_until: I-09 runner exists and DL-18/I-20 can provide actual CI/local mobile-device strategy or mark unsupported live mobile proof pending.
      relying_on: CI mobile proof requirements and evidence upload/retention expectations.
    - id: I-23-end-to-end-real-boundary-witness
      blocked_until: I-17 is clean or explicitly pending-live/BLOCKED for unavailable mobile proof.
      relying_on: actual generated React Native app plus generated Maestro/Detox artifacts and evidence consumption.
  required_before_finalizing:
    - id: DL-11-test-runner-tooling
      required_content: General test runner/package/version conventions, generated-test quality policy, fixtures, matchers, coverage, and shared test tooling compatible with mobile E2E.
    - id: DL-13-ui-verification-stack
      required_content: Visual/accessibility/layout UI verification policy must consume mobile artifacts without redefining behavior E2E.
    - id: DL-16-starter-architecture
      required_content: Exact generated React Native app layout, sample/reference mobile surfaces, fixture boundaries, app build/install strategy, and starter paths.
    - id: DL-18-ci-cd-defaults
      required_content: Exact CI provider, workflow syntax, device matrix, caching, artifact upload, and retention implementation.
    - id: DL-15-mechanical-engine
      required_content: Generated mobile E2E anti-pattern checks, wiring-integrity checks, quarantine metadata checks, and missing-evidence blockers where mechanical.
    - id: DL-02-artifact-schemas / I-01-artifact-schemas-config
      required_content: Machine-readable schema fields for generated mobile E2E metadata and evidence references.
    - id: I-17-web-mobile-e2e-ui-verification
      required_content: Actual positive, negative, regression, and real-boundary mobile E2E proof.
  deferrals:
    - deferred_question: Exact file syntax for generated mobile E2E metadata.
      rationale: Schema syntax belongs to DL-02/I-01 and generated-test implementation lanes; DL-12 locks semantic fields and validation rules.
      future_owner: DL-02-artifact-schemas / I-17-web-mobile-e2e-ui-verification
      allowed_now: true
      blocked_dependents:
        - I-17 closure if machine-readable metadata cannot be encoded and validated
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact CI workflow/provider/device implementation.
      rationale: CI provider defaults and workflow files belong to DL-18/I-20.
      future_owner: DL-18-ci-cd-defaults / I-20-ci-local-parity-wiring
      allowed_now: true
      blocked_dependents:
        - mobile CI proof closure where no actual device/simulator execution is available
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact React Native app paths, screen inventory, fixture data, and app build command names.
      rationale: Starter architecture and generated/reference content belong to DL-16/I-15/I-16/I-17.
      future_owner: DL-16-starter-architecture / I-17-web-mobile-e2e-ui-verification
      allowed_now: true
      blocked_dependents:
        - generated mobile E2E implementation closure
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-12-mobile-e2e-details.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-12-mobile-e2e-details/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** sibling and prerequisite decisions
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** sibling and prerequisite reports
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-12 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - production package/source paths
    - root config files
    - CI/workflow files
    - package manager files
    - mobile app files
    - test files
    - generated starter files
    - evidence artifacts outside the DL-12 work directory
    - any decision/report/work path not owned by DL-12
    - /Users/lizavasilyeva/work/harness-starter/**
  handoff_notes:
    - from: DL-12
      to: I-17-web-mobile-e2e-ui-verification
      condition: After DL-12 independent validation is clean and strategy prerequisites are green.
      shared_path_policy: disjoint
    - from: DL-12
      to: DL-11/DL-13/DL-15/DL-16/DL-18/DL-02/DL-10
      condition: Peer owners preserve DL-12 mobile E2E requirements while deciding their owned syntax/tooling/implementation details.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-17-web-mobile-e2e-ui-verification`: primary blocked implementation lane. It must not close without generated React Native mobile E2E scenarios, actual Maestro and Detox proof where environment supports it, artifact capture, failure routing, and pending-live handling.
- `I-20-ci-local-parity-wiring`: blocked for mobile CI closure until it proves a CI/mobile device strategy or marks mobile live proof `pending-live/BLOCKED` with exact evidence.
- `I-21-build-skill-orchestration` and `I-22-ship-skill-orchestration`: blocked from representing mobile E2E as green unless they consume DL-10/DL-12 evidence and hard-block unresolved mobile E2E failures.
- `I-23-end-to-end-real-boundary-witness`: blocked until it can rerun actual generated app + Maestro/Detox + evidence-consumer seams, or explicitly preserve pending-live blockers.
- `DL-20B`, `DL-24B`, `I-24`, and final bug hunt must audit/preserve this decision before final closure.

## Mobile E2E scope and boundary

Mobile E2E behavior tests answer: does the generated React Native app behave correctly from a user/system perspective on iOS/Android runtime surfaces?

DL-12 explicitly excludes:

- Web E2E runner policy: Playwright remains web-only.
- UI visual/accessibility/layout verification policy: owned by DL-13, though it may reuse mobile screenshots/tree/log artifacts produced by Maestro/Detox runs.
- General unit/integration/component/backend runner choices: owned by DL-11.
- Exact starter app layout, screen inventory, commands, and fixtures: owned by DL-16 and implementation lanes.
- Exact CI workflow syntax and provider mechanics: owned by DL-18/I-20.

DL-12 includes:

- Maestro/Detox behavior E2E split.
- Generated mobile E2E selection metadata and conflict policy.
- Simulator/emulator/local-device expectations.
- CI device proof and pending-live rules.
- Mobile E2E artifacts and failure/flake handling.
- Local developer/agent ergonomics requirements.

## Maestro / Detox split

### Maestro default categories

Generated mobile E2E scenarios default to Maestro when all are true:

1. The scenario is primarily a black-box user journey or acceptance flow.
2. Setup can be performed through public app entry, installed app state, generated fixtures, or documented test data without reading/modifying React Native internals.
3. Assertions are user-observable: visible state, navigation result, form result, error state, offline message, app launch state, or generic flow completion.
4. The scenario does not require deterministic control over RN bridge synchronization, app internals, native modules, mock network layers, background lifecycle, push events, or permission reset beyond what the runner/device can reliably exercise as a user.

Default Maestro examples, stated generically: app launch smoke, navigation across generated screens, form-like data entry, generic validation/error state, simple offline/no-connectivity state when externally controllable, and cross-platform acceptance journeys.

### Detox-required categories

Generated mobile E2E scenarios require Detox when any are true:

1. React Native synchronization or bridge timing is load-bearing for correctness.
2. The test needs deterministic app state reset, seeded state, fixture injection, mocks/stubs, network interception, or internal app control unavailable through black-box user actions.
3. The flow touches native modules, platform-specific callbacks, background/foreground transitions, app relaunch persistence, deep-link routing with internal state assertions, push/message delivery simulation, permission-state setup/reset, keyboard/native dialog control, or lifecycle-sensitive work.
4. The scenario needs precise waiting on RN state, app internals, or native accessibility/tree attributes to avoid flake or false green.
5. A prior failure classification shows Maestro cannot distinguish product failure from timing/environment instability for that scenario.

### When both are required

A scenario requires `runner: both` when it has both:

- user-visible acceptance value best proven by a readable black-box flow; and
- Detox-required synchronization/app-control/lifecycle/native-module risk.

In `both` mode, the two runner cases must have different coverage intent:

- Maestro proves the end-user flow and evidence readability.
- Detox proves deterministic state/control/synchronization or internals-sensitive behavior.

They must not be duplicate shallow smoke checks.

### Conflict handling

- If any Detox-required trigger is present, generated metadata may not select Maestro-only.
- If a scenario is high-risk and user-visible, Detox-only is insufficient unless the plan explicitly proves Maestro is not applicable and preserves equivalent user-observable evidence.
- If selection metadata conflicts with scenario requirements, generation/validation fails before test files are accepted.
- If the available environment lacks the required runner/device, status is `blocked` or `pending-live/BLOCKED`, not runner substitution.
- If the planner cannot classify runner need from Work Brief/Implementation Plan evidence, it must mark runner selection blocked for clarification; it must not guess from filename, prose keywords, or a default alone.

## Generated test selection rules

Generated mobile E2E tests and their planning artifacts must carry structured metadata sufficient for `plan`, `build`, validators, CI wiring, and future evidence consumers. Exact schema syntax is owned by DL-02/I-01, but DL-12 requires these semantic fields:

- `scenario_id`: stable id linked to Work Brief, Implementation Plan, and Verification Delta item.
- `scenario_title`: short generic title.
- `runner`: `maestro`, `detox`, or `both`.
- `runner_selection_rationale`: one or more explicit DL-12 criteria.
- `coverage_intent`: `black_box_user_flow`, `synchronization_control`, `app_lifecycle_control`, `native_module_control`, `state_reset_or_fixture`, or another DL-12-compatible generic intent.
- `target_platforms`: `ios_simulator`, `android_emulator`, or both; local physical device may be an additional non-exclusive target where supported.
- `required_app_state`: fixture/setup refs or `none`, with owner and reset expectations.
- `device_assumptions`: OS/runtime family, orientation, locale/text-scale/theme requirements where applicable.
- `app_build_ref`: app binary/build artifact identity expected by the run.
- `artifact_expectations`: screenshots, videos, runner logs, app/device logs, reports, traces where applicable.
- `flake_policy_ref`: DL-10/DL-12 classification and rerun/quarantine policy reference.
- `owner_lane`: expected implementation/validation/fixer owner.
- `evidence_consumer`: verification runner/build/ship/CI consumer that must read the evidence.
- `live_proof_status`: `not_run`, `required_before_closure`, `proven_by <evidence ref>`, or `pending-live/BLOCKED`.

Selection algorithm for planners/builders:

1. Start with `runner: maestro` for mobile behavior E2E.
2. Scan the scenario requirements against the Detox-required categories.
3. If any Detox-required category applies, switch to `detox` unless a separate black-box acceptance proof is also required.
4. If both black-box acceptance and Detox-specific risk are required, select `both` and split coverage intent.
5. Validate that target platforms, app state, device assumptions, and artifact expectations are compatible with selected runner(s).
6. Reject missing metadata, contradictory metadata, hidden runner substitution, and required-runner absence.

## Device and local environment strategy

Later implementation must support local mobile E2E against actual generated React Native app builds on real simulator/emulator/device environments. DL-12 requires these local semantics without locking exact command names:

- iOS proof uses an actual iOS simulator profile where host support exists.
- Android proof uses an actual Android emulator profile where host support exists.
- A local physical device may be supported as an additional debugging/validation target, but it cannot be the only deterministic baseline unless device identity, OS/runtime, install path, and artifact capture are recorded reproducibly.
- Local runs must install or launch an actual app binary/build artifact associated with the generated starter/reference app.
- Local prerequisites must be discoverable before running: platform SDK availability, simulator/emulator/device availability, app build availability, runner availability, environment variables/secrets policy, and evidence output path.
- Local failures caused by missing prerequisites are `environment_issue` or `missing_runner_or_prerequisite` evidence, not silent skips.
- Generated app state must be reset deterministically for scenarios that require independence. If reset cannot be performed black-box, Detox or a blocked state is required.
- Local failure messages must tell agents/users which prerequisite, device, app build, runner, scenario id, or evidence path failed.

## CI device strategy

DL-12 locks CI proof requirements, not provider syntax.

- CI must prove mobile E2E on actual simulator/emulator/device infrastructure for any closure that claims CI mobile E2E green.
- CI may shard by platform/runner/scenario, but final status must join through DL-10 evidence semantics.
- CI must preserve the same runner-selection metadata and evidence fields used locally.
- CI must upload or retain screenshots, videos, logs, reports, app build identifiers, device profile, and failure classifications sufficient for independent validation.
- If CI lacks iOS simulator, Android emulator, licensing, hardware, or hosted-provider support, affected CI mobile proof is `pending-live/BLOCKED`; it must not be replaced by local-only proof, shape checks, mocked devices, or manual statements.
- DL-18/I-20 own exact provider, workflow, cache, matrix, path filters, artifact upload, and local/CI parity implementation.
- CI mobile E2E cannot be final green if required runner/device evidence is absent, runner results are unclassified, artifacts are missing, or deterministic failures are quarantined without safe alternate coverage.

## Artifact and evidence capture

Every mobile E2E run must capture evidence for passing, failing, blocked, and pending-live outcomes. Exact Evidence Packet schema syntax is owned by DL-02/DL-10, but DL-12 requires these semantics:

- Runner report with scenario id, runner, platform, status, duration, attempt, and failure classification.
- Screenshots for relevant states and failures.
- Videos where supported by the runner/device environment, especially failures and CI runs.
- Runner logs from Maestro and Detox.
- App logs and device/system logs sufficient to diagnose app crash, native module, permission, deep-link, lifecycle, timing, or environment failures.
- App binary/build identifier, generated starter/reference version, and install target identity.
- Device metadata: platform, simulator/emulator/device profile, OS/runtime version, orientation, locale, text scale/theme where relevant.
- Test reports in machine-readable form plus human-readable summaries.
- Traces where the selected runner or verification collector supports them.
- Rerun lineage: original failure, reused evidence, invalidated evidence, retry attempt, classification, and final disposition.

Normalized path/name expectation for future lanes:

```txt
<vibe evidence root>/<lane>/<run-id>/mobile-e2e/<platform>/<runner>/<scenario-id>/
  report.<schema-owned-extension>
  screenshots/
  videos/
  logs/runner.log
  logs/app-device.log
  traces/
  metadata.<schema-owned-extension>
```

Exact root and extension are owned by DL-02/DL-10/DL-18/I-17, but path components must be stable, non-secret, normalized, and linked from evidence packets.

## Flake handling and failure routing

- A mobile E2E failure is hard-blocking until classified.
- Required classifications follow DL-10 and verification-layer §12.5: deterministic product/code failure, test bug, environment issue, timing/flakiness, external/tooling drift, runner internal error, missing evidence, or missing prerequisite.
- Reruns are allowed only as diagnostic attempts with preserved original evidence and lineage.
- A rerun pass cannot erase an earlier deterministic failure, unclassified failure, or flaky suspicion.
- Quarantine is not green. Quarantine may be proposed only with scenario id, original evidence, classification, owner, expiry/review condition, impact, and alternate deterministic coverage or blocked-dependent mapping.
- Deterministic product failures must route to the owning implementation/fixer lane, not to test quarantine.
- Test bugs route to mobile E2E/test-quality owners and remain blocking until repaired or covered elsewhere.
- Environment issues route to local/CI/device ownership and remain blocked/pending-live until environment proof exists.
- Timing/flaky suspicion triggers flaky-test investigator recommendation hooks and runner-owner analysis; it does not pass silently.
- Repeated flaky suspicion must improve runner isolation, app state reset, waits/synchronization, device stability, or test design; it must not simply increase retries until green.

## Local developer and agent ergonomics

Later DL-11/DL-17/DL-18/I-17/I-20 owners must expose ergonomic surfaces that satisfy these DL-12 requirements:

- Discover available mobile E2E scenarios, runner selection, target platforms, prerequisites, and evidence paths.
- Run all required mobile E2E, one runner, one platform, or one scenario id without editing generated files.
- Explain skipped/blocked/pending-live mobile proof with typed reason and next action.
- Check local prerequisites before running and fail with actionable messages.
- Show which app binary/build artifact is being installed or tested.
- Route failures to product/code fixer, test fixer, environment owner, flaky investigator, or external/tooling drift owner.
- Link results to Work Brief, Implementation Plan, Verification Delta, Build Result, and Ship Packet evidence.
- Keep command/result surfaces machine-readable for agents and readable enough for local developers.

Exact command names, flags, and help text are owned by DL-07/DL-11/I-09/I-17. DL-12 requires the ergonomic capabilities and failure semantics.

## Verification/witness consequences

- deterministic checks affected: mobile E2E runner metadata validation, runner selection validation, app build/install validation, device prerequisite validation, Maestro/Detox result ingestion, artifact completeness, flake classification, quarantine metadata, and CI/local mobile evidence parity.
- positive witnesses required downstream:
  - at least one generated mobile behavior flow runs through actual Maestro against an actual generated React Native app on a real simulator/emulator/device environment;
  - at least one synchronization/internals/app-control-heavy flow runs through actual Detox against the actual generated React Native app;
  - generated metadata selects runner(s) according to DL-12 criteria and is consumed by actual verification/evidence path;
  - screenshots, videos/logs where supported, runner logs, app/device logs, reports, build ids, and device metadata are captured and linked.
- negative witnesses required downstream:
  - a deliberately broken mobile behavior flow fails hard and records evidence;
  - missing runner metadata, missing app build, missing device, missing screenshot/log/report, or missing runner prerequisite blocks rather than passes;
  - Maestro-only policy for Detox-required scenario is rejected;
  - Detox-only policy for black-box user-flow coverage is rejected unless explicitly justified with equivalent user-observable evidence;
  - unclassified rerun success, silent quarantine, mocked-device proof, and manual/advisory-only proof are rejected.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - fixed starter stack remains NestJS API, React web, React Native mobile, strict TypeScript, pnpm, Turborepo, PostgreSQL, Prisma, shared contracts/client;
  - web E2E remains Playwright; mobile E2E remains Maestro + Detox;
  - UI verification remains separate and owned by DL-13/I-17;
  - six skills, artifact flow, plan-owned Verification Delta, automatic build/ship verification/context/evidence, deterministic hard-block policy, and mechanical gate families remain intact.
- real_boundary_required: yes for later implementation; no live runtime seam is created by this decision artifact.
- real_boundary_status: not_applicable for this decision artifact; required_before_closure for I-17 where environment support exists; `pending-live/BLOCKED` for unavailable mobile device/CI proof.
- earliest required proof lane: `I-17-web-mobile-e2e-ui-verification` after strategy prerequisites.
- full rerun lane: `I-23-end-to-end-real-boundary-witness`.

Later seam:

| Producer | Carrier | Consumer | Closure rule |
| --- | --- | --- | --- |
| actual generated React Native starter/reference mobile app plus generated Maestro/Detox test artifacts | installed app binary/build artifact, simulator/emulator/device state, generated test files/config, runner invocation, and evidence artifacts on disk | actual Maestro runner, actual Detox runner, verification runner/evidence collector, build/ship/CI failure routing | positive/negative/regression proof required; if live device/CI support is unavailable, affected closure remains `pending-live/BLOCKED`. |

## Ownership/path consequences

- This DL-12 lane writes only this decision artifact and its work directory.
- No production/package/root/config/CI/package-manager/mobile app/test/generated starter/evidence path outside the DL-12 work directory is authorized.
- Future implementation ownership:
  - `I-17`: generated/reference web/mobile E2E/UI fixtures and actual mobile E2E proof under its owned paths.
  - `I-20`: CI/local parity and workflow artifacts after handoff.
  - `I-21`/`I-22`: build/ship consumption of evidence and blocking results.
  - `DL-11`: broader test runner tooling and generated-test quality policy.
  - `DL-13`: UI verification evidence/baseline/deterministic-advisory policy.
  - `DL-16`: starter mobile app layout, state fixtures, and exact surfaces.
- Baseline screenshots/videos/logs from future runs must live under future implementation/evidence-owned paths, not DL-12 paths.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected: this decision artifact, future generated mobile E2E metadata, test templates, mobile fixtures, docs/examples, prompts/agents, evidence, and starter sample/reference paths.
- surface classification:
  - DL-12 policy and future core generated-test selection logic are core harness surfaces;
  - starter/reference flows are sample/demo/reference surfaces and must be labeled;
  - consuming-project mobile flows are project extension inputs and must not become core defaults.
- allowed generic vocabulary: mobile app, React Native, iOS, Android, simulator, emulator, device, runner, Maestro, Detox, scenario, flow, fixture, app state, contract, evidence, artifact, screenshot, video, log, trace, report, verification, build, ship, CI.
- project/business vocabulary: no business-domain flow is a core default. Terms such as ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout, cart, order, social feed, or equivalent project-specific flows are allowed only as explicit negative examples or labeled sample/demo/reference content under DL-20A.
- extension boundary: consuming projects may add domain-specific mobile E2E scenarios through project-owned Work Brief/Implementation Plan/Verification Delta content; those scenarios do not become harness defaults.
- deterministic/advisory owner mapping: DL-15/I-10-I-13, I-17, I-20, DL-20B, I-24, and final bug hunt must enforce/audit generated mobile E2E neutrality where applicable.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- shell/process/mobile-runner/package-manager commands used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none. The historical `DL-12-X` bg `bcd5f6783` conflict was adjudicated as a false-positive self-conflict; current inventory before writing showed no existing `DL-12-mobile-e2e-details.md`, and the owned work directory contained only the preserved execution report.
- production/package/root/config/CI/mobile/test/generated starter files edited: no.

## Evidence checklist

1. Existing execution report was updated first with an adjudication-authorized `EXTEND accepted` checkpoint before this decision artifact was written.
2. Prior blocked-report content was preserved as historical/process evidence, including the narrow pre-report inventory caveat.
3. Required source files and foundation decisions were inspected and are cited by path/section heading.
4. Files changed by this continuation are limited to this decision artifact and the DL-12 execution report.
5. No production/package/root/config/CI/mobile/test/generated starter/git paths were touched.
6. This artifact produces exactly one output class: `locked_decision_document`.
7. Backlog §12 is resolved: Maestro/Detox split, generated selection metadata, simulator/emulator/local strategy, CI device proof and pending-live rules, artifacts, flake handling, local ergonomics, I-17 mapping, real-boundary implications, and domain neutrality are covered.
8. Maestro + Detox locked direction is preserved; neither runner is downgraded to optional/advisory-only.
9. UI verification and web Playwright E2E ownership are separated.
10. Dependencies, blocked dependents, deferrals, required-before-finalizing, ownership, and handoffs use DL-24A-compatible structure.
11. Positive, negative, regression, and real-boundary witness consequences are explicit.
12. DL-20A domain-neutrality checklist is applied.
13. DL-10 flake/failure/evidence semantics are preserved.
14. No live mobile proof is claimed by this decision artifact itself.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and available diff/content, not just this artifact or report.

### Positive witnesses

- The decision artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-12-mobile-e2e-details.md` and uses the DL-24A-compatible template.
- It covers default Maestro flows, required Detox flows, runner-selection metadata, conflict handling, local/device strategy, CI pending-live rules, artifacts, flake handling, local ergonomics, blocked dependents, and real-boundary consequences.
- It preserves locked React Native mobile E2E as Maestro + Detox.
- It separates mobile behavior E2E from web Playwright and DL-13 UI verification.
- It maps I-17/I-20/I-21/I-22/I-23 dependencies without implementing their files.
- It applies DL-20A domain-neutrality and avoids business-domain core default flows.

### Negative witnesses

- Reject a Maestro-only policy.
- Reject a Detox-only policy.
- Reject a vague `run mobile E2E` policy without metadata, device strategy, artifacts, and flake handling.
- Reject manual/advisory QA as a hard-gate substitute.
- Reject rerun success that hides deterministic failure or unclassified flaky suspicion.
- Reject shape-only/mocked-device/synthetic proof as mobile live closure.
- Reject core default examples using project-specific business flows unless explicitly negative-example/sample/demo/reference-labeled.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Fixed starter stack remains NestJS API, React web, React Native mobile, strict TypeScript, pnpm, Turborepo, PostgreSQL, Prisma, shared contracts/client.
- Web E2E remains Playwright; mobile E2E remains Maestro + Detox.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains Work Brief → Implementation Plan → Build Result → Ship Packet.
- `plan` owns Verification Delta; `build` and `ship` run verification/context/evidence automatically.
- Deterministic checks hard-block; advisory review cannot solely pass or block unless promoted as specified.
- DL-10/DL-11/DL-13/DL-16/DL-18 ownership remains intact.

### Sibling/blast-radius checks

- Check final strategy §§5–11 and §§14–18.
- Check source docs: README §§3/9/12/15/16, locked decisions §§3/9/10, verification layer §§1/3/4/5.7/5.8/9/12.5/13/14/16, backlog §§11–13/18/24, mechanical gates §§1/7/9/11.
- Check DL-24A template/evidence/real-boundary/dirty-tree rules and DL-20A domain-neutrality checklist.
- Inspect relevant sibling decisions/reports present by validation time, especially DL-10, DL-11, DL-13, DL-16, DL-18, DL-15, DL-02, without treating unvalidated/in-progress artifacts as green.
- Confirm only DL-12 owned paths changed.
- Confirm no package/source/root/config/CI/mobile/test/generated starter/evidence/git paths were touched.

### Severity policy

- `critical`: locked Maestro+Detox contradiction; missing DL-24A/DL-20A prerequisite; missing decision artifact; unsafe out-of-license write; production/mobile/CI/test implementation by this decision lane; missing Maestro/Detox split; missing selection metadata; missing CI/device/artifact/flake policy; false real-boundary closure; advisory/manual QA accepted as sufficient hard proof; domain-neutrality violation; missing I-17 blocker mapping.
- `major-local`: incomplete runner-selection criteria, unclear future owner/dependency, incomplete evidence checklist, incomplete source citations, weak validation plan, or ambiguous local/CI/pending-live wording that blocks direct dependents but is repairable within DL-12 paths.
- `minor-local`: wording/format/citation clarity issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all schema, source, ownership, mobile E2E, domain-neutrality, dependency, and witness requirements are satisfied.

## Known ambiguities / future owners

- `DL-02` owns exact metadata and Evidence Packet schema syntax/versioning.
- `DL-10` owns verification runner/evidence/failure taxonomy semantics; DL-12 consumes those semantics for mobile E2E.
- `DL-11` owns general test runner tooling, shared generated-test conventions, fixtures/factories, matchers, coverage, mutation/property policy, and package/version choices outside DL-12 mobile split policy.
- `DL-13` owns UI verification visual/accessibility/layout/baseline policy. DL-12 mobile E2E artifacts may feed DL-13 but do not replace it.
- `DL-15` owns mechanical anti-pattern, wiring-integrity, quarantine metadata, and missing-evidence checks.
- `DL-16` owns exact starter architecture, generated React Native app layout, screen inventory, sample/reference fixtures, and app build/install details.
- `DL-18`/`I-20` own exact CI provider, workflow syntax, device matrix, caching, artifact upload, and local/CI parity implementation.
- `I-17` owns actual generated Maestro/Detox test artifacts and earliest mobile real-boundary proof.
- `I-23` owns full end-to-end rerun across actual producers/carriers/consumers.

## Open ambiguities / deferred items

No unresolved DL-12 product decision is hidden. Concrete syntax/path/provider details are intentionally assigned to future owners above. Any dependent requiring those concrete details remains blocked until the owner supplies them and proves the applicable real boundary, or records `pending-live/BLOCKED` where live mobile device/CI proof is unavailable.
