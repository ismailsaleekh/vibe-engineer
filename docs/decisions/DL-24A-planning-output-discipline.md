# DL-24A — Planning Output Discipline

## Status

LOCKED

- Decision ID: `DL-24A-planning-output-discipline`
- Date: 2026-06-23
- Owner lane: decision-lock execution for planning output discipline
- Required artifact path: `docs/decisions/DL-24A-planning-output-discipline.md`
- Report path: `.vibe/work/DL-24A-planning-output-discipline/reports/decision-lock-execution-report.md`

## Source citations

This decision is based on these source paths and section headings, cited without pasting source text:

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`; §6.1 `Decision DAG`; §6.3 `Safe parallel waves`; §7 `Explicit ready queue rules`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§13–15 `Agent prompt and triad strategy`, `Evidence, report, and ledger requirements`, `Dirty-tree and multi-orchestrator conflict policy`; §§17–19 `Final closure criteria`, `Severity gate policy`, `Concise first ready queue after MST closure`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §9 `Severity gate and closure criteria check`; §10 `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §2 `First ready queue items`; §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§1–4 `Product vision`, `The two repositories`, `Non-negotiable design rules`, `Core workflow`; §§9–10 `Verification model`, `Context preservation and retrieval`; §16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§1–11 for product/CLI name, two-repo direction, starter stack, create UX, config defaults, six skills, schematics boundary, automatic verification/context, E2E stack, verification layer decisions, and mechanical gates.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1–4 `Core principles`, `Artifact flow`, `Responsibilities by skill/orchestrator`, `Verification Delta`; §§6–16 for orchestration, agent registry, meta-agent safety, blocking policy, success criteria, and final invariant.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1–13 for deterministic mechanical gate doctrine and locked gate families.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §24 `Planning-phase output requirement` and related backlog items 1–23.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2 and 10 for Triad-A/Triad-B evidence-bound quality, report discipline, dirty-tree safety, and triad validation expectations.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar for perfect solution, report-first checkpointing, triad discipline, real-boundary truth, and dirty-tree safety.

## Decision

All future `DL-*` planning/decision artifacts in this workstream must be explicit, dependency-aware, evidence-backed, dirty-tree-safe, and independently validatable. No future decision may close green by relying on undocumented tribal knowledge, implied dependencies, unstated ownership, hidden deferrals, or shape-only proof for a claimed live seam.

Normative rules:

1. Every future decision-lock item must produce exactly one required output class listed in `Required output class` below.
2. Every future decision artifact must use the required template in this document or a stricter successor explicitly approved by a later decision/audit.
3. Every future decision artifact must declare dependencies, blocked dependents, required sequencing, deferrals, owned write paths, read-only paths, untouchable paths, witness consequences, evidence, validation plan, severity policy, dirty-tree safety, and domain-neutrality placeholder.
4. A decision that is not complete must be `DEFERRED` or `BLOCKED`; it must not be presented as `LOCKED` through vague follow-up language.
5. A deferred decision is valid only when no dependent decision or implementation lane relies on the deferred content. Any dependent that would rely on it must remain blocked and be listed as a blocked dependent.
6. A decision that claims feasibility, live behavior, integration readiness, or closure of a load-bearing seam must declare the real-boundary witness needed. If actual proof cannot run yet, the decision or dependent implementation closure must be marked `pending-live/BLOCKED`; fake/mock/synthetic proof is not enough.
7. Independent Triad-B validation must inspect the actual changed/owned files and any available diff, run positive/negative/regression witnesses appropriate to the decision, sweep sibling/blast radius, check source docs and prior decisions, confirm dirty-tree safety, and classify severity.
8. The `DL-24A` discipline gates all later decision artifacts. `DL-20A` remains the owner of domain-neutrality foundation rules; every future decision must carry a placeholder/check for those rules once `DL-20A` is green. `DL-24B` remains the later cross-decision compliance audit and is not replaced by this decision.

## Scope and non-goals

In scope:

- Define the planning-phase output requirement for all future `DL-*` decisions.
- Define a concrete ADR/decision/report template.
- Define dependency declaration fields and deferral rules.
- Define evidence and validator checklists.
- Define severity gates and STOP conditions for later decisions.
- Preserve dirty-tree ownership discipline and locked product decisions.

Non-goals:

- This decision does not execute or finalize `DL-20A`, `DL-24B`, any other `DL-*`, or any `I-*` implementation lane.
- This decision does not write production code, package source, root configuration, CI, CLI code, schemas, generated starter files, or implementation artifacts.
- This decision does not decide domain-neutrality enforcement details; `DL-20A` owns those details.
- This decision does not replace independent validation, fix/revalidation, final bug hunt, or the later `DL-24B` cross-decision audit.

## Alternatives considered

### Alternative A — Allow each decision agent to choose its own format

Rejected. It would leave dependency, evidence, ownership, and deferral semantics inconsistent across decisions. Validators could not reliably determine whether a future decision is green, and implementation lanes could accidentally proceed from incomplete or hidden assumptions.

### Alternative B — Track decisions only in orchestration reports

Rejected. Reports are recovery/evidence artifacts, but downstream implementers need stable decision artifacts at predictable paths. Decisions must be discoverable, citeable, independently validated, and auditable by `DL-24B`.

### Alternative C — Accept undocumented tribal knowledge for small items

Rejected. Planning backlog item 24 explicitly exists because nothing important may remain undocumented tribal knowledge. Even small decisions can block package ownership, schemas, real-boundary proof, verification duties, or dirty-tree safety.

### Alternative D — Permit deferred decisions without blocked dependents

Accepted only under strict conditions. A deferred decision is valid when it has explicit rationale, no dependent implementation lane relies on it, and all blocked dependents are listed. It is invalid when any downstream work would proceed as though the deferred content were decided.

## Required output class

Every future decision-lock artifact must produce exactly one of these four output classes:

1. `locked_decision_document`
   - Use when the decision resolves the item and downstream work may depend on the resolved content.
   - Required status: `LOCKED`.
2. `adr`
   - Use when the item is an architecture decision record with alternatives/tradeoffs and an accepted option.
   - Required status: `LOCKED` unless the ADR explicitly records `DEFERRED` or `BLOCKED` and no dependent relies on it.
3. `implementation_plan_section`
   - Use when the decision is deliberately resolved as a required section inside a later implementation plan rather than as a standalone design choice.
   - Must identify the exact future plan owner and must not allow dependent implementation to proceed until that section exists.
4. `explicit_deferred_decision`
   - Use when the decision is intentionally not resolved now.
   - Required status: `DEFERRED`.
   - Must include rationale, unresolved questions, required future owner, blocked dependents, and proof that no dependent implementation lane relies on the deferred content.

A decision artifact that produces zero classes, multiple classes, or an unstated hybrid is not green.

## Required future decision template

Future `DL-*` artifacts must use the following headings and fields. They may add stricter subheadings but must not omit these fields.

```markdown
# <DL-ID> — <Decision name>

## Status

- status: LOCKED | DEFERRED | BLOCKED
- output_class: locked_decision_document | adr | implementation_plan_section | explicit_deferred_decision
- date: <YYYY-MM-DD>
- owner_lane: <decision triad/lane>
- artifact_path: <path>
- report_path: <path>

## Source citations

- <path> — <section heading>
- <path> — <section heading>

## Decision summary

<Concise normative summary. If DEFERRED/BLOCKED, state what is not decided.>

## Decision details

<Normative rules, accepted option, constraints, and downstream effects.>

## Alternatives considered

### <Alternative>

- decision: accepted | rejected | deferred
- rationale: <why>
- consequences: <impact>

## Dependencies and prerequisites

Use the `Dependency declaration format` from DL-24A.

## Blocked dependents

<List every decision/implementation lane that must wait, or state `none` with rationale.>

## Verification/witness consequences

- deterministic checks affected: <list or none>
- positive witnesses required downstream: <list>
- negative witnesses required downstream: <list>
- regression witnesses required downstream: <list>
- real_boundary_required: yes | no
- real_boundary_status: not_applicable | required_before_closure | pending-live/BLOCKED | proven_by <path>
- if no live seam: <why no live seam exists for this decision>

## Ownership/path consequences

- owned_write_paths: <paths>
- read_only_paths: <paths>
- untouchable_paths: <paths>
- serialized/shared ownership notes: <notes or none>

## Domain-neutrality check

- DL-20A status consulted: <green | not-yet-green | not applicable>
- domain-neutrality rule references: <DL-20A sections once available>
- placeholder result before DL-20A: no core/domain-neutral implementation may finalize from this decision until DL-20A rules are applied where relevant.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes | no
- conflicts discovered: <none or exact evidence>

## Deferral rationale

Required when status is `DEFERRED`; otherwise state `not applicable`.

- deferred_question: <question>
- reason_now: <why deferred>
- future_owner: <DL/I lane>
- required_before_finalizing: <dependents or none>
- blocked_dependents: <dependents or none>
- proof_no_dependent_relies_now: <evidence>

## Evidence checklist

Use the `Evidence checklist` from DL-24A and add item-specific evidence.

## Validation plan and severity policy

Use the `Validator checklist` and severity gates from DL-24A; add item-specific witnesses.

## Known ambiguities / future owners

<List unresolved but non-blocking ambiguities, with owners and gating impact.>
```

## Dependency declaration format

Every future decision must include these exact fields in a machine-readable-enough block, even when values are empty:

```yaml
dependencies:
  depends_on:
    - id: <DL/I/source id>
      type: decision | implementation | source_doc | external_prerequisite
      required_status: LOCKED | PASS | CLEAN | AVAILABLE
      rationale: <why it is needed>
  blocks:
    - id: <DL/I lane or audit>
      reason: <why this decision blocks it>
  blocked_dependents:
    - id: <DL/I lane or audit>
      blocked_until: <condition>
      relying_on: <specific decision content>
  required_before_finalizing:
    - id: <DL/I lane or audit>
      required_content: <content that must exist before finalizing that dependent>
  deferrals:
    - deferred_question: <question>
      rationale: <why not resolved now>
      future_owner: <DL/I lane>
      allowed_now: true | false
      blocked_dependents:
        - <id>
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - <path>
  read_only_paths:
    - <path>
  untouchable_paths:
    - <path>
  handoff_notes:
    - from: <owner or none>
      to: <future owner>
      condition: <handoff condition>
      shared_path_policy: serialized | disjoint | not_applicable
```

Mapping example: `DL-20A` can fill `depends_on` with `DL-24A`, `blocks` with all core/domain-neutral decisions and implementation lanes, `owned_write_paths` with its own decision/report paths, `untouchable_paths` with package source/root/CI files, and `handoff_notes` with future `DL-20B` audit expectations. No required field is missing.

## Evidence checklist

A future decision cannot be called green unless its report and artifact include evidence for all applicable items below:

1. Report artifact was created first and updated after each stage.
2. Exact source files inspected are listed by path and section heading.
3. Exact files changed are listed by path.
4. No production/package/root/config/CI/generated starter files were touched unless that decision explicitly owns them; normal `DL-*` decisions do not.
5. The decision produces exactly one required output class.
6. Dependencies, blocked dependents, required sequencing, and deferrals use the required dependency declaration format.
7. If deferred, the artifact proves no dependent implementation lane relies on the deferred content; otherwise dependent lanes are blocked.
8. The artifact states verification/witness consequences, including positive, negative, and regression witnesses expected downstream.
9. The artifact states real-boundary status. If a decision claims live feasibility and actual proof cannot run, it is `pending-live/BLOCKED` rather than green.
10. Ownership/path consequences are explicit and compatible with dirty-tree/multi-orchestrator safety.
11. Domain-neutrality check placeholder is present and points to `DL-20A` as owner of details once available.
12. Locked decisions remain uncontradicted, including:
    - product/package/CLI name `vibe-engineer`;
    - two-repo direction: domain-neutral harness plus generated/reference starter kit;
    - six user-facing skills: `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
    - artifact flow: raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet;
    - `plan` owns Verification Delta;
    - `build` and `ship` run verification/context/evidence automatically;
    - fixed v1 starter stack and E2E choices where relevant;
    - mechanical gate families;
    - no push/PR without explicit approval.
13. The decision states why downstream dependents cannot finalize without the required discipline or referenced prerequisite.
14. The validator checklist and severity policy are included or referenced to this `DL-24A` artifact.

Valid deferral witness:

- A decision records `DEFERRED`, explains the unresolved question, names a future owner, and lists `I-15-create-import-starter-UX` as blocked until resolution. No implementation proceeds from the deferred content.

Invalid deferral witness:

- A decision records `DEFERRED` for CLI output contracts while `I-02-cli-primitive-foundation` proceeds as if the output format were known. This is rejected because a dependent relies on unresolved content.

## Validator checklist

Independent Triad-B validators for future `DL-*` decisions must perform and record:

### Positive witnesses

- Artifact exists at the owned decision path.
- Artifact uses the required template and exactly one output class.
- Decision resolves or explicitly defers/blocks the item without hidden assumptions.
- Required dependency declaration fields are present.
- Evidence checklist is complete for applicable items.
- Ownership, dirty-tree safety, and real-boundary status are explicit.
- At least one representative downstream lane can map onto the dependency/template fields without missing required information.

### Negative witnesses

- A hypothetical or actual missing dependency/evidence item is classified not green.
- A deferred decision with a dependent implementation relying on it is rejected.
- An artifact omitting ownership/dirty-tree safety is rejected.
- A decision that claims live feasibility without a real-boundary plan or proof is rejected or marked `pending-live/BLOCKED`.

### Regression witnesses

- Locked product/CLI name, two-repo direction, six skills, artifact flow, automatic verification/context, Verification Delta, mechanical gates, and no-push-without-approval policy remain uncontradicted.
- The decision does not authorize production implementation unless its lane explicitly owns implementation paths.
- `DL-20A` remains the owner of domain-neutrality foundation details.
- `DL-24B` remains the later cross-decision output audit.

### Sibling/blast-radius checks

- Check final strategy decision/DAG/ownership/verification sections for consistency.
- Check source docs and prior decisions for contradictions.
- Check that writes stayed inside owned paths.
- Check that target repo production source/root/config/CI files were not touched by decision-only lanes.

### Severity policy

- `critical`: source contradiction; out-of-license write; production implementation by a decision-only lane; missing output-class rule; invalid deferral policy; missing dependency/evidence/ownership discipline; false real-boundary closure; contradiction of locked decisions; unsafe dirty-tree operation. Blocks item and dependents.
- `major-local`: incomplete template/checklist or unclear dependency/evidence wording that blocks direct dependents but is repairable within the decision artifact/report paths.
- `minor-local`: narrow wording/citation clarity issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all requirements and witnesses satisfied.

## Real-boundary policy

Decision artifacts generally do not create live typed producer→consumer seams. Therefore most `DL-*` decisions may mark live seam proof `not_applicable` when they do not claim runtime feasibility.

However:

- A decision that claims a provider/API/client, writer/carrier/consumer, spawn/adapter, verification runner, context retriever, CI/local aggregate, or generated starter join is feasible must state the earliest real-boundary proof lane and the exact producer, carrier, and consumer.
- A shape-only fixture, mock, synthetic replay, or hand-authored artifact may support planning but cannot close a load-bearing seam.
- If actual proof is not yet possible, the decision or dependent implementation closure must be `pending-live/BLOCKED`.
- Later implementation lanes still require actual real-boundary proof for Work Brief→Plan, Plan→Build Result, Build Result→Ship Packet, contract provider→generated client→consumer, verification runner→build/ship/CI, context writer→retriever, local aggregate quality→CI, and other load-bearing seams listed by strategy.

For this `DL-24A` artifact itself, no live seam is created and no real API/provider/spawn/client witness is applicable.

## Ownership and dirty-tree policy

All decision agents must assume unrelated dirty work and parallel orchestrators are present.

Rules:

- Never ask for a clean tree.
- Never use `git stash`, `git reset`, `git clean`, `git checkout`, or `git restore`.
- Edit only explicitly owned paths.
- Treat unspecified paths as untouchable.
- Inspect existing content inside owned paths narrowly; if another owner has substantively written conflicting content, stop `BLOCKED` with evidence.
- Decision-only lanes normally own only their decision artifact and `.vibe/work/<decision-id>/**` reports/evidence.
- Production package source, root config, CI, generated starter files, `.git/**`, and unowned decisions/reports remain untouchable unless a future lane explicitly owns them.
- Reports must list files inspected, files changed, commands/witnesses run, dirty-tree compliance, blockers, and next step.

## Downstream gating impact

`DL-24A` gates all later decision artifacts because every later decision needs the output class, template, dependency, evidence, ownership, deferral, real-boundary, and validation discipline defined here before it can be independently validated as green.

Impacts:

- `DL-20A` executes after `DL-24A` discipline and supplies domain-neutrality foundation details for later decisions and core implementation.
- `DL-01` through `DL-19` and `DL-21` through `DL-23` cannot finalize until `DL-24A` and applicable `DL-20A` rules are green.
- `DL-20B` audits domain-neutrality compliance after relevant decisions.
- `DL-24B` audits cross-decision output compliance after decisions exist and does not replace this foundation discipline.
- Implementation lanes remain blocked until their decision dependencies and required audits are green; this artifact does not authorize production implementation.

## Known ambiguities / future owners

- Exact wording for future decisions can be stricter than this template, but not weaker. `DL-24B` will audit compliance.
- Domain-neutrality examples, forbidden vocabulary, and enforcement mechanics are owned by `DL-20A` and later `DL-20B` audit.
- Exact schemas for Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet, Evidence Packet, registry entries, context headers, schematic manifests, and skill manifests are owned by `DL-02` and related downstream decisions.
- Exact CLI, package, verification runner, mechanical engine, security, observability, documentation, and starter architecture choices remain owned by their respective `DL-*` items.
- Live implementation witnesses are owned by implementation lanes; decision artifacts must declare consequences and blockers but must not fake proof.
