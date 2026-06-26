# DL-20A — Domain-Neutrality Foundation

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-20A decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.1 `Harness repo package hypothesis`; §4.2 `Generated starter kit hypothesis`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`; §6 `Dependency DAG with scheduler gates`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 `Evidence`, `Dirty-tree`, `Final closure`, and `Severity` requirements.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §8 `Coverage by product surface`; §10 `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §2 `First ready queue items`; §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §3.1 `Domain-neutral core`; §8 `Schematics`; §9 `Verification model`; §15 `Success criteria`; §16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§1–3 `Product / package / CLI name`, `Two-repo direction`, and starter stack; §§5–11 config defaults, six skills, schematics, automatic verification/context, E2E stack, verification layer, and mechanical gates.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1.4–1.6 evidence/deterministic/domain-neutrality principles; §5.13 `Advisory review agents`; §11.2 `Agent validation`; §14 `Blocking policy summary`; §16 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §1 `Core verification doctrine`; §5 `Schema and contract strictness gate`; §7 `Quality wiring-integrity gate`; §§11–13 verification fit, implementation priority, and final invariant.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §20 `Domain-neutrality enforcement`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§0, 5.2, 10, 11 for triad discipline, evidence-bound validation, dirty-tree safety, and no band-aids.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

`vibe-engineer` harness core is permanently domain-neutral. Core packages, prompts, rules, validators, standards, schematics, docs, examples, generated starter mechanics, agent registry entries, and decision artifacts must use generic harness/development vocabulary unless content is explicitly a consuming-project extension or an unmistakably labeled sample/demo fixture. Later decisions and implementation lanes cannot close until they record this checklist, assign deterministic/advisory enforcement evidence, and preserve the core/extension/sample-demo boundary.

## Decision

The locked DL-20A decision is that domain-neutrality is a hard prerequisite for all later decision artifacts and core implementation. The normative foundation rules are stated in `Decision details`, the core/extension/sample-demo boundary, the allowed/forbidden vocabulary policy, the later decision checklist, and the implementation enforcement plan below.

## Decision details

1. Core harness surfaces may encode reusable development structure, orchestration, verification, context, contracts, adapters, skills, schematics, and standards.
2. Core harness surfaces must not encode project/business domains such as ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout/product/customer-order style business models, or any other consuming-project product concept.
3. Project-specific vocabulary belongs only in consuming-project extensions or generated starter sample/demo fixtures that are clearly labeled as sample/demo and never imported as harness core logic.
4. Domain-neutrality is a closure gate, not a style preference. A later decision or implementation lane omitting domain-neutrality evidence remains blocked by this decision.
5. Advisory review is useful but insufficient for core implementation closure. Core closure requires deterministic checks over actual governed harness surfaces plus advisory review for context-sensitive cases.
6. `DL-20A` defines the foundation and future proof plan only. It does not replace the later `DL-20B-domain-neutrality-compliance-audit`.

## Alternatives considered

### Advisory-only review

- decision: rejected
- rationale: `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` §§1.5 and 5.13 say advisory/LLM review is not the sole hard blocker. Core domain-neutrality leakage is a hard architectural risk, so deterministic evidence is required before core closure.
- consequences: advisory reviewers remain part of the plan, but cannot be the only gate for core harness surfaces.

### Hard-coded project vocabulary denylist only

- decision: rejected
- rationale: README §3.1 gives concrete forbidden examples, but backlog §20 also requires extension boundaries, examples/core separation, review agents, and generic-behavior tests. A denylist alone misses new project-specific concepts and cannot prove sample/demo labeling or ownership boundaries.
- consequences: denylist checks are allowed as one deterministic signal, but must be combined with governed-surface scanning, explicit sample/demo metadata, extension-boundary checks, and validator checklist evidence.

### No enforcement until `DL-20B`

- decision: rejected
- rationale: final strategy §§5.1, 5.2, 6, and 7 make `DL-20A` a prerequisite before later decision artifacts and core implementation. `DL-20B` is a later audit, not the foundation.
- consequences: every later `DL-*` decision and core implementation lane must apply this foundation now; `DL-20B` audits compliance later.

### Selected balanced approach

- decision: accepted
- rationale: lock a normative boundary/checklist now; require deterministic mechanical checks for governed core surfaces in later implementation; keep advisory review for nuanced semantics; audit all decisions later with `DL-20B`.
- consequences: future lanes have clear owners and proof obligations without `DL-20A` implementing production code.

## Dependencies

This decision depends on green `DL-24A` output discipline, `MST-R` PASS, and the cited source docs. The full DL-24A-compatible dependency declaration follows.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required future decision template, dependency declaration format, evidence checklist, validator checklist, and dirty-tree discipline.
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy is safe for implementation-planning and decision execution sequencing.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification, mechanical gates, backlog, strategy, and playbook define the domain-neutrality and proof requirements.
  blocks:
    - id: DL-01..DL-19,DL-21..DL-23
      reason: Later decision artifacts must include and pass the DL-20A domain-neutrality checklist.
    - id: core implementation lanes
      reason: Harness core implementation cannot close without deterministic/advisory domain-neutrality evidence mapped here.
    - id: DL-20B-domain-neutrality-compliance-audit
      reason: Audit requires this foundation as its checklist/source of truth.
  blocked_dependents:
    - id: DL-01..DL-19,DL-21..DL-23
      blocked_until: DL-20A is independently validated clean.
      relying_on: Decision-artifact checklist, allowed/forbidden vocabulary policy, and core/extension/sample-demo boundary.
    - id: I-00-repo-skeleton-governance and all later I-* core/starter/docs lanes
      blocked_until: Applicable decisions plus DL-20A are green and later audits pass where required by strategy.
      relying_on: Domain-neutral core and enforcement ownership.
    - id: DL-20B-domain-neutrality-compliance-audit
      blocked_until: Audited decision artifacts exist.
      relying_on: DL-20A checklist and enforcement plan.
  required_before_finalizing:
    - id: all later DL-* decision artifacts
      required_content: Domain-neutrality check section applying this decision.
    - id: I-10-mechanical-gates-P0 / DL-15
      required_content: Deterministic domain-neutrality governed-surface mechanism included or explicitly scheduled by mechanical-engine decision.
    - id: I-04-agent-registry-validation-meta
      required_content: Core agent/prompt domain-neutrality validation.
    - id: I-24-docs-reference-governance-polish
      required_content: Docs/reference/examples consistency with core-vs-sample-demo boundary.
    - id: DL-20B-domain-neutrality-compliance-audit
      required_content: Cross-decision and pre-implementation compliance audit.
  deferrals:
    - deferred_question: Exact tool implementation for deterministic core-surface checks.
      rationale: Tooling belongs to DL-15/I-10 and related implementation lanes; this decision locks requirements and owners.
      future_owner: DL-15-mechanical-engine / I-10-mechanical-gates-P0
      allowed_now: true
      blocked_dependents:
        - core implementation closure
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - docs/decisions/DL-20A-domain-neutrality-foundation.md
    - .vibe/work/DL-20A-domain-neutrality-foundation/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/**
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-20A owned paths
  untouchable_paths:
    - .git/**
    - package source paths
    - root config files
    - CI files
    - generated starter files
    - any decision/report path not owned by DL-20A
  handoff_notes:
    - from: DL-20A
      to: DL-20B-domain-neutrality-compliance-audit
      condition: After later decision artifacts are green and ready for audit.
      shared_path_policy: disjoint
    - from: DL-20A
      to: DL-15/I-10, I-04, I-24
      condition: Future lanes implement/validate the required deterministic/advisory/docs checks in their owned paths.
      shared_path_policy: disjoint
```

## Blocked dependents

All later decision artifacts and core implementation remain blocked until this `DL-20A` artifact is independently validated clean, per final strategy §§5.1, 5.2, 6, and 7.

Specific blocked groups:

- `DL-01` through `DL-19` and `DL-21` through `DL-23`: must apply the decision-artifact checklist before finalization.
- `DL-20B`: must wait until audited decisions exist, then audit against this foundation.
- `DL-24B`: must verify later decision-output compliance includes the DL-20A domain-neutrality check.
- `I-00` and all later core/starter/docs implementation lanes: cannot close core or starter surfaces that depend on domain-neutrality boundaries without the future proofs mapped here.
- `FINAL-BUGHUNT`: cannot close while any domain-neutrality proof is missing or `pending-live/BLOCKED`.

## Core / extension / sample-demo boundary

### Core harness

Core harness includes packages, prompts, rules/validators, standards, schematics, adapters, skills, agent registry entries, context/verification machinery, mechanical gates, docs/reference material, and examples that represent reusable harness behavior.

Allowed core concepts from README §3.1 and strategy §3 include:

- apps, packages, modules;
- contracts and runtime schemas;
- adapters and agentic harness integrations;
- tests, E2E, UI verification, mechanical gates;
- standards, context files, plans, work artifacts, evidence;
- verification, schematics, skills, agents, registries, orchestration;
- TypeScript, NestJS, React, React Native, pnpm, Turborepo, PostgreSQL, Prisma as locked starter stack/platform terms when discussing generic presets or starter stack decisions.

Core must be domain-neutral even when implementing strict rules. For example, a core contract schematic may generate `SampleEntity`, `ExampleModule`, or `RecordFixture`; it must not generate a production-specific `ProductInventoryOrder` unless that file is in a labeled sample/demo area and not harness core.

### Consuming-project extensions

Consuming projects may define their own business vocabulary, rules, standards, agents, schematics, verification policies, and context once they are clearly outside harness core. Extensions must be registered/configured through extension points rather than hard-coded into harness packages.

Project-specific extension content must declare ownership and scope, such as `project-owned rule`, `consuming-project agent`, or `project schematic`, and must not be imported by core packages as a default behavior.

### Sample/demo and generated starter artifacts

Sample/demo content is allowed only when all are true:

1. The path is explicitly a sample/demo/reference fixture path allowed by a later decision/lane.
2. The file or surrounding README labels the content as sample/demo/reference, not core policy.
3. The sample does not become a required core rule, core prompt assumption, or hidden default.
4. The sample remains generic enough to demonstrate structure without tying the harness to one product.

The generated/reference starter may demonstrate a golden module, but strategy §4.2 says it is domain-neutral/sample-only. Business vocabulary in generated starter examples must be minimal, labeled, and replaceable by consuming-project context.

### Docs and examples

Core docs may cite forbidden terms as negative examples when the citation is explicitly about domain-neutrality. Docs/examples must not present a business domain as the default intended project. Tutorials must label sample domains and preserve the reusable harness boundary.

### Prompts, agents, schematics, validators, standards

- Core prompts must not instruct agents to assume a business domain.
- Core agents must declare domain-neutral purpose and pass registry/prompt validation.
- Core schematics must generate generic names/slots and accept project-specific names as user/project inputs only at extension/starter boundaries.
- Core validators and standards must check harness structure, safety, verification, contracts, and context rather than business-specific models.
- Mechanical rules may detect domain-specific leakage in governed core surfaces, but consuming-project extension rules live outside core.

## Allowed and forbidden vocabulary policy

### Allowed generic harness vocabulary

Allowed in core when used generically:

- `vibe-engineer` as locked product/package/CLI name;
- `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship` as locked skills;
- Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet, Evidence Packet;
- app, package, module, contract, adapter, schema, validator, rule, standard, context, evidence, registry, schematic, skill, agent, orchestrator, fixture, test, E2E, UI verification, mechanical gate;
- generic implementation/platform words from locked stack decisions, including NestJS, React, React Native, TypeScript, pnpm, Turborepo, PostgreSQL, Prisma, Playwright, Maestro, Detox.

Allowed generic examples:

- `new-module` schematic;
- `contracts` package;
- `adapter` fixture;
- `ExampleModule`, `SampleContract`, `GenericEntity`, `TestRecord`, `ReferenceFlow` in sample/demo contexts;
- `ProjectRule` as an extension placeholder when explicitly documented as consuming-project-owned.

### Forbidden project/business vocabulary in core

Forbidden in core packages/prompts/rules/schematics/docs/examples unless cited as a negative example or explicitly labeled sample/demo:

- README §3.1 examples: ecommerce, inventory, fashion, Billz, Telegram, Instagram;
- synthetic placeholder examples marked here as forbidden core leakage: `ProductCatalog`, `ShoppingCart`, `CustomerOrder`, `CheckoutFlow`, `WarehouseStock`, `FashionDrop`, `BillzInvoice`, `TelegramBotBusinessRule`, `InstagramEngagementModel`;
- any consuming-project product name, domain model, workflow, integration assumption, or business rule not owned by the harness itself.

These examples are not an exhaustive denylist. A term can be forbidden even if not listed when it encodes a specific project/business model in a core surface.

### Citation and negative-example exception

Source docs and decision artifacts may mention forbidden terms to define or test the boundary. Such mentions must be visibly negative examples, test fixtures for rejection, or sample/demo labels. The mention must not normalize the term as core vocabulary.

## Decision-artifact checklist

Every later `DL-*` artifact must include a `Domain-neutrality check` section that records all applicable items:

1. Identify governed surfaces affected by the decision: packages, prompts, agents, rules, validators, standards, schematics, docs, examples, generated starter artifacts, or consuming-project extension points.
2. State whether each affected surface is core harness, consuming-project extension, sample/demo, or not applicable.
3. List positive generic terms/structures the decision permits.
4. List any project/business terms mentioned and classify each as forbidden, negative example, source citation, sample/demo, or project extension.
5. Confirm no core package/prompt/rule/schematic/doc/example is allowed to depend on ecommerce/inventory/fashion/Billz/Telegram/Instagram-like business concepts or any equivalent project-specific model.
6. Confirm consuming-project extensions have explicit boundaries and are not hidden core defaults.
7. Confirm sample/demo artifacts have explicit labels and do not overconstrain or replace consuming-project choices.
8. Map deterministic enforcement to an owner lane, or block the dependent if no owner exists.
9. Map advisory review to an owner lane where semantic judgment is required.
10. Include positive, negative, and regression witness consequences for validators.
11. Preserve locked decisions: `vibe-engineer` name, two-repo direction, six skills, artifact flow, fixed starter stack/E2E decisions, automatic verification/context, mechanical gates, and domain-neutral core.
12. State dirty-tree/path ownership impacts and confirm no unowned production files are edited.
13. If any item is deferred, prove no dependent relies on it; otherwise list blocked dependents.

A later decision omitting this checklist or leaving material items unanswered is not green.

## Implementation enforcement plan

### Deterministic checks required for core closure

The earliest deterministic enforcement must run over actual governed harness core surfaces, not hand-written examples only. Future implementation must provide checks that can prove:

- core governed files are enumerated through a real governed-surface registry;
- core package/prompt/rule/schematic/doc/example surfaces reject forbidden project/business vocabulary unless the file is explicitly sample/demo or negative-test-labeled;
- core schematics/generators do not emit unlabeled project-specific business concepts into core or generated starter defaults;
- extension fixtures are isolated from core defaults;
- positive generic cases are accepted;
- negative core leakage cases are rejected;
- missing domain-neutrality evidence in a later decision remains a blocking condition.

Expected owner mapping:

- `DL-15-mechanical-engine` decides exact mechanical mechanism and hard/advisory status integration.
- `I-10-mechanical-gates-P0` implements the first deterministic core-surface enforcement if it belongs in P0 governed surface/config/allowlist/wiring checks.
- `I-07-schematics-engine` proves core schematics generate generic names and respect sample/demo labels in owned schematic fixtures.
- `I-15-create-import-starter-UX` proves generated starter/create paths keep project-specific naming at input/extension boundaries and do not copy core harness logic.
- `I-04-agent-registry-validation-meta` implements/validates core agent and prompt domain-neutrality checks.
- `I-24-docs-reference-governance-polish` validates docs/reference/examples labels and consistency after implementation.
- `DL-20B-domain-neutrality-compliance-audit` audits all decision artifacts and governed implementation evidence before implementation launch beyond allowed skeleton gates/final closure.

### Advisory reviews

Advisory domain-neutrality review is required for semantics that deterministic checks cannot fully judge, including subtle product assumptions in prompts, docs, standards, and examples. Advisory owners:

- later `DL-*` validators for decision artifacts;
- `I-04` for agent/prompt registry surfaces;
- `I-24` for public docs/examples;
- `FINAL-BUGHUNT` for combined obvious-miss review.

Advisory review findings may become hard blockers when tied to this decision's acceptance criteria or a deterministic witness.

### Evidence location

Evidence must be recorded in the owning lane reports and, where implemented, lane-owned evidence paths. At minimum:

- decision checklist evidence in each `docs/decisions/DL-*.md` and each decision execution/validation report;
- mechanical check output in `I-10`/mechanical lane-owned reports or evidence paths;
- agent/prompt validation evidence in `I-04` reports/evidence;
- docs/example label evidence in `I-24` reports/evidence;
- cross-decision audit evidence in `DL-20B` artifact/report.

## Verification and witness consequences

This section is the DL-20A witness contract. The DL-24A-compatible `Verification/witness consequences` field is represented by the bullets below.

## Verification/witness consequences

- deterministic checks affected: future domain-neutrality governed-surface checks, agent/prompt validation, schematic/generator fixture checks, docs/example label checks, and audit checks.
- positive witnesses required downstream:
  - generic core terms (`apps`, `packages`, `modules`, `contracts`, `adapters`, `tests`, `standards`, `context`, `plans`, `verification`, `schematics`, `skills`) are accepted;
  - locked `vibe-engineer` name and six skills are accepted;
  - explicitly labeled sample/demo fixture is accepted when isolated from core defaults;
  - consuming-project extension rule is accepted only through an extension boundary.
- negative witnesses required downstream:
  - ecommerce/inventory/fashion/Billz/Telegram/Instagram-like business concepts in core prompts/rules/schematics/docs are rejected unless clearly negative-example or sample/demo-labeled;
  - advisory-only enforcement is rejected as sufficient for core closure;
  - a later decision without domain-neutrality evidence is blocked;
  - unlabeled sample/demo or generated starter business content is rejected.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet;
  - fixed starter stack and E2E decisions remain intact;
  - automatic verification/context behavior remains intact;
  - `DL-20B` remains a later audit and is not replaced by `DL-20A`;
  - `DL-24A` output discipline remains prerequisite and is not contradicted.
- real_boundary_required: yes for later implementation enforcement; no live runtime seam is created by this decision artifact itself.
- real_boundary_status: required_before_closure for core implementation lanes; not_applicable for this decision artifact.
- if no live seam: this decision only locks rules and proof ownership; it does not implement checks, generate code, or claim runtime feasibility.

## Ownership consequences

This section records DL-20A ownership and the DL-24A-compatible ownership/path fields.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/**`
- read_only_paths:
  - all source docs in `/Users/lizavasilyeva/work/harness-starter/**`;
  - existing prior decision artifacts and reports, including `DL-24A`;
  - target repo inventory outside DL-20A owned paths.
- untouchable_paths:
  - `.git/**`;
  - production package source, root config, CI, generated starter files;
  - all non-owned decision/report paths.
- serialized/shared ownership notes: none for DL-20A. Future lanes own disjoint enforcement artifacts and must record handoffs if they need shared/root paths.

## Domain-neutrality check

- DL-20A status consulted: this document is the foundation.
- domain-neutrality rule references: this document's `Core / extension / sample-demo boundary`, `Allowed and forbidden vocabulary policy`, `Decision-artifact checklist`, and `Implementation enforcement plan`.
- result: PASS for this artifact.

## Domain-neutrality self-check

Self-application:

1. Surface classification: this is a decision artifact, not core code or sample/demo implementation.
2. Positive generic terms used: apps, packages, modules, contracts, adapters, tests, standards, context, plans, verification, schematics, skills, agents, artifacts, evidence.
3. Forbidden/project terms used: only as source-cited negative examples or synthetic negative examples explicitly marked as forbidden core leakage.
4. Consuming-project extensions: treated as project-owned and outside core defaults.
5. Sample/demo boundary: explicitly labeled and constrained.
6. Deterministic owner mapping: assigned to DL-15/I-10 plus I-04/I-07/I-15/I-24 and DL-20B.
7. Advisory owner mapping: assigned to later validators, I-04, I-24, FINAL-BUGHUNT.
8. Regression preservation: locked name, six skills, artifact flow, fixed starter stack, E2E tools, automatic verification/context, and DL-24A/DL-20B sequencing are preserved.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes
- conflicts discovered: none. Target inventory before artifact creation showed no existing `docs/decisions/DL-20A-domain-neutrality-foundation.md` and no conflicting content inside `.vibe/work/DL-20A-domain-neutrality-foundation/**` beyond this lane's report.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Deferred implementation detail only:

- deferred_question: exact implementation tool/mechanism for deterministic domain-neutrality checks.
- reason_now: production implementation belongs to later `DL-15`/`I-10`, `I-04`, `I-07`, `I-15`, and `I-24` lanes, not this decision-only lane.
- future_owner: `DL-15-mechanical-engine`, `I-10-mechanical-gates-P0`, `I-04-agent-registry-validation-meta`, `I-07-schematics-engine`, `I-15-create-import-starter-UX`, `I-24-docs-reference-governance-polish`, `DL-20B-domain-neutrality-compliance-audit`.
- required_before_finalizing: core implementation closure and final closure.
- blocked_dependents: any dependent attempting to finalize without the assigned proof.
- proof_no_dependent_relies_now: no production implementation is authorized by this `DL-20A` decision; later decisions can rely on the locked requirements and must block if implementation proof is missing.

## Evidence checklist

1. Report artifact was created before the DL-20A decision artifact and updated after stages.
2. Source files inspected are listed in the execution report and cited above by path/section.
3. Files changed are this decision artifact and the DL-20A execution report only.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
7. No unresolved deferral is relied on by a dependent without a blocked-dependent mapping.
8. Verification/witness consequences list positive, negative, and regression witnesses.
9. Real-boundary status is stated: this decision creates no live seam; later implementation enforcement is required before core closure.
10. Ownership/path consequences are explicit and dirty-tree-safe.
11. Domain-neutrality check is present and self-applied.
12. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, `plan` Verification Delta, automatic `build`/`ship` verification/context, fixed starter stack/E2E, mechanical gate families, and no push/PR without approval.
13. Downstream dependents cannot finalize without this checklist and future enforcement proof.
14. Validator checklist and severity policy are included below.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and any available diff, not just this narrative.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md`.
- Required DL-24A output class/template fields are present.
- Backlog §20 is resolved: naming checks, forbidden domain examples, extension boundaries, examples-vs-core separation, review agents, and generic-behavior tests are covered.
- Reusable decision-artifact checklist is present.
- Locked product/domain-neutral decisions from README, locked decisions, and final strategy are preserved.
- Enforcement maps to later owner lanes or blocked dependents.

### Negative witnesses

- Core leakage examples using ecommerce/inventory/fashion/Billz/Telegram/Instagram-like business concepts are rejected unless explicitly negative-example or sample/demo-labeled.
- Advisory-only enforcement is not sufficient for core implementation closure.
- A later decision omitting domain-neutrality evidence remains blocked.
- Generic harness concepts (`apps`, `packages`, `modules`, `contracts`, `adapters`, `tests`, `standards`, `context`, `plans`, `verification`, `schematics`, `skills`) are not banned.

### Regression witnesses

- `vibe-engineer` name remains unchanged.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Fixed starter stack and E2E decisions remain intact.
- Automatic verification/context behavior remains intact.
- `DL-20B` remains later audit, not replaced by `DL-20A`.
- `DL-24A` output discipline remains prerequisite and is not contradicted.

### Sibling/blast-radius checks

- Check source docs listed in this artifact for contradictions.
- Check target repo writes stayed within DL-20A owned paths.
- Check no other decision artifact, source doc, production path, root config, CI, starter file, or git metadata was edited.
- Check future owner references are coherent with final strategy §§5–11.
- Check sample/demo rules do not make starter demonstration impossible.

### Severity policy

- `critical`: locked decision contradiction; missing `DL-24A` prerequisite; missing DL-20A decision artifact; unsafe write outside ownership; absent dependency/blocker mapping; no deterministic enforcement path for core domain-neutrality; advisory-only core closure.
- `major-local`: incomplete checklist; incomplete source citation; unclear proof owner; missing positive/negative/regression witness design limited to this decision.
- `minor-local`: wording/format issue that does not weaken gates.
- `clean`: schema, source, ownership, enforcement ownership, and witness requirements satisfied.

## Known ambiguities / future owners

No blocking ambiguity remains in this decision. Exact implementation mechanics are intentionally assigned to future owner lanes and block only the relevant implementation closures if not implemented/proven.

Future owners:

- `DL-15`/`I-10`: deterministic mechanical enforcement over governed core surfaces.
- `I-04`: core agent/prompt registry validation.
- `I-07`: schematic generic behavior evidence.
- `I-15`: create/import starter boundary evidence.
- `I-24`: docs/reference/examples label consistency.
- `DL-20B`: cross-decision and pre-implementation domain-neutrality audit.
- `FINAL-BUGHUNT`: combined obvious-miss review over all evidence.

## Open ambiguities / deferred items

None that any dependent may rely on without a future proof. Exact tool implementation is deferred to assigned implementation lanes and blocks the affected closure if missing.
