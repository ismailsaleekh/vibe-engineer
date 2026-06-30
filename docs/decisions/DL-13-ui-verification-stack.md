# DL-13 — UI Verification Stack

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-13 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-13-ui-verification-stack.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-13-ui-verification-stack/reports/decision-lock-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §5.2 `Decision-lock table`; §6.1 `Decision DAG`; §6.3 `Safe parallel waves`; §7 `Explicit ready queue rules`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–19 evidence, dirty-tree, severity, closure, and ready-queue policy.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §9 `Severity gate and closure criteria check`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §3 `Non-negotiable design rules`; §9 `Verification model`; §15 `Success criteria`; §16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §9 `E2E stack`; §10 `Verification-layer decisions`; §11 `Mechanical verification gates`.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §1.4 `Evidence over assertion`; §1.5 `Deterministic gates block; subjective review advises`; §5.8 `UI verification tests`; §10 `UI verification orchestration`; §14 `Blocking policy summary`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §1 `Core verification doctrine`; §6 `Quality ratchet`; §7 `Quality wiring-integrity gate`; §9 `Test anti-pattern scanner`; §11 `How this fits the verification layer`.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §13 `UI verification stack`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2 and 10 for Triad-B validation, evidence-bound verification, dirty-tree safety, and real-boundary discipline.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- Read-only sibling decisions present at execution time: `DL-01` through `DL-08` under `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/`, especially `DL-02` `Evidence Packet`, `DL-03` skill handoffs, `DL-05` UI specialist registry policy, `DL-06` real-boundary adapter discipline, `DL-07` CLI result envelope, and `DL-08` UI verification shell deferral.

## Decision summary

UI verification is a separate verification layer from E2E behavior testing. Web E2E remains Playwright; mobile E2E remains Maestro + Detox. DL-13 locks the UI verification stack policy that `I-17-web-mobile-e2e-ui-verification` must implement: deterministic screenshot capture, state metadata, accessibility reports, layout/geometry checks, visual-diff baselines, viewport/device/state matrices, structured evidence packets, and generic specialist UI verifier agents.

Deterministic UI findings hard-block. Subjective screenshot critique, LLM visual review, and unstructured specialist opinion are advisory by default and may not be the sole hard-blocking gate. Baselines are controlled artifacts with explicit approval/update evidence; missing screenshots, reports, baselines, viewport rows, accessibility reports, or state metadata fail loudly rather than passing.

## Decision details

### Accepted stack policy

1. Web UI verification uses Playwright as the real browser capture/state carrier because Playwright is already locked for web E2E, can serve/capture the actual web app state, can emit screenshots/traces, and can collect DOM, CSSOM, accessibility-tree, viewport, and interaction-state metadata. UI verification specs/runs are separate from E2E behavior specs even when they share the served app and browser runtime.
2. Mobile UI verification consumes the locked mobile E2E path: Maestro for black-box flow/state capture and Detox for synchronized React Native state and deeper tree/attribute capture where required. Mobile UI verification is separate from mobile E2E behavior assertions even when it uses the same simulator/device session.
3. Visual regression uses deterministic image comparison over normalized PNG screenshots. The v1 comparator must be a stable pixel-diff implementation such as `pixelmatch` or an equivalent exact algorithm selected by the implementation lane; it must record tool/version/thresholds and emit diff images plus numeric metrics. No implementation may substitute an LLM screenshot opinion for visual-diff evidence.
4. Web accessibility checking uses deterministic automated accessibility checks through `axe-core` executed in the real browser context, plus Playwright accessibility/tree/focus metadata where applicable.
5. Mobile accessibility checking uses deterministic React Native/platform tree metadata available through Detox, Maestro artifacts, or app-exposed test/debug accessibility snapshots. When a required mobile accessibility rule cannot be observed through a real tree/provider, that mobile proof remains `pending-live/BLOCKED`; screenshots alone do not close mobile accessibility.
6. Deterministic layout, overlap, clipping, responsive, z-index, focus, contrast, and interaction-state checks use structured DOM/tree/geometry/color metadata where available. Screenshot-only computer-vision or LLM observations may advise, but they do not hard-block unless backed by a deterministic rule and reproducible artifact.
7. Exact artifact schema fields remain owned by `DL-02`; DL-13 locks required semantic evidence and blocker behavior only.
8. Exact test runner choices outside UI verification remain owned by `DL-11`; exact Maestro/Detox split and device/CI details remain owned by `DL-12`; exact verification runner/evidence/failure taxonomy integration remains owned by `DL-10`; exact mechanical-engine integration remains owned by `DL-15`; exact starter UI surfaces and app layout remain owned by `DL-16`; exact observability defaults remain owned by `DL-23`.

### UI verification run model

Each UI verification run is a matrix over:

- target app/surface: web or mobile;
- UI state id: a stable generic state such as `default`, `loading`, `empty`, `error`, `long-content`, `focused`, `hovered`, `pressed`, `disabled`, `overlay-open`, or `responsive-breakpoint` when applicable;
- viewport/device profile;
- data fixture/profile;
- theme/color scheme and font/text scale when applicable;
- locale/direction when applicable;
- deterministic check set: visual diff, accessibility, layout/geometry, interaction state, and specialist verifiers.

A run is green only when every required matrix row has all required artifacts, deterministic checks pass, advisory findings are recorded with disposition, and evidence is linked to the Build Result or validation report according to `DL-02`/`DL-10` semantics.

## Alternatives considered

### Subjective-only screenshot or LLM review

- decision: rejected
- rationale: source verification policy says evidence beats assertion and subjective review advises. Unstructured screenshot opinion cannot provide stable pass/fail semantics, negative witnesses, reproducible artifacts, or baseline governance.
- consequences: LLM/specialist visual review remains useful for issue discovery and gap detection but does not solely hard-block.

### E2E-only UI coverage

- decision: rejected
- rationale: verification-layer §5.8 explicitly separates behavior E2E from UI verification: E2E proves behavior; UI verification proves visual correctness/usability.
- consequences: `I-17` must implement both E2E behavior tests and UI verification evidence; passing Playwright/Maestro/Detox flows is insufficient by itself.

### Ungoverned baseline update / accept-current-screenshot behavior

- decision: rejected
- rationale: silent baseline updates make regressions disappear and violate evidence-bound verification and ratchet discipline.
- consequences: baseline creation/update requires an explicit artifact, reviewer/operator approval, before/after evidence, and independent validation; CI and normal verification must never auto-accept current screenshots.

### Tool-specific lock-in without an interface

- decision: rejected
- rationale: the strategy requires `DL-13` to define deterministic/advisory boundaries and evidence semantics, while sibling decisions own general runner/tooling details. Locking every implementation package here would overreach.
- consequences: DL-13 locks Playwright/axe-core/pixel-diff style choices and hard evidence interfaces; implementation may select exact package versions under `DL-11`/`I-17` so long as semantics and witnesses remain intact.

### Screenshot visual diff only

- decision: rejected
- rationale: screenshots catch many regressions but cannot reliably explain DOM/tree accessibility, focus, overlap cause, z-index semantics, or clipping. Shape-only pixel differences also create false positives without state metadata.
- consequences: screenshots must be paired with DOM/tree, accessibility, geometry, viewport/device, normalization, and state reports where available.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision template, dependency declaration format, evidence checklist, validator checklist, real-boundary policy, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core/extension/sample-demo vocabulary policy and decision checklist.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: Strategy, README, locked decisions, verification layer, mechanical gates, backlog, playbook, and quality bar define UI verification requirements.
    - id: sibling-decisions-present-read-only
      type: decision
      required_status: LOCKED or read-only-if-present
      rationale: Existing DL-01..DL-08 decisions were inspected for consistency; absent related decisions are not prerequisites for DL-13 decision closure.
  blocks:
    - id: I-17-web-mobile-e2e-ui-verification
      reason: I-17 must implement UI verification stack, evidence packets, baselines, deterministic/advisory boundary, and web/mobile real-boundary witnesses.
    - id: I-23-end-to-end-real-boundary-witness
      reason: Full rerun must prove UI verification with actual producers/carriers/consumers and intentional deterministic UI defects.
    - id: UI portions of I-20/I-21/I-22/I-24 where applicable
      reason: CI/build/ship/docs behavior that represents UI verification evidence must preserve DL-13 hard/advisory and evidence policies.
  blocked_dependents:
    - id: I-17-web-mobile-e2e-ui-verification
      blocked_until: DL-13 is independently validated clean and other strategy prerequisites for I-17 are green.
      relying_on: visual regression strategy, capture matrix, accessibility/layout policies, baseline governance, failure representation, and real-boundary witness contract.
    - id: I-23-end-to-end-real-boundary-witness
      blocked_until: I-17 UI verification implementation is clean or explicitly pending-live/BLOCKED for unavailable mobile device proof.
      relying_on: actual UI verification evidence and deterministic defect-blocking behavior.
    - id: UI verification docs/evidence consumers
      blocked_until: their owning lanes can consume DL-13 semantic evidence and any DL-02/DL-10 schemas without inventing policy.
      relying_on: evidence packet semantics, hard/advisory distinction, and baseline governance.
  required_before_finalizing:
    - id: DL-10-verification-implementation
      required_content: UI verification result/failure taxonomy, deterministic/advisory representation, rerun behavior, and evidence packet integration compatible with DL-13.
    - id: DL-11-test-runner-tooling
      required_content: Exact runner/package/version choices for component/test integration must not weaken DL-13 UI requirements.
    - id: DL-12-mobile-e2e-details
      required_content: Maestro/Detox split, simulator/device artifact capture, flake handling, and mobile metadata availability used by UI verification.
    - id: DL-15-mechanical-engine
      required_content: Any mechanical wiring/ratchet checks for UI baselines, missing artifacts, stale baselines, or generated test anti-patterns.
    - id: DL-16-starter-architecture
      required_content: Exact starter web/mobile surfaces, state fixtures, app serving path, and generated UI layout targets.
    - id: DL-23-observability-defaults
      required_content: Any UI verification observability/log correlation requirements when UI failures are represented in evidence.
    - id: I-17-web-mobile-e2e-ui-verification
      required_content: Actual web and mobile UI verification implementation with positive, negative, regression, and real-boundary witnesses.
  deferrals:
    - deferred_question: Exact implementation package versions and code-level schema fields for UI evidence packets.
      rationale: Package versions and schemas belong to DL-10/DL-11/DL-02 and I-17; DL-13 locks semantic requirements and hard/advisory policy.
      future_owner: DL-02/DL-10/DL-11/I-17
      allowed_now: true
      blocked_dependents:
        - I-17-web-mobile-e2e-ui-verification closure if exact schemas/tooling are unavailable
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact mobile device/simulator CI matrix and Maestro-vs-Detox split.
      rationale: Owned by DL-12; DL-13 defines UI evidence required from whichever mobile path is selected.
      future_owner: DL-12-mobile-e2e-details / I-17-web-mobile-e2e-ui-verification
      allowed_now: true
      blocked_dependents:
        - mobile UI verification closure where device metadata or screenshots are unavailable
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact starter screen/component inventory and generated fixture data.
      rationale: Owned by DL-16 and implementation lanes; DL-13 defines generic state categories and evidence rules.
      future_owner: DL-16-starter-architecture / I-17-web-mobile-e2e-ui-verification
      allowed_now: true
      blocked_dependents:
        - starter UI verification matrix finalization
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-13-ui-verification-stack.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-13-ui-verification-stack/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-*.md except DL-13
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** except DL-13 owned work directory
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-13 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - production package/source paths
    - root config files
    - CI/workflow files
    - generated starter fixtures
    - screenshot/baseline/test artifacts outside DL-13 work notes
    - all non-DL-13 decision artifacts and reports
    - /Users/lizavasilyeva/work/harness-starter/**
  handoff_notes:
    - from: DL-13
      to: I-17-web-mobile-e2e-ui-verification
      condition: After DL-13 independent validation is clean and I-17 prerequisites are green.
      shared_path_policy: disjoint
    - from: DL-13
      to: DL-10/DL-11/DL-12/DL-15/DL-16/DL-23
      condition: Future decisions/lanes must preserve DL-13 UI evidence and hard/advisory requirements while deciding their owned details.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-17-web-mobile-e2e-ui-verification` is the primary blocked implementation lane. It may not close without implementing the UI verification stack, baseline governance, deterministic/advisory classification, missing-artifact failures, and actual web/mobile proof requirements in this decision.
- `I-23-end-to-end-real-boundary-witness` must rerun UI verification over actual generated/reference web and mobile surfaces and prove intentional deterministic UI defects hard-block.
- UI evidence consumers in `I-20`, `I-21`, `I-22`, and `I-24` are blocked from representing UI verification as green if they do not preserve DL-13 evidence, baseline, and hard/advisory policies.
- `DL-10`, `DL-11`, `DL-12`, `DL-15`, `DL-16`, and `DL-23` were absent as decision artifacts at execution time. DL-13 does not decide their owned details; dependents that need those details remain blocked until those owners provide them.

## UI verification stack requirements

### Visual regression approach

- Web visual regression uses real Playwright browser screenshots from the served web app state.
- Mobile visual regression uses real screenshots/videos/logs from the locked Maestro + Detox mobile path.
- The comparator must produce deterministic pass/fail results, diff artifacts, and numeric metrics. A `pixelmatch`-class PNG diff is the v1 baseline; an equivalent replacement is acceptable only if it preserves deterministic metrics, artifact output, threshold recording, and positive/negative/regression witnesses.
- Default policy is zero unexpected unapproved visual diff after normalization. Any tolerance for antialiasing, subpixel rendering, or platform font differences must be explicit in the UI verification config/evidence and cannot mask missing elements, clipped content, overlap, contrast failure, or layout breakage.

### Screenshot/state capture

Every required UI state capture must emit:

- screenshot path, content hash, dimensions, viewport/device metadata, and capture timestamp normalized or recorded;
- app target and state id;
- fixture/data profile id;
- browser/device/OS/runtime version;
- theme/color-scheme, locale/direction, and text/font scale when applicable;
- interaction state applied before capture;
- stabilization notes: animations disabled or waited, network/data fixture locked, volatile content masked, time/randomness fixed where possible;
- trace/video/log paths where available.

Missing screenshot or state metadata is a deterministic failure.

### DOM/tree/metadata capture for web

Web UI verification must collect, for each state/viewport:

- DOM snapshot or structured element tree for declared relevant regions;
- CSS computed style and DOMRect geometry for target elements;
- accessibility tree and/or axe-core report;
- focus order and visible focus indicator evidence for interactive states;
- overflow, scroll, clipping, and elementFromPoint/z-index sampling results for relevant elements;
- console/page error summary where available.

A web screenshot without DOM/accessibility/geometry metadata is incomplete for deterministic layout/a11y closure.

### Mobile capture/report strategy

Mobile UI verification must collect, for each state/device:

- Maestro screenshot/video/log artifacts for black-box state capture;
- Detox synchronized screenshot/state artifacts where deterministic state setup or React Native tree metadata is required;
- platform/device profile metadata: OS, simulator/emulator/device family, pixel density, orientation, font/text scale, theme, locale, and runtime versions;
- React Native/platform accessibility/tree metadata where available;
- layout frame/bounding-box metadata where available.

If the environment cannot provide real mobile screenshots or required tree/accessibility metadata, the mobile portion of `I-17` remains `pending-live/BLOCKED`. Shape-only screenshots, hand-authored trees, or synthetic reports do not close the seam.

### Viewport/device/state matrix

The v1 default matrix for starter UI surfaces must include at least:

- Web viewport profiles:
  - compact phone-like viewport: `390x844` or implementation-equivalent small mobile profile;
  - small fallback viewport: `360x640` when responsive minimum width matters;
  - tablet portrait: `768x1024`;
  - desktop: `1280x720`;
  - wide desktop: `1440x900` when horizontal layout is relevant.
- Mobile device profiles:
  - one iOS phone simulator profile;
  - one Android phone emulator profile;
  - tablet profile only when the starter surface claims tablet support or a task touches tablet-responsive behavior.
- State profiles for every relevant screen/component/flow:
  - default/success;
  - loading;
  - empty;
  - error;
  - long content / overflow stress;
  - relevant interaction states: hover, focus, pressed, selected, disabled, overlay/open, keyboard-visible where applicable.
- Additional task-specific states required by a Work Brief/Implementation Plan Verification Delta.

A required matrix row missing a screenshot, report, or deterministic result is a hard failure.

### Accessibility checks

Hard-blocking deterministic accessibility checks include:

- web axe-core violations at configured severity levels required by the verification runner;
- insufficient text/icon contrast where foreground/background can be deterministically measured or declared through tokens/metadata;
- missing accessible names/roles for interactive controls where the accessibility tree exposes them;
- broken keyboard focus order or absent visible focus indicator for keyboard-reachable web controls;
- disabled/pressed/selected state not represented in deterministic attributes when applicable;
- mobile missing label/role/state/touch-target metadata where React Native/platform tree evidence is available.

Mobile accessibility gaps caused by unavailable real tree/provider support must be recorded as `pending-live/BLOCKED` for the dependent proof, not silently treated as green.

### Overlap, clipping, layout, responsive, typography, color, focus, and interaction checks

Hard-blocking deterministic UI checks include:

- visible element overlap where geometry and stacking metadata show unintended intersection of declared non-overlapping elements;
- content clipping or truncation where scroll/overflow/text metrics prove visible content is cut off without an allowed truncation rule;
- essential element offscreen/outside viewport without a valid scroll affordance;
- responsive breakpoint failure where required elements disappear, reorder incompatibly, or exceed viewport bounds;
- z-index/layering failure where elementFromPoint or equivalent tree hit-testing proves an essential element is covered;
- contrast below configured accessibility threshold with deterministic color inputs;
- missing or broken focus/hover/pressed/disabled state when deterministic interaction metadata is available;
- typography regressions when computed font family/size/weight/line-height/token metadata differs from baseline or declared design tokens beyond approved tolerance.

Screenshot-only or LLM-only observations of spacing, visual taste, aesthetics, or brand fit are advisory unless a deterministic rule, baseline diff, accessibility violation, geometry result, or task-specific acceptance criterion backs them.

### Baseline storage, approval, update, normalization, and stale-baseline policy

- Baselines are required for visual regression rows unless the row is explicitly in a first-baseline proposal state.
- Baselines must be stored under implementation-lane-owned fixture/baseline paths, never under DL-13 paths, and must be linked by evidence packets.
- Every baseline identity includes: app target, state id, viewport/device profile, theme, locale/direction, text scale, data fixture, screenshot dimensions, comparator version, normalization rules, and approved source artifact/commit or generated fixture version.
- Initial baseline creation requires an explicit baseline proposal artifact, screenshot evidence, reviewer/operator approval, and independent validation. It is not an automatic pass.
- Baseline updates require before/after screenshots, diff images, numeric metrics, rationale, linked Implementation Plan/Build Result or decision, reviewer/operator approval, and independent validation.
- CI and normal verification must not auto-update, auto-accept, or silently regenerate baselines.
- Missing baseline, stale baseline identity, invalid baseline schema, changed normalization without approval, or baseline growth without approval is a hard failure.
- Normalization may mask or stabilize only declared volatile data such as timestamps, random ids, cursors, animation frames, network latency indicators, or OS-rendering noise. Normalization must be recorded and must not hide semantic UI changes, missing elements, clipping, overlap, accessibility, or layout failures.

### Evidence packet/report fields

Exact schemas are owned by `DL-02`/`DL-10`, but UI verification evidence must semantically include:

- `ui_run_id`, source plan/build/ship/validation artifact refs, and verification layer `ui_verification`;
- app target, route/screen/component/state id, and state setup artifact refs;
- viewport/device profile and environment versions;
- screenshot, baseline, diff, trace/video/log, DOM/tree, accessibility, geometry, and specialist report artifact refs with content hashes;
- comparator/checker names and versions;
- thresholds, normalization rules, masks, and stabilization settings;
- deterministic rule results with pass/fail/blocking classification;
- advisory findings with non-blocking classification unless promoted under this decision;
- missing artifact/report/baseline rows as explicit deterministic failures;
- failure details: issue class, rule id, state id, viewport/device id, evidence path, actual/expected values, reproducibility notes, and suggested owner/fixer class.

### Specialist UI agent inputs/outputs

Specialist UI verification agents are generic issue-class specialists, not business-domain reviewers. They consume structured evidence packets, not raw screenshots alone.

Required input classes:

- screenshots and visual diffs;
- DOM/tree and geometry metadata;
- accessibility reports;
- viewport/device/state matrix reports;
- interaction-state reports;
- baseline metadata and update proposals;
- trace/video/log artifacts where relevant;
- normalization and threshold settings.

Required output classes:

- structured finding list with `deterministic | advisory` classification;
- issue class such as overlap, clipping, alignment, responsive layout, typography, color/contrast, z-index/overlay, truncation, accessibility, interaction state, loading/empty/error state, mobile viewport, visual regression, or motion/animation;
- evidence references and exact state/viewport/device ids;
- severity and blocking flag;
- fixer recommendation or owner route;
- explanation of whether a finding is backed by deterministic evidence or remains advisory.

A specialist UI agent cannot be its own only validator and cannot create a hard-block solely from unstructured visual opinion.

## Deterministic vs advisory boundary

### Hard-blocking deterministic findings

A UI finding hard-blocks when it is produced by a deterministic checker or deterministic artifact condition, including:

- required screenshot/report/baseline/viewport/device/state/a11y/tree/geometry artifact missing or invalid;
- visual diff exceeds approved thresholds for a required baseline row;
- axe-core or equivalent deterministic accessibility violation at blocking severity;
- deterministic contrast/touch-target/focus/role/name/state failure;
- DOM/tree/geometry proof of unintended overlap, clipping, offscreen essential content, broken responsive layout, or z-index coverage;
- stale/invalid/unapproved baseline or silent baseline update attempt;
- UI evidence packet cannot distinguish deterministic failure from advisory review;
- UI verifier runner exits with deterministic failure or typed blocked status.

### Advisory findings

Advisory by default:

- LLM visual review;
- subjective aesthetic critique;
- screenshot-only qualitative spacing/alignment comments without a deterministic rule or baseline metric;
- specialist review that lacks structured deterministic evidence;
- low-confidence computer-vision findings not backed by exact geometry/baseline/a11y evidence.

Advisory findings must still be recorded, triaged, and either fixed, accepted with rationale, converted into deterministic rules, or routed to a UI-verifier-gap/meta-agent recommendation when recurring.

### Promoting advisory findings to blocking

An advisory finding may block a task only when at least one is true:

1. it is converted into a deterministic rule/check with reproducible evidence and rerun proof;
2. the approved Implementation Plan or task-specific acceptance criteria explicitly marks that visual review criterion as blocking, names the reviewer/agent class, and records structured screenshot/evidence refs;
3. a human/operator approval gate explicitly rejects the UI state, with evidence paths and scope.

Even then, unstructured opinion alone must not become an automated deterministic gate or CI hard-block. The finding must be represented in the evidence artifact with criterion, scope, reviewer/source, artifacts, and disposition.

## Verification/witness consequences

- deterministic checks affected: visual diff, screenshot/state artifact completeness, baseline validity, accessibility checks, geometry/layout checks, focus/interaction checks, viewport/device matrix completeness, stale-baseline/ratchet checks, and UI evidence packet validation.
- positive witnesses required downstream:
  - web: actual generated/reference web app served through the real app/server path; Playwright captures screenshots, DOM/accessibility/geometry reports, visual diff artifacts, and UI evidence packets consumed by the verification runner/build path;
  - mobile: actual generated/reference React Native UI exercised through Maestro/Detox; real screenshots/videos/logs/tree metadata where available and UI reports consumed by the verification runner/build path;
  - baseline proposal/update flow requires explicit evidence and approval;
  - deterministic layout/a11y/visual checks pass on clean starter surfaces.
- negative witnesses required downstream:
  - missing screenshot/report/baseline/matrix row/a11y artifact fails loudly;
  - intentional overlap, clipping, contrast, focus, accessibility, responsive, or visual-diff defect hard-blocks;
  - silent baseline update or accept-current-screenshot behavior is rejected;
  - E2E pass alone does not satisfy UI verification;
  - subjective/LLM-only review cannot hard-block as a deterministic failure;
  - unavailable mobile live proof is `pending-live/BLOCKED`, not green.
- regression witnesses required downstream:
  - Playwright remains web E2E while UI verification remains separate;
  - Maestro + Detox remain mobile E2E while UI verification consumes their artifacts separately;
  - deterministic gates block and advisory review does not solely hard-block;
  - `vibe-engineer` name, six skills, artifact flow, Verification Delta ownership by `plan`, automatic build/ship verification/context/evidence, mechanical gates, and DL-20A/DL-24A audits remain intact.
- real_boundary_required: yes for later implementation; no live runtime seam is created by this decision artifact.
- real_boundary_status: not_applicable for this decision artifact; required_before_closure for `I-17`; full rerun required in `I-23`; mobile device/simulator unavailable state must be `pending-live/BLOCKED`.

Earliest real-boundary proof:

| Surface                | Earliest lane                           | Producer                                                                                           | Carrier                                                                                                                               | Consumer                                                                                                             | Closure rule                                                                                      |
| ---------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Web UI verification    | `I-17-web-mobile-e2e-ui-verification`   | actual generated/reference web UI state served by the real app/server path chosen by starter lanes | real screenshots, DOM/accessibility/tree metadata, viewport matrix output, visual diff/layout/a11y reports, and evidence packet files | actual UI verification runner/checkers and verification evidence collector consumed by build/ship verification paths | positive/negative/regression proof required; shape-only screenshots or fake reports do not close. |
| Mobile UI verification | `I-17-web-mobile-e2e-ui-verification`   | actual generated/reference React Native UI state exercised through locked mobile tooling           | real mobile screenshots/videos/logs/tree metadata where available and UI verification reports                                         | actual mobile UI verification/checker path and evidence collector                                                    | if device/simulator/tree support is unavailable, closure is `pending-live/BLOCKED`.               |
| Full rerun             | `I-23-end-to-end-real-boundary-witness` | actual generated starter critical UI states                                                        | all UI verification carriers from web and mobile                                                                                      | build/ship/final evidence consumers                                                                                  | intentional deterministic UI defects must hard-block.                                             |

## Ownership/path consequences

- This decision writes only:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-13-ui-verification-stack.md`;
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-13-ui-verification-stack/reports/decision-lock-execution-report.md`.
- No package source, root config, CI workflow, generated starter fixture, screenshot, baseline, test, or schema file is created by DL-13.
- Future implementation ownership remains with final-strategy lanes, primarily:
  - `I-17`: `examples/starter-reference/generated-fixtures/golden-web/**`, `examples/starter-reference/generated-fixtures/golden-mobile/**`, `examples/starter-reference/generated-fixtures/e2e-ui/**`, and its work directory;
  - `I-09`/`DL-10`: verification runner/evidence/failure representation;
  - `I-20`: CI/local parity only after owner handoff;
  - `I-21`/`I-22`: build/ship consumption of verification evidence;
  - `I-24`: docs/reference polish.
- Baseline/screenshot artifacts must live only under future implementation-lane-owned paths, not ambient project roots or DL-13 paths.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` with validation `PASS`.
- governed surfaces affected: UI verification policy, future UI verifier agents, reports/evidence, baseline rules, starter sample/reference UI verification fixtures, docs.
- surface classification:
  - DL-13 policy and future core UI verifier agents/checkers are core harness surfaces;
  - starter UI fixtures/baselines are sample/reference surfaces and must be labeled;
  - consuming-project visual rules are project extensions and must not become core defaults.
- allowed generic vocabulary used: UI state, viewport, screenshot, baseline, visual diff, layout, overlap, clipping, accessibility, contrast, focus, interaction state, evidence, runner, agent, verifier, app, package, module, contract, test, schematic, skill, state, matrix, device.
- project/business vocabulary: none is used as a core UI rule. Terms forbidden by DL-20A, including ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout, cart, order, or equivalent business concepts, remain forbidden in core UI verification policy unless explicitly negative examples or labeled sample/demo content.
- specialist UI verifier agents are generic issue-class specialists, not business-domain reviewers.
- baseline and fixture policy distinguishes core harness defaults from sample/reference starter artifacts.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- shell/process commands used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none. The DL-13 work directory did not exist before the report write; before decision artifact creation, the owned work directory contained only this lane's report.
- target inventory was inspected read-only. Existing sibling decisions `DL-01` through `DL-08`, `DL-20A`, and `DL-24A` were read-only; no non-owned decision/report/source path was edited.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Implementation details assigned to future owners are not hidden deferrals:

- exact schema fields and storage formats: `DL-02`/`DL-10`/implementation lanes;
- exact unit/component/general runner tooling: `DL-11`;
- exact Maestro/Detox split, mobile device CI, and mobile artifact capture mechanics: `DL-12`;
- exact starter web/mobile screen inventory and state fixtures: `DL-16`;
- exact mechanical baseline ratchet/wiring checks: `DL-15`;
- exact observability/correlation details for UI failure evidence: `DL-23`.

Any dependent that needs those exact details remains blocked until the future owner supplies them. No production implementation is authorized by this decision.

## Evidence checklist

1. Report artifact was created first at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-13-ui-verification-stack/reports/decision-lock-execution-report.md` before this decision artifact.
2. Source files inspected are listed in the report and cited above by path/section heading.
3. Files changed are limited to this decision artifact and the DL-13 execution report.
4. No production/package/root/config/CI/generated starter/screenshot/baseline/test files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Backlog §13 is resolved: visual regression tooling/interface, screenshot strategy, viewport matrix, accessibility checker, layout/overlap detection, LLM visual review, specialist UI agents, deterministic failure representation, and baseline approval/update are covered.
7. UI verification remains separate from E2E; Playwright web E2E and Maestro + Detox mobile E2E are preserved.
8. Deterministic vs advisory boundary is explicit and hard-blocking conditions are listed.
9. Baseline approval/update is controlled, evidence-backed, and rejects silent accept-current behavior.
10. Missing screenshot/report/baseline/viewport/a11y/tree artifacts fail loudly.
11. UI evidence packet semantic fields are defined while exact schema ownership remains with `DL-02`/`DL-10`.
12. Real-boundary proof is assigned to `I-17` and `I-23`; no live proof is claimed by this decision.
13. Related absent decisions are not contradicted or prematurely decided.
14. DL-20A domain-neutrality checklist is applied.
15. Dirty-tree ownership and path restrictions are explicit.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and any available diff, not just this report.

### Positive witnesses

- Decision artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-13-ui-verification-stack.md` and uses the DL-24A template with exactly one output class.
- The report exists and records report-first execution.
- Backlog §13 coverage is complete.
- `I-17` can implement UI verification without inventing visual diff, baseline, screenshot, viewport/device/state, accessibility, layout, specialist-agent, failure-representation, or hard/advisory policy.
- UI verification is explicitly separate from E2E.
- Playwright, Maestro, and Detox locked decisions are preserved.
- DL-20A domain-neutral core rules are applied.

### Negative witnesses

- A subjective-only screenshot/LLM review policy is rejected.
- E2E success alone is rejected as sufficient UI verification.
- Silent baseline update or accept-current-screenshot behavior is rejected.
- Missing screenshot, report, baseline, viewport result, a11y report, or metadata artifact is a hard failure.
- Deterministic overlap/clipping/contrast/accessibility/layout failures hard-block.
- Mobile live proof that cannot run is `pending-live/BLOCKED`, not green.
- Core UI verification policy containing project/business vocabulary is rejected unless explicitly negative-example/sample/demo/extension-labeled under DL-20A.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- `plan` owns Verification Delta; `build` and `ship` run verification/context/evidence automatically.
- Web E2E remains Playwright; mobile E2E remains Maestro + Detox.
- Deterministic gates block; advisory review does not solely hard-block.
- `DL-10`, `DL-11`, `DL-12`, `DL-15`, `DL-16`, and `DL-23` are not contradicted or prematurely decided.
- `DL-20B` and `DL-24B` remain later audits.

### Sibling/blast-radius checks

- Check final strategy §§5–11 and §§14–19 for consistency.
- Check `docs/verification-layer.md` §§5.8, 10, and 14 for UI verification policy consistency.
- Check `docs/locked-decisions.md` §§9–10 for E2E and verification decisions.
- Check `docs/planning-research-backlog.md` §13 coverage.
- Check DL-24A template/evidence and DL-20A domain-neutrality checklist.
- Inspect present sibling decisions `DL-01` through `DL-08` read-only for contradictions; if `DL-10`, `DL-11`, `DL-12`, `DL-15`, `DL-16`, `DL-23`, `DL-20B`, or `DL-24B` appear before validation, inspect them read-only.
- Confirm only owned DL-13 decision/work paths changed.
- Confirm no package source, root config, CI, starter fixture, screenshot/baseline, or git metadata was touched.

### Severity policy

- `critical`: locked decision contradiction; missing DL-24A/DL-20A prerequisite; missing decision artifact; out-of-license write; ambiguous deterministic/advisory boundary; E2E-only UI verification; subjective-only hard blocking; silent baseline update policy; false real-boundary closure; missing blocked-dependent mapping for `I-17`; domain-neutrality violation.
- `major-local`: incomplete backlog §13 coverage; unclear future owner for proof; incomplete evidence checklist or validation plan; repairable source-citation/template issue that blocks direct dependents.
- `minor-local`: wording/citation clarity issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all schema, source, ownership, UI verification, domain-neutrality, and witness requirements satisfied.

## Known ambiguities / future owners

- `DL-02` owns exact artifact schemas and versioned evidence packet fields. DL-13 only locks semantic UI evidence requirements.
- `DL-10` owns verification runner/evidence/failure taxonomy, rerun strategy, and integration of hard/advisory results into build/ship/CI.
- `DL-11` owns exact unit/integration/component runner choices and any shared test tooling outside DL-13 UI verifier requirements.
- `DL-12` owns exact Maestro-vs-Detox split, simulator/device strategy, artifact capture, flake handling, and mobile CI feasibility.
- `DL-15` owns mechanical baseline ratchet, wiring-integrity, stale-baseline checks, generated-test anti-pattern integration, and any linter-like UI artifact checks.
- `DL-16` owns exact starter architecture, UI surfaces, fixtures, web server path, and generated/reference screen inventory.
- `DL-23` owns observability defaults and any correlation/log/trace evidence attached to UI verification failures.
- `I-17` owns actual implementation and earliest web/mobile real-boundary proof; if mobile device/simulator support is unavailable, it must close `pending-live/BLOCKED` for mobile proof.
- `I-23` owns the full rerun of UI verification in the end-to-end real-boundary witness.
