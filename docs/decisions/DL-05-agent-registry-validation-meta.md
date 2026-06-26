# DL-05 — Agent Registry and Agent Validation

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-05 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-05-agent-registry-validation-meta.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-05-agent-registry-validation-meta/reports/decision-lock-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §5 `Agent registry and agent validation`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §6 `Orchestration model`; §7 `Planning orchestrator design`; §8 `Build orchestrator design`; §9 `Failure routing and fixing`; §10 `UI verification orchestration`; §11 `Agent registry`; §11.1 `Registry metadata`; §11.2 `Agent validation`; §12 `Meta-agents outside normal orchestration`; §12.14 `Meta-agent safety rule`; §13 `Harness configuration`; §15 `Success criteria`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §10 `Verification-layer decisions`; §11 `Mechanical verification gates`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §2 `The two repositories`; §3.1 `Domain-neutral core`; §3.2 `User interacts with skills, not low-level tooling`; §4 `Core workflow`; §9 `Verification model`; §15 `Success criteria`; §16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §1 `Core verification doctrine`; §5 `Schema and contract strictness gate`; §7 `Quality wiring-integrity gate`; §11 `How this fits the verification layer`; §12 `Implementation priority`; §13 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §0 `Binding operator directives`; §5.2 `Work-item loop — plan, execute, verify, fix`; §10 `The quality bar`; §11 `Operator anti-patterns`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §5.2 `Decision-lock table`; §6.1 `Decision DAG`; §6.2 `Implementation DAG`; §9.2 `Decision triad ownership`; §9.3 `Implementation lane ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §13.3 `Product agent/skill coverage`; §14 `Evidence, report, and ledger requirements`; §18 `Severity gate policy`; §19 `Concise first ready queue after MST closure`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §8 `Coverage by product surface`; §10 `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §2 `First ready queue items`; §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`; `Verification and witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

The harness must have a typed, schema-validated, versioned agent registry. Every core, project-extension, sample/demo, validator, fixer, reviewer, orchestrator, specialist, and meta-agent must be registered, linked, validated, maturity-classified, versioned, and testable before it can be treated as green. Core registry surfaces are domain-neutral, meta-agents are recommendation-only by default, no agent may be its only validator, and `I-04-agent-registry-validation-meta` remains blocked until DL-05 policy and DL-02 registry-entry schema/serialization are aligned and green.

## Decision details

1. The accepted model is a typed registry with mandatory validation, not ad hoc prompt files.
2. The registry is the source of truth for which agents exist, what they may do, when they run, what artifacts they consume/produce, which validators/fixers review them, and which maturity/version/eval evidence supports their use.
3. Registry entries are harness artifacts. Exact artifact serialization and schema mechanics are owned by `DL-02`; DL-05 locks the semantic model and validation policy.
4. Agent prompts, generated skill files, adapters, and runtime dispatch may consume registry data only after registry validation passes.
5. Any agent missing required metadata, required evidence, domain-neutrality proof for core use, valid graph links, or allowed-tool/forbidden-action consistency is not green.
6. No-self-validation is mandatory. An agent may assist with its own preflight checks, but an independent validator must be the blocking validator for green closure.
7. Meta-agents may recommend changes or produce patch material routed through normal planning/build/verification. They must not silently mutate harness or starter files unless a later explicit decision changes this policy.
8. Decision-only closure creates no live runtime seam. The first real producer/carrier/consumer registry proof is required in `I-04` and cannot close shape-only.

## Alternatives considered

### No registry / ad hoc prompt files

- decision: rejected
- rationale: verification-layer §11 requires a registry because the harness may contain many agents. Ad hoc files cannot prove metadata completeness, graph integrity, tool permissions, maturity, ownership, or eval coverage.
- consequences: downstream orchestrators would invent policy and orphan/unsafe agents would be hard to detect.

### Advisory-only agent validation

- decision: rejected
- rationale: agents are harness code. Deterministic validation must check schemas, links, tools, versions, changelogs, and domain-neutral core surfaces. Advisory review remains useful for semantic prompt quality but is insufficient for core closure.
- consequences: stable/core agents require smoke, regression/eval, and schema/tool/link evidence.

### One flat registry with no type/maturity/version metadata

- decision: rejected
- rationale: flat entries do not encode validator/fixer relationships, orchestration safety, deprecation, maturity gates, runtime/cost planning, or meta-agent safety.
- consequences: the registry must model typed agents and graph relationships.

### Meta-agents allowed to silently mutate files

- decision: rejected
- rationale: verification-layer §12.14 and the final strategy require recommendation-only meta-agent safety unless a later explicit decision changes it.
- consequences: silent mutation by a meta-agent is a critical validation failure.

### Selected typed registry + mandatory validation + recommendation-only meta-agent policy

- decision: accepted
- rationale: this option satisfies backlog §5, verification-layer §11/§12, DL-20A domain-neutrality, DL-24A output discipline, and future `I-04` implementation needs without stealing peer-owned schema/runtime details.
- consequences: `I-04` implements schema-backed registry validation and real-boundary consumers after `DL-02` and relevant peer decisions are green.

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
      rationale: Supplies core/extension/sample-demo boundary and mandatory domain-neutrality proof obligations for core registry entries, prompts, metadata, examples, and validators.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, backlog, strategy, playbook, and quality bar define the registry and validation requirements.
  blocks:
    - id: I-04-agent-registry-validation-meta
      reason: Implements registry package, future core registry entries, validation fixtures, meta-agent registry policy fixtures, and real producer/carrier/consumer proof.
    - id: I-09-verification-runner-evidence-failure-routing
      reason: Verification/failure routing consumes validated validator/fixer/meta-agent relationships and must reject invalid registry references.
    - id: I-14-pi-adapter-skill-consumption
      reason: Adapter-generated agent/skill files must consume only validated registry entries.
    - id: I-21-build-skill-orchestration
      reason: Build orchestration must allocate specialists, validators, fixers, and meta-agent escalations from validated registry data.
    - id: final closure
      reason: Final closure requires actual agent/skill files consumed by the selected harness path or pending-live/BLOCKED status.
  blocked_dependents:
    - id: I-04-agent-registry-validation-meta
      blocked_until: DL-05 is validated clean and DL-02 registry-entry schema/serialization is green and aligned with this semantic model.
      relying_on: Required metadata model, validation rules, registry scope/location policy, maturity/version/deprecation policy, validator/fixer graph integrity, domain-neutrality, and meta-agent safety.
    - id: I-09-verification-runner-evidence-failure-routing
      blocked_until: DL-05 plus DL-10 are green; registry-facing failure routing hooks are defined without overriding DL-10 taxonomy.
      relying_on: Agent validation outcomes, evidence expectations, and meta-agent escalation hooks.
    - id: I-14-pi-adapter-skill-consumption
      blocked_until: DL-05 plus DL-03/DL-06 and I-04 registry loader/validator outputs are green.
      relying_on: Validated agent/skill registry entries consumed by adapter-specific files.
    - id: I-21-build-skill-orchestration
      blocked_until: DL-05 plus DL-04/DL-10/I-04 are green.
      relying_on: Valid specialist/validator/fixer registry graph and iteration-cap semantics.
    - id: DL-24B-cross-decision-output-audit
      blocked_until: This and other audited decisions exist.
      relying_on: DL-24A-compliant decision output.
    - id: DL-20B-domain-neutrality-compliance-audit
      blocked_until: This and other audited decisions exist.
      relying_on: Domain-neutrality application to registry policy.
  required_before_finalizing:
    - id: DL-02-artifact-schemas
      required_content: Exact registry entry schema/serialization must represent all DL-05 required semantic fields or explicitly block I-04.
    - id: DL-03-skill-protocols
      required_content: Skill protocol references to agents must resolve through validated registry IDs without redefining registry policy.
    - id: DL-04-orchestration-runtime
      required_content: Runtime scheduling must respect registry metadata such as type, trigger, parallel-safety, context, validator/fixer links, and iteration caps without weakening DL-05 constraints.
    - id: DL-06-agentic-harness-integrations
      required_content: Adapter-specific generated files must preserve validated registry metadata and tool/action restrictions.
    - id: DL-10-verification-implementation
      required_content: Failure routing and evidence model must consume registry validation results and meta-agent recommendations without redefining registry semantics.
    - id: I-04-agent-registry-validation-meta
      required_content: Actual registry loader/validator, on-disk entries/fixtures, graph integrity checks, domain-neutrality checks, and downstream consumer witness.
    - id: I-09-verification-runner-evidence-failure-routing
      required_content: Actual verification runner integration consumes registry validation/evidence and routes failures using valid agents.
    - id: I-14-pi-adapter-skill-consumption
      required_content: Pi adapter consumes validated registry entries for generated skills/commands, or closure is pending-live/BLOCKED if live harness proof is unavailable.
    - id: I-21-build-skill-orchestration
      required_content: Build orchestration uses validated specialist/validator/fixer relationships and preserves max iteration constraints.
  deferrals:
    - deferred_question: Exact registry entry file format, schema library, serialization, and migration representation.
      rationale: Owned by DL-02 artifact schemas. DL-05 locks semantic fields and validation policy only.
      future_owner: DL-02-artifact-schemas / I-04-agent-registry-validation-meta
      allowed_now: true
      blocked_dependents:
        - I-04-agent-registry-validation-meta
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact skill protocol, runtime scheduling, adapter file format, and failure taxonomy mechanics.
      rationale: Owned by DL-03, DL-04, DL-06, and DL-10 respectively.
      future_owner: DL-03 / DL-04 / DL-06 / DL-10
      allowed_now: true
      blocked_dependents:
        - I-09-verification-runner-evidence-failure-routing
        - I-14-pi-adapter-skill-consumption
        - I-21-build-skill-orchestration
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-05-agent-registry-validation-meta.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-05-agent-registry-validation-meta/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source and orchestration docs
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/**
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/**
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-05 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - /Users/lizavasilyeva/work/vibe-engineer/packages/**
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/registry/**
    - /Users/lizavasilyeva/work/vibe-engineer root config and CI files
    - /Users/lizavasilyeva/work/vibe-engineer generated starter/source/adapter/schema implementation paths
    - any decision/report path not owned by DL-05
  handoff_notes:
    - from: DL-05
      to: DL-02-artifact-schemas
      condition: DL-02 must encode DL-05 semantic fields in the exact registry-entry schema or block I-04.
      shared_path_policy: disjoint
    - from: DL-05
      to: I-04-agent-registry-validation-meta
      condition: After DL-05 and DL-02 are green, I-04 implements registry loader/validator/fixtures and real-boundary proof in its owned paths.
      shared_path_policy: disjoint
    - from: DL-05
      to: DL-10/I-09 and DL-04/I-21
      condition: Verification/failure routing and orchestration consume registry metadata and validation results without weakening no-self-validation or iteration caps.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-04-agent-registry-validation-meta` is blocked until DL-05 is clean and `DL-02` supplies aligned exact registry-entry schema/serialization.
- `I-09-verification-runner-evidence-failure-routing` is blocked from relying on registry validation/failure routing details until DL-05 and DL-10 are green.
- `I-14-pi-adapter-skill-consumption` is blocked from consuming registry-generated agent/skill files until DL-05, DL-03, DL-06, and I-04 outputs are green or explicitly pending-live/BLOCKED.
- `I-21-build-skill-orchestration` is blocked from depending on specialist/validator/fixer registry graph behavior until DL-05, DL-04, DL-10, and I-04 are green.
- `DL-20B` and `DL-24B` are blocked until audited decisions exist.
- No production implementation is authorized by this decision.

## Registry scope and boundary

### Core harness agents

Core harness agents are domain-neutral agents owned by the `vibe-engineer` harness. They include:

- user-facing skill orchestration support for `brainstorm`, `grill-me`, `task`, `plan`, `build`, and `ship`;
- planning specialists listed in verification-layer §7;
- build specialists listed in verification-layer §8;
- failure routing and fixer specialists listed in verification-layer §9;
- UI verification specialists listed in verification-layer §10;
- validators, fixers, reviewers, and meta-agents that maintain harness quality.

Core entries must use generic harness/development vocabulary and must pass domain-neutrality validation before stable/core use.

### Project-extension agents

Project-extension agents belong to a consuming project. They may encode that project's vocabulary, standards, and integrations only through explicit extension scopes. They must not become core defaults, must not be imported by core packages as hidden policy, and must be validated against the same structural registry requirements plus extension-boundary checks.

### Sample/demo agents

Sample/demo agents or fixtures are allowed only when isolated under explicit sample/demo/reference paths, labeled as sample/demo, and not used as core defaults. Sample/demo entries may demonstrate registry mechanics but cannot satisfy core registry coverage unless they are also valid domain-neutral core entries.

## Registry location and ownership policy

1. Future implementation must separate registry engine/validation code from registry entries.
2. The future harness registry package/API is owned by `I-04` under `packages/registry/**` per the final strategy.
3. Future core registry entries/fixtures are owned by `I-04` under `.vibe/registry/core-agents/**` and/or package fixtures as decided by `DL-02`/I-04; this decision does not create those files.
4. Consuming-project extensions must live in project-scoped registry locations configured as extensions, not inside core registry defaults. Exact serialization/path syntax is owned by `DL-02` and implementation configuration decisions.
5. Sample/demo registry entries must live in explicitly labeled sample/demo/reference fixture paths and must be excluded from core default agent resolution unless intentionally loaded as examples/tests.
6. No registry entry may be load-bearing unless it is loaded through the actual registry loader/validator and passes all required checks.

## Required registry metadata model

Every registry entry must contain the following semantic fields. `DL-02` owns exact schema syntax, optionality syntax, and serialization, but it must preserve these semantics.

- `id` / `name`: stable unique identifier and human-readable name; IDs must be exact and collision-free.
- `type`: one of `orchestrator`, `specialist`, `validator`, `fixer`, `reviewer`, or `meta`.
- `purpose`: concise domain-neutral or extension-scoped purpose.
- `trigger_conditions`: when the agent may run; meta-agents must use explicit harness-health/failure-pattern triggers.
- `input_schema`: machine-readable input contract owned/aligned with DL-02.
- `output_schema`: machine-readable output contract owned/aligned with DL-02.
- `allowed_tools`: explicit allowlist or typed capability set; no implicit broad tool access.
- `forbidden_actions`: actions the agent must not perform, including path writes, destructive operations, silent mutation, push/PR, or bypass of verification where applicable.
- `context_requirements`: required context closure, source artifacts, registry dependencies, and prompt/context inputs.
- `expected_artifact_paths`: paths or path patterns the agent may read/write/produce, subject to lane ownership.
- `expected_runtime_cost_class`: bounded class for scheduling/cost planning, such as small/medium/large or equivalent exact enum defined later.
- `parallel_safety`: flag and rationale indicating whether the agent can run concurrently and under what path/ownership restrictions.
- `default_validator_agent`: registry ID of the independent validator; cannot be the agent itself as the only validator.
- `default_fixer_agent`: registry ID of the default fixer or an explicit typed `none`/`not_applicable` value with rationale when no fixer is valid.
- `max_iterations_if_applicable`: per-agent validation/fix iteration cap or reference to repository default; cannot silently exceed the locked default of 3 unless a later runtime/config decision explicitly permits it.
- `maturity`: one of `experimental`, `stable`, or `core`.
- `owner`: responsible harness lane/team/component or project extension owner.
- `version`: version of the entry/prompt/contract behavior.
- `changelog`: versioned change history or link to versioned changelog entry.
- `examples_evals`: smoke examples, sample inputs/outputs, eval fixtures, and regression evidence references appropriate to maturity.
- `deprecation_supersession`: active/deprecated/superseded status, replacement ID when applicable, removal timeline, and migration notes.

## Agent type taxonomy and maturity states

### Agent types

- `orchestrator`: coordinates other agents and artifact flow; examples include planning/build/ship orchestration roles. It must not be the only validator of specialist output.
- `specialist`: produces a bounded work product for a narrow area.
- `validator`: independently validates another agent's output against contracts, evidence, and acceptance criteria.
- `fixer`: repairs defects found by validators or verification failure routing.
- `reviewer`: produces advisory review or task-specific review findings; advisory by default unless promoted by deterministic/task criteria.
- `meta`: monitors patterns, repeated failures, drift, or harness-health signals and recommends improvements.

### Maturity states

- `experimental`: may be used in non-blocking trials or explicitly labeled fixtures; requires schema/tool/link validation and at least smoke evidence; cannot be a default hard gate for core closure unless a later decision elevates it.
- `stable`: may be used for normal workflows; requires schema/tool/link validation, smoke evidence, regression/eval coverage, version/changelog evidence, and owner assignment.
- `core`: required harness default; requires all stable evidence plus domain-neutrality proof, no-self-validation linkage, deprecation policy, real downstream consumer proof where implemented, and clean regression evidence.

Maturity promotion must be explicit in the registry changelog and cannot occur solely by changing wording in a prompt.

## Versioning, changelog, deprecation, and supersession policy

1. Every entry has a version. Behavior-changing prompt, schema, tool permission, trigger, output, validator/fixer link, maturity, or deprecation changes require a version/changelog update.
2. Stable/core entries require regression/eval evidence for behavior changes before promotion.
3. Deprecated entries may remain only with explicit status, replacement/supersession target when one exists, owner, rationale, and removal/migration plan.
4. Superseded entries must not remain default targets unless a compatibility decision explicitly allows a migration window.
5. Consumers must reject references to removed entries and warn/block according to maturity/deprecation policy for deprecated entries.
6. Changelog validation is mandatory. A changed entry without an updated version/changelog is not green.

## Agent validation requirements

Every registry validation run must include, at minimum:

- registry schema validation;
- input/output schema conformance;
- prompt/instruction linting where applicable;
- allowed-tool validation;
- forbidden-tool validation;
- domain-neutrality validation for core harness agents;
- smoke tests on sample artifacts;
- regression/eval tests for stable/core agents;
- validator/fixer link validation;
- orphan-agent detection;
- version/changelog validation.

Additional normative rules:

1. Validation must run over actual on-disk entries, not only hand-authored examples embedded in tests.
2. Missing required metadata is a blocking validation failure.
3. A tool allowed in one field but forbidden by another is rejected; forbidden actions override allowed tools.
4. Core agent prompt text, metadata, examples, and evals must pass DL-20A domain-neutrality gates.
5. Stable/core agents must have positive, negative, and regression witnesses relevant to their type.
6. Validation results must be written as evidence and consumable by downstream verification/orchestration paths.

## Validator/fixer and no-self-validation policy

1. Every load-bearing producer agent must name an independent default validator or be explicitly blocked from load-bearing use.
2. An agent may not be its own only validator. Self-checks may be advisory or preflight but cannot be the sole green gate.
3. Validator agents themselves are agents and require registry entries, owners, versions, and validators appropriate to their maturity.
4. Fixer links must point to agents whose type is `fixer` or a typed orchestrator that dispatches to fixers.
5. Validator/fixer cycles are invalid when they make independent validation impossible or create infinite repair loops.
6. Maximum validation/fix iterations default to the locked concept `maxValidationFixIterations: 3`; registry entries may set lower caps or reference the repository default. Runtime details are owned by DL-04, but DL-05 requires the registry to expose the cap metadata.
7. After the iteration cap, the orchestrator must stop, record evidence, classify the blocker, and route escalation/meta-agent recommendation through normal channels.

## Meta-agent policy

Meta-agents exist outside the normal plan/build flow and are triggered by repeated failures, patterns, or harness-health signals. By default, they produce recommendations or patch material routed through normal planning/build/verification. They must not silently edit harness/starter files, bypass validators, mutate registry entries, commit, push, open PRs, or change tool permissions.

| Meta-agent family | Trigger | Allowed output | Safety requirement |
| --- | --- | --- | --- |
| Verification-gap detector | repeated verification failures or recurring escaped defect class | recommendation to add/update verifier, hook, test pattern, agent, schematic, or standard | recommendation/patch material only |
| Agent-gap detector | repeated work handled by generic agents | recommendation for a new specialist/validator/fixer/reviewer | no auto-registration |
| Schematic-gap detector | repeated manual structure | recommendation for schematic proposal | no generator mutation |
| Standard-gap detector | repeated review comments or inconsistent implementation | recommendation for standard/doc/rule proposal | normal decision/build path |
| Flaky-test investigator | repeated or suspicious unstable test results | classification: deterministic product failure, test bug, environment issue, timing/flakiness, or external drift | no quarantine/mutation without normal verification path |
| Context-decay detector | stale, missing, or misleading context | recommendation to update context owner/artifacts | no silent context edits |
| Parallelism optimizer | inefficient build splitting or dependency ordering | recommendation for allocation/DAG improvements | no runtime config mutation |
| Architecture-erosion detector | repeated boundary drift or architectural inconsistency | recommendation for rule/standard/refactor decision | normal planning/build route |
| Test-debt detector | behavior exists without adequate verification | recommendation to add verification coverage | no test-file mutation by default |
| UI-verifier-gap detector | recurring UI issues missed by current verifiers | recommendation for new UI verifier/check | no silent verifier registration |
| Observability-gap detector | important path lacks logs/metrics/traces/visibility | recommendation for observability verification | no production instrumentation edit |
| Agent-quality regression detector | specialist quality declines over time | recommendation to revise prompt/evals/version/maturity | no maturity demotion/promotion without registry validation |
| Postmortem learner | failed builds or escaped defects | recommendation to improve standards, schematics, agents, validators, hooks, tests, or context rules | normal planning/build/verification route |

A later explicit decision may expand meta-agent authority, but until then any silent mutation by a meta-agent is a critical failure.

## Project-specific extension model

1. Consuming projects may define project-specific agents through explicit extension registry scopes.
2. Extension agents must declare owner, scope, allowed tools, forbidden actions, context requirements, expected artifact paths, validators/fixers, maturity, version, changelog, examples/evals, and deprecation/supersession information.
3. Extension entries may use project vocabulary only in extension-scoped fields and fixtures; they must not contaminate core registry entries, core prompts, or core examples.
4. Core defaults may reference extension points but not project-specific agent IDs.
5. The registry loader must be able to report whether an entry is core, project-extension, sample/demo, negative-test, or deprecated.
6. Project extensions must not bypass core safety rules such as no-self-validation, forbidden actions, and tool enforcement.

## Registry graph integrity and orphan/unused-agent detection

Future validation must prove:

- IDs are unique and references resolve exactly;
- types are valid and compatible with referenced roles;
- default validator and fixer references exist, are type-compatible, and do not self-validate as the only gate;
- triggers do not create ambiguous duplicate default ownership for the same event unless explicitly ordered by the runtime decision;
- expected artifact paths are compatible with ownership and do not include forbidden paths;
- deprecated/superseded entries are not default targets without an explicit migration policy;
- every stable/core agent is reachable from a skill, orchestrator, validator/fixer link, meta-agent trigger, or explicit registry group;
- orphaned references are rejected;
- unused agents are rejected unless explicitly experimental, dormant, deprecated, or sample/demo with owner/rationale.

## Allowed-tool and forbidden-action enforcement requirements

1. Registry validation must reject entries with missing, ambiguous, or contradictory tool/action policy.
2. Allowed tools define the maximum capability set; runtime/adapters/security policies may further restrict them.
3. Forbidden actions override allowed tools and must include at least dirty-tree destructive operations, out-of-owned-path writes, silent meta-agent mutation, unapproved commit/push/PR, verification bypass, and unauthorized registry mutation where applicable.
4. Agent execution must be rejected or blocked when an adapter/runtime cannot enforce required tool/action restrictions.
5. Tool policy must be tested with positive and negative fixtures in `I-04`, then consumed by actual downstream code.
6. Exact security/command policy details remain owned by `DL-22` and later implementation lanes; DL-05 requires registry-facing enforcement fields and validation.

## Verification/witness consequences

- deterministic checks affected: registry schema validation, graph integrity validation, tool/action policy validation, domain-neutrality validation, version/changelog validation, maturity/eval evidence validation, orphan/unused detection, and deprecation/supersession checks.
- positive witnesses required downstream:
  - valid orchestrator, specialist, validator, fixer, reviewer, and meta-agent entries load successfully;
  - valid core entries pass domain-neutrality validation;
  - valid project-extension entry is accepted only through extension scope;
  - valid sample/demo entry is accepted only as labeled sample/demo;
  - validator/fixer links resolve and respect no-self-validation;
  - stable/core entries include smoke/regression/eval evidence and changelog.
- negative witnesses required downstream:
  - missing metadata is rejected;
  - input/output schema mismatch is rejected;
  - allowed-tool/forbidden-action contradiction is rejected;
  - core project-specific vocabulary is rejected unless explicitly negative-example or sample/demo-labeled under DL-20A;
  - self-validation-only setup is rejected;
  - orphan validator/fixer references and unlinked stable/core agents are rejected;
  - meta-agent silent mutation is rejected;
  - stale/missing version/changelog is rejected;
  - deferred exact schema/serialization cannot unblock I-04.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - two-repo direction remains domain-neutral harness plus starter/reference boilerplate;
  - six user-facing skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet;
  - `plan` owns Verification Delta;
  - `build`/`ship` automatically run verification/context/evidence;
  - fixed starter stack and E2E decisions remain intact;
  - mechanical gate families remain intact;
  - no push/PR without approval remains intact;
  - `DL-20B` and `DL-24B` remain later audits.
- real_boundary_required: yes for `I-04`; no live runtime seam is created by this decision artifact itself.
- real_boundary_status: `not_applicable` for this decision artifact; `required_before_closure` for `I-04`; `pending-live/BLOCKED` if actual producer/carrier/consumer proof cannot run due to missing peer dependencies.

Earliest `I-04` real-boundary proof must use:

- Producer: actual registry entry authoring/generation path for core agents and meta-agents using DL-02 schema/contract plus DL-05 policy.
- Carrier: on-disk registry entries under future owned paths such as `.vibe/registry/core-agents/**` and/or package fixtures decided by implementation.
- Consumer: actual `packages/registry` loader/validator and at least one downstream consumer such as orchestration, skills, verification, or adapter code resolving a validated entry.

Shape-only parsing is not sufficient for `I-04` closure.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-05-agent-registry-validation-meta.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-05-agent-registry-validation-meta/**`
- read_only_paths:
  - `/Users/lizavasilyeva/work/harness-starter/**` source/orchestration artifacts;
  - prior decision artifacts and reports for DL-24A and DL-20A;
  - peer decision artifacts/reports if present;
  - target repo inventory outside DL-05 owned paths.
- untouchable_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.git/**`;
  - `/Users/lizavasilyeva/work/vibe-engineer/packages/**`;
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/registry/**`;
  - root config, CI, generated starter/reference, package source, adapter source, schema files, and all production code;
  - any decision/report path not owned by DL-05.
- serialized/shared ownership notes: none for this decision artifact. Future implementation writes are owned by I-04 or peer lanes and must use disjoint paths or explicit handoff.

## Domain-neutrality check

- DL-20A status consulted: green (`LOCKED` and validation `PASS`).
- governed surfaces affected: future core registry entries, core prompts/instructions, core metadata, validator/fixer/reviewer/meta-agent entries, examples/evals, project-extension registry entries, and sample/demo fixtures.
- surface classification: this artifact is a decision artifact; future core registry surfaces are core harness; project-extension agents are consuming-project extensions; sample/demo agents are explicitly labeled sample/demo.
- positive generic terms permitted: agent, skill, orchestrator, specialist, validator, fixer, reviewer, meta-agent, registry, schema, context, artifact, evidence, verification, schematic, adapter, package, module, test, E2E, UI verification, Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet.
- project/business terms mentioned: terms such as ecommerce, inventory, fashion, Billz, Telegram, Instagram, or equivalent project models are forbidden in core and may appear only as negative examples, explicit source-citation boundary tests, or labeled sample/demo/extension content.
- consuming-project extensions: explicitly separated and cannot become core defaults.
- sample/demo artifacts: must be labeled, isolated, and excluded from core default resolution unless intentionally loaded for tests/examples.
- deterministic enforcement owner mapping: `I-04` for core agent/prompt/registry validation; `DL-15`/`I-10` for broader governed-surface mechanical enforcement if assigned there; `DL-20B` for cross-decision audit.
- advisory review owner mapping: later DL validators, I-04 agent/prompt review, I-24 docs/examples review, and final bug hunt.
- result: PASS for this decision artifact; future implementation remains blocked without actual proof.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes
- conflicts discovered: none. Before drafting, the DL-05 decision artifact was absent and the DL-05 work area contained only this execution report.
- peer work observed: peer D1 work areas may exist concurrently; they are read-only and not touched by DL-05.

## Deferral rationale

This decision is `LOCKED`, not deferred. Peer-owned implementation details are intentionally deferred without unblocking dependents.

- deferred_question: exact registry artifact serialization, schema library, and migration format.
- reason_now: owned by `DL-02-artifact-schemas`; DL-05 only owns semantic registry policy.
- future_owner: `DL-02` and `I-04`.
- required_before_finalizing: `I-04-agent-registry-validation-meta` and any downstream consumer relying on actual registry entries.
- blocked_dependents: `I-04`, plus related `I-09`/`I-14`/`I-21` consumers where they rely on the deferred detail.
- proof_no_dependent_relies_now: no production implementation is authorized; all dependent implementation lanes remain blocked until peer-owned details are green.

- deferred_question: exact skill protocol hooks, orchestration scheduler mechanics, adapter file formats, and verification/failure taxonomy.
- reason_now: owned by `DL-03`, `DL-04`, `DL-06`, and `DL-10` respectively.
- future_owner: `DL-03`, `DL-04`, `DL-06`, `DL-10`, then implementation lanes.
- required_before_finalizing: consumers that depend on those mechanics.
- blocked_dependents: `I-09`, `I-14`, `I-21`, and any other consumer relying on those details.
- proof_no_dependent_relies_now: DL-05 defines registry-facing requirements only and blocks dependents that need peer-owned details.

## Evidence checklist

1. Report artifact was created before the decision artifact and updated after stages.
2. Required source files were inspected and are cited by path and section heading.
3. Files changed are limited to:
   - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-05-agent-registry-validation-meta/reports/decision-lock-execution-report.md`
   - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-05-agent-registry-validation-meta.md`
4. No production/package/root/config/CI/generated starter files or `.vibe/registry/**` entries were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Backlog §5 is resolved: registry format/location policy, metadata fields, maturity states, versioning, validator/fixer relationships, eval/smoke tests, deprecation/supersession, project-specific extension model, allowed-tool enforcement, domain-neutral validation, and orphan/unused detection are covered.
7. Verification-layer §11.1 metadata fields are all represented.
8. Verification-layer §11.2 validation requirements are all represented.
9. Peer overlaps with `DL-02`, `DL-03`, `DL-04`, `DL-06`, and `DL-10` are dependency-mapped and not silently decided.
10. Meta-agent safety is recommendation-only by default and silent mutation is rejected.
11. DL-20A domain-neutrality constraints are applied.
12. Locked decisions remain preserved: `vibe-engineer` name, two-repo direction, six skills, artifact flow, automatic verification/context, Verification Delta, fixed starter stack/E2E choices, mechanical gate families, and no push/PR without approval.
13. Real-boundary proof is assigned to `I-04` and cannot close shape-only.
14. Dirty-tree safety and owned-path limits are stated.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and available diffs, not the implementer narrative.

### Positive witnesses

- DL-05 decision artifact exists at the owned path and uses DL-24A format with exactly one output class.
- It covers every backlog §5 decision bullet and every verification-layer §11.1 metadata field.
- It covers every verification-layer §11.2 validation requirement.
- It defines core/project-extension/sample-demo registry boundaries and applies DL-20A.
- It preserves no-self-validation, validator/fixer link validation, max-iteration implications, and orphan/unused detection.
- It declares meta-agents recommendation-only by default and covers the verification-layer §12 meta-agent families.
- It maps future real-boundary proof to `I-04` and blocks dependents that need peer-owned schema/runtime details.

### Negative witnesses

- A registry entry missing required metadata is not green.
- A core agent with project-specific business vocabulary is rejected unless clearly sample/demo or negative-example-labeled.
- A meta-agent that silently edits harness/starter files is rejected.
- A stable/core agent with no eval/smoke/regression evidence is rejected.
- An agent that validates itself as the only validator is rejected.
- An allowed-tool/forbidden-action mismatch is rejected.
- An orphan validator/fixer reference or unlinked stable/core agent is rejected.
- A decision that defers exact schema/serialization while allowing `I-04` to proceed is rejected.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Agent registry does not replace skill protocols, artifact schemas, orchestration runtime, adapter formats, or verification/failure taxonomy decisions.
- Meta-agents remain recommendation-only unless a later explicit decision changes the policy.
- `DL-20A` and `DL-24A` remain prerequisites and are not contradicted.
- `DL-20B` and `DL-24B` remain later audits.

### Sibling/blast-radius checks

- Check consistency against final strategy §§5–11 and §13.3.
- Check consistency against verification-layer §§6–13 and backlog §5.
- Check consistency against DL-24A output discipline and DL-20A domain-neutrality foundation.
- Check that peer decisions `DL-02`, `DL-03`, `DL-04`, `DL-06`, `DL-10`, `DL-15`, `DL-20B`, and `DL-24B` are not overwritten.
- Check that only DL-05 owned paths changed.

### Severity policy

- `critical`: missing DL-24A/DL-20A compliance; out-of-license write; missing artifact; missing required metadata or validation category; meta-agent mutation allowed without later explicit decision; no-self-validation weakened; domain-neutrality violated; false real-boundary closure; unblocked dependent relying on deferred peer-owned detail.
- `major-local`: incomplete registry policy, unclear dependency/owner mapping, incomplete meta-agent list/safety, incomplete validation plan, or unclear future proof owner limited to DL-05/direct dependents.
- `minor-local`: citation/wording issue that does not weaken gates or unblock dependents.
- `clean`: all content, source, ownership, dependency, witness, and domain-neutrality requirements satisfied.

## Known ambiguities / future owners

- `DL-02-artifact-schemas` owns exact registry-entry schema, serialization, file format, version/migration syntax, and machine-readable details. `I-04` cannot proceed until DL-02 and DL-05 are aligned and green.
- `DL-03-skill-protocols` owns exact skill protocol references and handoff contracts.
- `DL-04-orchestration-runtime` owns scheduler mechanics, iteration execution, parallelism runtime, and resumability details.
- `DL-06-agentic-harness-integrations` owns adapter-specific generated file formats and live harness constraints.
- `DL-10-verification-implementation` owns verification runner, evidence/failure taxonomy, rerun, flaky classification, and failure routing representation.
- `DL-15`/`I-10` may own broader deterministic governed-surface enforcement that complements I-04 registry-specific validation.
- `DL-20B` owns later domain-neutrality audit; `DL-24B` owns cross-decision output audit.
- Exact package API and registry file layout are future implementation details; any dependent relying on them remains blocked until the owning decisions/implementation proof are green.
