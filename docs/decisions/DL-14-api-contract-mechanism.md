# DL-14 — API Contract Mechanism

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-14 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-14-api-contract-mechanism.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-14-api-contract-mechanism/DL-14-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §5.2 `Decision-lock table`; §6.2 `Implementation DAG`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §12 `Mechanical gates plan`; §§14–18 evidence, dirty-tree, closure, and severity policy.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Decision-artifact checklist`; `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Implementation enforcement plan`; `Verification and witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §14 `API contract mechanism`; related §11 `Test runner and quality tooling choices`; §15 `Lint, boundary, and mechanical verification engine`; §16 `Starter kit detailed architecture`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§2–3 fixed stack and domain-neutral core; §8 `Schematics`; §9 `Verification model`; §§12–14 starter kit/harness relationship and implementation order; §16 locked decisions/backlog.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§2–3 two-repo direction and fixed starter stack; §7 `Schematics are internal/agent-facing`; §10 `Verification-layer decisions`; §11 `Mechanical verification gates`.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §5.2 `Type checking and type-safety gates`; §5.6 `Contract and adapter tests`; §7 `Planning orchestrator design`; §8 `Build orchestrator design`; §9 `Failure routing and fixing`; §14 `Blocking policy summary`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §1 `Core verification doctrine`; §5 `Schema and contract strictness gate`; §7 `Quality wiring-integrity gate`; §§11–13 verification fit, implementation priority, and final invariant.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md` — `Decision summary`; `Validation and type-generation consequences`; `Known ambiguities / future owners`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-08-schematics-system.md` — `Schematic scope and initial set`; `Known ambiguities / future owners`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md` — `Decision summary`; `Evidence packet requirements`; `Failure classification taxonomy`; `Known ambiguities / future owners`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§0, 5.2, 10, 11 evidence, triad, dirty-tree, and real-boundary doctrine.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

V1 API contracts use a contract-first TypeScript HTTP strategy: `ts-rest` route contracts with named Zod runtime schemas are the canonical API contract source of truth. The selected mechanism is not pure OpenAPI-first, not tRPC, and not bare Zod schemas without route/client contract semantics.

The canonical starter contract package owns named reusable Zod schemas and `ts-rest` contracts for each API route, status code, request part, and response body. NestJS providers implement those contracts through the selected `ts-rest` Nest-compatible adapter or a contract-derived adapter generated from the same source. React web and React Native consume a generated/shared API client package derived only from the same contracts. OpenAPI may be generated from the contract as a secondary documentation/interoperability artifact, but it is not the source of truth.

## Decision details

### Accepted v1 mechanism

1. The v1 API contract mechanism is **`ts-rest` contract-first HTTP APIs with named Zod runtime schemas**.
2. Canonical source of truth lives in the starter/harness contract surface chosen by future package/starter owners, conceptually `packages/contracts` for the generated/reference starter and `packages/contracts` or equivalent harness fixture paths for `I-11`.
3. Each important API boundary shape must have a named reusable schema, for example `ExampleRequestSchema`, `ExampleResponseSchema`, `ExampleContract`, or `RecordFixtureSchema` in sample/demo contexts.
4. Route definitions must name HTTP method, path, path params, query, headers where relevant, request body schema, response status codes, and response body schemas in a `ts-rest` contract.
5. Zod schemas are runtime contracts. TypeScript types are inferred/generated from those schemas/contracts; hand-authored interfaces may be local convenience projections only and must not become the source of truth.
6. OpenAPI is a generated projection from the same contract for docs/tooling; no implementation lane may edit OpenAPI by hand or treat OpenAPI as the authoritative v1 contract.

### Runtime validation responsibilities

1. API request path params, query params, headers, bodies, and any external/input payload enter the boundary as `unknown` or equivalently untrusted values.
2. The NestJS provider must validate request data against the named contract schemas before application logic uses it.
3. The provider must validate response payloads against the declared response schemas before sending them. An invalid provider response is a contract failure and must fail closed with evidence; it must not be trusted because TypeScript compiled.
4. The generated/shared client must type requests and responses from the same contract and must validate received response payloads before exposing them to React or React Native consumers when the response crosses the network boundary.
5. Consumer code must not define duplicate DTO/schema shapes for API payloads. It imports contract-derived types/client functions from the shared/generated client package.
6. External adapter payloads, web/native form/input payloads, persisted JSON blobs, env/config, webhook/event payloads, and generated artifact files remain subject to the broader mechanical rule: validate unknown boundary data through named runtime schemas before use.

### Generated/shared client strategy

1. The starter contains an `api-client` package or generated client artifact derived from the canonical `ts-rest` contract package.
2. React web imports the generated/shared client, including a contract-derived query/mutation adapter where chosen by implementation, rather than writing hand-authored fetch wrappers with duplicated types.
3. React Native imports the same generated/shared client source or a generated platform-safe artifact from it. Platform adapters may differ for fetch/base URL/auth transport, but request/response schemas and route contracts must not fork.
4. Generated client artifacts must be reproducible from the contract source. Stale generated output, hand-edited generated clients, or generated clients derived from a different contract source are mechanical failures.
5. Client generation/wrapping may be implemented by a deterministic script, schematic, package build step, or library-provided factory, but all outputs must consume the same `ts-rest` contract and named schemas.

### NestJS API/provider compatibility requirements

1. NestJS remains the fixed v1 API framework.
2. API providers must implement routes through the selected `ts-rest` Nest-compatible adapter or a generated Nest adapter that consumes the canonical contract source.
3. Nest DTO classes, decorators, Swagger annotations, or OpenAPI decorators may be generated projections for compatibility/docs only; they must not be separately maintained canonical DTO definitions.
4. Provider implementation must be able to prove request validation, response validation, status-code correctness, and generated-client compatibility in a real Nest-compatible fixture before `I-11` closes.
5. If the chosen library/adapter cannot support a required validation/projection without duplicated schemas, the implementation lane must stop `BLOCKED` and route a DL-14-compatible fix; it may not silently adopt duplicate DTOs or weaker validation.

### Schema duplication policy

Forbidden:

- defining provider DTOs and client DTOs separately for the same payload;
- hand-authoring TypeScript interfaces as canonical API schemas;
- manually editing generated OpenAPI or generated clients as the source of truth;
- creating separate web/mobile schemas that mirror provider schemas;
- using broad `Record<string, unknown>`, bare object/list/map shapes, or unvalidated JSON as important API contract models.

Allowed only as projections from the canonical contract source:

- inferred TypeScript types;
- generated client wrappers;
- generated OpenAPI;
- generated Nest adapter/DTO/doc metadata if needed;
- test fixtures derived from named schemas while still proving real provider/client behavior.

### Type-safety and unknown-boundary policy

- Strict TypeScript is mandatory but not sufficient.
- Boundary values are not trusted because a generic type says they are valid.
- `any`, unreviewed `as unknown`/`as any`, non-null escape patterns, unvalidated `JSON.parse`, and broad domain models are rejected by mechanical gates unless a future allowlist policy explicitly and narrowly permits a non-load-bearing exception.
- Contract implementers must model absence, status variants, error responses, and important identifiers explicitly through named schemas.

## Alternatives considered

### OpenAPI + generated client

- decision: rejected as canonical v1 source; accepted only as generated projection.
- rationale: OpenAPI produces strong interop and documentation, but OpenAPI-first would make the TypeScript/Zod authoring loop less direct for agents, creates pressure to maintain Nest DTOs/OpenAPI schemas separately, and increases provider/client schema duplication risk. It is still valuable as generated docs/tooling from the canonical contract.
- consequences: future lanes may generate OpenAPI from `ts-rest` contracts, but no lane may hand-maintain OpenAPI as the authoritative API contract.

### tRPC

- decision: rejected.
- rationale: tRPC provides excellent end-to-end TypeScript inference, but it is a poorer fit for the locked NestJS HTTP API/provider direction, explicit REST contracts, OpenAPI projection, non-web clients, and contract tests that should prove real HTTP provider/client behavior.
- consequences: v1 preserves standard HTTP contract semantics and generated clients usable by React web and React Native without coupling the starter to tRPC router/runtime assumptions.

### ts-rest with named Zod schemas

- decision: accepted.
- rationale: It gives TypeScript-first route contracts, named runtime Zod schemas, HTTP semantics, good React/React Native client consumption, Nest-compatible provider integration, OpenAPI projection options, agent-readable contracts, and feasible minimal real-boundary proof.
- consequences: implementation lanes must prove provider request/response validation and generated/shared client consumption from one contract source; library gaps become blockers, not excuses to duplicate schemas.

### Zod/schema-first contracts without a route-contract/client framework

- decision: rejected as incomplete.
- rationale: Zod alone covers runtime shapes, but backlog §14 also requires generated clients, NestJS compatibility, route/status semantics, and contract tests. Bare schemas leave too much to future lanes and would reopen the core mechanism.
- consequences: Zod is accepted as the runtime schema layer only inside a `ts-rest` contract-first mechanism.

### Other named strategy: GraphQL schema-first

- decision: rejected.
- rationale: GraphQL can provide typed contracts but would change the HTTP/API style, add resolver/codegen complexity, and is not required by the fixed starter direction. It is less direct for simple NestJS REST examples and generated React Native clients in v1.
- consequences: future project extensions may use GraphQL outside core defaults only by an explicit project-owned extension decision; v1 starter defaults remain `ts-rest` HTTP contracts.

## Evaluation matrix

| Criterion | OpenAPI + generated client | tRPC | ts-rest + named Zod schemas | Bare Zod/schema-first | GraphQL schema-first |
| --- | --- | --- | --- | --- | --- |
| end-to-end TypeScript safety | medium; codegen-dependent | high | high | medium unless extra framework added | medium/high; codegen-heavy |
| runtime validation | high if wired; duplication risk | medium/high with schemas | high via named Zod schemas | high for shapes only | high if resolvers validate |
| generated client quality | high for REST clients | high but tRPC-specific | high/shared contract client | underspecified | high but GraphQL-specific |
| NestJS compatibility | high but often DTO/OpenAPI-driven | weaker/non-native for Nest REST | high with Nest adapter/contract implementation | partial | possible but changes API model |
| React/RN consumption | high | high for TS clients but RPC-coupled | high via shared client/fetch/query adapters | underspecified | high with GraphQL client |
| agent readability | medium; YAML/spec verbose | medium; router semantics | high; TS contracts + named schemas | high shapes, weak routes | medium; SDL/resolvers |
| testability | high but may test spec not provider | high but less HTTP contract focus | high real provider/client fixture feasible | partial | high but heavier |
| maintainability | medium; spec/code drift risk | medium; framework coupling | high; single TS contract source | medium; custom glue grows | medium; added stack complexity |
| schema duplication risk | medium/high | low | low if enforced | medium | medium |
| real-boundary witness feasibility | high | medium | high | medium | medium |
| mechanical-gate fit | medium; generation drift checks needed | medium | high; named schemas + contract source | medium | medium |
| domain-neutrality fit | high if generic | high if generic | high if generic | high if generic | high if generic |

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies decision template, dependency format, evidence checklist, real-boundary policy, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies core/extension/sample-demo boundary and allowed/forbidden vocabulary policy.
    - id: DL-02-artifact-schemas
      type: decision
      required_status: LOCKED
      rationale: Locks harness artifact schema strictness; DL-14 must not weaken runtime schema/boundary doctrine.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: Strategy, README, locked decisions, verification layer, mechanical gates, backlog, playbook, and quality bar define API contract requirements.
  blocks:
    - id: I-11-contract-strictness-minimal-real-fixture
      reason: Needs selected API contract mechanism, source-of-truth policy, validation duties, duplication ban, and real-boundary witness contract.
    - id: I-16-starter-api-contracts-client-golden
      reason: Needs starter API/contracts/client mechanism for Nest provider, generated/shared client, React web, and React Native consumers.
    - id: DL-15-mechanical-engine / I-10-I-13 mechanical lanes
      reason: Schema/contract strictness and duplicate-schema/generated-client gates must enforce this mechanism.
    - id: DL-08-schematics-system / I-07-schematics-engine
      reason: Contract/API endpoint schematics must emit this mechanism once starter-heavy content is enabled.
  blocked_dependents:
    - id: I-11-contract-strictness-minimal-real-fixture
      blocked_until: DL-14 is independently validated clean and DL-11/DL-15 prerequisites needed for implementation closure are green.
      relying_on: ts-rest + named Zod schemas, contract-source-of-truth rules, provider/client validation, duplication ban, and minimal real-boundary proof.
    - id: I-16-starter-api-contracts-client-golden
      blocked_until: I-11 is clean and DL-14, DL-16, and DL-11 are green.
      relying_on: full starter Nest API + generated/shared client + React/RN contract join.
    - id: contract strictness/mechanical gate closure
      blocked_until: DL-14 is clean and I-11 proves minimal real behavior.
      relying_on: named runtime schemas, no duplication, generated client from same contract source, and real behavior tests.
    - id: starter/create/API contract schematics
      blocked_until: DL-14 plus DL-08/DL-16/DL-11 and relevant implementation lanes are green.
      relying_on: contract schematic/API endpoint template content.
  required_before_finalizing:
    - id: DL-11-test-runner-tooling
      required_content: Test runner/tooling must support contract tests, integration tests, and generated client/provider witnesses required by I-11/I-16.
    - id: DL-15-mechanical-engine
      required_content: Mechanical schema/contract strictness gate must detect unvalidated payloads, duplicate schemas, stale generated clients, and parser self-agreement tests.
    - id: DL-16-starter-architecture
      required_content: Starter app/package layout must place contracts and api-client so Nest/web/RN consume one source.
    - id: DL-08-schematics-system
      required_content: Contract/API endpoint schematics must generate ts-rest/Zod contract stubs and tests without business-domain defaults.
    - id: DL-22-security-safety-model
      required_content: API/client generation, external payloads, secrets, auth headers, env/base URLs, and network safety policies must align with this contract mechanism.
    - id: DL-23-observability-defaults
      required_content: API request/response contract failures and generated-client calls must preserve correlation/log/trace evidence where required.
  deferrals:
    - deferred_question: Exact package paths, script names, codegen command names, and adapter implementation details for ts-rest/Zod contracts.
      rationale: Package layout belongs to DL-01/DL-16 and implementation lanes; this decision locks the mechanism and obligations.
      future_owner: DL-01, DL-16, I-11, I-16, I-07/I-15 where generated templates are involved
      allowed_now: true
      blocked_dependents:
        - any implementation lane attempting to finalize concrete paths/scripts before its owner decision
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-14-api-contract-mechanism.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-14-api-contract-mechanism/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** sibling/prerequisite decisions
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** sibling/prerequisite reports and inventory
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-14 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - production package/source paths
    - root config files
    - CI files
    - CLI files
    - schema packages
    - mechanical gate packages
    - generated starter files
    - docs not explicitly owned by DL-14
    - any decision/report/work path not owned by DL-14
    - /Users/lizavasilyeva/work/harness-starter/**
  handoff_notes:
    - from: DL-14
      to: I-11-contract-strictness-minimal-real-fixture
      condition: After DL-14 independent validation is clean and DL-11/DL-15 implementation prerequisites are available.
      shared_path_policy: disjoint
    - from: DL-14
      to: I-16-starter-api-contracts-client-golden
      condition: After I-11 minimal proof is clean and starter architecture/test decisions are green.
      shared_path_policy: disjoint
    - from: DL-14
      to: DL-08, DL-11, DL-15, DL-16, DL-22, DL-23
      condition: Peer decisions must preserve these API contract constraints within their owned scopes.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-11-contract-strictness-minimal-real-fixture` — blocked until DL-14 is independently validated and required test/mechanical prerequisites are available for implementation closure.
- `I-16-starter-api-contracts-client-golden` — blocked until `I-11` proves the minimal real provider/client/consumer seam and DL-16/DL-11 are green.
- Contract strictness/mechanical lanes — blocked from closing schema/contract strictness without DL-14 enforcement and `I-11` real behavior proof.
- Starter create/API/client/template lanes — blocked from final API contract templates until DL-14 constraints are applied with DL-08/DL-16/DL-11.
- `DL-20B`, `DL-24B`, `I-23`, and `FINAL-BUGHUNT` must audit/preserve this decision before final closure.

## Verification/witness consequences

- deterministic checks affected: contract schema validation, generated client freshness, provider request validation, provider response validation, client response validation, duplicate schema detection, strict TypeScript/no-escape checks, OpenAPI projection drift checks where generated, contract-test behavior checks.
- positive witnesses required downstream:
  - `I-11`: valid request/response roundtrip through actual minimal Nest-compatible provider and generated/shared client succeeds.
  - `I-11`: React/RN-like consumer fixture imports and calls the generated/shared client rather than a hand-authored mock.
  - `I-16`: full starter Nest API, generated/shared client, React web consumer, and React Native consumer join with the same contract source.
- negative witnesses required downstream:
  - invalid request body/query/path/header is rejected at the provider boundary before application logic.
  - invalid provider response is rejected before successful send/client exposure.
  - client receives schema-invalid response and fails closed instead of exposing typed-but-invalid data.
  - duplicated provider/client/consumer schemas are detected and fail.
  - generated client not derived from the canonical contract source fails.
  - a contract test that validates only parser self-agreement without real provider/client behavior fails.
- regression witnesses required downstream:
  - fixed stack remains NestJS + React + React Native + strict TypeScript + shared contracts/client.
  - product/package/CLI name remains `vibe-engineer`.
  - six skills and artifact flow remain unchanged.
  - mechanical schema/contract strictness remains a hard future requirement.
  - DL-02, DL-08, DL-11, DL-15, DL-16, DL-22, and DL-23 ownership is not stolen.
- real_boundary_required: yes for downstream implementation; no production runtime seam is created by this decision artifact.
- real_boundary_status: required_before_closure for `I-11` and `I-16`; not_applicable for this decision artifact.
- earliest required proof:
  - lane: `I-11-contract-strictness-minimal-real-fixture`.
  - producer/provider: actual minimal Nest-compatible provider implementing a `ts-rest` contract with named Zod schemas.
  - carrier: actual generated/shared client artifact or package derived from the same contract source.
  - consumer: actual consumer fixture importing and calling that generated/shared client.
  - closure rule: shape-only/fake/mock tests cannot close `I-11`; if the live proof cannot run, `I-11` must be `pending-live/BLOCKED`.
- full starter proof:
  - lane: `I-16-starter-api-contracts-client-golden`.
  - producer/provider: generated/reference starter Nest API.
  - carrier: starter contracts package plus generated/shared api-client package.
  - consumers: React web and React Native starter consumers.
  - closure rule: if actual starter join cannot run, `I-16` must be `pending-live/BLOCKED`.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-14-api-contract-mechanism.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-14-api-contract-mechanism/**`
- read_only_paths:
  - all cited source docs under `/Users/lizavasilyeva/work/harness-starter/**`;
  - prerequisite/sibling decisions and reports in `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/**` and `.vibe/work/**`;
  - target repo inventory outside DL-14 owned paths.
- untouchable_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.git/**`;
  - production package/source paths, root config, CI, CLI, schema packages, mechanical gate packages, generated starter files;
  - docs not explicitly owned by DL-14;
  - any non-DL-14 decision/report/work path.
- serialized/shared ownership notes:
  - none for this decision artifact.
  - future contract implementation paths are owned by `I-11`; future starter API/contracts/client fixture paths are owned by `I-16`; future schematics/create paths are owned by `I-07`/`I-15`; future mechanical gate paths are owned by `DL-15`/`I-10`-`I-13`.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected: API contract decision text, future contract package, generated client, Nest provider fixture, React/RN consumer fixtures, contract/API endpoint schematics, tests, docs/examples.
- surface classification: v1 mechanism is core/starter infrastructure; future generated starter examples are sample/demo/reference; consuming-project API domains are project-owned extensions.
- allowed generic terms: contract, schema, API, endpoint, provider, client, consumer, request, response, route, module, fixture, ExampleContract, SampleEndpoint, RecordFixture, GenericEntity, ReferenceFlow.
- project/business terms: none are core defaults here. Any business-domain vocabulary in future consuming projects must be extension-owned or explicitly sample/demo-labeled, and forbidden core examples from DL-20A remain negative examples only.
- examples policy: use `ExampleContract`, `SampleEndpoint`, `RecordFixture`, `GenericEntity`, or `ReferenceFlow` for core/sample explanations.
- generated starter sample/demo content must be labeled and replaceable; it must not become the core contract policy.
- deterministic enforcement owners: `DL-15`/`I-10`-`I-13` for mechanical checks, `I-11` for minimal contract fixture, `I-16` for starter join, `I-07`/`I-15` for schematic/create boundaries, `DL-20B` and `I-24` for audits/docs.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes
- conflicts discovered: none. Before this report was created, no existing DL-14 decision artifact or DL-14 work content was visible. Later inventory showed sibling decision/report paths, which were treated as read-only and not edited.
- production/package/root/config/CI/generated starter files edited: no.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Narrow implementation mechanics are assigned to future owners without reopening the core mechanism:

- deferred_question: exact package paths and build/generation command names for contracts and api-client.
- reason_now: package/starter layout and scripts belong to DL-01/DL-16 and implementation lanes.
- future_owner: DL-01, DL-16, I-11, I-16, I-07/I-15 where schematics/create are involved.
- required_before_finalizing: any implementation lane that claims concrete paths/scripts.
- blocked_dependents: implementation closure for concrete package/script layout if owner decisions are missing.
- proof_no_dependent_relies_now: dependents can rely on the locked mechanism and obligations, but cannot finalize concrete paths/scripts until their owner lanes decide/implement them.

No v1 mechanism choice, source-of-truth rule, runtime validation responsibility, generated/shared client obligation, schema duplication rule, or real-boundary witness requirement is deferred.

## Evidence checklist

1. Report artifact was created first at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-14-api-contract-mechanism/DL-14-execution-report.md`.
2. Required source files were inspected and are cited above by path/section.
3. Files changed are this decision artifact and the DL-14 execution report only.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, owned/read-only/untouchable paths, and handoffs use the DL-24A dependency declaration format.
7. DL-24A and DL-20A were read and applied; both prerequisites are `LOCKED` and independently validated `PASS`.
8. Backlog §14 option set is evaluated: OpenAPI + generated client, tRPC, ts-rest, Zod/schema-first, and GraphQL as another named strategy.
9. Selected mechanism supports NestJS API, React web, React Native mobile, strict TypeScript, and shared contracts/client.
10. Runtime validation is required for API requests, API responses, client responses, and external/input payloads before use.
11. Important boundary shapes require named reusable schemas/contracts, not bare object/list/map shapes.
12. Provider/client/consumer schema duplication is forbidden; generated clients must derive from the same contract source or a generated artifact from it.
13. Contract tests must validate real provider/client behavior, not parser self-agreement.
14. Early minimal real-boundary proof is assigned to `I-11`; full starter proof is assigned to `I-16`.
15. DL-20A domain-neutrality is satisfied with generic examples and sample/demo boundaries.
16. No live runtime proof is claimed by this decision artifact itself.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and any available diff/inventory, not just this artifact or report.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-14-api-contract-mechanism.md`.
- Execution report exists at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-14-api-contract-mechanism/DL-14-execution-report.md` and records report-first creation.
- Artifact follows DL-24A template/status/output-class/dependency/evidence/ownership/domain-neutrality fields.
- Mechanism is concrete: `ts-rest` + named Zod runtime schemas with generated/shared client and optional generated OpenAPI projection.
- Evaluation covers the required backlog options and criteria.
- Runtime validation, no duplication, generated-client source, Nest/web/RN responsibilities, and I-11/I-16 real-boundary witnesses are explicit.

### Negative witnesses

- Reject any DL-14 reading that leaves OpenAPI/tRPC/ts-rest/Zod unresolved while allowing `I-11` or `I-16` to proceed.
- Reject duplicated provider/client/consumer schemas.
- Reject a generated client not derived from the canonical contract source.
- Reject API payloads treated as trusted typed data without runtime validation.
- Reject contract tests that only prove parser self-agreement without actual provider/client/consumer behavior.
- Reject project/business vocabulary as core default contract policy unless explicitly negative-example or sample/demo-labeled per DL-20A.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Fixed starter stack remains NestJS + React + React Native + strict TypeScript + shared contracts/client.
- Six skills and artifact flow remain unchanged.
- Mechanical schema/contract strictness remains a hard future requirement.
- DL-02, DL-08, DL-11, DL-15, DL-16, DL-22, and DL-23 ownership is not stolen.
- DL-20B and DL-24B remain later audits.
- No production implementation is authorized by this decision.

### Sibling/blast-radius checks

- Check final strategy §§5.2, 6.2, 9.2, 10, 11, and 12 for dependency/witness consistency.
- Check backlog §14 for full option/criteria coverage.
- Check README and locked decisions for fixed stack compatibility.
- Check verification-layer §5.2 and §5.6 for type-safety and contract-test alignment.
- Check mechanical gates §5 for named runtime schemas, no schema duplication, generated client from same contract source, and real behavior tests.
- Check DL-24A template compliance and DL-20A domain-neutrality compliance.
- Check target repo inventory for writes outside DL-14 owned paths.

### Severity policy

- `critical`: missing artifact/report; out-of-license write; contradiction of locked stack/domain-neutrality/mechanical gates; unresolved mechanism while `LOCKED`; no runtime-validation requirement; schema duplication allowed; false real-boundary closure; missing `I-11`/`I-16` witness consequences.
- `major-local`: incomplete option evaluation, unclear owner handoff, incomplete evidence checklist, weak validation plan, or ambiguous generated-client/provider/consumer responsibility limited to DL-14 paths.
- `minor-local`: citation/wording issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all requirements satisfied with no residual blocker.

## Known ambiguities / future owners

- `DL-02` owns harness artifact JSON schemas and generated TypeScript type mechanics; DL-14 owns starter/API contract mechanism and must not weaken DL-02 strictness.
- `DL-08`/`I-07` own contract/API endpoint schematic generation and must emit `ts-rest`/Zod stubs once their starter-heavy contract templates are in scope.
- `DL-11` owns exact unit/integration/contract test tooling and must support I-11/I-16 witnesses.
- `DL-15` owns exact mechanical enforcement for duplicate schemas, unvalidated payloads, stale generated clients, and parser-self-agreement tests.
- `DL-16` owns exact starter package/app layout and golden module shape while preserving the one-source contract/client policy.
- `DL-22` owns security/safety for env/base URLs/auth headers/secrets/network policy and external payload safety.
- `DL-23` owns observability defaults for request/client/correlation evidence.
- `I-11` owns minimal actual provider+generated-client+consumer fixture; if it cannot prove the selected mechanism at the real boundary, it must stop `pending-live/BLOCKED`.
- `I-16` owns full starter Nest API + generated/shared client + React/RN proof; if it cannot run the actual join, it must stop `pending-live/BLOCKED`.
