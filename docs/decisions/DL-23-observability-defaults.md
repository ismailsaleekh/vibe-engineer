# DL-23 — Observability Defaults

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-23 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-23-observability-defaults.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-23-observability-defaults/DL-23-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §23 `Observability defaults`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §4.1 `Harness repo package hypothesis`; §4.2 `Generated starter kit hypothesis`; §5.2 `Decision-lock table` row `DL-23-observability-defaults`; §6.2 `Implementation DAG`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane` rows `DL-*` and `I-19`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity requirements.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §7 `Verification and real-boundary witness check`; §8 `Coverage by product surface`; §9 `Severity gate and closure criteria check`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §2 `The two repositories`; §3 `Non-negotiable design rules`; §9 `Verification model`; §12 `Starter kit shape`; §13 `Relationship between starter kit and harness`; §15 `Success criteria`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§2–3 two-repo direction and starter stack; §§8–11 automatic verification/context, E2E stack, verification layer, and mechanical gates.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1.4–1.6 evidence/deterministic/domain-neutrality principles; §5.12 `Observability verification`; §8.5 implementation agents; §12.11 `Observability-gap detector`; §14 `Blocking policy summary`; §16 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §1 `Core verification doctrine`; §7 `Quality wiring-integrity gate`; §11 `How this fits the verification layer`; §13 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2 and 10 for Triad execution, evidence, dirty-tree safety, and real-boundary truth.

## Decision summary

`vibe-engineer` v1 observability defaults are a small typed observability contract implemented later in `packages/observability/**` and demonstrated by the generated/reference starter without requiring a production monitoring backend.

The selected defaults are:

1. structured logging through a harness-owned observability abstraction, with Pino as the default Node/Nest/CLI JSON log adapter;
2. OpenTelemetry as the default tracing and metrics API/SDK family;
3. W3C trace context plus an explicit `correlationId`/`requestId` propagation contract;
4. bounded, domain-neutral metric categories for requests, operations, errors, verification runs, and external/client calls;
5. generated observability tests that consume real emitted logs, metrics, traces/spans, and correlation values from the golden critical path and an error path;
6. a minimal starter demonstration using local capture/test exporters and structured evidence, not dashboards or production backends.

This decision does not implement packages, tests, starter files, CI, dashboards, or production code.

## Decision details

### Logging default

1. Core code must depend on a `packages/observability` logging abstraction, not direct ad-hoc `console.log` calls or framework-specific logger calls as the load-bearing default.
2. The default Node/Nest/CLI adapter is Pino emitting newline-delimited structured JSON records.
3. Browser and React Native starter surfaces must use the same typed log-record abstraction. Their default implementation may write to a local capture sink and development console adapter, but the load-bearing verification contract is the structured record emitted to the harness observability sink.
4. Unstructured console output is allowed only as a non-authoritative development projection of the structured record. It is never closure evidence.
5. Required structured log fields are defined in `Observability contract` below. Missing required fields are verification failures.

### Tracing default

1. OpenTelemetry is the default tracing API/SDK family for v1.
2. The harness observability package must expose a small domain-neutral span API over OpenTelemetry concepts and must not require callers to know exporter details.
3. Required spans include inbound API request spans where an API exists, client call spans for web/mobile/API client boundaries, verification-run spans where verification exercises observability, and operation spans for generated golden critical paths.
4. W3C Trace Context (`traceparent` and `tracestate` where available) is the default propagation carrier across HTTP/API/client boundaries.
5. If an implementation environment cannot support a live trace exporter, it may use an actual in-process/test OpenTelemetry exporter for verification; hand-authored trace artifacts and mocked-only emitters do not close the implementation lane.

### Metrics default

1. OpenTelemetry Metrics is the default v1 metrics API family.
2. Metrics must be emitted through typed helpers in `packages/observability`, not through arbitrary strings at call sites.
3. Required metric categories are:
   - request count and request duration;
   - client/external call count and duration;
   - operation count and duration for domain-neutral generated critical paths;
   - error count by generic error class/status;
   - verification run count, duration, and result for observability verification;
   - instrumentation failure count for missing/invalid observability evidence.
4. Metric names and labels must be domain-neutral, stable, and bounded. Labels must not include raw user input, secrets, high-cardinality identifiers, or project/business event names in harness core.
5. Exact dashboard, alerting, remote backend, retention, and provider export configuration are not v1 defaults in this decision. They belong to later consuming-project configuration or docs after implementation proof exists.

### Correlation/request ID strategy

1. Each incoming request, generated golden critical-path invocation, verification run, and CLI/build/ship observability run must have a `correlationId`.
2. API surfaces also carry a `requestId`; when the boundary is not request-shaped, `requestId` may be absent only if the record includes an applicable `runId` or `operationId` plus `correlationId`.
3. Generated `correlationId` and `requestId` values are canonical RFC 4122 UUID v4 strings produced only by the `packages/observability` typed ID factory using a cryptographic random source available to the runtime. If React Native or another runtime lacks a native cryptographic UUID source, `I-19` must add an explicit supported crypto-backed implementation in its owned paths or stop `pending-live/BLOCKED`.
4. Inbound `x-request-id` and correlation headers may be preserved only when they validate as canonical UUID v4 strings under the typed ID parser. Otherwise the implementation must generate new UUID v4 IDs and record that regeneration occurred without logging the invalid inbound value.
5. For a new request-shaped boundary, `requestId` and `correlationId` default to the same generated UUID v4 unless a valid upstream correlation value is received. Downstream client/API calls propagate both headers when both are available.
6. Call sites must not hand-roll IDs, parse IDs with heuristic text matching, or use raw user-supplied IDs as trusted values.
7. Propagation requirements:
   - API inbound handlers read/create IDs and attach them to logs, spans, metrics, and response headers where applicable.
   - Web and mobile clients attach correlation/request headers to API calls from the generated client boundary selected by `DL-14`/`DL-16`.
   - Verification runners create or capture a verification `runId` and join it to `correlationId` in evidence.
   - Generated starter golden critical paths must prove the same correlation value appears across client call, API handling, structured logs, spans, metrics/evidence labels, and verification assertions wherever those boundaries exist.
8. A missing correlation field, broken propagation, or mismatch across emitted artifacts is a hard failure for `I-19` and `I-23` closure.

### Generated observability tests and evidence assertions

1. `I-19-observability-defaults-tests` owns implementation of observability packages and starter fixtures/tests.
2. Generated observability tests must exercise actual instrumentation and collect actual emitted structured logs, metric samples, trace/span data, and correlation IDs.
3. Tests that assert only process exit, HTTP status, or fixture shape are insufficient.
4. Required downstream tests include:
   - positive golden critical path emits log + metric + span + correlation evidence;
   - positive error path emits error log + error metric + error span/status with redaction-compatible evidence;
   - negative missing `correlationId`, `traceId`, required log field, metric category, or span attribute fails;
   - regression domain-neutral naming and no direct ad-hoc console logging as core default;
   - security regression that sensitive values are redacted or absent according to `DL-22`.
5. Exact test runner setup belongs to `DL-11`; this decision requires observability test semantics and evidence, not runner-specific command syntax.

### Starter demonstration scope

1. The starter kit must demonstrate observability on one minimal domain-neutral golden critical path and one error path.
2. The demonstration must be intentionally small: local capture sinks/test exporters, structured records, evidence assertions, and a short reference explanation are enough.
3. The starter must not require Prometheus, Jaeger, Grafana, cloud monitoring, production dashboards, or external observability accounts for baseline verification.
4. Sample/demo telemetry names must be generic (`reference.operation`, `api.request`, `client.call`, `verification.run`) and labeled sample/demo/reference where they appear in starter fixtures.
5. Exact starter layout and golden module names belong to `DL-16`; this decision supplies the observability requirements those starter surfaces must satisfy.

### Failure policy

1. Missing required observability evidence is a hard verification failure, not an advisory warning.
2. Logs-only observability is insufficient for closure when traces, metrics, or correlation are omitted.
3. Shape-only fixtures, mocked emitters without actual instrumentation, hand-authored evidence artifacts, and synthetic-only logs are not closure evidence.
4. If the real generated golden path cannot run in the implementation environment, the affected closure is `pending-live/BLOCKED`, not green.
5. Observability must fail closed when sensitive data redaction policy from `DL-22` is unavailable for a sensitive assertion. Dependents that require exact redaction behavior remain blocked until `DL-22`/`I-18` supplies it.

### Downstream owner mapping

- `packages/observability/**`: owned by `I-19-observability-defaults-tests` after decision/audit prerequisites are green.
- Starter observability fixtures under `examples/starter-reference/generated-fixtures/observability/**`: owned by `I-19`.
- Full generated-starter rerun and cross-boundary proof: owned by `I-23-end-to-end-real-boundary-witness`.
- Evidence/failure taxonomy and Evidence Packet schema consumption: owned by `DL-10`/`I-09` and `DL-02`/`I-01`; DL-23 specifies observability evidence semantics only.
- CI/local artifact upload/parity: owned by `DL-18`/`I-20`.
- Docs/reference observability pages: owned by `DL-21`/`I-24`.
- Security redaction/secret policy: owned by `DL-22`/`I-18`.

## Alternatives considered

### No default observability

- decision: rejected
- rationale: backlog §23 requires observability defaults, verification-layer §5.12 requires critical paths to be observable, and the final strategy blocks `I-19`/`I-23` on logs/metrics/traces/correlation proof.
- consequences: v1 includes observability as a hard verification surface.

### Logs-only observability

- decision: rejected
- rationale: logs alone cannot prove trace propagation, metrics coverage, or cross-boundary correlation. The strategy explicitly requires logs/metrics/traces/correlation tests.
- consequences: downstream closure requires all four signal classes where the architecture exposes the relevant boundary.

### Framework-specific lock-in without abstraction

- decision: rejected
- rationale: direct Nest/Pino/browser/RN-specific calls at every call site would leak framework choices into core, make starter/harness reuse harder, and weaken verification capture.
- consequences: core uses a small typed `packages/observability` abstraction with adapters for Node/Nest/CLI/browser/RN environments.

### Full production-grade stack/dashboard now

- decision: rejected
- rationale: Prometheus/Grafana/Jaeger/cloud monitoring setup would overcomplicate the starter and belongs to production deployment/project configuration, not the minimal generated starter proof.
- consequences: v1 baseline uses local capture/test exporters and structured evidence. Remote exporters and dashboards may be documented or extended later.

### Selected balanced default

- decision: accepted
- rationale: Pino for Node JSON logs plus OpenTelemetry for traces/metrics provides mature standards, Nest/Node compatibility, portable W3C propagation, and feasible local evidence capture while keeping browser/mobile behind a small typed abstraction.
- consequences: future implementation can prove real emitted signals without requiring external backends or domain-specific telemetry.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy is safe for decision execution and preserves observability witness gates.
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies decision template, dependency declaration, evidence checklist, validator checklist, real-boundary policy, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies core/extension/sample-demo boundary and forbidden core telemetry vocabulary policy.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: Backlog, README, locked decisions, verification layer, mechanical gates, strategy, MST-R, and playbook define observability/default/proof requirements.
  blocks:
    - id: I-19-observability-defaults-tests
      reason: Primary implementation lane for packages/observability, starter observability fixtures, generated tests, and emitted evidence assertions.
    - id: I-23-end-to-end-real-boundary-witness
      reason: Full rerun must prove actual observability artifacts are emitted and consumed across generated critical paths.
    - id: I-16-starter-api-contracts-client-golden
      reason: Starter API/client golden path must expose boundaries that I-19 instruments without contradicting API contract ownership.
    - id: I-17-web-mobile-e2e-ui-verification
      reason: Web/mobile generated flows must carry correlation where those boundaries are available.
    - id: I-20-ci-local-parity-wiring
      reason: CI/local parity must preserve observability evidence artifacts when observability tests are required.
    - id: I-24-docs-reference-governance-polish
      reason: Public observability docs/reference must describe these defaults after implementation evidence exists.
  blocked_dependents:
    - id: I-19-observability-defaults-tests
      blocked_until: DL-23 is independently validated clean and peer decisions needed for implementation closure are available.
      relying_on: logging abstraction, tracing/metrics defaults, correlation strategy, generated test semantics, evidence assertions, and path ownership.
    - id: I-23-end-to-end-real-boundary-witness
      blocked_until: I-19 plus API/web/mobile/build/ship/security/CI dependencies are clean or explicitly pending-live/BLOCKED.
      relying_on: full real-boundary observability proof.
    - id: docs/CI/evidence lanes
      blocked_until: observability evidence semantics are implemented and integrated with DL-02/DL-10/DL-18/DL-21 ownership.
      relying_on: stable observability evidence meaning and artifact locations.
  required_before_finalizing:
    - id: DL-02-artifact-schemas / I-01-artifact-schemas-config
      required_content: Evidence Packet or compatible artifact schema can link observability log/metric/trace/correlation evidence without DL-23 inventing schema syntax.
    - id: DL-10-verification-implementation / I-09-verification-runner-evidence-failure-routing
      required_content: Verification/failure taxonomy can classify missing observability evidence, missing fields, redaction failures, and pending-live blockers.
    - id: DL-11-test-runner-tooling
      required_content: Exact generated test runner setup for observability tests.
    - id: DL-14-api-contract-mechanism
      required_content: API/provider/client seam that carries correlation headers and contract failures without schema duplication.
    - id: DL-16-starter-architecture
      required_content: Exact golden module/app layout and available API/web/mobile boundaries for observability demonstration.
    - id: DL-18-ci-cd-defaults
      required_content: CI artifact upload/parity mechanics for observability evidence.
    - id: DL-21-documentation-system
      required_content: Final public observability docs/reference structure.
    - id: DL-22-security-safety-model / I-18-security-safety-hooks-policy
      required_content: Exact sensitive-data, secret, and redaction policy consumed by logs/traces/metrics/evidence.
  deferrals:
    - deferred_question: Exact Evidence Packet field names and storage layout for observability evidence.
      rationale: Schema/storage syntax belongs to DL-02, DL-09, DL-10, and implementation lanes; DL-23 locks semantic requirements only.
      future_owner: DL-02-artifact-schemas / DL-10-verification-implementation / I-09
      allowed_now: true
      blocked_dependents:
        - I-19 closure if observability evidence cannot be represented machine-readably
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact test runner commands and assertion library syntax.
      rationale: Owned by DL-11; DL-23 locks required observability tests and failure semantics.
      future_owner: DL-11-test-runner-tooling / I-19-observability-defaults-tests
      allowed_now: true
      blocked_dependents:
        - I-19 generated test implementation closure
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact starter file layout, golden module names, and API/web/mobile route/component names.
      rationale: Owned by DL-16; DL-23 locks minimal demonstration requirements without inventing starter architecture.
      future_owner: DL-16-starter-architecture / I-16 / I-17 / I-19
      allowed_now: true
      blocked_dependents:
        - starter observability fixture closure until DL-16 layout is available
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact redaction catalog and sensitive-field policy.
      rationale: Owned by DL-22/I-18; DL-23 requires observability to respect it and blocks sensitive closure if unavailable.
      future_owner: DL-22-security-safety-model / I-18-security-safety-hooks-policy
      allowed_now: true
      blocked_dependents:
        - any observability error-path or evidence closure involving sensitive data
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-23-observability-defaults.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-23-observability-defaults/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** prerequisite and sibling decisions
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** prerequisite and sibling reports
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-23 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - /Users/lizavasilyeva/work/vibe-engineer/packages/**
    - /Users/lizavasilyeva/work/vibe-engineer/apps/**
    - /Users/lizavasilyeva/work/vibe-engineer/examples/**
    - /Users/lizavasilyeva/work/vibe-engineer/.github/**
    - /Users/lizavasilyeva/work/vibe-engineer/package.json
    - /Users/lizavasilyeva/work/vibe-engineer/turbo.json
    - /Users/lizavasilyeva/work/vibe-engineer/scripts/**
    - all non-DL-23 decision/report/work paths
  handoff_notes:
    - from: DL-23
      to: I-19-observability-defaults-tests
      condition: After DL-23 independent validation is clean and implementation prerequisites are green.
      shared_path_policy: disjoint
    - from: DL-23
      to: I-23-end-to-end-real-boundary-witness
      condition: After I-19 and all full starter dependencies are clean or explicitly pending-live/BLOCKED.
      shared_path_policy: disjoint
    - from: DL-23
      to: DL-02/DL-10/DL-11/DL-14/DL-16/DL-18/DL-21/DL-22
      condition: Peer owners preserve DL-23 observability semantics inside their own exact schemas, runners, starter, CI, docs, and security policies.
      shared_path_policy: disjoint_or_serialized_by_strategy
```

## Blocked dependents

- `I-19-observability-defaults-tests`: blocked until DL-23 is independently validated and implementation prerequisites are green.
- `I-23-end-to-end-real-boundary-witness`: blocked until I-19 evidence exists and the full generated starter path can be rerun or remains explicitly `pending-live/BLOCKED`.
- Starter lanes `I-16` and `I-17`: cannot close observability-sensitive golden API/web/mobile boundaries without preserving correlation propagation and evidence requirements assigned here.
- `I-20-ci-local-parity-wiring`: blocked from observability artifact parity closure until observability evidence paths are implemented.
- `I-24-docs-reference-governance-polish`: blocked from final public observability docs until implementation evidence exists.
- `DL-20B`, `DL-24B`, and `FINAL-BUGHUNT`: must audit/preserve this decision and cannot close while observability proof is missing or shape-only.

## Observability contract

### Structured logs and required fields

Every load-bearing structured log record emitted by core/starter observability instrumentation must include:

- `schemaVersion`;
- `timestamp` in UTC/RFC 3339 or equivalent typed timestamp format selected by implementation schemas;
- `severity`: domain-neutral level such as `debug`, `info`, `warn`, `error`, or `fatal`;
- `service.name` or equivalent component identity;
- `surface`: one of a bounded set such as `harness`, `api`, `web`, `mobile`, `verification`, or `starter-reference`;
- `operation.name` using generic names;
- `event.name` using generic names;
- `correlationId`;
- `traceId` when a trace/span exists;
- `spanId` when a current span exists;
- `requestId` when request-shaped;
- `runId` when verification/build/ship-shaped;
- `outcome`: `started`, `succeeded`, `failed`, `blocked`, or equivalent bounded status;
- `durationMs` when recording completion/duration events;
- `error.type`, `error.message`, and `error.stackRef` or redacted equivalent for error records, subject to DL-22;
- `redaction.status` or equivalent evidence marker when sensitive fields are handled.

Required fields must be schema-validated by implementation-owned tests. Free-form message strings may exist but cannot be the only carrier of load-bearing data.

### Correlation/request ID inclusion

- `correlationId` is required on logs, spans, metrics/evidence labels where feasible, verification evidence, and API response/request metadata where applicable.
- `requestId` is required for request-shaped API/client boundaries.
- `traceId`/`spanId` must be included in logs emitted inside a span.
- Metrics must avoid high-cardinality raw IDs in normal metric labels unless the value is captured only in test/evidence mode. Production-oriented metric labels should join by trace/correlation through evidence/logs/traces rather than unbounded labels.

### Tracing/span defaults and propagation boundaries

Required generic span attributes include:

- service/component identity;
- surface;
- operation name;
- correlation ID;
- request ID when applicable;
- route/template or generic operation identifier where available;
- result/outcome;
- error status and redacted error classification for failures;
- verification run ID for observability verification spans.

Propagation boundaries:

- inbound API request → API handler/context;
- API handler → logs/metrics/traces/evidence;
- web/mobile generated client → API request headers;
- API response → client evidence where applicable;
- verification runner → generated critical-path invocation and evidence collector;
- build/ship verification evidence where observability checks are run.

### Metrics categories and naming/label constraints

Required metric categories:

- `request.count` and `request.duration`;
- `client.call.count` and `client.call.duration`;
- `operation.count` and `operation.duration`;
- `error.count`;
- `verification.run.count` and `verification.run.duration`;
- `observability.assertion.count` for pass/fail assertion accounting where useful.

Naming constraints:

- names are generic and domain-neutral;
- labels are bounded enums or low-cardinality identifiers such as surface, operation, outcome, status class, runner id, and component;
- raw user content, secrets, tokens, unbounded request IDs, or business-domain object names are forbidden in core metric labels;
- consuming projects may add project-specific metrics through extension/configuration boundaries, not harness core defaults.

### Error-path observability

Error paths must emit:

- an error-level structured log with correlation and trace context;
- an error span status/event with redacted classification;
- an error metric increment with bounded labels;
- verification evidence that demonstrates the error was observable and that sensitive values were absent/redacted per DL-22.

An implementation that logs the error but omits error span/metric/correlation evidence is not green for I-19 closure.

### Redaction/security interaction

- Logs, spans, metrics, and evidence must respect DL-22 secret, production credential, redaction, and audit/evidence policies.
- Sensitive raw values must not appear in observability records or evidence. Evidence may include redacted placeholders, stable non-secret fingerprints where DL-22 permits, rule ids, and artifact refs.
- If exact redaction semantics are unavailable because DL-22/I-18 is not green, any dependent that exercises sensitive observability paths remains blocked.

### Evidence artifact shape at decision level

DL-23 does not own exact Evidence Packet schema fields. It requires observability evidence to be machine-readable enough to include:

- run id and producer/consumer identity;
- paths/refs to captured structured logs, metrics, traces/spans, and assertion output;
- correlation join matrix showing expected IDs across emitted artifacts;
- positive/negative assertion results;
- error-path and redaction assertion results;
- missing-signal classifications;
- `pending-live/BLOCKED` status when the actual golden path cannot run.

Exact schema, serialization, and retention belong to DL-02/DL-10/DL-18/DL-21 owners.

## Generated starter demonstration policy

The generated/reference starter should demonstrate only enough observability to prove the defaults:

1. one generic successful critical path through the available API/web/mobile boundary selected by DL-16;
2. one generic error path that records error observability and redaction-compatible evidence;
3. local capture/test exporters for logs, metrics, and traces;
4. generated tests that consume emitted artifacts;
5. concise docs/reference text after implementation, owned by DL-21/I-24.

It must not add production dashboards, alerting rules, cloud accounts, project-specific event taxonomies, or broad telemetry catalogs to the starter baseline.

## Verification/witness consequences

- deterministic checks affected: observability package tests, generated starter observability tests, evidence collector assertions, failure taxonomy mapping, CI/local evidence preservation, redaction/security checks, and domain-neutrality checks.
- positive witnesses required downstream:
  - actual golden critical path emits structured logs, metrics, traces/spans, and correlation IDs;
  - verification consumes those emitted artifacts and records evidence refs;
  - API/web/mobile propagation is proven where DL-16 architecture exposes those boundaries;
  - error path emits error log, error metric, error span/status, and redaction-compatible evidence;
  - starter demonstration remains minimal and domain-neutral.
- negative witnesses required downstream:
  - missing `correlationId`, `requestId` where request-shaped, `traceId`/`spanId` where span-shaped, required log field, required metric category, or required span attribute fails;
  - direct ad-hoc unstructured console output as the core default fails;
  - logs-only observability fails;
  - hand-authored observability artifacts, fake logs, mocked-only emitters, or shape-only fixtures fail implementation closure;
  - sensitive values in logs/traces/metrics/evidence fail or block per DL-22;
  - domain-specific telemetry names in core fail unless explicitly sample/demo/negative-example-labeled.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - two-repo direction, six skills, artifact flow, fixed starter stack, Playwright/Maestro/Detox, automatic verification/context, mechanical gates, and no-push-without-approval remain uncontradicted;
  - DL-20B and DL-24B audit roles remain intact;
  - exact artifact schemas remain DL-02-owned;
  - exact test tooling remains DL-11-owned;
  - exact starter shape remains DL-16-owned;
  - exact security/redaction policy remains DL-22-owned.
- real_boundary_required: yes for later implementation seams; no live runtime seam is created by this decision artifact.
- real_boundary_status: not_applicable for DL-23 artifact; required_before_closure for `I-19` and rerun through `I-23`.
- earliest required proof:
  - producer: actual harness/starter observability instrumentation in `packages/observability/**` and starter API/web/mobile instrumentation;
  - carrier: actual structured log records, metric samples, trace/span context, and correlation/request ID values emitted during generated golden critical path and error path;
  - consumer: actual verification/evidence collector/assertions used by `I-19`, rerun through `I-23` and CI/local parity where applicable.
- closure rule: fake/mock/synthetic proof is shape-only. If the actual generated golden path cannot run, closure is `pending-live/BLOCKED`.

## Ownership/path consequences

DL-23 decision execution owns only:

- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-23-observability-defaults.md`;
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-23-observability-defaults/**`.

Future implementation ownership follows the final strategy:

- `I-19-observability-defaults-tests`: `packages/observability/**`, `examples/starter-reference/generated-fixtures/observability/**`, `.vibe/work/I-19-observability-defaults-tests/**`.
- `I-23-end-to-end-real-boundary-witness`: full witness fixture/evidence paths assigned by strategy.
- `I-20`: CI/local parity and artifact upload paths, serialized for root/CI ownership.
- `I-24`: observability docs/reference paths after implementation evidence exists.

No production packages, starter fixtures, root config, CI, scripts, or docs outside this decision artifact were touched by DL-23.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected: this decision artifact and future core observability package, starter observability fixtures, generated tests, evidence assertions, docs/reference, and consuming-project extension points.
- surface classification: core observability defaults are harness core; generated starter demonstration is sample/demo/reference; consuming-project telemetry vocabulary is extension/configuration.
- allowed generic terms: operation, request, command, skill, artifact, module, package, verification run, error, span, metric, trace, context propagation, log, event, evidence, correlation, request ID.
- project/business terms: none are core defaults. Ecommerce/inventory/fashion/Billz/Telegram/Instagram-like business concepts and equivalent project-specific event names are forbidden in core observability defaults.
- sample/demo boundary: starter telemetry examples must be explicitly sample/demo/reference and generic; they must not become core defaults.
- extension boundary: consuming projects may add their own telemetry names, dashboards, alert rules, and business events through extension/configuration boundaries only.
- deterministic enforcement owner mapping: `I-19` tests and `I-10`/mechanical/domain-neutrality gates where applicable; `I-24` docs checks; `DL-20B` and final bughunt audit.
- advisory owner mapping: later validators and final bughunt for subtle semantic leakage.
- positive generic case: `reference.operation.started`, `api.request.completed`, `client.call.failed`, and `verification.run.completed` are acceptable generic names.
- negative core leakage case: business-domain event names in `packages/observability/**` or core generated defaults are rejected unless explicitly negative-example or sample/demo-labeled outside core.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none. Initial target inventory showed no existing DL-23 decision artifact and only this report in the DL-23 work directory.
- production package/source/root config/CI/starter/git metadata writes: none.
- clean-tree request made: no.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Narrow implementation details are assigned and gated rather than left tribal:

- exact test runner commands/assertion syntax: `DL-11`/`I-19`;
- exact starter layout/golden route/component names: `DL-16`/`I-16`/`I-17`/`I-19`;
- exact Evidence Packet schema/storage/retention: `DL-02`/`DL-10`/`DL-18`/`I-09`/`I-20`;
- exact redaction catalog and sensitive-field policy: `DL-22`/`I-18`;
- exact docs location and public reference format: `DL-21`/`I-24`.

No dependent may treat those details as finalized until the named owner is green and proof exists. Dependents that need them must remain blocked.

## Evidence checklist

1. This execution report was created before the decision artifact and updated after stages.
2. Required source files were inspected and are cited by path and section heading.
3. Files changed are limited to this decision artifact and `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-23-observability-defaults/DL-23-execution-report.md`.
4. No production package/source/root config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Backlog §23 topics are resolved: logging library/abstraction, tracing defaults, metrics defaults, correlation ID strategy, generated observability tests, and starter demonstration scope.
7. Dependencies, blocked dependents, required sequencing, deferrals, owned/read-only/untouchable paths, and handoffs use the DL-24A dependency declaration format.
8. No peer-owned exact schema/test/starter/CI/docs/security detail is finalized by DL-23 without owner mapping and blocked dependents.
9. Verification/witness consequences include positive, negative, regression, and real-boundary requirements.
10. Evidence semantics are defined without usurping DL-02 schema ownership.
11. Error-path observability and missing-field failure expectations are defined.
12. DL-20A domain-neutrality checklist is applied.
13. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, fixed starter stack/E2E, automatic verification/context/evidence, mechanical gates, and no push/PR without approval.
14. This decision does not claim live implementation proof.

## Validation plan and severity policy

Independent Triad-B validation must inspect this actual decision artifact, this execution report, and available inventory/content evidence. It must not rely on implementer claims.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-23-observability-defaults.md` and follows DL-24A schema with exactly one output class.
- It resolves backlog §23 topics: logging abstraction/library, tracing defaults, metrics defaults, correlation ID strategy, generated observability tests, and starter demonstration scope.
- It maps observability proof to `I-19` and full rerun to `I-23`.
- Dependencies on `DL-10`, `DL-11`, `DL-14`, `DL-16`, `DL-18`, `DL-21`, and `DL-22` are declared without stealing ownership.
- It defines downstream witnesses for logs, metrics, traces, correlation data, error path, redaction interaction, missing-field failure, and verification evidence consumption.
- It applies DL-20A domain-neutrality policy.

### Negative witnesses

- Logs-only observability is rejected.
- Missing or mismatched correlation propagation is rejected.
- Ad-hoc unstructured `console.log` as core default is rejected.
- Shape-only or mocked-only observability tests are rejected for implementation closure.
- Domain-specific telemetry names in core are rejected unless explicitly sample/demo/negative-example-labeled.
- Observability that ignores DL-22 redaction/secret policy is blocked.

### Regression witnesses

- `vibe-engineer` name, two-repo direction, six skills, artifact flow, fixed starter stack, Playwright/Maestro/Detox, automatic verification/context, mechanical gates, and no-push-without-approval remain uncontradicted.
- DL-23 does not authorize production implementation.
- DL-20B and DL-24B audit roles remain intact.
- Exact artifact schemas remain owned by DL-02; exact test tooling by DL-11; exact starter shape by DL-16; exact security/redaction policy by DL-22.

### Sibling/blast-radius checks

- Check final strategy §§5.2, 6.2, 9.2, 10, and 11 for dependency/witness consistency.
- Check source docs listed above and prior decisions DL-24A/DL-20A.
- Check available sibling decisions for DL-02/DL-10/DL-14/DL-15/DL-22 consistency where present.
- Check no target paths outside DL-23 ownership changed.
- Check future owner references are coherent with final-strategy lane ownership.

### Dirty-tree safety checks

- Confirm the execution report existed before the decision artifact.
- Confirm no production package/source/root config/CI/starter/git metadata writes.
- Confirm no clean-tree request and no stash/reset/clean/checkout/restore.

### Severity policy

- `critical`: missing decision artifact; out-of-license write; contradiction of locked decisions; missing DL-24A/DL-20A compliance; no correlation strategy; no real-boundary proof plan for I-19; false claim that shape-only evidence is enough; advisory-only observability closure; security/redaction contradiction.
- `major-local`: incomplete source citation, incomplete dependency/owner mapping, incomplete backlog §23 coverage, or missing positive/negative/regression witness design limited to DL-23 paths.
- `minor-local`: wording/format issue that does not weaken gates.
- `clean`: all schema, source, ownership, domain-neutrality, and witness requirements satisfied.

## Known ambiguities / future owners

- `DL-02` owns exact Evidence Packet schemas, serialization, validation errors, and migrations. DL-23 owns only observability evidence semantics.
- `DL-10` owns verification runner/failure taxonomy integration. DL-23 requires missing observability evidence to be hard-blocking.
- `DL-11` owns exact test-runner setup and assertion tooling for generated observability tests.
- `DL-14` owns API contract/provider/client mechanism; DL-23 requires correlation propagation through that seam without changing API contract ownership.
- `DL-16` owns exact starter architecture, golden module, and app/package layout.
- `DL-18`/`I-20` own CI provider, artifact upload, cache, matrix, and local/CI parity details.
- `DL-21`/`I-24` own final public observability documentation/reference structure.
- `DL-22`/`I-18` own secret/redaction/security policy for observability records and evidence.
- `I-19` owns implementation and proof for `packages/observability/**` and starter observability fixtures.
- `I-23` owns full end-to-end rerun; any unavailable real environment remains `pending-live/BLOCKED`, not green.
