# DL-11 — Test Runner and Quality Tooling Choices

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-11 adjudication-authorized decision-lock finisher
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-11-test-runner-tooling.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-11-test-runner-tooling/reports/decision-lock-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/dl-11-12-blocker-adjudication.md` — `Exact finisher license — DL-11 EXTEND`; `Ordered remainder spec — DL-11`; `Validity of current blocked reports`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-11-brief-generated.md` — `Deliverable and non-goals`; `Required decision artifact schema/format`; `Real-boundary witness requirement`; `Domain-neutrality constraints from DL-20A`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-11-brief-validation.md` — `Verdict`; `Coverage matrix`; `Dependency audit`; `Dirty-tree and ownership conflict audit`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`; §6 `Dependency DAG with scheduler gates`; §7 `Explicit ready queue rules`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity requirements.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §9 `Severity gate and closure criteria check`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Decision-artifact checklist`; `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Implementation enforcement plan`; `Verification and witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §3 `Non-negotiable design rules`; §9 `Verification model`; §12 `Starter kit shape`; §16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §3 `Starter kit stack`; §9 `E2E stack`; §10 `Verification-layer decisions`; §11 `Mechanical verification gates`.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §1.3 `Test coverage is mandatory, but not line-coverage theater`; §1.4 `Evidence over assertion`; §1.5 `Deterministic gates block`; §1.6 `Verification is domain-neutral`; §5.4 `Unit tests`; §5.5 `Integration tests`; §5.7 `E2E behavior tests`; §5.8 `UI verification tests`; §14 `Blocking policy summary`; §15 `Success criteria`; §16 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §1 `Core verification doctrine`; §2 `Governed quality surface`; §7 `Quality wiring-integrity gate`; §9 `Test anti-pattern scanner`; §11 `How this fits the verification layer`; §12 `Implementation priority`; §13 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §11 `Test runner and quality tooling choices`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§0, 5.2, 10, 11.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-01-repo-package-structure.md` — `Package and publishability table`; `Starter consumption model`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md` — `Evidence Packet`; `Verification Delta`; `Validation and type-generation consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-03-skill-protocols.md` — `Shared protocol rules`; `Handoff contracts`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-08-schematics-system.md` — `Tests and evidence requirements`; `Known ambiguities / future owners`.

## Decision summary

The v1 default test stack is surface-specific but policy-unified:

- **Vitest** is the default runner for harness packages, Node/Nest unit tests, package integration tests, backend contract tests, backend HTTP E2E tests, and React web component tests.
- **Jest** is reserved for React Native component tests where Metro/React Native ecosystem compatibility is load-bearing.
- **Playwright** remains the locked web E2E runner.
- **Maestro + Detox** remain the locked mobile E2E runners; DL-12 owns their flow split and device/CI details.

Coverage is mandatory as evidence of required behavior/risk/acceptance/regression coverage, not as line-coverage theater. Generated tests must be meaningful, named, fixture-backed, evidence-producing, and failure-loud. Mutation testing is targeted/advisory in v1 unless a later Verification Delta explicitly marks a narrow target blocking. Property testing with `fast-check` is blocking only for the bounded classes listed below when a lane relies on generalized input invariants.

## Decision details

### Unit test runner

1. `Vitest` is the v1 default unit runner for core harness TypeScript packages, Node utilities, schema validators, CLI/library units, mechanical-gate helper units, backend service units, and web-side pure logic.
2. Vitest must run in strict TypeScript projects without relying on transpile-only acceptance as proof. Typecheck remains a separate hard gate; a green test run does not replace typecheck.
3. Unit tests must be named for behavior, acceptance criterion, risk, or regression. Smoke-only tests and process-exit-only tests are not valid evidence for meaningful behavior.
4. React Native component units are the exception: they use Jest under the React Native component testing policy below.

### Integration test runner

1. `Vitest` is the v1 default integration and contract runner for non-mobile surfaces.
2. Integration tests must exercise real package/module boundaries where the lane claims integration, not hand-authored parser-matching fixtures.
3. Database-backed integration tests must use the actual configured persistence boundary for the lane. For PostgreSQL/Prisma starter integration, the expected real boundary is a real PostgreSQL service in a lane-owned fixture environment, normally through Testcontainers or an explicitly provided CI service. If the real database boundary cannot run, the dependent lane is `pending-live/BLOCKED`; it must not silently switch to an in-memory substitute for truth-green.
4. Integration evidence must be written through the DL-10 Evidence Packet semantics once available.

### Backend E2E strategy

1. Backend E2E uses Vitest to orchestrate an actual NestJS application instance and HTTP requests against its real route/provider boundary.
2. Contract/API tests for `I-11` and `I-16` must run through the selected API contract mechanism owner and actual provider/client/consumer seam. The expected shape, subject to DL-14 validation, is a Nest-compatible provider implementing the canonical contract source plus a generated/shared client consumed by a real consumer fixture.
3. Backend E2E is not a browser E2E substitute. Web behavior E2E remains Playwright; mobile behavior E2E remains Maestro + Detox.
4. Any backend E2E proof that only validates a schema parser against hand-authored matching data is insufficient.

### React component testing setup

1. React web component tests use `Vitest` plus `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` matchers, and `jsdom` for DOM semantics.
2. Component tests verify accessible user-observable behavior, state transitions, error/loading/empty states, and generated component contracts where applicable.
3. Visual/layout correctness is not closed by React component tests; deterministic UI verification remains owned by DL-13 and later `I-17`.

### React Native component testing setup

1. React Native component tests use `Jest` plus React Native Testing Library.
2. Jest is scoped to React Native component/unit testing because the RN ecosystem, Metro transforms, native mocks, and RNTL conventions make Jest the safest v1 runner there.
3. RN Jest tests must use typed fixtures and meaningful assertions. Snapshot-only component tests are invalid unless paired with specific semantic assertions and volatile output normalization.
4. RN component tests do not replace Maestro/Detox mobile E2E or DL-13 UI verification.

### Web E2E preservation

1. Web E2E remains `Playwright`.
2. Playwright tests must run against the actual served web app in downstream implementation lanes.
3. Playwright evidence must include traces/screenshots/videos/reports where relevant and normalize volatile data.
4. Playwright is also the web capture carrier for UI verification under DL-13, but UI verification specs are separate from E2E behavior tests.

### Mobile E2E preservation

1. Mobile E2E remains `Maestro + Detox`.
2. DL-11 does not decide the exact Maestro-vs-Detox flow split. DL-12 owns default flow selection, device/local/CI strategy, flake handling, and artifact capture details.
3. DL-11 requires both mobile runners to remain visible to the verification runner and generated-test metadata. Generated mobile tests must record whether DL-12 assigned them to Maestro, Detox, or both.
4. If device/simulator live proof cannot run, downstream closure is `pending-live/BLOCKED`; no mock mobile harness or synthetic parser closes the seam.

### Coverage tooling and policy

1. Vitest lanes use V8 coverage through Vitest coverage tooling.
2. Jest/RN lanes use Jest coverage with an implementation-selected V8/Istanbul-compatible provider that emits machine-readable summaries.
3. Playwright, Maestro, Detox, and UI verification lanes record scenario/matrix/evidence coverage rather than pretending line coverage proves E2E/UI completeness.
4. Coverage reports are required evidence when a lane executes tests, but percentage thresholds are not the definition of completeness.
5. Hard blocker: every required behavior, acceptance criterion, risk, sensitive path, and regression from the approved Verification Delta must be covered by an explicit test/check/evidence item or marked `blocked` with owner and condition.
6. Hard blocker: coverage tooling missing, empty, scoped away from governed files, or unable to map to the tested surface fails the lane.
7. Ratchet policy: once DL-15/I-12/I-20 provide a quality ratchet and wiring-integrity implementation, changed-surface coverage may ratchet and block new unapproved coverage debt. Until then, line/branch/function percentages are signals and evidence, not standalone proof of completeness.

### Mutation and property testing policy

1. `fast-check` is the v1 property-testing library for TypeScript surfaces.
2. Property tests are **blocking** when the Verification Delta or owner decision relies on generalized invariants for parsers/normalizers, schema validators, artifact migration, path/idempotency/conflict logic, generated-name normalization, or security/safety policy functions.
3. Property tests are **advisory or optional** for ordinary UI rendering, simple glue code, or flows already better covered by real-boundary integration/E2E tests.
4. Mutation testing uses `StrykerJS` only as targeted v1 evidence for critical pure logic, schema/contract validators, generated-test quality calibration, or mechanical-gate detector calibration.
5. Mutation testing is **not** a global v1 hard gate. It becomes blocking only for a named target when the approved Verification Delta or a later mechanical/test-quality owner explicitly requires it and the target has stable deterministic inputs. Otherwise it is advisory/ratcheted evidence.
6. Mutation/property tooling must never replace real-boundary witnesses for provider/client/consumer, browser, mobile, verification-runner, or CI/local seams.

### Custom matcher and assertion policy

1. Shared custom matchers live in future test-only helper surfaces such as `packages/testing` as decided by DL-01 and implementation owners.
2. Matchers must be domain-neutral and narrow: artifact validity, evidence shape, normalized volatile output, path ownership, schema validation results, generated-marker integrity, and runner status are valid matcher themes.
3. Vitest and Jest matcher adapters may share assertion semantics but must not force one runtime abstraction across all surfaces.
4. Custom matchers must produce clear failure output and must be tested with positive and negative fixtures.
5. Assertions must inspect semantic outcomes. Assertions that only check command exit code, non-empty output, snapshot existence, or parser self-agreement are not acceptable for load-bearing generated tests.

### Test data factories and fixtures

1. Core factories and fixtures must be typed, deterministic, domain-neutral, and explicit about ownership.
2. Fixture builders must be schema-derived or schema-validated where schemas exist. Hand-authored fixtures that merely match the parser are insufficient for contract or artifact truth-green.
3. Core fixture names use generic/sample vocabulary such as `ExampleModule`, `SampleContract`, `RecordFixture`, `GenericEntity`, or `ReferenceFlow`; consuming-project business vocabulary belongs only in project extensions or clearly labeled sample/demo/reference fixtures.
4. Test data must use stable seeds and explicit reset/cleanup rules. Hidden global mutable fixture state is forbidden.
5. Fixture setup failure must fail the test before assertions; silent fallback to default data is forbidden.
6. Real-boundary lanes must use actual producer/carrier/consumer fixtures where required, not only factories.

### Cross-surface consistency rules

1. Test taxonomy is unified; runner implementation is surface-specific.
2. Every generated or hand-authored test must declare or encode: layer, surface, runner, source artifact/acceptance/regression id, fixture owner, deterministic/advisory status, expected evidence artifacts, and required live resources.
3. Names follow a consistent pattern: `<layer>/<surface>/<acceptance-or-regression-id>/<behavior>`, adapted to each runner's naming conventions.
4. Volatile output such as timestamps, random ids, ports, image diffs, device names, and trace paths must be normalized or recorded as metadata, not baked into brittle snapshots.
5. Generated tests must fail when required setup, fixtures, services, browsers, devices, baselines, schemas, or resources are missing.
6. The common verification runner may aggregate all surfaces, but no surface is forced into a runner that weakens its native proof needs.

## Alternatives considered

### Vitest vs Jest for shared/unit tests

- decision: Vitest accepted for shared/unit/integration surfaces except RN component tests.
- rationale: Vitest is fast, TypeScript/Vite-friendly, ESM-friendly, compatible with V8 coverage, and suitable for harness packages, Nest unit/integration, contract fixtures, and React web components.
- consequences: Jest remains scoped to React Native component tests where it is load-bearing; this is surface-specific, not indecision.

### One runner for every surface

- decision: rejected.
- rationale: one runner would either weaken React Native component compatibility, browser E2E, mobile E2E, or UI verification proof. The policy must be unified, not the runtime.
- consequences: verification aggregation and evidence schemas unify results; runner selection remains surface-specific.

### Backend E2E through Playwright only

- decision: rejected.
- rationale: backend HTTP/provider/client contract proof needs direct API/provider/client control and negative invalid-payload cases. Playwright remains web behavior E2E, not the backend contract runner.
- consequences: backend E2E/contract tests use Vitest against actual Nest-compatible providers and generated clients.

### Backend E2E through mocked providers only

- decision: rejected.
- rationale: mocks prove shape only and would violate real-boundary requirements for `I-11`/`I-16`.
- consequences: mocks may support unit tests but cannot close backend E2E or contract strictness.

### React component options

- decision: `@testing-library/react` + Vitest + jsdom accepted.
- rationale: it favors user-observable behavior and integrates with Vitest/web tooling while keeping UI visual proof in DL-13.
- consequences: Enzyme-like implementation-detail tests and screenshot-only component assertions are rejected.

### React Native component options

- decision: React Native Testing Library + Jest accepted.
- rationale: RN component transforms, native mocks, and ecosystem tooling remain Jest-centered; forcing Vitest would risk a brittle abstraction.
- consequences: RN Jest evidence is aggregated by the verification runner and kept separate from Maestro/Detox E2E.

### Coverage as hard line threshold vs behavior/risk coverage signal

- decision: behavior/risk/acceptance/regression coverage is hard; raw line percentage is evidence/ratchet signal.
- rationale: source docs reject line-coverage theater. Missing required behavior coverage is critical even if line percentage is high.
- consequences: coverage reports are mandatory, but thresholds must not be the sole green criterion.

### Mutation/property testing v1-blocking vs targeted/advisory/deferred

- decision: property testing is targeted blocking for generalized invariant surfaces; mutation testing is targeted advisory/ratcheted unless explicitly required by a later Verification Delta.
- rationale: global mutation blocking would overfit tooling before mechanical ratchet and runner implementation exist; property tests are valuable where invariant spaces are load-bearing.
- consequences: no dependent may claim mutation-tested confidence unless actual Stryker evidence exists; absence of global mutation testing does not block unrelated lanes.

### Centralized vs per-surface matchers/assertions

- decision: centralized semantics with per-runner adapters.
- rationale: evidence and artifact assertions should be consistent, but Vitest/Jest/Playwright/Maestro/Detox have different runtime APIs.
- consequences: shared matchers live in test-only helper surfaces with adapter layers; no runner is forced to emulate another.

### Test data factories/fixtures strategy

- decision: typed deterministic fixture builders plus real-boundary fixtures where closure claims need them.
- rationale: generated tests need stable setup and meaningful assertions without hand-authored parser-matching fixtures.
- consequences: fixture setup must fail loudly, use generic/sample naming, and preserve DL-20A boundaries.

## Locked tool choices and policies

| Area                           | Locked choice / policy                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit runner                    | Vitest for harness/shared/backend/web units; Jest only for RN component units.                                                              |
| Integration runner             | Vitest for package/backend/contract integration.                                                                                            |
| Backend E2E                    | Vitest-driven Nest-compatible app + actual HTTP/provider/client seam; generated/shared client where contracts require it.                   |
| Web E2E                        | Playwright, preserved.                                                                                                                      |
| Mobile E2E                     | Maestro + Detox, preserved; split owned by DL-12.                                                                                           |
| React component testing        | Vitest + Testing Library React + user-event + jest-dom + jsdom.                                                                             |
| React Native component testing | Jest + React Native Testing Library.                                                                                                        |
| Coverage                       | V8/Vitest coverage, Jest coverage for RN, scenario/matrix evidence for E2E/UI; behavior/risk coverage hard, line percentage signal/ratchet. |
| Property testing               | fast-check targeted; blocking for named invariant surfaces only.                                                                            |
| Mutation testing               | StrykerJS targeted; advisory/ratcheted unless explicitly made blocking by an approved Verification Delta/future owner.                      |
| Matchers/assertions            | Domain-neutral shared matcher semantics with Vitest/Jest adapters; meaningful semantic assertions required.                                 |
| Factories/fixtures             | Typed deterministic schema-derived builders; real-boundary fixtures where closure claims require them; generic/sample naming only.          |
| Generated-test naming/evidence | Layer/surface/runner/source-id naming; machine-readable evidence; volatile normalization; setup/resource failures hard-fail.                |

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: PASS
      rationale: Supplies required output discipline, dependency fields, evidence checklist, validator checklist, real-boundary policy, and dirty-tree safety; artifact is LOCKED with independent validation PASS.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: PASS
      rationale: Supplies domain-neutral core, extension, sample/demo, vocabulary, and fixture rules for test tooling; artifact is LOCKED with independent validation PASS.
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy is safe for decision-lock execution.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, backlog, playbook, and quality bar define test tooling requirements.
  blocks:
    - id: I-11-contract-strictness-minimal-real-fixture
      reason: Needs Vitest-backed contract/integration runner commitments and real-boundary generated-client/provider/consumer test policy.
    - id: I-12-mechanical-gates-P1-ratchet-test-scanner
      reason: Needs generated-test quality rules, coverage/ratchet implications, test anti-pattern policy, fixtures, and evidence conventions.
    - id: I-16-starter-api-contracts-client-golden
      reason: Needs backend/unit/integration/contract runner and coverage policy for starter API/contracts/client golden proof.
    - id: I-17-web-mobile-e2e-ui-verification
      reason: Needs Playwright preservation, Maestro+Detox preservation, RN component runner policy, and UI/E2E separation.
    - id: I-19-observability-defaults-tests
      reason: Needs runner and evidence conventions where observability defaults/tests depend on chosen tooling.
    - id: all generated tests
      reason: Generated tests may not execute/close until runner, assertion, fixture, coverage, and evidence policies are locked.
  blocked_dependents:
    - id: I-11-contract-strictness-minimal-real-fixture
      blocked_until: DL-11 is independently validated clean and DL-14/DL-15 prerequisites are available for implementation closure.
      relying_on: Vitest contract/integration runner, real-boundary fixture rules, meaningful assertions, and generated-test quality.
    - id: I-12-mechanical-gates-P1-ratchet-test-scanner
      blocked_until: DL-11 and DL-15 are green, with I-10/I-11 prerequisites satisfied.
      relying_on: test anti-pattern scanner expectations, coverage/ratchet policy, and generated-test failure rules.
    - id: I-16-starter-api-contracts-client-golden
      blocked_until: DL-11, DL-14, DL-16, and I-15/I-11 prerequisites are green.
      relying_on: backend/unit/integration/contract runner choices and starter golden test evidence.
    - id: I-17-web-mobile-e2e-ui-verification
      blocked_until: DL-11, DL-12, DL-13, I-15, and I-16 prerequisites are green; mobile live proof may remain pending-live/BLOCKED if unavailable.
      relying_on: Playwright, Maestro+Detox, RN component testing policy, and UI/E2E separation.
    - id: I-19-observability-defaults-tests
      blocked_until: DL-11 and DL-23 plus starter prerequisites are green.
      relying_on: observability tests using selected runner/evidence conventions.
    - id: generated tests
      blocked_until: DL-11 independent validation passes and each generated-test lane has its surface-specific prerequisites.
      relying_on: runner/tool/matcher/fixture/coverage/generated-test policies.
  required_before_finalizing:
    - id: DL-10-verification-implementation
      required_content: Evidence/failure taxonomy and verification runner aggregation must consume DL-11 runner outputs without changing tool choices.
    - id: DL-12-mobile-e2e-details
      required_content: Exact Maestro/Detox split, device/CI strategy, artifacts, and flake policy for mobile E2E.
    - id: DL-13-ui-verification-stack
      required_content: UI verification remains separate from E2E and supplies deterministic UI artifact expectations.
    - id: DL-14-api-contract-mechanism
      required_content: Contract mechanism must be testable through Vitest integration/contract lanes.
    - id: DL-15-mechanical-engine
      required_content: Test anti-pattern scanner, ratchet, wiring-integrity, and mechanical hard/advisory status must enforce DL-11 generated-test policy.
    - id: DL-16-starter-architecture
      required_content: Starter app/package layout and golden surfaces must place tests/fixtures where selected runners can execute them.
    - id: DL-18-ci-cd-defaults
      required_content: CI must invoke equivalent local runner paths and preserve artifacts.
    - id: DL-23-observability-defaults
      required_content: Observability test needs must map onto selected runners/evidence.
  deferrals:
    - deferred_question: Exact package versions and config filenames for Vitest, Jest, Playwright, Maestro, Detox, coverage, fast-check, StrykerJS, jsdom, Testing Library, and runner adapters.
      rationale: Implementation lanes and CI/provider owners install and pin package versions; DL-11 locks choices and policies.
      future_owner: I-00/I-09/I-11/I-12/I-16/I-17/I-20 with DL-18 for CI provider details
      allowed_now: true
      blocked_dependents:
        - any implementation lane attempting to run tests before concrete package/config installation
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact Maestro-vs-Detox generated-flow split and device matrix.
      rationale: Owned by DL-12; DL-11 preserves both runners and evidence requirements only.
      future_owner: DL-12-mobile-e2e-details
      allowed_now: true
      blocked_dependents:
        - mobile E2E closure in I-17
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-11-test-runner-tooling.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-11-test-runner-tooling/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** sibling and prerequisite decisions
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** sibling and prerequisite reports
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-11 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - production package/source paths
    - root config files
    - package manifests and lockfiles
    - CI workflows/scripts
    - generated starter files
    - tests/source/config files
    - any decision/report/work path not owned by DL-11
    - /Users/lizavasilyeva/work/harness-starter/**
  handoff_notes:
    - from: DL-11
      to: I-11/I-12/I-16/I-17/I-19/generated-test lanes
      condition: After DL-11 independent validation passes and each lane's own prerequisites are green.
      shared_path_policy: disjoint
    - from: DL-11
      to: DL-10/DL-12/DL-13/DL-14/DL-15/DL-16/DL-18/DL-23
      condition: Peer decisions consume DL-11 runner/tooling constraints without having their scopes overwritten.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-11-contract-strictness-minimal-real-fixture`: blocked until DL-11 is independently validated and required contract/mechanical prerequisites are available; it must run actual provider/API + generated client + consumer fixture through the selected Vitest/contract path.
- `I-12-mechanical-gates-P1-ratchet-test-scanner`: blocked until DL-11 and DL-15 are green; it must enforce generated-test quality, ratchet, scanner, and coverage-signal rules.
- `I-16-starter-api-contracts-client-golden`: blocked until DL-11, DL-14, DL-16, and prerequisite implementation lanes are green; it must run selected backend/unit/integration/contract tests and invalid-payload rejection proof.
- `I-17-web-mobile-e2e-ui-verification`: blocked until DL-11, DL-12, DL-13, I-15, and I-16 are green; web must be served to Playwright, mobile must use Maestro + Detox per DL-12 or remain `pending-live/BLOCKED`.
- `I-19-observability-defaults-tests`: blocked where observability test evidence depends on selected runners until DL-11 and DL-23 are green.
- All generated tests: blocked until DL-11 validation passes and lane-specific prerequisites provide actual runner/config/resource availability.

## Verification/witness consequences

- deterministic checks affected: future unit, integration, backend E2E, web E2E, mobile E2E, React component, React Native component, coverage collection, generated-test quality, matcher, fixture, property-test, mutation-test, and test anti-pattern checks.
- positive witnesses required downstream:
  - Vitest accepts and runs meaningful unit/integration/backend contract tests with coverage evidence.
  - React component tests run under Vitest/jsdom/Testing Library with semantic assertions.
  - React Native component tests run under Jest/RNTL with semantic assertions.
  - Playwright serves and exercises the actual web app for E2E behavior.
  - Maestro + Detox execute actual RN mobile flows per DL-12 or record `pending-live/BLOCKED` when live device proof cannot run.
  - Generated tests include stable metadata, meaningful assertions, fixtures, normalized volatile output, and evidence links.
- negative witnesses required downstream:
  - smoke-only tests, exit-code-only tests, no-assertion tests, parser self-agreement fixtures, unnormalized volatile snapshots, missing setup/resources, or silent fixture fallback fail.
  - Missing coverage report for a tested surface fails.
  - Line coverage percentage alone cannot mark a required behavior/risk as covered.
  - Deterministic test failures cannot be downgraded to advisory.
  - Unsupported mobile/browser/database live resources produce `pending-live/BLOCKED`, not green.
- regression witnesses required downstream:
  - Product/package/CLI name remains `vibe-engineer`.
  - Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
  - Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
  - `build` and `ship` continue to run verification/context/evidence automatically.
  - Playwright remains web E2E; Maestro + Detox remain mobile E2E.
  - Mechanical gate families, especially wiring-integrity and test anti-pattern scanner, remain intact.
- real_boundary_required: yes for downstream implementation lanes; no live runtime seam is created by this decision artifact.
- real_boundary_status: not_applicable for this decision artifact; required_before_closure or `pending-live/BLOCKED` for I-11/I-12/I-16/I-17/I-19/I-20 as applicable.
- if no live seam: DL-11 writes only a decision artifact and does not install or run test tooling.

Earliest required real-boundary proofs:

| Lane   | Producer                                                  | Carrier                                                                         | Consumer                                                       | Closure rule                                                                             |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `I-11` | actual minimal provider/API using the contract mechanism  | generated/shared client plus on-disk test/evidence artifacts                    | actual consumer fixture under Vitest contract/integration path | hand-authored parser-matching fixtures do not close; invalid payload rejection required. |
| `I-12` | actual aggregate quality path                             | real fixture files and ratchet/scanner baselines                                | test anti-pattern scanner and ratchet consumers                | positive/negative/regression cases required; bad generated tests must fail.              |
| `I-16` | actual starter API/contracts/client golden fixture        | selected backend/unit/integration/contract tests and generated client artifacts | starter app/API/client consumers                               | invalid payload rejection and generated-client consumption required.                     |
| `I-17` | actual served web app and actual RN mobile app            | Playwright traces/screenshots; Maestro/Detox artifacts; UI evidence from DL-13  | verification runner/build evidence consumers                   | unavailable mobile live proof is `pending-live/BLOCKED`, not green.                      |
| `I-19` | actual golden critical path observability instrumentation | logs/metrics/traces/correlation artifacts plus selected runner results          | observability test assertions/evidence collector               | missing correlation/log/metric/trace evidence fails where required.                      |
| `I-20` | local aggregate quality/test command                      | runner invocations and evidence artifacts                                       | CI workflow/static validator                                   | local and CI must invoke equivalent runner semantics.                                    |

## Ownership/path consequences

- This decision pass writes only:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-11-test-runner-tooling.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-11-test-runner-tooling/reports/decision-lock-execution-report.md`
- No package source, test files, package manifests, lockfiles, root configs, CI workflows, generated starter files, screenshots, baselines, or scripts are created or edited by DL-11.
- Future implementation ownership remains with the relevant I-lanes and peer decisions; exact runner installation/configuration belongs to those lanes after all prerequisites and audits are green.
- Sibling decisions may read this artifact but must not treat DL-11 as authority for their owned details beyond the constraints explicitly listed here.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` with validation `PASS`.
- governed surfaces affected: test runner policy, generated test metadata, custom matchers, fixtures/factories, examples, future `packages/testing`, verification evidence, and generated starter test defaults.
- surface classification:
  - core runner/matcher/fixture policy is core harness policy;
  - starter golden tests and examples are sample/reference surfaces and must be labeled;
  - consuming-project test data/factories are project extensions and must not become core defaults.
- positive generic vocabulary permitted: apps, packages, modules, contracts, adapters, tests, standards, context, plans, verification, schematics, skills, agents, fixtures, examples, records, modules, providers, consumers, routes, states, evidence.
- project/business terms: ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout/cart/order/customer/product-like concepts are forbidden in core runner policy, generated test defaults, matchers, factories, and examples unless explicitly negative examples or sample/demo/reference content.
- fixture policy: core fixtures use generic/sample names such as `ExampleModule`, `SampleContract`, `RecordFixture`, `GenericEntity`, or `ReferenceFlow`; project-specific fixtures live behind extension boundaries.
- deterministic enforcement owners: DL-15/I-10-I-13 for mechanical/test anti-pattern/domain-neutrality checks, I-11/I-16/I-17/I-19 for lane proofs, I-24 and DL-20B for docs/audit.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none. The DL-11 decision artifact was absent before this write, and the DL-11 work directory contained only this lane's preserved report/history.
- production/source/root/config/CI/package/generated starter writes: none.
- historical `DL-11-X` bg `b46ac3946` ownership record was treated as a resolved self-conflict per adjudication, not as a competing non-self owner.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Implementation details assigned to future owners without reopening DL-11:

- exact dependency versions, config filenames, script names, and package installation: implementation lanes plus DL-18/I-20 for CI parity;
- exact Maestro/Detox flow split, local device strategy, CI device strategy, artifacts, and flake handling: DL-12;
- exact UI verification stack implementation and baseline policy: DL-13;
- exact verification evidence/failure taxonomy envelope: DL-10;
- exact API contract mechanism: DL-14;
- exact mechanical gate implementation and test anti-pattern scanner mechanics: DL-15;
- exact starter layout and golden surfaces: DL-16;
- exact observability tests: DL-23.

A dependent that needs any exact future-owned detail remains blocked until that owner is green. No dependent may treat these implementation details as silently decided by DL-11.

## Evidence checklist

1. Existing DL-11 blocked report content was preserved and continued after adjudication.
2. The adjudication report was read and applied; `EXTEND` resolved the false-positive self-conflict.
3. The report was updated before creating this decision artifact in the finisher continuation.
4. Required source files and foundation decisions were inspected and are cited by path/section.
5. Files changed are limited to this decision artifact and the DL-11 execution report.
6. No production/package/root/config/CI/generated starter/source/test files were touched.
7. This artifact produces exactly one output class: `locked_decision_document`.
8. Every backlog §11 area is resolved: unit runner, integration runner, backend E2E, React component setup, RN component setup, coverage, mutation/property testing, matchers/assertions, factories/fixtures, and cross-surface consistency.
9. Locked Playwright and Maestro + Detox decisions are preserved.
10. Dependencies, blocked dependents, required sequencing, deferrals, paths, and handoffs use the DL-24A dependency declaration format.
11. Generated-test quality rules include meaningful assertions, acceptance/regression names, stable evidence, volatile normalization, setup/resource failure, and no parser self-agreement.
12. Coverage policy rejects line-coverage theater and requires behavior/risk/acceptance/regression proof.
13. Real-boundary consequences are assigned to downstream lanes without claiming live proof here.
14. DL-20A domain-neutrality check is applied to runner policy, matchers, factories, fixtures, and examples.
15. Dirty-tree safety is recorded and no unowned write occurred.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and any available diff/inventory, not just this artifact or report.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-11-test-runner-tooling.md` and uses the DL-24A-compatible schema with exactly one output class.
- Every backlog §11 area is resolved or validly assigned to a future owner with blocked dependents.
- Vitest, Jest-for-RN-components, Playwright, Maestro, Detox, coverage, property/mutation, matchers, factories/fixtures, and generated-test policies are present.
- Locked Playwright and Maestro + Detox choices are preserved.
- Blocked dependents map includes `I-11`, `I-12`, `I-16`, `I-17`, `I-19`, and all generated tests.
- UI verification is kept separate from E2E and DL-13 scope remains intact.
- DL-20A domain-neutrality evidence is present with generic/sample fixture rules.
- Existing blocked report history is preserved and adjudication is cited.

### Negative witnesses

- Reject any decision reading that replaces Playwright for web E2E or removes either Maestro or Detox from mobile E2E.
- Reject one-runner-for-everything implementation that weakens RN, browser, mobile, backend, or UI proof.
- Reject line/branch coverage as the definition of completeness.
- Reject generated tests with smoke-only assertions, exit-code-only assertions, missing assertions, unnormalized volatile snapshots, silent setup failure, or parser self-agreement fixtures.
- Reject advisory-only proof for deterministic test gates.
- Reject project/business-domain factories or fixtures in core unless sample/demo/reference-labeled under DL-20A.
- Reject any downstream lane that treats DL-11 as live tooling proof; DL-11 is decision-only.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- `build` and `ship` run verification/context/evidence automatically.
- Playwright, Maestro, Detox, fixed starter stack, strict TypeScript, pnpm/Turborepo, shared contracts/client, and mechanical gate families remain intact.
- DL-10, DL-12, DL-13, DL-14, DL-15, DL-16, DL-18, DL-20B, DL-23, and DL-24B scopes are not overwritten.

### Sibling/blast-radius checks

- Check final strategy §§5.2, 6, 7, 9.2, 10, and 11.
- Check DL-24A output discipline and DL-20A domain-neutrality.
- Check README, locked decisions, verification layer, mechanical gates, backlog §11, playbook, and quality bar for source consistency.
- Check present green sibling decisions/reports for consistency, especially DL-01, DL-02, DL-03, DL-04, DL-05, DL-06, and DL-08.
- Treat unvalidated sibling decisions such as DL-10, DL-13, and DL-14 as compatibility signals only unless their independent validation PASS exists at validation time.
- Confirm no non-owned target paths, source docs, package/source/root/config/CI/generated starter files, sibling work dirs, or `.git/**` were edited.

### Severity policy

- `critical`: locked E2E contradiction; missing artifact/report; missing DL-24A/DL-20A compliance; unsafe/out-of-license write; production implementation; omitted backlog §11 area; generated test lanes unblocked without tooling commitments; false real-boundary closure; advisory-only deterministic gate; domain-neutrality violation.
- `major-local`: incomplete but repairable runner choice, dependency mapping, generated-test quality policy, coverage/mutation/property policy, fixture/matcher policy, evidence checklist, or validation plan affecting direct dependents.
- `minor-local`: wording/citation clarity issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: source, schema, ownership, dependency, tooling, generated-test quality, domain-neutrality, and witness requirements are satisfied.

## Known ambiguities / future owners

- `DL-10` owns verification command/evidence/failure taxonomy and aggregation semantics; DL-11 only requires runner outputs to be consumable.
- `DL-12` owns Maestro-vs-Detox flow split, simulator/device setup, CI device proof, mobile artifacts, and flake handling.
- `DL-13` owns deterministic UI verification, visual/baseline/accessibility/layout proof, and advisory boundary for UI checks.
- `DL-14` owns exact API contract mechanism; DL-11 requires its provider/client/consumer seam to be testable.
- `DL-15` owns mechanical engine, test anti-pattern scanner implementation, quality ratchet, and wiring-integrity gate details.
- `DL-16` owns exact starter architecture, app/package layout, golden module surfaces, and dev services.
- `DL-18` owns CI/CD provider defaults, caching/matrix/artifact upload, and local/CI parity implementation.
- `DL-23` owns observability defaults/tests and correlation/log/trace evidence.
- `DL-20B` and `DL-24B` own later domain-neutrality and cross-decision output audits.
- Future implementation lanes own package installation/configuration and must prove real runner boundaries before closure.
