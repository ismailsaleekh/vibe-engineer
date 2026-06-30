# DL-01 — Repository and Package Structure

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-01 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-01-repo-package-structure.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-01-repo-package-structure/DL-01-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.1 `Harness repo package hypothesis`; §4.2 `Generated starter kit hypothesis`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`; §6 `Dependency DAG with scheduler gates`; §8 `Pass sizing and allocation`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, final closure, and severity requirements.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §9 `Severity gate and closure criteria check`; §10 `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§1–3 `Product vision`, `The two repositories`, `Non-negotiable design rules`; §§11–13 `Harness package shape`, `Starter kit shape`, `Relationship between starter kit and harness`; §16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§1–3 `Product / package / CLI name`, `Two-repo direction`, `Starter kit stack`; §§5–11 for config defaults, skills, schematics, automatic verification/context, E2E, verification layer, and mechanical gates.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1–4 and §§11–16 for evidence, artifact flow, Verification Delta, registry, blocking policy, and final invariant.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1–13 for mechanical gate package/verification implications.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §1 `Repository and package structure`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2 and 10 for Triad-B validation, dirty-tree safety, and real-boundary discipline.

## Decision summary

The harness repository is the single open-source monorepo named `vibe-engineer`. The generated/reference starter repository is named `vibe-engineer-starter`. The harness monorepo uses pnpm workspaces and Turborepo from day one, with a minimal source package split aligned to final-strategy implementation lanes. The public npm package and CLI binary are both `vibe-engineer`, implemented from `packages/cli`; all other harness packages use reserved scoped workspace names under `@vibe-engineer/*` but are private/internal and not independently published in the initial release.

The starter consumes the harness by depending on the `vibe-engineer` package and using harness-generated assets/configuration. It must not copy harness implementation logic. Later lanes must prove real package-manager, import, contract, and CI joins before closure.

## Decision details

1. Exact repository names are locked:
   - harness repo: `vibe-engineer`;
   - generated/reference starter repo: `vibe-engineer-starter`.
2. The harness repo is a monorepo from day one, not a single-package repo and not multiple independent repos.
3. The root package is private and named `@vibe-engineer/workspace`; the root is never published.
4. `packages/cli` is the public main npm package named `vibe-engineer` and owns the public binary named `vibe-engineer`.
5. Internal workspace packages use scoped names under `@vibe-engineer/*` immediately so imports, ownership, and future publication do not require renaming.
6. Initial independent npm publication is intentionally minimal: only `vibe-engineer` is public/published. Scoped packages are private workspace packages and may be bundled into, or otherwise consumed by, `vibe-engineer` according to later build/package decisions. They are not stable external APIs until a later governance/API decision promotes them.
7. Presets and adapters have separate workspace packages because they are extension surfaces and final-strategy lanes, but they are private/internal initially.
8. No package named `core` is created. The former broad core responsibilities are split into `artifacts`, `config`, `context`, `verification`, `contracts`, `standards`, and related lane-owned packages to avoid a single ambiguous god package.
9. The starter repository and harness examples consume harness packages through dependency declarations, workspace links, packed tarballs, or published package references. Copying harness source or reimplementing harness logic in the starter is forbidden.
10. Exact schemas, CLI command contracts, skill protocols, schematic APIs, verification engine details, mechanical checker implementation, starter app architecture, governance/license, docs system, security, and observability remain owned by their later DL/I lanes. DL-01 only fixes repository/package names, source package boundaries, publication posture, and consumption direction.

## Alternatives considered

### One unscoped package only, no workspace split

- decision: rejected
- rationale: it would hide artifact schemas, verification, mechanical gates, skills, adapters, contracts, and starter-generation responsibilities inside one ambiguous package, conflicting with final-strategy lane ownership.
- consequences: fewer initial directories, but unsafe shared ownership and poor future real-boundary evidence.

### Many independently published packages from day one

- decision: rejected
- rationale: it over-engineers public API stability before DL-07, DL-19, DL-21, and package build/release details are decided.
- consequences: scoped names are reserved now, but initial publication remains one public package.

### Split harness into multiple repositories

- decision: rejected
- rationale: final strategy and locked decisions require one open-source domain-neutral harness repo plus one generated/reference starter repo. Multiple harness repos would add cross-repo release friction before core seams are proven.
- consequences: adapters/presets remain packages inside the harness monorepo unless a future governance decision explicitly splits them.

### Make `@vibe-engineer/cli` the initial public package

- decision: rejected
- rationale: the locked product/package/CLI name is `vibe-engineer`. Users should install and invoke `vibe-engineer` without an additional scoped package name.
- consequences: `@vibe-engineer/cli` is not used now; `vibe-engineer` is both main package and binary.

### Starter copies harness code into its repo

- decision: rejected
- rationale: README §13 and strategy §4.2 require the starter to consume harness packages instead of duplicating logic.
- consequences: I-15/I-23 validators must reject copied harness implementation in generated starter fixtures.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms the final strategy is safe for decision-lock execution planning.
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision schema, dependency declaration format, evidence checklist, validator checklist, real-boundary policy, and dirty-tree policy.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies core/extension/sample-demo boundaries and package/repo naming constraints.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, planning backlog, strategy, and playbook define DL-01 requirements.
  blocks:
    - id: I-00-repo-skeleton-governance
      reason: I-00 needs exact repo/package/workspace names and package directory conventions.
    - id: all package-owned implementation lanes
      reason: Package paths/names and publication posture must be fixed before scaffolding.
    - id: I-15-create-import-starter-UX
      reason: Create/import must know how the starter consumes harness packages.
  blocked_dependents:
    - id: I-00-repo-skeleton-governance
      blocked_until: DL-01 is independently validated clean, plus its other strategy prerequisites are green.
      relying_on: exact repository names, root workspace direction, package directory conventions, public/private package posture.
    - id: package-owned implementation lanes I-01..I-23
      blocked_until: DL-01 is independently validated clean and lane-specific decisions are green.
      relying_on: package path/name mapping and forbidden dependency directions.
    - id: I-15-create-import-starter-UX
      blocked_until: DL-01 is independently validated clean and DL-06/DL-07/DL-08/DL-16/DL-17 prerequisites are green.
      relying_on: starter consumption model and no-copy rule.
  required_before_finalizing:
    - id: I-00-repo-skeleton-governance
      required_content: Root private workspace name, package manager/workspace direction, package globs, and initial package directories/names from this decision.
    - id: I-15-create-import-starter-UX
      required_content: Generated starter dependency/import consumption of `vibe-engineer` rather than copied harness logic.
    - id: I-20-ci-local-parity-wiring
      required_content: Local/CI aggregate path references the decided package/workspace structure.
  deferrals:
    - deferred_question: Exact package build tooling, export maps, versioning, and release automation.
      rationale: Owned by DL-19/I-00/I-20 and later package implementation lanes; DL-01 locks names and publication posture only.
      future_owner: DL-19-open-source-governance / I-00-repo-skeleton-governance / I-20-ci-local-parity-wiring
      allowed_now: true
      blocked_dependents:
        - release publication closure
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact public CLI command contracts and subpath exports.
      rationale: Owned by DL-07 and implementation lanes; DL-01 locks the package/binary identity only.
      future_owner: DL-07-cli-primitives / I-02-cli-primitive-foundation
      allowed_now: true
      blocked_dependents:
        - CLI command implementation closure
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-01-repo-package-structure.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-01-repo-package-structure/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/**
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/**
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-01 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - /Users/lizavasilyeva/work/vibe-engineer/package.json
    - /Users/lizavasilyeva/work/vibe-engineer/pnpm-workspace.yaml
    - /Users/lizavasilyeva/work/vibe-engineer/turbo.json
    - /Users/lizavasilyeva/work/vibe-engineer/tsconfig.base.json
    - /Users/lizavasilyeva/work/vibe-engineer/packages/**
    - /Users/lizavasilyeva/work/vibe-engineer/examples/**
    - /Users/lizavasilyeva/work/vibe-engineer/.github/**
    - all non-owned decision/report paths
  handoff_notes:
    - from: DL-01
      to: I-00-repo-skeleton-governance
      condition: After independent DL-01 validation is clean and I-00 prerequisites are satisfied.
      shared_path_policy: serialized
    - from: DL-01
      to: package-owned implementation lanes
      condition: Use package path/name table; do not reopen naming.
      shared_path_policy: disjoint
```

## Blocked dependents

No DL-01 repository/package naming question remains unresolved. After independent DL-01 validation is clean, no dependent is blocked by a DL-01 deferral.

Until that validation occurs, `I-00-repo-skeleton-governance`, package-owned implementation lanes, and `I-15-create-import-starter-UX` remain blocked on DL-01. They may also remain blocked by their own listed prerequisites, including DL-19, DL-24B, DL-02, DL-06, DL-07, DL-08, DL-10, DL-14, DL-15, DL-16, DL-17, DL-18, DL-20B, DL-21, DL-22, and DL-23 where applicable.

## Exact repository names

- Harness repository name: `vibe-engineer`.
- Starter/reference repository name: `vibe-engineer-starter`.
- Harness root private workspace package name: `@vibe-engineer/workspace`.
- Public main npm package name: `vibe-engineer`.
- Public CLI binary name: `vibe-engineer`.
- Reserved npm scope: `@vibe-engineer`.

Naming rationale:

- `vibe-engineer` preserves the locked product/package/CLI name and is generic enough for a domain-neutral harness.
- `vibe-engineer-starter` makes the second repository visibly a generated/reference starter and not a fork of harness internals.
- The `@vibe-engineer` scope is reserved now for internal workspace package names and future independent package publication without rename.

Reserved future names:

- Scoped package names listed in the package table are locked now as workspace package names.
- No additional repository names are locked now. Consuming-project repositories are user/project-owned and named by the create/import flow.
- `@vibe-engineer/cli` is not used now and must not be introduced without a later decision because `vibe-engineer` is the main public package.

## Harness repository structure

Decision: `vibe-engineer` is a pnpm/Turborepo monorepo from day one.

Package manager/workspace direction:

- Package manager: pnpm.
- Task graph direction: Turborepo.
- Root package: private, name `@vibe-engineer/workspace`, no npm publication.
- Workspace package globs for I-00: `packages/*`, `packages/presets/*`, `packages/adapters/*`.
- Harness examples/fixtures may exist under `examples/**`, but they are not the separate starter repo and are not public starter implementation ownership by default.

Root/shared files that I-00 must own later:

- `package.json` with private root workspace metadata;
- `pnpm-workspace.yaml` with decided workspace globs;
- `turbo.json`;
- `tsconfig.base.json`;
- lint/format configs;
- `.gitignore`, `.npmrc`, lockfile if generated;
- governance files assigned by DL-19/I-00;
- root docs/governance scaffolding assigned to I-00.

Package directory conventions:

- Production harness packages live under `packages/<name>`.
- Presets live under `packages/presets/<preset-name>`.
- Agentic harness adapters live under `packages/adapters/<adapter-name>`.
- Test-only harness helpers live under `packages/testing` and are never production dependencies.
- Starter/reference fixtures in the harness repo must live under lane-owned `examples/starter-reference/**` paths and must be labeled reference/sample/fixture.
- There is no `packages/core`; each lane owns a named package or subpath from the table below.

## Package and publishability table

| Package directory                | Package name                          | Public/private/internal status                                              | Initial publish status                                                                  | Primary consumers                                                         | Owning implementation lane from final strategy                            | Dependencies / forbidden dependencies                                                                                                         |
| -------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cli`                   | `vibe-engineer`                       | public main package and CLI                                                 | publishable as the initial public npm package after governance/release gates            | users, skills, CI, starter create/import, advanced agents                 | `I-02`, plus command lanes `I-07`, `I-09`, `I-15`, `I-18`, `I-21`, `I-22` | may depend on harness packages through public/internal APIs; must not depend on starter app packages or copy starter logic                    |
| `packages/artifacts`             | `@vibe-engineer/artifacts`            | private internal workspace package; future public API candidate             | not independently published initially; bundled/consumed by `vibe-engineer` where needed | all artifact writers/validators, skills, CLI, verification, context       | `I-01`                                                                    | foundational; must not depend on CLI, skills, adapters, verification runners, or starter code                                                 |
| `packages/config`                | `@vibe-engineer/config`               | private internal workspace package; future public API candidate             | not independently published initially                                                   | CLI, verification, schematics, create/import, generated config validators | `I-01`                                                                    | may depend on artifacts; must not depend on CLI, adapters, skills, or starter code                                                            |
| `packages/orchestration`         | `@vibe-engineer/orchestration`        | private internal workspace package                                          | not independently published initially                                                   | plan/build/ship runtime, failure routing, allocation                      | `I-03`                                                                    | may depend on artifacts, config, registry, context, verification contracts; must not depend on CLI or starter apps                            |
| `packages/registry`              | `@vibe-engineer/registry`             | private internal workspace package; future extension API candidate          | not independently published initially                                                   | agent/skill/schematic registry validation, adapters                       | `I-04`                                                                    | may depend on artifacts/config; must not depend on CLI command implementation, starter apps, or one adapter                                   |
| `packages/skills`                | `@vibe-engineer/skills`               | private internal workspace package                                          | not independently published initially                                                   | generated skills, adapters, CLI skill commands                            | `I-05`, `I-06`, `I-21`, `I-22`                                            | may depend on artifacts, config, orchestration, registry, context, verification; must not depend on adapter-specific packages or starter apps |
| `packages/schematics`            | `@vibe-engineer/schematics`           | private internal workspace package; future extension API candidate          | not independently published initially                                                   | CLI schematic/create/import, implementation agents                        | `I-07`                                                                    | may depend on artifacts, config, standards, contracts; must not depend on starter app implementation or adapter-specific packages             |
| `packages/context`               | `@vibe-engineer/context`              | private internal workspace package                                          | not independently published initially                                                   | context index/update/drift, build/ship, create/import                     | `I-08`                                                                    | may depend on artifacts/config; must not depend on CLI command internals or starter apps                                                      |
| `packages/verification`          | `@vibe-engineer/verification`         | private internal workspace package                                          | not independently published initially                                                   | verify command, build/ship, evidence/failure routing, CI                  | `I-09`                                                                    | may depend on artifacts, config, context, registry, mechanical-gates/security/observability contracts; must not depend on starter apps        |
| `packages/mechanical-gates`      | `@vibe-engineer/mechanical-gates`     | private internal workspace package; future public API candidate             | not independently published initially                                                   | verification runner, CI/local quality, mechanical fixtures                | `I-10`, `I-11`, `I-12`, `I-13`, `I-20`                                    | may depend on artifacts/config/contracts; must not depend on CLI command internals or starter apps                                            |
| `packages/contracts`             | `@vibe-engineer/contracts`            | private internal workspace package; future public API candidate             | not independently published initially                                                   | contract strictness fixtures, generated starter contracts/client lanes    | `I-11`                                                                    | may depend on artifacts/config; must not depend on concrete starter apps or web/mobile packages                                               |
| `packages/security`              | `@vibe-engineer/security`             | private internal workspace package                                          | not independently published initially                                                   | CLI safety commands, verification/build/ship hooks                        | `I-18`                                                                    | may depend on artifacts/config/verification contracts; must not depend on starter app business code                                           |
| `packages/observability`         | `@vibe-engineer/observability`        | private internal workspace package                                          | not independently published initially                                                   | generated starter observability defaults/tests, verification evidence     | `I-19`                                                                    | may depend on artifacts/config; must not depend on starter app implementation                                                                 |
| `packages/standards`             | `@vibe-engineer/standards`            | private internal workspace package; future public content package candidate | not independently published initially                                                   | schematics, docs/reference, generated standards                           | `I-24` with inputs from package lanes                                     | may depend on artifacts only if needed; must not depend on runtime CLI/adapters/starter apps                                                  |
| `packages/presets/typescript`    | `@vibe-engineer/preset-typescript`    | private preset workspace package; future public preset package              | not independently published initially                                                   | schematics/create/import, generated TS/pnpm/turbo/lint/test defaults      | `I-00`, `I-07`, `I-15`, `I-20` as applicable                              | may depend on config/standards/mechanical-gates metadata; must not include business-domain or starter app logic                               |
| `packages/presets/nest-react-rn` | `@vibe-engineer/preset-nest-react-rn` | private preset workspace package; future public preset package              | not independently published initially                                                   | starter generation for locked v1 stack                                    | `I-15`, `I-16`, `I-17`, `I-19`                                            | may depend on preset-typescript/schematics/contracts/standards metadata; must not become a second starter repo or copy harness runtime        |
| `packages/adapters/pi`           | `@vibe-engineer/adapter-pi`           | private adapter workspace package; future public adapter package            | not independently published initially                                                   | selected first agentic harness integration, generated pi skills/commands  | `I-14`                                                                    | may depend on artifacts/config/registry/skills/context; must not depend on other adapters or starter apps                                     |
| `packages/adapters/claude-code`  | `@vibe-engineer/adapter-claude-code`  | reserved private adapter workspace package                                  | not independently published initially; scaffold only when DL-06/lane owns it            | future Claude Code integration                                            | future DL-06-owned lane                                                   | same adapter dependency rule; no pi dependency unless through common registry contracts                                                       |
| `packages/adapters/codex`        | `@vibe-engineer/adapter-codex`        | reserved private adapter workspace package                                  | not independently published initially; scaffold only when DL-06/lane owns it            | future Codex integration                                                  | future DL-06-owned lane                                                   | same adapter dependency rule; no starter app dependency                                                                                       |
| `packages/adapters/opencode`     | `@vibe-engineer/adapter-opencode`     | reserved private adapter workspace package                                  | not independently published initially; scaffold only when DL-06/lane owns it            | future OpenCode integration                                               | future DL-06-owned lane                                                   | same adapter dependency rule; no starter app dependency                                                                                       |
| `packages/testing`               | `@vibe-engineer/testing`              | private test-only workspace package                                         | never published initially                                                               | harness fixtures/helpers/tests only                                       | relevant package implementation lanes                                     | may depend on harness packages for tests; no production package may depend on it                                                              |

## CLI and main package decision

`vibe-engineer` is both:

1. the main public npm package name; and
2. the CLI binary name.

Implementation consequences:

- `packages/cli/package.json` must use `name: "vibe-engineer"` and expose a `bin` entry named `vibe-engineer` when I-02 owns package metadata.
- Root `package.json` must not be the public package. It is private workspace metadata named `@vibe-engineer/workspace`.
- There is no initial public `@vibe-engineer/cli` package.
- CLI command contracts, output schemas, command-loader details, and subpath exports are owned by DL-07/I-02 and later command lanes, not DL-01.
- If internal scoped packages are bundled into the CLI distribution, the bundling/build mechanism is a later implementation detail; it must not change package names or public identity.

## Preset/plugin/adapter boundaries

- Presets are package-level extension surfaces under `packages/presets/*`.
- Built-in v1 preset names locked now:
  - `@vibe-engineer/preset-typescript` at `packages/presets/typescript`;
  - `@vibe-engineer/preset-nest-react-rn` at `packages/presets/nest-react-rn`.
- Adapters are package-level integration surfaces under `packages/adapters/*`.
- First adapter package name locked now:
  - `@vibe-engineer/adapter-pi` at `packages/adapters/pi`.
- Future adapter names reserved now:
  - `@vibe-engineer/adapter-claude-code`;
  - `@vibe-engineer/adapter-codex`;
  - `@vibe-engineer/adapter-opencode`.
- Presets/adapters are internal private workspace packages initially; promotion to independently published public packages requires later governance/API/release decisions.
- Presets may provide configuration and generation assets. They must not contain project/business-domain defaults.
- Adapters translate harness skills/registry/context concepts into a selected agentic harness format. They must not implement product-domain behavior and must not depend on starter apps.

## Starter consumption model

The generated/reference starter repository is `vibe-engineer-starter`.

Normative consumption rules:

1. The starter consumes the harness through dependency declarations on `vibe-engineer` and generated configuration/assets produced by `vibe-engineer` commands/schematics.
2. During implementation before publication, starter fixtures must consume local harness packages through an actual workspace link, local package link, or packed tarball representing `vibe-engineer`; hand-copied harness source is not allowed.
3. After publication, normal starter consumption is a package dependency on `vibe-engineer` plus generated project config selecting the agentic harness.
4. The starter must not import private internal `@vibe-engineer/*` packages unless a later decision explicitly promotes a scoped package as a public stable API.
5. Any direct code import from the harness by starter code must be through public `vibe-engineer` package exports or generated artifacts/contracts decided by later package/CLI/schema decisions.
6. Harness logic must stay in the harness repo. Starter code may contain generated sample/demo/reference app logic, but not copied harness validators, runners, schematics, adapters, or skill engines.
7. `examples/starter-reference/**` inside the harness repo is a fixture/reference area for implementation witnesses, not a substitute for the separate `vibe-engineer-starter` repository name.

Future real-boundary proof owners:

- `I-15-create-import-starter-UX` must prove an actual `vibe-engineer create` or equivalent generated starter fixture consumes harness packages through dependency/import declarations, not copied harness logic.
- `I-11-contract-strictness-minimal-real-fixture` and `I-16-starter-api-contracts-client-golden` must prove actual provider/client/consumer joins using package boundaries compatible with this decision.
- `I-20-ci-local-parity-wiring` must prove local aggregate quality and CI reference the decided workspace/package structure.

## Minimality and over-engineering check

This split is the minimum safe split because every package either:

- maps to a final-strategy implementation lane with distinct ownership;
- isolates a future public extension surface (`presets`, `adapters`);
- prevents the unbounded `core` package from absorbing unrelated responsibilities; or
- supports mandatory real-boundary proof (`contracts`, `verification`, `mechanical-gates`, `testing`).

The split avoids over-engineering by keeping independent publication to a single initial public package, `vibe-engineer`, while using private workspace packages for source ownership and build/test isolation. It preserves lane boundaries without forcing public API stability before the relevant DL/I owners decide schemas, commands, protocol, governance, security, observability, or documentation details.

`I-00-repo-skeleton-governance` can create the root workspace and package skeleton from this decision without reopening naming because this artifact locks:

- exact repo names;
- root private workspace package name;
- package manager/workspace direction;
- workspace globs;
- package directories and package names;
- initial public/private/publish posture;
- `vibe-engineer` package/binary identity;
- starter consumption direction.

## Verification/witness consequences

- deterministic checks affected: future workspace discovery, package manifest validation, import-boundary checks, no-copy starter consumption checks, mechanical governed-surface registry checks, and CI/local parity checks.
- positive witnesses required downstream:
  - `I-00`: actual pnpm workspace graph resolves decided package directories and root config.
  - `I-15`: actual generated starter declares dependency on `vibe-engineer` and consumes harness-generated assets/imports without copied harness logic.
  - `I-11`/`I-16`: actual contract/provider/client/consumer fixtures work across decided package boundaries.
  - `I-20`: local aggregate quality and CI reference the same decided package/workspace graph.
- negative witnesses required downstream:
  - missing package from workspace graph fails;
  - starter copying harness source fails;
  - starter importing private `@vibe-engineer/*` packages without promotion fails;
  - public package/binary renamed away from `vibe-engineer` fails;
  - production package depending on `@vibe-engineer/testing` fails.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - two-repo direction remains `vibe-engineer` plus `vibe-engineer-starter`;
  - harness core remains domain-neutral;
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet;
  - fixed starter stack remains NestJS, React, React Native, strict TypeScript, pnpm, Turborepo, PostgreSQL, Prisma, shared contracts/client, tests/E2E/UI verification/CI/context/golden module;
  - normal users interact through skills, not low-level package/CLI primitives;
  - schematics remain deterministic agent-facing generators;
  - `build` and `ship` automatically run verification/context/evidence.
- real_boundary_required: yes for later implementation lanes; no live runtime seam is created by this decision artifact.
- real_boundary_status: required_before_closure for I-00/I-11/I-15/I-16/I-20/I-23; not_applicable for this decision artifact.
- if no live seam: this artifact locks package/repo boundaries only. It does not create package files, run a package manager, generate a starter, or claim package consumption is already proven.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-01-repo-package-structure.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-01-repo-package-structure/**`
- read_only_paths:
  - all cited source docs and orchestration artifacts in `/Users/lizavasilyeva/work/harness-starter/**`;
  - prerequisite decision artifacts/reports for DL-24A and DL-20A;
  - target repo inventory outside DL-01 owned paths.
- untouchable_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.git/**`;
  - root workspace/config/package/CI/source/starter files;
  - `packages/**`, `examples/**`, generated starter files;
  - all non-owned decision/report paths.
- serialized/shared ownership notes:
  - I-00 owns root workspace/config/governance creation later.
  - I-20 owns later root/CI aggregate wiring handoff.
  - Package implementation lanes own package source paths listed in the final strategy and this package table.
  - CLI package metadata edits after I-02 require serialized handoff because `packages/cli/package.json` is shared by command lanes.

## Domain-neutrality check

- DL-20A status consulted: green/LOCKED/PASS.
- domain-neutrality rule references: DL-20A `Core / extension / sample-demo boundary`, `Allowed and forbidden vocabulary policy`, `Decision-artifact checklist`, `Implementation enforcement plan`, and `Verification/witness consequences`.
- governed surfaces affected by this decision: repository names, package names, package directory conventions, preset/adapter names, starter reference naming, and future consumption boundaries.
- surface classification:
  - `vibe-engineer` harness repo and all `@vibe-engineer/*` packages are core harness surfaces.
  - `vibe-engineer-starter` is generated/reference starter surface.
  - `examples/starter-reference/**` is sample/reference fixture surface.
  - consuming-project repositories are project-owned extension surfaces.
- positive generic terms permitted: artifacts, config, cli, orchestration, registry, skills, schematics, context, verification, mechanical gates, contracts, security, observability, standards, presets, adapters, testing.
- project/business terms mentioned: none as package/repo names. Any source-cited forbidden terms are only negative examples under DL-20A.
- result: PASS. Repo/package names are generic harness/development terms and do not encode ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout/product/customer-order style business models, or equivalent project-specific concepts.
- later enforcement owner: DL-15/I-10 for mechanical governed-surface checks, I-04 for agent/prompt registry surfaces, I-07/I-15 for schematic/create outputs, I-24 for docs/examples labels, and DL-20B for audit.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes
- conflicts discovered: none. Target inventory showed only this DL-01 work report inside the DL-01 owned work directory and no existing DL-01 decision artifact. Parallel decision work exists in disjoint DL-02..DL-08 paths and was not touched.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Implementation details deliberately assigned to future owners, with no dependent allowed to rely on them before they are decided/proven:

- exact artifact schemas: DL-02/I-01;
- CLI command contracts, output schemas, and public subpath exports: DL-07/I-02 and command lanes;
- skill protocols: DL-03/I-05/I-06/I-21/I-22;
- schematic API/template/idempotency: DL-08/I-07;
- verification/evidence model: DL-10/I-09;
- mechanical engine details: DL-15/I-10..I-13;
- starter detailed app architecture/golden module details: DL-16/I-15..I-17/I-19;
- governance/license/versioning/release: DL-19/I-00/I-24;
- docs system: DL-21/I-24;
- security and observability details: DL-22/DL-23 and their implementation lanes.

## Evidence checklist

- Report artifact was created before this decision artifact and updated after source/prerequisite/inventory inspection.
- Exact source files inspected are listed in the execution report and cited by path/section here.
- Files changed are limited to this decision artifact and the DL-01 execution report.
- No production/package/root/config/CI/generated starter files were touched.
- This artifact produces exactly one output class: `locked_decision_document`.
- Dependencies, blocked dependents, deferrals, ownership, read-only paths, untouchable paths, and handoffs use the DL-24A dependency declaration format.
- Every planning backlog §1 question is answered explicitly:
  1. repo names: `vibe-engineer`, `vibe-engineer-starter`;
  2. harness structure: pnpm/Turborepo monorepo from day one;
  3. scope/publishing: public `vibe-engineer` package, private initial `@vibe-engineer/*` workspace packages;
  4. internal package names: package table;
  5. public/private packages: package table;
  6. preset/plugin boundaries: presets/adapters sections;
  7. starter consumption: dependency on `vibe-engineer`, no copied logic;
  8. `vibe-engineer` CLI/main package: yes, both; scoped packages reserved/internal now;
  9. minimal package split: no `core`, lane-aligned private workspace packages, one initial public package.
- Locked product/package/CLI name `vibe-engineer` is preserved.
- Two-repo direction is preserved with domain-neutral harness plus generated/reference starter kit repo.
- Package boundaries map to final-strategy lanes without shared-file ambiguity beyond recorded serialized handoffs.
- I-00 can create skeleton without reopening package/repo naming.
- Later starter proof must show actual dependency/import/CLI-generated consumption rather than copied harness logic.
- DL-20A domain-neutrality checklist is applied to repo/package names and examples.
- Real-boundary status is not falsely marked proven.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and target inventory, not this report alone.

### Positive witnesses

- `docs/decisions/DL-01-repo-package-structure.md` exists and uses the DL-24A schema with exactly one output class.
- All backlog §1 questions are answered explicitly.
- Exact harness and starter/reference repository names are locked.
- The package/publication table includes package directory, package name, public/private/internal status, initial publish status, consumers, owner lanes, and dependency/forbidden-dependency notes.
- `I-00-repo-skeleton-governance` can derive root workspace/package skeleton ownership without further naming decisions.
- Starter consumption model forbids copying harness logic and names later real-boundary proof lanes.
- Domain-neutrality checklist from DL-20A is present and passes for repo/package names.

### Negative witnesses

- Reject any interpretation that lets I-00 proceed with repo names open.
- Reject any package metadata plan where `vibe-engineer` is not both main package and CLI binary.
- Reject package tables missing visibility, initial publish status, consumers, owner lanes, or forbidden dependency notes.
- Reject reintroducing a broad `packages/core` god package without a later decision.
- Reject starter generation that copies harness implementation or imports private scoped packages without promotion.
- Reject domain-specific core package/repo names or unlabeled business examples.
- Reject any deferred DL-01 boundary that a downstream lane relies on.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Two-repo direction remains harness repo plus generated/reference starter kit repo.
- Harness core remains domain-neutral.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- Fixed starter stack remains NestJS, React, React Native, strict TypeScript, pnpm, Turborepo, PostgreSQL, Prisma, shared contracts/client, tests/E2E/UI verification/CI/context/golden module.
- Normal users interact through skills, not low-level package/CLI primitives.
- Schematics remain deterministic agent-facing generators.
- `build` and `ship` automatically run verification/context/evidence.
- DL-02, DL-03, DL-07, DL-08, DL-10, DL-14, DL-15, DL-16, DL-19, DL-21, DL-22, and DL-23 remain owners of their details.

### Sibling/blast-radius checks

- Check final strategy §§3–11 and §19 for DAG, package hypothesis, ownership, and proof-lane consistency.
- Check DL-24A for output discipline compliance.
- Check DL-20A for domain-neutrality compliance.
- Check README §§2, 11, 12, 13; locked decisions §§1–3/§§5–11; verification layer; mechanical gates; and backlog §1 for contradictions.
- Check target repo inventory to confirm no production/root/config/package/starter files or unrelated decision paths were edited by DL-01.
- Check that package boundaries do not force later lanes to share unplanned write paths.

### Severity policy

- `critical`: locked decision contradiction; out-of-license write; missing decision artifact; missing DL-24A/DL-20A prerequisite; unresolved required backlog §1 decision with dependent relying on it; invalid deferral; starter-copying-harness model; missing package visibility/consumer/owner table; false real-boundary closure; unsafe dirty-tree operation.
- `major-local`: incomplete package table, unclear publication status, unclear I-00 skeleton consequences, incomplete domain-neutrality check, or weak validation plan limited to DL-01 paths.
- `minor-local`: citation/wording/format issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all schema, source, ownership, domain-neutrality, and witness requirements are satisfied.

## Known ambiguities / future owners

No DL-01 blocker remains.

Future owners and non-blocking boundaries:

- DL-19/I-00 decide exact governance/license/release metadata and create root files, but must preserve names from DL-01.
- DL-07/I-02 decide exact CLI command contracts, subpath exports, command discovery, and package metadata details beyond `name`/`bin` identity.
- DL-06/I-14 decide adapter abstraction and first pi implementation details, but must use the adapter package names and boundaries here.
- DL-08/I-07 decide schematic API/template/idempotency details, but must use `@vibe-engineer/schematics` and preset boundaries here.
- DL-15/I-10..I-13 decide exact mechanical engine implementation, but must use `@vibe-engineer/mechanical-gates` and preserve the governed package surface.
- DL-16/I-15..I-17 decide detailed starter app architecture inside `vibe-engineer-starter` and harness-owned fixtures.
- DL-21/I-24 decide public docs structure and examples, preserving domain-neutral labels.
- DL-20B and DL-24B later audit domain-neutrality and output discipline across decisions.
