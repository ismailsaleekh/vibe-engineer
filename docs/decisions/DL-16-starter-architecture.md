# DL-16 — Starter Architecture

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-16 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-16-starter-architecture.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-16-starter-architecture/reports/decision-lock-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §16 `Starter kit detailed architecture`; related §§11-14, 17-18, 22-24.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.2 `Generated starter kit hypothesis`; §5.2 row `DL-16-starter-architecture`; §6.2 `Implementation DAG`; §8 `Pass sizing and allocation`; §9.2/§9.3 ownership; §10 verification matrix; §11 real-boundary witness plan; §§14-18 evidence, dirty-tree, closure, and severity rules.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §§1, 4, 5, 7, 9, 10.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-01-repo-package-structure.md` — `Exact repository names`; `Package and publishability table`; `Starter consumption model`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-06-agentic-harness-integrations.md` — `Decision summary`; `Common harness adapter abstraction`; `Pi v1 integration decision`; `Pi generated-file families`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` — `CLI surface matrix`; `Interactive and non-interactive behavior`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-08-schematics-system.md` — `Schematic scope and initial set`; `How schematics generate code + tests + context/docs stubs`; `Deferral rationale`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-09-context-memory-drift.md` — `Context storage decision`; `Drift detection and update decision`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md` — `Evidence packet requirements`; `Failure classification taxonomy`; `Build verifier selection from Verification Delta`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-12-mobile-e2e-details.md` — `Maestro / Detox split`; `Generated test selection rules`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-13-ui-verification-stack.md` — `UI verification stack requirements`; `Deterministic vs advisory boundary`; `Known ambiguities / future owners`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-14-api-contract-mechanism.md` — `Decision summary`; `Accepted v1 mechanism`; `Generated/shared client strategy`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-22-security-safety-model.md` — `Generated env/config conventions`; `External integration safe defaults`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§2, 12, 13, 15, 16.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§2-4, 6, 8-11.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§5.2, 5.6-5.8, 5.11-5.12, 10, 13-16.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1, 2, 5, 7, 11-13.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§0, 5.2, 10, 11.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

The generated/reference starter repository is `vibe-engineer-starter` and is a strict TypeScript pnpm/Turborepo monorepo that consumes the `vibe-engineer` harness package rather than copying harness logic. Its default generated architecture is:

- `apps/api`: NestJS + Prisma API.
- `apps/web`: React web shell.
- `apps/mobile`: React Native mobile shell.
- `packages/domain`, `packages/contracts`, `packages/api-client`, `packages/config`, `packages/testing`, and `packages/ui`.
- `.vibe/context`, `.vibe/work`, `.vibe/evidence`, `.vibe/registry`, and `.tooling/**` generated-support areas.

The v1 starter is no-auth by default, uses local PostgreSQL + Prisma with a single explicitly sample/demo golden module, uses `ts-rest` + named Zod schemas per DL-14, includes `packages/ui` as a constrained shared UI/tokens package, and exposes local scripts that are intended to become the same semantic verification path later used by CI. Exact sibling-owned test runner, mobile device, CI, bootstrap context, security implementation, and observability implementation details remain blocked on their owners.

## Decision details

1. `DL-16` locks the starter-side architecture, layout, names, boundaries, default golden module, no-auth stance, database/Prisma defaults, env/config conventions, dev services, and local script intent.
2. The starter is generated/reference/sample-ready application code, not harness core. It consumes harness packages and generated harness assets; it must not copy validators, schematics, skills, adapters, verification runners, context machinery, or other harness implementation logic.
3. The starter repo name is `vibe-engineer-starter` from DL-01. Generated consuming projects may use user-supplied repo/app names, but the default directory and package graph semantics below remain the generated architecture.
4. The reference package scope for the reference starter is `@vibe-engineer-starter`. Generated consuming projects use a create-derived private workspace scope `@<project-slug>` unless a future package-name owner supplies a stricter naming rule.
5. All workspace packages in generated projects are private by default. Public publication of application packages is out of scope.
6. The golden module is `golden-records`, an explicitly labeled sample/demo/reference module. It exists to demonstrate architecture and verification seams, not to define a business domain.
7. V1 starter default auth stance is no-auth. No login, users, sessions, roles, OAuth, JWT, or auth provider scaffolding is generated by default.
8. PostgreSQL + Prisma are default persistence. The default schema is intentionally minimal and domain-neutral.
9. API contracts use DL-14's locked `ts-rest` + named Zod schemas. DL-16 does not reopen the contract mechanism.
10. Web, mobile, UI, E2E, context, observability, verification, security, and CI surfaces are included as architecture slots with blocked handoffs to their owner decisions/lanes.

## Alternatives considered

### Layout shape: apps/packages monorepo

- decision: accepted.
- rationale: matches the locked starter stack and final strategy hypothesis, gives clear app/package ownership, and is concrete enough for create/API/web/mobile lanes.
- consequences: downstream fixtures must use the same app/package names unless a later validated DL-16 amendment changes them.

### Single app or API-only starter

- decision: rejected.
- rationale: contradicts fixed v1 stack: NestJS API, React web, React Native mobile, shared contracts/client, E2E/UI/context/golden module.
- consequences: implementation lanes must create and verify all three app shells.

### Auth included by default

- decision: rejected for v1 default.
- rationale: auth would require security/session/provider choices owned by DL-22 or a future auth-specific decision, and would overcomplicate the golden module before core starter seams are proven.
- consequences: auth-dependent implementation remains blocked until a future decision; generated examples may include a typed `currentActor: null` or local display label only when explicitly non-auth and sample-labeled.

### No database / in-memory starter

- decision: rejected.
- rationale: locked stack includes PostgreSQL + Prisma and starter must prove database/schema/migration/integration seams.
- consequences: local PostgreSQL and Prisma schema/migration/seed are required, but kept minimal.

### Large business-flavored golden module

- decision: rejected.
- rationale: violates DL-20A domain-neutrality and would leak project-specific assumptions into starter defaults.
- consequences: use `GoldenRecord` sample/demo terminology only.

### Omit `packages/ui`

- decision: rejected.
- rationale: the fixed starter includes UI verification/shared UI concerns, and a constrained UI package gives `I-17` a stable shared surface without forcing business components into apps.
- consequences: `packages/ui` exists but is deliberately narrow and cannot contain routes, API calls, navigation, persistence, or business/domain rules.

### Let DL-16 choose exact test runner, mobile split, UI verifier, CI, context bootstrap, security, or observability libraries

- decision: rejected.
- rationale: these are owned by DL-11, DL-12, DL-13, DL-18, DL-17, DL-22, and DL-23 respectively.
- consequences: DL-16 defines slots, paths, scripts, and blocker handoffs; dependents cannot finalize those exact details until owners are green.

## Generated starter layout

Reference/generated layout:

```txt
vibe-engineer-starter/
  package.json                 # private root package, generated scope-owned
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  eslint.config.*              # exact config mechanics owned by mechanical/test lanes
  prettier.config.*
  vibe-engineer.config.*       # exact schema/extension owned by DL-02/DL-07/DL-22; required concepts locked
  .env.example
  apps/
    api/
      package.json             # @<project-scope>/api
      src/
        main.ts
        app.module.ts
        health/
        golden-records/        # sample/demo/reference module
      prisma/
        schema.prisma
        migrations/
        seed.ts
      test/
    web/
      package.json             # @<project-scope>/web
      src/
        app/
        routes/
          home/
          golden-records/      # sample/demo/reference screen/route
          system-status/
        main.tsx
      e2e/
      ui-verification/
    mobile/
      package.json             # @<project-scope>/mobile
      src/
        app/
        screens/
          home/
          golden-records/      # sample/demo/reference screen
          system-status/
        navigation/
      e2e/
        maestro/
        detox/
      ui-verification/
  packages/
    domain/
      package.json             # @<project-scope>/domain
      src/golden-records/      # pure sample/demo domain model/use cases
    contracts/
      package.json             # @<project-scope>/contracts
      src/golden-records/      # ts-rest route contracts + named Zod schemas
    api-client/
      package.json             # @<project-scope>/api-client
      src/golden-records/      # generated/shared client derived from contracts
    config/
      package.json             # @<project-scope>/config
      src/                     # env/config wrappers; no secrets in defaults
    testing/
      package.json             # @<project-scope>/testing
      src/fixtures/            # sample/demo fixtures/factories/helpers
    ui/
      package.json             # @<project-scope>/ui
      src/tokens/
      src/primitives/
      src/web/
      src/native/
  docs/
    reference/
      starter.md               # docs owner may refine; sample/demo labels required
  .vibe/
    context/
    work/
    evidence/
    registry/
  .tooling/
    scripts/
    dev-services/
      docker-compose.yml       # local PostgreSQL only by default
    ci/                        # local/CI parity handoff templates only when owned
    generated/
```

Exact syntax for package manager config, test config, CI workflow, and harness config files remains owned by the applicable decisions/implementation lanes, but generated files must land in the families above.

## App and package boundaries

### App/package names

Default private workspace names in the reference starter:

| Path | Package name |
| --- | --- |
| root | `@vibe-engineer-starter/workspace` |
| `apps/api` | `@vibe-engineer-starter/api` |
| `apps/web` | `@vibe-engineer-starter/web` |
| `apps/mobile` | `@vibe-engineer-starter/mobile` |
| `packages/domain` | `@vibe-engineer-starter/domain` |
| `packages/contracts` | `@vibe-engineer-starter/contracts` |
| `packages/api-client` | `@vibe-engineer-starter/api-client` |
| `packages/config` | `@vibe-engineer-starter/config` |
| `packages/testing` | `@vibe-engineer-starter/testing` |
| `packages/ui` | `@vibe-engineer-starter/ui` |

Generated consuming projects substitute `vibe-engineer-starter` with the normalized project slug supplied to `vibe-engineer create/import`, preserving the suffixes and import graph.

### Import direction rules

- `packages/domain`: pure TypeScript domain/sample use cases only. It must not import NestJS, React, React Native, Prisma client, API client, UI package, CLI, harness internals, filesystem/process, or app code.
- `packages/contracts`: owns `ts-rest` contracts and named Zod schemas. It may import only generic/shared type helpers allowed by implementation owners; it must not import app code, Prisma client, UI, or api-client.
- `packages/api-client`: generated/shared client derived from `packages/contracts`; it may depend on contracts and config. It must not duplicate schemas or define hand-authored fetch DTOs.
- `apps/api`: imports domain, contracts, config, and Prisma adapter code local to `apps/api`; it must not import web, mobile, UI route components, or test-only helpers in production code.
- `apps/web`: imports api-client, ui, config, and optionally contracts for type names only. It must not import api, Prisma, Nest internals, mobile screens, or test helpers in production code.
- `apps/mobile`: imports api-client, ui native entrypoints, config, and optionally contracts for type names only. It must not import api, Prisma, web DOM components, or test helpers in production code.
- `packages/ui`: imports no app, api, Prisma, or api-client code. It may expose tokens, primitive props, shared accessibility helpers, and platform-specific web/native entrypoints.
- `packages/testing`: test-only. No production package may depend on it.
- Generated starter code may import `vibe-engineer` package exports and generated harness assets, but must not import private `@vibe-engineer/*` harness packages unless a later decision promotes them.

## Golden module

The golden module is `golden-records` and every generated file, route, fixture, context entry, and test around it must be labeled as `sample`, `demo`, or `reference`.

Purpose:

- demonstrate one vertical slice across domain, contract, API, database, api-client, web, mobile, tests, E2E, UI verification, context, observability slots, and evidence;
- prove starter boundaries without encoding a project/business domain;
- give downstream lanes a concrete real-boundary target.

Normative content:

- Domain entity: `GoldenRecord` with generic fields only: `id`, `title`, `summary`, `status`, `createdAt`, `updatedAt`.
- Status enum: `draft | active | archived` or equivalent generic lifecycle names.
- API routes: health/status plus `golden-records` list, read, and create/update as needed for witnesses. The minimal required witness path is create or seed one record, list records, and render/read it in web and mobile.
- Contracts: named Zod schemas and `ts-rest` route contracts for every request and response.
- API client: generated/shared client consumed by both web and mobile.
- Web: a home/system-status shell and a `Golden Records` sample/reference screen.
- Mobile: a home/system-status shell and a `Golden Records` sample/reference screen.
- Tests/evidence: future DL-11/DL-12/DL-13/I-16/I-17 owners must add unit/integration/contract/E2E/UI witnesses, including invalid payload negative cases and UI missing-artifact/defect cases.
- Context: generated context nodes/headers under `.vibe/context/**` must classify the module as sample/demo/reference.
- Observability: the golden critical path must include instrumentation slots and later DL-23-owned logs/metrics/traces/correlation evidence.

Forbidden golden-module content:

- ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout, cart, order, customer, payment, social-feed, or equivalent business-model defaults;
- unlabeled sample/demo content;
- hidden core harness defaults derived from the starter.

## Auth/no-auth stance

V1 starter default is **no-auth**.

Required consequences:

1. No generated users table, session table, auth provider, JWT/OAuth setup, login screen, registration screen, RBAC, or authenticated API middleware by default.
2. API routes are local/demo public endpoints for generated development only; production hardening and project auth are future project-extension work.
3. Generated config may include placeholder slots for future auth integration only when disabled by default and explicitly labeled project-owned/future.
4. Security controls from DL-22 still apply: no real secrets, no production credentials, safe env defaults, redaction, and no external mutations without approval.
5. Any implementation lane that needs auth to complete its acceptance criteria is blocked pending a future auth/security decision; it may not improvise auth.

## Database and Prisma stance

Default database architecture:

- PostgreSQL is required for local development and starter verification.
- Prisma is the default ORM/migration layer.
- The canonical Prisma schema lives in `apps/api/prisma/schema.prisma`.
- The generated API owns Prisma adapter/repository code under `apps/api/src/**`; `packages/domain` stays Prisma-free.
- Initial migration is committed in `apps/api/prisma/migrations/**` and represents the golden module only.
- Seed script lives in `apps/api/prisma/seed.ts` and inserts explicit sample/demo/reference `GoldenRecord` rows.
- Test data factories/helpers live in `packages/testing` and remain test-only.

Default Prisma model semantics:

```txt
GoldenRecord
  id: string uuid/cuid
  title: string
  summary: string nullable/optional
  status: draft | active | archived
  createdAt: DateTime
  updatedAt: DateTime
```

No auth, billing, tenant, user, order, inventory, external integration, or business-domain table is generated by default.

Migration policy:

- Generated starter has an initial migration for the sample schema, not ad-hoc `db push` as the authoritative state.
- Local dev scripts may run migrations and seed local data.
- CI/local parity and exact migration verification are owned by DL-18/I-20 and DL-11/DL-10 handoffs.
- Any migration drift, schema duplication, or unchecked Prisma/generated-client mismatch must block downstream closure.

## API and contract boundary

DL-16 preserves DL-14 as the exact API mechanism owner and accepts its locked mechanism:

- canonical API contracts use `ts-rest` route contracts with named Zod runtime schemas;
- OpenAPI may be generated only as a projection;
- provider/client/consumer schemas must not be duplicated;
- request and response validation is required at runtime.

Starter-side API pattern:

1. `packages/contracts` is the canonical contract source for starter app API routes.
2. `apps/api` implements NestJS routes from those contracts and validates request/response payloads.
3. `packages/api-client` is generated/shared from the contracts and consumed by `apps/web` and `apps/mobile`.
4. API route paths are under `/api/**` for app data and `/health` or `/api/system/status` for health/status.
5. Web and mobile cannot call hand-written fetch wrappers for golden module data; they must consume the shared api-client.
6. Invalid request/response/client payload negative witnesses are required in I-16.

Required dependency on DL-14/I-11/I-16:

- `I-11` must first prove minimal provider + generated client + consumer fixture.
- `I-16` must then prove full starter Nest API + contracts + api-client + app consumer join.
- If actual `ts-rest`/Zod/Nest/client live proof cannot run, closure is `pending-live/BLOCKED`.

## Web/mobile/UI architecture

### Web shell

- `apps/web` is a React web app shell.
- Required starter routes/screens: home, system/API status, and sample/demo/reference golden-records.
- Web state must be fixtureable for Playwright E2E and DL-13 UI verification states: default, loading, empty, error, long-content/overflow where applicable.
- Exact web test/component runner choices are owned by DL-11; UI verification details by DL-13.

### Mobile shell

- `apps/mobile` is a React Native app shell.
- Required starter screens: home, system/API status, and sample/demo/reference golden-records.
- Navigation must be simple and deterministic enough for generated Maestro/Detox flows.
- Mobile E2E runner split, device strategy, artifacts, and pending-live policy are owned by DL-12 and I-17.
- Exact mobile build/install command names are future implementation details; if needed by I-17 and not available, I-17 remains blocked.

### Shared UI strategy

`packages/ui` exists in v1.

Allowed content:

- design tokens, spacing/type/color token definitions, accessibility helper types, generic primitive prop contracts;
- minimal platform-specific primitive entrypoints under `src/web/**` and `src/native/**` when needed to bridge React DOM and React Native differences;
- sample/demo/reference visual primitives only when labeled and generic.

Forbidden content:

- data fetching, API clients, business/domain logic, Prisma/database code, navigation/router ownership, app-specific screens, harness internals, hidden auth behavior, or project/business vocabulary defaults.

UI verification implications:

- Web UI proof must serve the actual web app and use Playwright/DOM/accessibility/geometry evidence per DL-13.
- Mobile UI proof must use actual RN app via Maestro/Detox artifacts where environment supports; otherwise mark `pending-live/BLOCKED`.
- E2E success alone does not satisfy UI verification.

## Env/config/dev services/scripts

### Harness config relationship

Generated starter receives a root `vibe-engineer.config.*` file whose exact schema/extension is owned by DL-02/DL-07/DL-22, but it must contain these locked concepts:

```yaml
agenticHarness: <selected by create/import>
maxParallelAgents: 8
maxValidationFixIterations: 3
agenticWorkPackageTargetHours: 6
starter:
  architectureDecision: DL-16-starter-architecture
  appNames: [api, web, mobile]
  packageNames: [domain, contracts, api-client, config, testing, ui]
```

Generated app env/config is separate from harness config. App env files configure API ports, database URL, web/mobile API base URL, and optional disabled observability/auth slots. Harness config controls harness behavior; it is not a dumping ground for application secrets.

### Env conventions

Required generated env classes:

- root `.env.example`: non-secret placeholders and local-only defaults.
- app-local env examples under app paths only when needed for app-specific variables.
- local uncommitted `.env.local` files may be described but must not be generated with real secrets.

Required variable classes:

- `DATABASE_URL` for local PostgreSQL/Prisma, using visibly local-only non-secret placeholder credentials or dummy local credentials.
- `API_PORT`, `WEB_PORT`, and mobile/web API base URL variables.
- `VIBE_ENGINEER_CONFIG` or equivalent pointer only if later CLI/config decisions require it.
- observability variables disabled by default pending DL-23.
- auth variables absent by default; future project auth variables are disabled/project-owned slots only.

DL-22 consequences:

- no real secrets, production credentials, production endpoints, deploy keys, or committed credential-bearing URLs;
- redacted config inspection/evidence;
- missing real credentials for optional integrations disables or blocks, never silently falls back.

### Docker/dev services

Default local dev services:

- a single PostgreSQL service for local development and integration testing;
- stable service name `postgres`;
- local database names derived from project slug, with separate dev/test databases when test tooling needs them;
- no Redis, queue, auth provider, object store, production-like external service, or observability backend by default.

Supporting services:

- Prisma Studio or database admin tools may be local scripts, not required Docker services.
- Any observability collector/backing service is blocked on DL-23.
- Any external provider service is blocked on DL-22 and project-owned integration decisions.

### Local scripts

Root scripts are semantic obligations; exact command internals are implementation-owned:

- `dev`: run local dev graph for API + web and optionally mobile instructions.
- `dev:api`, `dev:web`, `dev:mobile`: app-specific dev entrypoints.
- `db:start`, `db:stop`, `db:migrate`, `db:seed`, `db:reset:local`: local PostgreSQL/Prisma lifecycle, local-only.
- `typecheck`, `lint`, `format:check`, `test`, `build`: strict quality/build surface.
- `verify`: future aggregate semantic verification path consumed by build/ship/CI.
- `e2e:web`: Playwright E2E path.
- `e2e:mobile:maestro`, `e2e:mobile:detox`: mobile E2E paths with DL-12 metadata.
- `ui:verify`: DL-13 UI verification path.
- `context:validate`: context/drift validation when exposed by DL-09/DL-07.

CI/local parity:

- DL-16 requires local scripts to be designed so DL-18/I-20 can invoke the same semantic aggregate path in CI.
- DL-16 does not create CI workflow syntax or decide provider/caching/matrix details.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy and real-boundary doctrine are safe for decision execution.
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies decision schema, dependency declaration, evidence checklist, validator checklist, deferral and dirty-tree policy.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core/extension/sample-demo constraints for starter/golden content.
    - id: DL-01-repo-package-structure
      type: decision
      required_status: LOCKED
      rationale: Locks `vibe-engineer-starter`, starter consumption model, no-copy rule, and harness package direction.
    - id: DL-14-api-contract-mechanism
      type: decision
      required_status: LOCKED
      rationale: Locks `ts-rest` + named Zod API contracts used by starter architecture.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, planning backlog, strategy, playbook, and quality bar define DL-16 requirements.
  blocks:
    - id: I-15-create-import-starter-UX
      reason: Needs exact generated starter layout, names, config/dev service/script slots, harness-consumption and create/import witness obligations.
    - id: I-16-starter-api-contracts-client-golden
      reason: Needs API/contracts/client/golden-module package boundaries and no-auth/DB/API decisions.
    - id: I-17-web-mobile-e2e-ui-verification
      reason: Needs web/mobile shells, UI package policy, golden screens, E2E/UI evidence paths, and DL-12/DL-13 handoffs.
    - id: I-19-observability-defaults-tests
      reason: Needs golden critical path and observability slots while waiting on DL-23 exact defaults.
    - id: I-23-end-to-end-real-boundary-witness
      reason: Full generated starter proof depends on this architecture and later implementation seams.
  blocked_dependents:
    - id: I-15-create-import-starter-UX
      blocked_until: DL-16 plus DL-06/DL-07/DL-08/DL-09/DL-17 and required implementation prerequisites are green.
      relying_on: generated layout, app/package names, harness config relationship, dev services, scripts, and no-copy starter consumption.
    - id: I-16-starter-api-contracts-client-golden
      blocked_until: I-11 is clean and DL-14/DL-16/DL-11 are green.
      relying_on: golden module, PostgreSQL/Prisma schema, contracts/api-client boundaries, and actual Nest/web/RN contract join.
    - id: I-17-web-mobile-e2e-ui-verification
      blocked_until: I-15/I-16 plus DL-11/DL-12/DL-13 prerequisites are green.
      relying_on: web/mobile app shells, golden screens, shared UI policy, E2E/UI verification slots.
    - id: I-19-observability-defaults-tests
      blocked_until: I-16/I-17 plus DL-23 and DL-11 are green.
      relying_on: golden critical path instrumentation slots and evidence requirements.
    - id: DL-23-observability-defaults
      blocked_until: DL-16 golden critical path exists as a target; exact observability defaults remain DL-23-owned.
      relying_on: where starter observability must attach.
    - id: I-23-end-to-end-real-boundary-witness
      blocked_until: I-15/I-16/I-17/I-18/I-19/I-21/I-22 are clean or pending-live blockers are explicit.
      relying_on: full generated starter layout and seams.
  required_before_finalizing:
    - id: DL-11-test-runner-tooling
      required_content: exact unit/integration/component/backend/generated test runner/tooling details for starter tests.
    - id: DL-12-mobile-e2e-details
      required_content: Maestro/Detox split and device/pending-live policy for mobile tests.
    - id: DL-13-ui-verification-stack
      required_content: UI evidence, baseline, screenshot, accessibility, geometry, deterministic/advisory policy.
    - id: DL-17-bootstrap-context-generation
      required_content: exact optional-brief/skipped-brief context files and inference limits.
    - id: DL-18-ci-cd-defaults
      required_content: CI provider, local/CI parity, caching/matrix/artifact upload details.
    - id: DL-22-security-safety-model
      required_content: security/env/destructive/external integration policy applied to generated config and scripts.
    - id: DL-23-observability-defaults
      required_content: logging/tracing/metrics/correlation library/defaults and evidence for golden path.
  deferrals:
    - deferred_question: Exact test runner packages/configs and generated test file syntax.
      rationale: Owned by DL-11 and implementation lanes; DL-16 only locks starter architecture and required test surfaces.
      future_owner: DL-11-test-runner-tooling / I-16 / I-17
      allowed_now: true
      blocked_dependents: [I-16, I-17, I-19 where exact test tooling is required]
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact bootstrap context files from optional project brief or skipped brief.
      rationale: Owned by DL-17; DL-16 only reserves `.vibe/context/**` and context labels.
      future_owner: DL-17-bootstrap-context-generation / I-15-create-import-starter-UX
      allowed_now: true
      blocked_dependents: [I-15 create/import context bootstrap closure]
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact CI workflow/provider/local parity implementation.
      rationale: Owned by DL-18/I-20; DL-16 only defines local script intent.
      future_owner: DL-18-ci-cd-defaults / I-20-ci-local-parity-wiring
      allowed_now: true
      blocked_dependents: [I-20 CI/local parity closure]
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact observability library/defaults/correlation strategy.
      rationale: Owned by DL-23/I-19; DL-16 only defines golden path slots.
      future_owner: DL-23-observability-defaults / I-19-observability-defaults-tests
      allowed_now: true
      blocked_dependents: [I-19 observability closure]
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-16-starter-architecture.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-16-starter-architecture/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** sibling/prerequisite decisions
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** sibling/prerequisite reports
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-16 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - /Users/lizavasilyeva/work/vibe-engineer/packages/**
    - /Users/lizavasilyeva/work/vibe-engineer/apps/**
    - /Users/lizavasilyeva/work/vibe-engineer/examples/**
    - /Users/lizavasilyeva/work/vibe-engineer/scripts/**
    - /Users/lizavasilyeva/work/vibe-engineer/.github/**
    - root config/package/CI/source/generated starter files
    - non-DL-16 decision/report/work paths
  handoff_notes:
    - from: DL-16
      to: I-15-create-import-starter-UX
      condition: Generate starter/reference fixture from this layout and prove create/import + harness consumption.
      shared_path_policy: disjoint
    - from: DL-16
      to: I-16-starter-api-contracts-client-golden
      condition: Implement golden API/contracts/client/database path after I-15/I-11 and decisions are green.
      shared_path_policy: disjoint
    - from: DL-16
      to: I-17-web-mobile-e2e-ui-verification
      condition: Implement web/mobile/E2E/UI proofs after I-16 and DL-11/DL-12/DL-13 are green.
      shared_path_policy: disjoint
    - from: DL-16
      to: I-19-observability-defaults-tests
      condition: Attach DL-23 observability defaults to golden critical path.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-15-create-import-starter-UX`: blocked until it can generate/import the decided layout, persist harness config, produce context/bootstrap outputs per DL-17, consume harness packages, and prove actual create/import.
- `I-16-starter-api-contracts-client-golden`: blocked until it can implement golden DB/API/contracts/client with DL-14 and DL-11-compatible tests.
- `I-17-web-mobile-e2e-ui-verification`: blocked until web/mobile shells exist and DL-11/DL-12/DL-13 details are available.
- `I-19-observability-defaults-tests`: blocked until DL-23 supplies exact observability defaults and golden critical path is implemented.
- `I-23-end-to-end-real-boundary-witness`: blocked until create, starter, verification, context, security, observability, build, and ship-adjacent seams exist or are explicitly pending-live.
- `DL-20B` and `DL-24B`: must later audit this decision's domain-neutrality and output-discipline compliance.

## Verification/witness consequences

- deterministic checks affected: workspace/package graph validation, no-copy harness consumption checks, strict TypeScript/config guards, schema/contract strictness, Prisma migration/schema drift checks, generated env/config validation, test/e2e/ui evidence checks, context/drift checks, observability evidence checks, local/CI wiring checks.
- positive witnesses required downstream:
  - `I-15`: actual `vibe-engineer create/import` writes this starter layout with generated config and selected `agenticHarness`.
  - `I-15`: generated starter declares dependency on/consumes `vibe-engineer` rather than copied harness source.
  - `I-16`: actual Nest provider + Prisma + `ts-rest`/Zod contracts + generated api-client + app consumer join succeeds.
  - `I-17`: actual web app is served to Playwright; actual React Native app is consumed by Maestro/Detox where environment supports.
  - `I-17`: DL-13 UI verification evidence is produced for web/mobile states; unavailable mobile proof is `pending-live/BLOCKED`.
  - `I-19`: golden critical path emits logs/metrics/traces/correlation artifacts required by DL-23 and consumed by verification.
  - `I-23`: full create→starter→verify/context→build/ship-adjacent evidence rerun uses actual producers/carriers/consumers.
- negative witnesses required downstream:
  - generated starter copying harness logic fails;
  - unlabeled or business-domain golden content fails;
  - generated auth/users/session default fails;
  - missing PostgreSQL/Prisma migration or seed evidence fails;
  - API/client schema duplication or stale generated client fails;
  - invalid API payload fails at provider/client boundary;
  - E2E-only success without UI verification fails;
  - missing context/evidence/observability/correlation where required fails;
  - shape-only generated fixtures, mocked clients, or hand-authored starter files cannot close real-boundary seams.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - two-repo direction remains `vibe-engineer` plus `vibe-engineer-starter`;
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet;
  - create flow asks only project naming, default agentic harness, optional project brief;
  - fixed starter stack remains NestJS, React, React Native, strict TypeScript, pnpm, Turborepo, PostgreSQL, Prisma, shared contracts/client, Playwright, Maestro + Detox;
  - build/ship automatic verification/context/evidence and no push/PR without approval remain intact.
- real_boundary_required: yes for downstream implementation seams; no live runtime seam is created by this decision artifact.
- real_boundary_status: not_applicable for DL-16 artifact; required_before_closure for I-15/I-16/I-17/I-19/I-23.
- earliest required seams:
  - `I-15` create/import seam: actual CLI producer → generated starter files/config carrier → generated build/verify consumer.
  - `I-15` harness consumption seam: built/local harness package producer → starter dependency/import declarations carrier → starter typecheck/build consumer.
  - `I-16` contract/API/client seam: actual Nest provider + named runtime contract/schema producer → generated client carrier → actual app consumer fixture.
  - `I-17` web/mobile/UI seam: actual web app to Playwright; actual RN app to Maestro/Detox or `pending-live/BLOCKED`.
  - `I-19` observability seam: golden instrumentation producer → logs/metrics/traces/correlation carrier → verification/evidence consumer.
  - `I-23` full rerun: actual end-to-end generated starter witness.

## Ownership/path consequences

Current DL-16 writes are limited to:

- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-16-starter-architecture.md`;
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-16-starter-architecture/**`.

This decision authorizes no package source, root config, CI, generated starter fixture, app, test, Docker, script, Prisma, or evidence implementation file writes.

Future implementation ownership remains with final-strategy lanes:

- `I-15`: create/import CLI and starter template/fixture paths.
- `I-16`: golden API/contracts/client fixtures.
- `I-17`: golden web/mobile/E2E/UI fixtures.
- `I-19`: observability fixtures/tests.
- `I-20`: CI/local parity and root/CI script handoff.
- `I-23`: full end-to-end generated starter witness.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected: generated/reference starter layout, app/package names, golden module, API/contracts/client examples, DB schema, env/config/dev services/scripts, UI/web/mobile sample screens, context/evidence, docs/reference labels.
- surface classification:
  - starter generated app files are generated/reference starter surfaces, not harness core;
  - golden module is sample/demo/reference;
  - harness consumption logic remains harness core and is not copied;
  - consuming-project customizations are project-owned extensions.
- positive generic terms used: apps, packages, modules, contracts, schemas, API, client, config, testing, UI, context, evidence, golden record, sample, demo, reference, PostgreSQL, Prisma, NestJS, React, React Native.
- project/business terms mentioned: only source-cited forbidden negative examples; no ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout/cart/order/customer/payment/social-feed-like concept is a starter default.
- sample/demo labeling: all `golden-records` files, fixtures, screens, routes, seed data, and context must be labeled sample/demo/reference.
- extension boundary: project-specific vocabulary enters only through user project inputs, future project-owned extensions, or explicitly labeled sample/demo content; it must not become harness core defaults.
- deterministic enforcement owners: DL-15/I-10 for governed surface checks where assigned, I-15 for create/starter boundaries, I-16/I-17/I-19 for generated fixture checks, I-24 for docs labels, DL-20B for audit.
- advisory enforcement owners: validators, docs reviewers, final bug hunt.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- shell/process commands used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none. Before creating this decision artifact, target inventory showed no `docs/decisions/DL-16-starter-architecture.md`; DL-16 owned work path contained only this lane's report.
- no production/package/root/config/CI/generated starter files were touched.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Implementation-detail deferrals are explicit and do not allow dependents to proceed from missing content:

1. Exact test runner/package/version/config syntax:
   - future_owner: `DL-11-test-runner-tooling` and implementation lanes.
   - blocked_dependents: `I-16`, `I-17`, `I-19` where exact tests are required.
2. Exact mobile device/CI split beyond DL-12:
   - future_owner: `DL-12`, `DL-18`, `I-17`, `I-20`.
   - blocked_dependents: mobile live proof and CI mobile closure.
3. Exact UI verifier package versions/evidence schemas:
   - future_owner: `DL-13`, `DL-10`, `DL-02`, `I-17`.
   - blocked_dependents: UI verification closure.
4. Exact context bootstrap files/inference:
   - future_owner: `DL-17`, `I-15`.
   - blocked_dependents: create/import bootstrap closure.
5. Exact observability library/defaults:
   - future_owner: `DL-23`, `I-19`.
   - blocked_dependents: observability closure.
6. Exact CI workflow/provider syntax:
   - future_owner: `DL-18`, `I-20`.
   - blocked_dependents: CI/local parity closure.

Proof no dependent relies now: this DL-16 artifact locks starter architecture and blocks any implementation lane whose exact sibling-owned details are not available.

## Evidence checklist

1. Report artifact was created first at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-16-starter-architecture/reports/decision-lock-execution-report.md`.
2. Required source files inspected are listed in the report and cited above by path/section heading.
3. Files changed are limited to this decision artifact and the DL-16 execution report.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Every planning backlog §16 topic is answered: app names, package names, module boundaries, golden module, auth/no-auth, DB schema, API pattern, shared UI, web shell, mobile shell, env/config, Docker/dev services, local scripts.
7. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
8. Starter consumes harness packages and does not copy harness logic.
9. Fixed stack and E2E tools are preserved.
10. DL-14 API mechanism is preserved; DL-11/DL-12/DL-13/DL-17/DL-18/DL-22/DL-23 owners are not stolen.
11. Golden module is explicitly domain-neutral/sample-only and covers API/contracts/client/web/mobile/tests/E2E/UI/context/observability/evidence slots.
12. Real-boundary proof is assigned to downstream lanes and not falsely claimed here.
13. DL-20A domain-neutrality checklist is applied.
14. No production implementation was performed.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and available diffs/inventory, not only this report.

### Positive witnesses

- DL-16 artifact exists at the owned path and follows DL-24A schema with exactly one output class.
- Backlog §16 topics are all locked or validly deferred with blocked dependents.
- Layout is concrete enough for `I-15`, `I-16`, `I-17`, and `I-19` to know starter fixture paths and handoffs.
- Fixed stack is preserved.
- Starter consumes `vibe-engineer` and does not copy harness logic.
- Golden module is sample/demo/reference and domain-neutral.
- Dependencies on DL-11, DL-12, DL-13, DL-14, DL-17, DL-18, DL-22, and DL-23 are explicit where applicable.

### Negative witnesses

- Reject a starter architecture omitting any backlog §16 topic.
- Reject starter copying harness logic or importing private harness packages without promotion.
- Reject unlabeled business/project vocabulary in golden content.
- Reject generated auth/users/session defaults.
- Reject hand-authored/mock starter fixtures as final real-boundary proof.
- Reject any implementation lane proceeding from a deferred sibling-owned detail it relies on.

### Regression witnesses

- `vibe-engineer` name remains unchanged.
- Two-repo direction remains domain-neutral harness plus `vibe-engineer-starter` generated/reference starter.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- Create flow remains constrained to project naming, default agentic harness, and optional project brief.
- `build`/`ship` automatic verification/context/evidence and no push/PR without approval remain intact.
- Playwright and Maestro + Detox remain locked.
- DL-24A and DL-20A remain prerequisites; DL-20B/DL-24B remain later audits.

### Sibling/blast-radius checks

- Check final strategy §§4.2, 5.2, 6.2, 8, 9.2/9.3, 10, 11.
- Check source docs listed above for contradictions.
- Check adjacent decision responsibilities are not stolen or contradicted.
- Check target repo inventory shows writes only in DL-16 owned decision/work paths.
- Check no package/root/CI/starter/generated fixture files were created.

### Severity policy

- `critical`: locked decision contradiction; out-of-license write; missing DL-24A/DL-20A prerequisite; missing DL-16 artifact; false real-boundary closure; missing valid disposition for backlog §16 topic; invalid deferral used by dependent lane; starter copies harness logic; domain-specific core leakage; production implementation by decision-only lane.
- `major-local`: incomplete citation, dependency/blocker mapping, validation plan, or architecture detail that blocks direct dependents but is repairable within DL-16 paths.
- `minor-local`: wording/format/citation clarity issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all schema, source, ownership, architecture, dependency, domain-neutrality, and witness requirements satisfied.

## Known ambiguities / future owners

- `DL-11`: unit/integration/component/backend test runner choices, generated test conventions, coverage tooling, fixtures/matchers.
- `DL-12`: exact mobile Maestro/Detox split and device/CI artifact mechanics; DL-16 preserves its policy.
- `DL-13`: exact UI verification evidence/baseline/tooling details; DL-16 supplies UI surfaces.
- `DL-14`: API contract mechanism is already locked as `ts-rest` + named Zod; DL-16 consumes it.
- `DL-17`: exact create/import project context bootstrap files and skipped-brief behavior.
- `DL-18`: CI provider, workflows, cache/matrix/artifact upload, local/CI parity.
- `DL-22`: security/safety implementation for env/config, commands, secrets, destructive/external operations.
- `DL-23`: logging, tracing, metrics, correlation defaults and observability tests.
- `DL-15`: exact mechanical gate implementation for governed surfaces, schema/contract strictness, wiring, ratchet, smells, test anti-patterns.
- `I-15`, `I-16`, `I-17`, `I-19`, `I-20`, and `I-23` own implementation and live proof in their paths.

No unresolved DL-16 architecture choice remains hidden. Concrete sibling-owned implementation details are valid deferrals with blocked dependents.
