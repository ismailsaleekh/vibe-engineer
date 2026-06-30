# DL-03 — Skill Protocols

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-03 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-03-skill-protocols.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-03-skill-protocols/DL-03-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`, row `DL-03-skill-protocols`; §6 `Dependency DAG with scheduler gates`; §8 `Pass sizing and allocation`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity policy; §19 `Concise first ready queue after MST closure`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §8 `Coverage by product surface`; §9 `Severity gate and closure criteria check`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §3 `Non-negotiable design rules`; §4 `Core workflow`; §5 `Skill responsibilities`; §6 `Artifact model`; §7 `CLI role`; §8 `Schematics`; §9 `Verification model`; §10 `Context preservation and retrieval`; §15 `Success criteria`; §16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §6 `Skills generated per app`; §7 `Schematics are internal/agent-facing`; §8 `Verification and context updates are automatic`; §10 `Verification-layer decisions`.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §2 `Artifact flow`; §3 `Responsibilities by skill/orchestrator`; §4 `Verification Delta`; §5 `Verification catalog`; §6 `Orchestration model`; §7 `Planning orchestrator design`; §8 `Build orchestrator design`; §11 `Agent registry`; §12 `Meta-agents outside normal orchestration`; §14 `Blocking policy summary`; §16 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §3 `Skill protocols`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §1 `Core verification doctrine`; §5 `Schema and contract strictness gate`; §11 `How this fits the verification layer`; §13 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §5.2 `Work-item loop`; §10 `The quality bar`; §11 `Operator anti-patterns`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

The six normal user-facing skills are exactly `brainstorm`, `grill-me`, `task`, `plan`, `build`, and `ship`. They form the locked artifact chain: raw intent → Work Brief → Implementation Plan with machine-readable Verification Delta → Build Result → Ship Packet.

`brainstorm`, `grill-me`, and `task` are input-producing skills and must all write the same Work Brief artifact class. `plan` consumes Work Brief only and owns final risk/sensitive-area analysis and Verification Delta design. `build` consumes an approved Implementation Plan only and writes a Build Result after implementation, verification asset construction, automatic verification, evidence capture, and context update. `ship` consumes Build Result only, runs final verification/context checks, writes a Ship Packet, and may prepare commit/PR material but must not push or open a PR without explicit user approval.

This decision locks protocol-level producer/consumer obligations, permitted behavior, blocking behavior, validation expectations, storage/carrier duties, and handoff contracts. Exact artifact schema fields, versions, validators, storage serializers, CLI syntax, adapter file formats, runtime internals, registry schemas, context internals, verification runner details, security policy mechanics, and observability implementation remain owned by sibling decisions.

## Decision details

### `brainstorm`

```yaml
purpose: >-
  Exploratory intake skill for unclear ideas, product/development tradeoffs, and early shaping.
  It helps the user converge from raw intent to a durable Work Brief without requiring the user
  to choose low-level CLI primitives or schematics.
inputs:
  - raw user intent, notes, questions, constraints, or optional existing context supplied by the user or configured context retrieval.
  - may read relevant existing context needed to avoid losing known constraints.
  - must not consume Implementation Plan, Build Result, or Ship Packet as its normal start artifact.
outputs:
  - one persisted Work Brief artifact using the same Work Brief artifact class as `grill-me` and `task`.
  - may include candidate acceptance scenarios, candidate E2E cases, candidate UI states, unknowns, and tradeoff notes as Work Brief content subject to DL-02 schema ownership.
allowed_actions:
  - ask exploratory questions.
  - summarize options, tradeoffs, constraints, non-goals, and uncertainties.
  - consult durable context when available.
  - propose candidate acceptance and E2E scenarios for planner refinement.
  - write/update only the Work Brief artifact and any lane-owned evidence/report artifacts during implementation lanes.
forbidden_actions:
  - final risk classification or sensitive-area analysis.
  - creating an Implementation Plan, Build Result, or Ship Packet.
  - implementing code, running build/ship behavior, pushing, opening PRs, or invoking schematics as user-facing actions.
  - silently relying on chat history instead of the persisted Work Brief.
clarifying_question_policy:
  - ask when the raw idea lacks enough objective, outcome, constraint, or acceptance information to create a useful Work Brief.
  - prefer converging questions over endless exploration once enough information exists.
  - do not ask low-level implementation, schema, CLI, or runtime questions owned by later skills or sibling decisions unless the missing answer blocks Work Brief creation.
blocking_conditions:
  - user intent remains too vague to write a truthful Work Brief after reasonable clarification.
  - requested action would require implementation, planning, shipping, destructive operations, or out-of-scope production writes.
  - artifact persistence or schema validation is unavailable once the relevant DL-02/I-01 mechanisms are required.
  - concrete owned-path or policy conflict is discovered.
subagents_or_specialists:
  - may coordinate domain-neutral ideation, context-summary, acceptance-scenario, and Work Brief validator specialists when registry support exists.
  - registry schema, allowed tools, and specialist identities are owned by DL-05.
validation_steps:
  - confirm the output is a Work Brief artifact and not a plan/build/ship artifact.
  - confirm the Work Brief is persisted through the configured artifact carrier.
  - confirm all required Work Brief schema constraints once DL-02/I-01 validators exist.
  - confirm candidate verification notes are captured without final risk/sensitive-area ownership.
  - reject domain-specific core assumptions under DL-20A.
storage_and_carrier_obligations:
  - persist the Work Brief to the configured on-disk work-artifact store; exact path, format, version, and validators are owned by DL-02/DL-09/DL-07 as applicable.
  - include enough durable linkage for `plan` intake to consume the Work Brief without chat-history dependence.
  - generated harness skill files must preserve this protocol through the selected adapter; adapter format is owned by DL-06.
handoff_contract:
  - hand off exactly one valid Work Brief artifact to `plan`.
  - `plan` must reject raw brainstorm chat or a non-Work Brief carrier as direct intake.
  - unresolved user questions must be explicit in the Work Brief rather than hidden in chat.
evidence_required:
  - later positive witness: actual `brainstorm` writer emits an on-disk Work Brief consumed by actual plan intake.
  - later negative witness: malformed or non-persisted brainstorm output is rejected.
  - later regression witness: Work Brief class remains shared with `grill-me` and `task`.
```

### `grill-me`

```yaml
purpose: >-
  Adversarial intake skill for pressure-testing assumptions, edge cases, missing constraints,
  risky changes, and acceptance gaps before planning.
inputs:
  - raw user intent, draft idea, proposed task, existing Work Brief candidate, or context summary supplied for challenge.
  - may read relevant durable context to identify contradictions and missing constraints.
  - must not consume Implementation Plan, Build Result, or Ship Packet as its normal start artifact.
outputs:
  - one persisted Work Brief artifact using the same Work Brief artifact class as `brainstorm` and `task`.
  - may include challenged assumptions, candidate risks/unknowns, candidate acceptance scenarios, candidate E2E cases, and explicit unresolved questions.
allowed_actions:
  - ask adversarial clarification questions.
  - challenge assumptions, edge cases, abstractions, operational concerns, security/safety concerns, and missing acceptance criteria.
  - propose candidate verification scenarios for planner refinement.
  - mark unresolved ambiguity explicitly in the Work Brief.
forbidden_actions:
  - final risk classification or sensitive-area analysis; `plan` owns final classification.
  - converting the Work Brief into an Implementation Plan or Verification Delta.
  - implementing code, running build/ship behavior, pushing, opening PRs, or treating schematics as user-facing skills.
  - hard-coding consuming-project business assumptions into core skill behavior.
clarifying_question_policy:
  - ask targeted questions when an assumption, acceptance gap, reproduction gap, or constraint gap would make the Work Brief misleading.
  - stop asking once remaining unknowns can be truthfully recorded for `plan` to resolve or block.
blocking_conditions:
  - a critical ambiguity prevents truthful Work Brief creation.
  - requested pressure-test would require plan/build/ship authority or sibling-owned implementation details.
  - no durable artifact carrier is available where required.
  - concrete ownership, safety, or domain-neutrality conflict is discovered.
subagents_or_specialists:
  - may coordinate assumption-challenger, acceptance-scenario, context-consistency, and Work Brief validator specialists when registry support exists.
  - security/safety reviewer participation is advisory here unless task-specific deterministic criteria exist; final security policy belongs to DL-22 and later lanes.
validation_steps:
  - confirm challenged assumptions and candidate scenarios are captured in a Work Brief artifact.
  - confirm final risk/sensitive-area labels are not asserted as planner-owned conclusions.
  - validate artifact shape through DL-02/I-01 validators when available.
  - verify the skill did not write plan/build/ship artifacts.
storage_and_carrier_obligations:
  - persist the Work Brief to the configured on-disk work-artifact store and link to any read context by durable reference, not chat transcript.
  - exact storage, schema, and link mechanics are dependencies on DL-02/DL-09.
handoff_contract:
  - hand off exactly one valid Work Brief artifact to `plan`.
  - candidate risks and cases are input signals; `plan` must independently perform final risk/sensitive-area analysis and Verification Delta design.
evidence_required:
  - later positive witness: actual `grill-me` writer emits an on-disk Work Brief consumed by actual plan intake.
  - later negative witness: final risk classification by `grill-me` as authoritative is rejected.
  - later regression witness: shared Work Brief class remains identical to `brainstorm` and `task` producers.
```

### `task`

```yaml
purpose: >-
  Fast neutral intake skill for direct requests, bugs, small features, chores, refactors,
  research requests, or decision requests when the user already has a concrete objective.
inputs:
  - raw user request, bug report, reproduction notes, logs/errors, constraints, affected surface, or concise project context.
  - may read relevant durable context needed to normalize the request.
  - must not consume Implementation Plan, Build Result, or Ship Packet as its normal start artifact.
outputs:
  - one persisted Work Brief artifact using the same Work Brief artifact class as `brainstorm` and `grill-me`.
  - may include observed/expected behavior, reproduction evidence, candidate acceptance notes, and candidate E2E cases.
allowed_actions:
  - normalize a direct request into a Work Brief.
  - ask minimal clarifying questions only when needed for truthful intake.
  - capture supplied evidence and candidate verification cases for planner refinement.
  - route vague requests to `brainstorm`/`grill-me` style questioning while still producing a Work Brief when complete.
forbidden_actions:
  - accepting raw request as sufficient input for `plan` without writing a Work Brief.
  - final risk/sensitive-area classification.
  - creating Implementation Plan, Build Result, or Ship Packet artifacts.
  - implementing changes, running verification as build/ship closure, committing, pushing, or opening PRs.
clarifying_question_policy:
  - ask only for information required to avoid a false or unusable Work Brief, such as missing expected behavior, reproduction basis, acceptance outcome, or affected surface.
  - avoid exploratory expansion when the user's request is already sufficient.
blocking_conditions:
  - request cannot be represented truthfully as a Work Brief.
  - bug report lacks minimum reproducible or observable evidence and the user cannot provide enough to proceed.
  - requested action requires direct build/ship execution or an out-of-license path.
  - artifact persistence/schema validation is unavailable once required.
subagents_or_specialists:
  - may coordinate bug-normalizer, reproduction-summarizer, acceptance-capture, and Work Brief validator specialists when registry support exists.
  - exact specialist registry metadata belongs to DL-05.
validation_steps:
  - confirm direct request was converted into persisted Work Brief before `plan` intake.
  - validate required artifact constraints once DL-02/I-01 exist.
  - confirm candidate verification evidence is not silently omitted when user supplied it.
  - confirm no plan/build/ship artifact was created.
storage_and_carrier_obligations:
  - persist Work Brief through the configured artifact carrier.
  - attach or link supplied logs/evidence by durable artifact reference where supported; exact evidence schema/location belongs to DL-02/DL-10/DL-09.
handoff_contract:
  - hand off exactly one valid Work Brief artifact to `plan`.
  - if intake remains incomplete, block or record explicit unresolved questions; do not hand off ambiguous raw chat as plan input.
evidence_required:
  - later positive witness: actual `task` writer emits an on-disk Work Brief consumed by actual plan intake.
  - later negative witness: `plan` rejects a raw direct request when no Work Brief artifact exists.
  - later regression witness: shared Work Brief class remains identical to `brainstorm` and `grill-me` producers.
```

### `plan`

```yaml
purpose: >-
  Planning orchestrator that converts one validated Work Brief into an actionable Implementation Plan
  containing a machine-readable Verification Delta.
inputs:
  - exactly one valid Work Brief artifact.
  - relevant durable context closure discovered from artifact links and configured context retrieval.
  - must reject raw chat/user intent as direct intake.
outputs:
  - one persisted Implementation Plan artifact.
  - the Implementation Plan must contain a machine-readable Verification Delta; exact schema fields and serialization are owned by DL-02.
allowed_actions:
  - perform final risk analysis and sensitive-area classification.
  - inspect context needed for planning.
  - coordinate planning specialists.
  - decide required implementation steps, acceptance criteria, Definition of Done, context/docs changes, and verification needs.
  - mark verification items add/update/reuse/not applicable/blocked at the protocol level, with exact representation owned by DL-02/DL-10.
  - block when prerequisites or approvals required for a buildable plan are missing.
forbidden_actions:
  - consuming raw intent directly instead of a Work Brief.
  - implementing code, changing production files, or producing Build Result/Ship Packet.
  - silently skipping verification catalog categories.
  - treating input-skill candidate risks or E2E cases as final without planner analysis.
  - locking exact schema fields, CLI output syntax, runtime scheduling internals, or registry schemas owned by sibling decisions.
clarifying_question_policy:
  - ask only when the Work Brief lacks information required for a truthful buildable plan or verification delta.
  - if the missing information belongs to an input skill, route back or block rather than accepting raw chat as a substitute artifact.
  - if a sibling-owned decision is unavailable, declare the dependency and block/defer the dependent detail under DL-24A rules.
blocking_conditions:
  - missing, invalid, ambiguous, or schema-rejected Work Brief.
  - plan would depend on unresolved exact schema/CLI/runtime/registry/context/verification/security/observability details not safely deferrable.
  - verification category cannot be classified add/update/reuse/not applicable/blocked.
  - required context is unavailable or stale in a way that prevents safe planning.
  - concrete ownership conflict or locked-decision contradiction.
subagents_or_specialists:
  - may coordinate planning specialists named by verification-layer planning design, including context scoper, dependency mapper, implementation planners, test planners, risk/sensitive-area classifier, verification-delta planner, plan validator, and plan fixer.
  - specialist registry format and enforcement belong to DL-05; runtime orchestration mechanics belong to DL-04.
validation_steps:
  - validate Work Brief input through actual schema validator once DL-02/I-01 exist.
  - verify Implementation Plan is persisted and links to the source Work Brief.
  - verify Verification Delta is machine-readable and covers the verification catalog without silent omissions.
  - run independent plan validation; planner output must not be accepted by the same agent as sole validator.
  - verify domain-neutrality for core protocol/prompt surfaces.
storage_and_carrier_obligations:
  - persist the Implementation Plan and its Verification Delta to the configured work-artifact store.
  - preserve durable links to the source Work Brief and context closure.
  - exact storage path, artifact format, link representation, and validators are owned by DL-02/DL-09/DL-07.
handoff_contract:
  - hand off exactly one valid Implementation Plan artifact to `build`.
  - the plan must be explicitly approved before `build` consumes it.
  - build intake must reject unapproved plans, raw Work Briefs, or raw user requests.
evidence_required:
  - later positive witness: actual `plan` consumes a real Work Brief artifact and writes an Implementation Plan with machine-readable Verification Delta consumed by actual build intake.
  - later negative witness: raw user intent or malformed Work Brief is rejected.
  - later regression witness: no verification category is silently skipped and final risk ownership stays with `plan`.
```

### `build`

```yaml
purpose: >-
  Build orchestrator that consumes an approved Implementation Plan, implements the requested change,
  builds required verification assets, runs verification automatically, captures evidence, updates context,
  and writes a Build Result.
inputs:
  - exactly one approved valid Implementation Plan artifact.
  - referenced context closure, verification requirements, and artifact links.
  - must reject raw requests, Work Briefs, unapproved plans, malformed plans, and stale plan carriers.
outputs:
  - one persisted Build Result artifact after implementation, verification, evidence capture, and context update.
  - evidence/context artifacts required by the approved plan and verification implementation decisions.
allowed_actions:
  - load context closure.
  - coordinate implementation, verification-builder, runner, fixer, evidence, and context-update specialists.
  - use schematics internally/agent-facing where appropriate.
  - implement product behavior and required verification assets.
  - run deterministic verification automatically and iterate on root-cause fixes within configured caps.
  - route failures to specialist fixers or block with evidence.
  - update durable context and evidence carriers.
forbidden_actions:
  - accepting raw user intent, Work Brief, or unapproved Implementation Plan as build input.
  - skipping required verification assets or treating advisory review alone as deterministic closure.
  - silently passing failed deterministic checks.
  - producing Ship Packet, pushing, opening PRs, or committing without explicit separately authorized policy.
  - mutating outside owned implementation-lane paths once implemented.
clarifying_question_policy:
  - ask only when an approved plan contains an ambiguity that prevents safe implementation or verification.
  - prefer blocking with evidence when the ambiguity is a missing prerequisite, ownership conflict, or sibling-owned decision rather than improvising.
  - do not ask the user to manually run verification or context update as normal workflow.
blocking_conditions:
  - no approved valid Implementation Plan.
  - plan dependencies, owned paths, or required schemas/validators are unavailable.
  - deterministic verification fails after allowed fix iterations.
  - required evidence or context update cannot be written.
  - real-boundary witness required for the lane cannot run and cannot be honestly marked pending-live/BLOCKED.
  - concrete dirty-tree ownership conflict or unsafe operation request.
subagents_or_specialists:
  - may coordinate build specialists named by verification-layer build design, including build scoper, allocator, dependency DAG builder, implementation agents, verification-builder agents, integration/merge agents, verification runners, failure classifiers/routers, fixer agents, evidence collector, context updater, and final build validator.
  - runtime mechanics belong to DL-04; registry policy belongs to DL-05; verification implementation belongs to DL-10.
validation_steps:
  - validate approved plan intake.
  - verify implementation changes match plan scope and owned paths.
  - verify required verification assets were implemented or explicitly blocked by the Verification Delta.
  - run deterministic verification automatically and record evidence.
  - independently validate Build Result; no self-validation as sole gate.
  - verify context update/drift checks ran as required.
storage_and_carrier_obligations:
  - persist Build Result to configured work-artifact store with durable links to Implementation Plan, evidence, verification outputs, changed-file summary, and context updates.
  - exact evidence packet, context storage, build-result schema, runner output, and path conventions are owned by DL-02/DL-09/DL-10/DL-07.
handoff_contract:
  - hand off exactly one valid Build Result artifact to `ship`.
  - ship intake must reject raw requests, Work Briefs, Implementation Plans, and Build Results lacking required evidence/context status.
evidence_required:
  - later positive witness: actual `build` consumes approved Implementation Plan, runs verification/context/evidence behavior, and writes Build Result consumed by ship intake.
  - later negative witness: raw request, Work Brief, unapproved plan, or failed verification blocks.
  - later regression witness: defaults `maxParallelAgents: 8`, `maxValidationFixIterations: 3`, and `agenticWorkPackageTargetHours: 6` remain preserved where referenced.
```

### `ship`

```yaml
purpose: >-
  Finalization skill that consumes a Build Result, runs final verification/context/evidence checks,
  writes a Ship Packet, and prepares commit/PR material without pushing or opening a PR unless the user explicitly approves.
inputs:
  - exactly one valid Build Result artifact.
  - referenced evidence, context status, verification outputs, and prepared change summary.
  - must reject raw requests, Work Briefs, Implementation Plans, and missing/invalid Build Result carriers.
outputs:
  - one persisted Ship Packet artifact.
  - prepared commit message, PR title/body, release/reviewer notes when applicable, and final evidence summary.
allowed_actions:
  - run final verification and context/drift checks automatically.
  - confirm evidence exists and deterministic blockers are clean.
  - summarize changes, verification, residual warnings, and follow-ups.
  - prepare commit/PR material.
  - ask for explicit approval before any push/open-PR action if a later implementation lane supports such actions.
forbidden_actions:
  - consuming anything other than Build Result as normal input.
  - introducing new feature behavior except routing a discovered blocking defect back through build/fix flow.
  - pushing, opening PRs, or performing remote publication without explicit user approval.
  - silently ignoring failed final verification, missing evidence, or stale context.
  - treating commit/PR preparation as implementation closure without Ship Packet persistence.
clarifying_question_policy:
  - ask when final packaging requires user approval, release/reviewer wording, or explicit decision on residual warnings.
  - ask before push/open PR; absence of approval is a block for those actions, not permission.
  - do not ask the user to manually run final verification or context checks as normal workflow.
blocking_conditions:
  - missing or invalid Build Result.
  - final deterministic verification fails.
  - evidence/context preservation is missing or stale.
  - requested push/open PR lacks explicit approval.
  - release/ship action would violate safety, security, ownership, or dirty-tree rules.
subagents_or_specialists:
  - may coordinate final verification runner, evidence auditor, context/drift checker, DoD checker, release-note summarizer, and ship-packet validator specialists when registry support exists.
  - commit/PR execution mechanics, if any, remain subject to CLI/adapter/security decisions and operator approval.
validation_steps:
  - validate Build Result intake.
  - rerun or confirm final verification/context checks according to DL-10/DL-09.
  - confirm evidence is present and linked.
  - confirm Ship Packet is persisted and includes prepared commit/PR material.
  - confirm no push/open PR occurred without explicit approval.
  - independently validate the Ship Packet.
storage_and_carrier_obligations:
  - persist Ship Packet to configured work-artifact store with durable links to Build Result, final evidence, context status, and prepared commit/PR material.
  - exact schema, evidence format, and integration output format are owned by DL-02/DL-07/DL-10/DL-22.
handoff_contract:
  - hand off the Ship Packet to the operator or downstream commit/PR-prep consumer.
  - any actual push/open PR action remains blocked until explicit user approval and relevant security/CLI/adapter rules allow it.
evidence_required:
  - later positive witness: actual `ship` consumes Build Result and writes Ship Packet plus final evidence without pushing/opening PR.
  - later negative witness: failed final verification, missing evidence, or no approval for push/PR blocks.
  - later regression witness: ship remains final proof/prep skill, not an implementation skill.
```

## Shared protocol rules

1. **User-facing skills vs CLI primitives.** Normal users operate through exactly six user-facing skills: `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`. Low-level CLI commands are deterministic primitives for agents, skills, CI, or advanced debugging. DL-03 does not define exact CLI command syntax or output contracts; DL-07 owns those details.
2. **Schematics are internal/agent-facing.** Schematics such as module, adapter, contract, test, context, or skill scaffolds are deterministic generators selected by agents/skills. They are not normal user-facing skills. DL-08 owns schematic API/manifest/idempotency details.
3. **Artifact-first storage.** Skill handoffs must use persisted artifacts and durable references, not raw chat history. Exact artifact fields, versions, validators, migrations, link format, and storage serializer are owned by DL-02 and related implementation lanes; DL-09 owns context storage/drift internals.
4. **Approval gates.** `build` may consume only an approved Implementation Plan. `ship` may prepare commit/PR material but must not push or open a PR without explicit user approval and applicable security/adapter/CLI support.
5. **No self-validation.** Skill outputs that become load-bearing handoffs require independent validation. Orchestrators may coordinate validators/fixers but must not be their own sole acceptance gate.
6. **Automatic verification/context/evidence.** `build` and `ship` automatically run required verification/context/evidence behavior. Users should not need to manually run verification or context-update commands during normal workflow.
7. **Deterministic blockers.** Deterministic checks hard-block. Advisory review is useful but does not solely hard-block unless promoted to deterministic or task-specific blocking criteria.
8. **Domain-neutrality.** Core skill protocols/prompts/rules must remain domain-neutral under DL-20A. Project-specific vocabulary belongs only in consuming-project extensions or explicitly labeled sample/demo/negative examples.
9. **Sibling ownership.** DL-03 locks skill-level semantics and handoffs only. It must not be used as authority for exact artifact schema fields, CLI formats, adapter formats, runtime engine internals, registry schema, verification runner design, context storage, security policy, or observability implementation.

## Handoff contracts

### Raw Intent → Work Brief

- Producers: `brainstorm`, `grill-me`, `task`.
- Carrier: persisted Work Brief artifact.
- Consumer: `plan` intake.
- Closure rule: all three input skills must produce the same Work Brief artifact class. They may capture candidate acceptance/E2E/UI cases and unknowns, but final risk/sensitive-area analysis belongs to `plan`.
- Reject cases: raw chat as plan input, three divergent Work Brief artifact classes, authoritative final risk classification by an input skill, or non-persisted output.

### Work Brief → Implementation Plan + Verification Delta

- Producer: `plan`.
- Carrier: persisted Implementation Plan artifact containing a machine-readable Verification Delta.
- Consumer: `build` intake.
- Closure rule: `plan` consumes Work Brief only, owns risk/sensitive-area analysis, evaluates the verification catalog without silent omissions, and writes a buildable plan.
- Reject cases: raw user intent intake, malformed Work Brief, missing machine-readable Verification Delta, skipped verification category, or unlinked plan.

### Implementation Plan → Build Result

- Producer: `build`.
- Carrier: persisted Build Result plus evidence/context updates.
- Consumer: `ship` intake.
- Closure rule: `build` consumes approved Implementation Plan only, implements behavior and required verification assets, runs verification automatically, updates context, captures evidence, and writes Build Result.
- Reject cases: raw request/Work Brief intake, unapproved plan, failed deterministic verification accepted as green, missing evidence, or missing context update.

### Build Result → Ship Packet

- Producer: `ship`.
- Carrier: persisted Ship Packet and final evidence summary.
- Consumer: final DoD checker, operator, and any commit/PR-prep consumer.
- Closure rule: `ship` consumes Build Result only, runs final verification/context checks, prepares commit/PR material, and does not push/open PR without explicit approval.
- Reject cases: invalid Build Result, failed final verification, missing evidence/context, or push/open PR without explicit approval.

## Alternatives considered

### Treat low-level CLI commands as the normal user-facing layer

- decision: rejected
- rationale: source docs lock that normal users operate through six skills while CLI primitives are deterministic engines for agents/skills/CI/advanced debugging.
- consequences: DL-03 defines skill semantics; DL-07 defines CLI primitives.

### Give each input skill its own artifact schema

- decision: rejected
- rationale: source docs lock `brainstorm`, `grill-me`, and `task` as producers of the same Work Brief artifact class.
- consequences: later `I-05` must prove actual shared schema acceptance across all three producers.

### Let `plan` accept raw intent directly for convenience

- decision: rejected
- rationale: locked artifact flow requires raw intent to become Work Brief before planning, preserving durable memory and validation boundaries.
- consequences: later plan intake validators must reject raw intent without a Work Brief artifact.

### Let `build` proceed from an unapproved plan

- decision: rejected
- rationale: `build` consumes approved Implementation Plan only and performs production implementation; skipping approval weakens the hard handoff boundary.
- consequences: later build intake must reject unapproved or malformed plans.

### Let `ship` push/open PR by default

- decision: rejected
- rationale: source docs lock explicit approval before push/open PR.
- consequences: later ship implementation must prove no push/open PR happens without explicit approval.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms the final strategy is safe for decision-lock execution planning and preserves skill/artifact-flow gates.
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision template, dependency fields, evidence checklist, validator checklist, real-boundary policy, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core, extension, sample/demo, vocabulary, checklist, and enforcement rules for skill protocols.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, backlog, strategy, playbook, and quality bar define skill/artifact/verification obligations.
  blocks:
    - id: I-05-input-skills-work-brief-vertical
      reason: Requires DL-03 skill protocols for the three Work Brief producers and plan intake boundary.
    - id: I-06-plan-skill-verification-delta
      reason: Requires DL-03 plan protocol, Work Brief-only intake, risk ownership, and Verification Delta handoff.
    - id: I-21-build-skill-orchestration
      reason: Requires DL-03 build protocol, approved-plan intake, verification/context/evidence behavior, and Build Result handoff.
    - id: I-22-ship-skill-orchestration
      reason: Requires DL-03 ship protocol, Build Result-only intake, final verification/context, Ship Packet handoff, and no-push rule.
    - id: I-14-pi-adapter-skill-consumption
      reason: Generated harness skill files must preserve DL-03 semantics for all six skills.
    - id: adapter/skill-generator lanes
      reason: Adapter and generated skill assets must preserve the protocol without overconstraining adapter-specific formats.
  blocked_dependents:
    - id: I-05-input-skills-work-brief-vertical
      blocked_until: DL-03 is independently validated clean and DL-02/I-01 schema validators required for implementation are available.
      relying_on: Shared Work Brief producer obligations and plan intake handoff.
    - id: I-06-plan-skill-verification-delta
      blocked_until: DL-03, DL-02, DL-04, DL-05, DL-10, and required predecessor lanes are green.
      relying_on: Work Brief-only intake, planner risk ownership, machine-readable Verification Delta obligation.
    - id: I-21-build-skill-orchestration
      blocked_until: DL-03 plus runtime/context/verification/adapter/create/CI prerequisites are green per strategy DAG.
      relying_on: Approved-plan-only build intake and automatic verification/context/evidence obligations.
    - id: I-22-ship-skill-orchestration
      blocked_until: I-21 and DL-03/DL-09/DL-10/CI prerequisites are green.
      relying_on: Build Result-only ship intake, final verification/context/evidence, Ship Packet, and no-push rule.
    - id: I-14-pi-adapter-skill-consumption
      blocked_until: DL-03 plus DL-06/DL-07/I-04/I-05/I-06 prerequisites are green and live adapter proof is available or pending-live/BLOCKED.
      relying_on: Generated skill semantics and six-skill coverage.
  required_before_finalizing:
    - id: DL-02-artifact-schemas
      required_content: Exact artifact fields, versions, validators, migrations, and storage serializer contracts for Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet, Evidence Packet, registry entries, context headers, schematic manifests, and skill manifests.
    - id: DL-04-orchestration-runtime
      required_content: Runtime DAG/resume/failure-routing mechanics that execute skill protocols without changing their user-facing semantics.
    - id: DL-05-agent-registry-validation-meta
      required_content: Registry schema, allowed/forbidden tool validation, specialist/meta-agent policy, and recommendation-only meta-agent enforcement unless changed by future decision.
    - id: DL-06-agentic-harness-integrations
      required_content: Adapter surfaces that generate/load skill files while preserving DL-03 protocol.
    - id: DL-07-cli-primitives
      required_content: CLI invocation/output contracts used by skills as deterministic primitives.
    - id: DL-09-context-memory-drift
      required_content: Context storage, retrieval, update, drift, and context-carrier mechanics used by build/ship.
    - id: DL-10-verification-implementation
      required_content: Verification runner, evidence/failure taxonomy, hard/advisory result representation, and build/ship verification behavior.
    - id: DL-22-security-safety-model
      required_content: Security/safety rules for commands, destructive actions, secrets, approvals, and ship/push boundaries.
    - id: DL-23-observability-defaults
      required_content: Observability requirements where Verification Delta/build/ship evidence requires them.
  deferrals:
    - deferred_question: Exact artifact schema fields, storage paths, validators, versions, and migrations.
      rationale: Owned by DL-02/I-01; DL-03 locks artifact classes and producer/consumer obligations only.
      future_owner: DL-02-artifact-schemas / I-01-artifact-schemas-config
      allowed_now: true
      blocked_dependents:
        - I-05-input-skills-work-brief-vertical
        - I-06-plan-skill-verification-delta
        - I-21-build-skill-orchestration
        - I-22-ship-skill-orchestration
      invalid_if_any_dependent_relies: true
    - deferred_question: Runtime orchestration, retry/resume/failure-routing implementation.
      rationale: Owned by DL-04/DL-10 and implementation lanes; DL-03 defines skill behavior only.
      future_owner: DL-04-orchestration-runtime / DL-10-verification-implementation / I-03 / I-09
      allowed_now: true
      blocked_dependents:
        - I-06-plan-skill-verification-delta
        - I-21-build-skill-orchestration
        - I-22-ship-skill-orchestration
      invalid_if_any_dependent_relies: true
    - deferred_question: Adapter-specific skill file formats and CLI invocation/output syntax.
      rationale: Owned by DL-06 and DL-07; DL-03 remains harness-neutral.
      future_owner: DL-06-agentic-harness-integrations / DL-07-cli-primitives / I-14
      allowed_now: true
      blocked_dependents:
        - I-14-pi-adapter-skill-consumption
        - adapter/skill-generator lanes
      invalid_if_any_dependent_relies: true
    - deferred_question: Context, verification, security, and observability implementation internals.
      rationale: Owned by DL-09, DL-10, DL-22, and DL-23; DL-03 requires automatic behavior without deciding mechanics.
      future_owner: DL-09-context-memory-drift / DL-10-verification-implementation / DL-22-security-safety-model / DL-23-observability-defaults
      allowed_now: true
      blocked_dependents:
        - I-21-build-skill-orchestration
        - I-22-ship-skill-orchestration
        - I-23-end-to-end-real-boundary-witness
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-03-skill-protocols.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-03-skill-protocols/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts cited above
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/**
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/**
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-03 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - /Users/lizavasilyeva/work/vibe-engineer/package source paths
    - /Users/lizavasilyeva/work/vibe-engineer/root config files
    - /Users/lizavasilyeva/work/vibe-engineer/CI files
    - /Users/lizavasilyeva/work/vibe-engineer/generated starter files
    - /Users/lizavasilyeva/work/vibe-engineer/schema, CLI, adapter, registry, context, verification, security, and observability implementation paths
    - any decision/report path not owned by DL-03
    - /Users/lizavasilyeva/work/harness-starter/** source docs, ledger/status, prompts, and non-owned reports
  handoff_notes:
    - from: DL-03
      to: DL-02-artifact-schemas
      condition: DL-02 must define exact artifact schemas/validators without contradicting DL-03 protocol-level flow.
      shared_path_policy: disjoint
    - from: DL-03
      to: DL-04/DL-05/DL-06/DL-07/DL-09/DL-10/DL-22/DL-23
      condition: Sibling decisions must preserve skill semantics while deciding their owned mechanics.
      shared_path_policy: disjoint
    - from: DL-03
      to: I-05/I-06/I-21/I-22/I-14
      condition: Implementation lanes must prove actual producer/carrier/consumer seams, not shape-only artifacts.
      shared_path_policy: disjoint
```

## Blocked dependents

Minimum blocked dependents:

- `I-05-input-skills-work-brief-vertical` — blocked until DL-03 is clean and DL-02/I-01 artifact validators/storage exist; must prove actual `brainstorm`/`grill-me`/`task` writers produce consumable Work Brief artifacts.
- `I-06-plan-skill-verification-delta` — blocked until DL-03 and prerequisites are green; must prove actual Work Brief → Implementation Plan with machine-readable Verification Delta and build intake consumption.
- `I-21-build-skill-orchestration` — blocked until plan/build/runtime/context/verification prerequisites are green; must prove approved Implementation Plan → Build Result with automatic verification/context/evidence.
- `I-22-ship-skill-orchestration` — blocked until build result prerequisites are green; must prove Build Result → Ship Packet with final verification/context/evidence and no push/open PR.
- `I-14-pi-adapter-skill-consumption` — blocked until adapter/skill generator can preserve six-skill semantics and prove live harness load or mark pending-live/BLOCKED.
- Related adapter and skill-generator lanes — blocked from closing if generated skills do not preserve DL-03 protocols.

Additional impacted lanes include `I-01-artifact-schemas-config`, `I-03-orchestration-runtime`, `I-04-agent-registry-validation-meta`, `I-08-context-memory-drift`, `I-09-verification-runner-evidence-failure-routing`, `I-20-ci-local-parity-wiring`, `I-23-end-to-end-real-boundary-witness`, `DL-20B-domain-neutrality-compliance-audit`, and `DL-24B-cross-decision-output-audit` to the extent they audit or implement these protocol handoffs.

## Verification/witness consequences

- deterministic checks affected: future artifact schema validation, skill manifest validation, generated skill/adaptor validation, plan/build/ship intake validators, verification-delta catalog completeness checks, evidence/context presence checks, no-push approval checks, and domain-neutrality checks.
- positive witnesses required downstream:
  - actual `brainstorm`, `grill-me`, and `task` each write a valid on-disk Work Brief artifact of the same artifact class.
  - actual `plan` consumes Work Brief only and writes Implementation Plan with machine-readable Verification Delta.
  - actual `build` consumes approved Implementation Plan only, builds behavior plus verification, runs verification/context/evidence automatically, and writes Build Result.
  - actual `ship` consumes Build Result only, runs final verification/context checks, writes Ship Packet, and prepares commit/PR material without pushing/opening PR.
  - generated skill files preserve all six protocols through the selected adapter.
- negative witnesses required downstream:
  - `plan` rejects raw chat/user intent and malformed Work Brief.
  - `build` rejects raw request, Work Brief, malformed plan, and unapproved plan.
  - `ship` rejects raw request, Work Brief, Implementation Plan, invalid Build Result, failed final verification, missing evidence/context, and push/open PR without approval.
  - input skills cannot close by authoritatively finalizing risk/sensitive-area analysis or omitting candidate acceptance/E2E capture when supplied.
  - schematics are rejected as normal user-facing skills.
  - core skill prompts/protocols with project/business assumptions are rejected under DL-20A.
  - exact schema fields locked by DL-03 while DL-02 is unavailable are rejected.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`.
  - six skills remain exactly `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
  - artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
  - schematics remain internal/agent-facing.
  - `build` and `ship` automatically run verification/context/evidence behavior.
  - deterministic checks hard-block and advisory review remains advisory unless promoted.
  - locked defaults remain preserved where referenced: `maxParallelAgents: 8`, `maxValidationFixIterations: 3`, `agenticWorkPackageTargetHours: 6`.
  - DL-20A/DL-24A remain prerequisites; DL-20B/DL-24B remain later audits.
- real_boundary_required: no for this decision artifact itself; yes for later implementation seams.
- real_boundary_status: not_applicable for DL-03 decision artifact because it writes no live skill seam and claims no runtime feasibility.
- if no live seam: this document locks protocols and proof obligations only; it does not implement skill writers, validators, adapters, storage, or runtime.

Later real-boundary witness map:

| Seam                                                | Earliest proof lane                                   | Actual producer                                     | Carrier                                                                    | Actual consumer                                        | Closure rule                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Work Brief producers → plan intake                  | `I-05-input-skills-work-brief-vertical`               | actual `brainstorm`/`grill-me`/`task` skill writers | on-disk Work Brief artifact validated by real schema once DL-02/I-01 exist | actual plan intake parser/schema validator             | I-05 cannot close without positive, negative, and regression proof.                                             |
| Work Brief → Implementation Plan/Verification Delta | `I-06-plan-skill-verification-delta`                  | actual `plan` orchestrator                          | on-disk Implementation Plan with machine-readable Verification Delta       | actual build intake/schema validator                   | I-06 cannot close without real writer/carrier/consumer proof.                                                   |
| Implementation Plan → Build Result                  | `I-21-build-skill-orchestration`                      | actual `build` orchestrator                         | on-disk Build Result plus evidence/context updates                         | actual ship intake parser                              | I-21 cannot close without proof that failed verification blocks and passing build writes consumable result.     |
| Build Result → Ship Packet                          | `I-22-ship-skill-orchestration`                       | actual `ship` orchestrator                          | on-disk Ship Packet and final evidence                                     | schema/final DoD checker plus commit/PR-prep consumer  | I-22 cannot close without proof and without pushing/opening PR.                                                 |
| Generated skill files → selected harness adapter    | `I-14-pi-adapter-skill-consumption` and adapter lanes | adapter/skill generator                             | generated harness skill/command files                                      | actual selected harness loader/executor when available | If live harness load cannot run, mark `pending-live/BLOCKED`; shape-only generated files do not close the seam. |

Fake/mock/synthetic skill artifacts may support design but cannot close these implementation lanes.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-03-skill-protocols.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-03-skill-protocols/**`
- read_only_paths:
  - all cited `/Users/lizavasilyeva/work/harness-starter/**` source docs and orchestration context;
  - existing DL-24A/DL-20A decision artifacts and reports;
  - target repo inventory outside DL-03 ownership.
- untouchable_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.git/**`;
  - package source, root config, CI, generated starter, schema, CLI, adapter, registry, context, verification, security, and observability implementation paths;
  - unowned decisions/reports;
  - source docs, ledger/status, prompts, and reports in `/Users/lizavasilyeva/work/harness-starter/**`.
- serialized/shared ownership notes: none for this decision-only pass. Future implementation lanes must use their own explicit path ownership and handoff rules.

## Domain-neutrality check

- DL-20A status consulted: green (`LOCKED` and independently validated `PASS`).
- governed surfaces affected: core skill protocols/prompts/rules, future generated skill files, adapter skill consumption, artifact-flow docs, and implementation-lane validations.
- surface classification: DL-03 itself is a decision artifact for core harness skill protocols. Future skill implementations are core harness surfaces unless explicitly consuming-project extensions or sample/demo fixtures.
- positive generic terms/structures permitted: Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet, Evidence Packet, apps, packages, modules, contracts, adapters, tests, standards, context, plans, verification, schematics, skills, agents, orchestrators, registries, validators, fixtures.
- project/business terms mentioned: ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout/customer/order/product-catalog style terms only as DL-20A negative examples and not as core defaults.
- core leakage result: no core skill protocol is allowed to assume a consuming-project business model.
- consuming-project extensions: project-specific vocabulary may enter Work Brief content from user/project input and remain project-owned; it must not become harness core prompt/protocol default.
- sample/demo boundary: sample/demo references must be explicitly labeled and must not replace consuming-project choices.
- deterministic enforcement owner mapping: DL-15/I-10, I-04, I-07, I-14, I-24, DL-20B, and final bughunt as assigned by strategy/DL-20A.
- advisory review owner mapping: later decision validators, agent/prompt validators, docs validators, and final bughunt.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none. Before the first DL-03 report write, there was no visible DL-03 decision artifact or DL-03 work-area content. After source reading, target inventory showed this DL-03 report and sibling D1 work areas; no conflicting DL-03 decision artifact was present.
- production implementation touched: no.
- source docs/ledger/status touched: no.

## Deferral rationale

This decision is `LOCKED`; no part of the skill protocol obligation is deferred. Implementation-specific and field-specific details are intentionally assigned to future owners and must block dependent implementation if missing.

- deferred_question: exact artifact schema fields, artifact formats, versions, validators, migrations, storage serializers, link fields, and evidence packet schema.
  - reason_now: DL-02/I-01 owns schema and validator details.
  - future_owner: `DL-02-artifact-schemas` / `I-01-artifact-schemas-config`.
  - required_before_finalizing: schema-dependent skill implementation and real-boundary lanes.
  - blocked_dependents: `I-05`, `I-06`, `I-21`, `I-22`, `I-23`, adapter/skill-generator lanes as applicable.
  - proof_no_dependent_relies_now: this is a decision-only lane; it authorizes no production implementation and keeps schema-dependent implementation blocked.
- deferred_question: CLI command names/arguments/output formats used by skills.
  - reason_now: DL-07 owns CLI primitives.
  - future_owner: `DL-07-cli-primitives` / `I-02` and command-specific lanes.
  - required_before_finalizing: CLI-consuming implementation lanes.
  - blocked_dependents: CLI/adapter/build/ship lanes relying on exact CLI contracts.
  - proof_no_dependent_relies_now: DL-03 states semantics only.
- deferred_question: runtime orchestration, registry/meta-agent policy, adapter file format, context storage, verification runner, security, and observability mechanics.
  - reason_now: sibling decisions own these mechanics.
  - future_owner: DL-04, DL-05, DL-06, DL-09, DL-10, DL-22, DL-23 and their implementation lanes.
  - required_before_finalizing: dependent implementation closure.
  - blocked_dependents: any lane relying on the unresolved mechanics.
  - proof_no_dependent_relies_now: all affected details are dependencies; DL-03 does not unblock implementation without the owners.

## Evidence checklist

1. Report artifact was created before the DL-03 decision artifact and updated after stages.
2. Exact source files inspected are listed in the execution report and cited above by path and heading.
3. Files changed are this decision artifact and the DL-03 execution report only.
4. No production/package/root/config/CI/generated starter/source/schema/CLI/adapter/registry/context/verification files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
7. Deferred details are sibling-owned implementation/schema/format mechanics; dependent implementation remains blocked until owners are green.
8. Verification/witness consequences list deterministic checks plus positive, negative, and regression witnesses.
9. Real-boundary status is stated: this decision creates no live seam; later implementation lanes require actual writer/carrier/consumer proof.
10. Ownership/path consequences are explicit and dirty-tree-safe.
11. Domain-neutrality check applies DL-20A and rejects project/business assumptions in core protocols.
12. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, `plan` Verification Delta, automatic `build`/`ship` verification/context/evidence, schematics internal/agent-facing, deterministic blockers, locked defaults, and no push/PR without approval.
13. DL-03-specific evidence:
    - all six skill subsections exist;
    - every skill block includes purpose, inputs, outputs, allowed actions, forbidden actions, clarifying-question policy, blocking conditions, subagents/specialists, validation steps, storage/carrier obligations, handoff contract, and evidence required;
    - `brainstorm`, `grill-me`, and `task` share Work Brief artifact class and do not own final risk/sensitive-area analysis;
    - `plan` consumes Work Brief only, owns risk/sensitive-area analysis, and emits Implementation Plan with machine-readable Verification Delta;
    - `build` consumes approved Implementation Plan only and requires implementation, verification asset construction, automatic verification, context update, evidence capture, and Build Result;
    - `ship` consumes Build Result only and requires final verification/context/evidence, Ship Packet, commit/PR material preparation, and explicit approval before push/open PR.
14. Validator checklist and severity policy are included below.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and any available diff, not just this execution report.

### Positive witnesses

- DL-03 decision artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-03-skill-protocols.md`.
- Artifact uses the DL-24A template and exactly one output class.
- All six skill subsections exist and each includes required protocol fields.
- The decision resolves backlog §3 special focus: input skills share Work Brief schema/class, `plan` consumes Work Brief only, `build` consumes approved Implementation Plan only, and `ship` consumes Build Result only.
- Verification-layer responsibilities are preserved: input skills propose candidate acceptance/E2E cases, `plan` owns risk/sensitive-area analysis and Verification Delta, `build` builds verification, and `ship` final-verifies.
- Dependents and proof owners map to final strategy lanes.
- DL-20A domain-neutrality checklist is applied.

### Negative witnesses

- A protocol where `plan` accepts raw chat/user intent directly instead of Work Brief is rejected.
- A protocol where `build` accepts raw request, Work Brief, malformed plan, or unapproved plan is rejected.
- A protocol where `ship` pushes/opens PR without explicit approval is rejected.
- A protocol where input skills perform final risk classification or silently skip candidate acceptance/E2E capture is rejected.
- A protocol that treats schematics as user-facing skills is rejected.
- A protocol that hard-codes a specific business domain in core skill prompts/rules is rejected under DL-20A.
- A decision that locks exact artifact schema fields while DL-02 is absent/not green is rejected unless those fields are clearly deferred and do not unblock schema-dependent implementation.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six skills remain exactly `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- Schematics remain internal/agent-facing and not normal user-facing skills.
- `build` and `ship` automatically run verification/context/evidence behavior.
- Deterministic checks hard-block; advisory review remains advisory unless promoted.
- Defaults remain preserved where referenced: `maxParallelAgents: 8`, `maxValidationFixIterations: 3`, `agenticWorkPackageTargetHours: 6`.
- DL-20A/DL-24A remain prerequisites; DL-20B/DL-24B remain later audits.

### Sibling/blast-radius checks

- Check consistency against README §§3–10/15, locked decisions §§6–10, verification-layer §§2–8/11–16, planning backlog §3, mechanical gates §§1/5/11/13, final strategy §§5–11/17–19, DL-24A, and DL-20A.
- Check that DL-03 does not preempt DL-02, DL-04, DL-05, DL-06, DL-07, DL-09, DL-10, DL-22, or DL-23 beyond declaring protocol obligations and dependencies.
- Check no path outside DL-03 decision/work ownership changed.
- Check no production source, root config, CI, generated starter, non-owned decision, source doc, ledger/status, or `.git/**` path was edited.
- Check target decision does not overconstrain adapters so tightly that pi/Claude/Codex/OpenCode integrations become impossible.

### Severity policy

- `critical`: locked skill/artifact-flow contradiction; out-of-license write; missing report-first execution evidence; missing any of six skills; wrong input/output chain; false real-boundary closure; hidden dependency on ungreen DL-02/sibling details; advisory-only hard closure for deterministic protocol requirements; domain-specific core leakage; production implementation by a decision-only lane.
- `major-local`: incomplete protocol field for one or more skills; unclear handoff contract; incomplete dependency/blocker mapping; missing validation witness design; unclear proof owner but repairable inside DL-03 paths.
- `minor-local`: wording/citation clarity issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all schema, source, ownership, dependency, domain-neutrality, and witness requirements satisfied.

## Known ambiguities / future owners

- `DL-02-artifact-schemas`: exact fields, versions, validators, migrations, schemas, storage serializers, and artifact-link mechanics for Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet, Evidence Packet, registry entries, context headers, schematic manifests, and skill manifests.
- `DL-04-orchestration-runtime`: runtime DAG, resumability, failure-routing, allocation, and execution mechanics.
- `DL-05-agent-registry-validation-meta`: registry schema, specialist/meta-agent policy, allowed/forbidden tools, and recommendation-only meta-agent enforcement.
- `DL-06-agentic-harness-integrations`: harness adapter abstraction and adapter-specific generated skill/command file formats.
- `DL-07-cli-primitives`: exact CLI invocation and machine-readable output contracts.
- `DL-09-context-memory-drift`: context storage, retrieval, graph/index/update, and drift internals.
- `DL-10-verification-implementation`: verification runner, evidence/failure taxonomy, rerun/resume, advisory/hard representation, and failure routing hooks.
- `DL-22-security-safety-model`: command safety, destructive action, secrets, approval, and remote-operation policy details.
- `DL-23-observability-defaults`: observability defaults and evidence requirements where tasks require observability verification.
- `DL-20B-domain-neutrality-compliance-audit`: later cross-decision/implementation domain-neutrality audit.
- `DL-24B-cross-decision-output-audit`: later audit that decisions have compliant outputs/dependencies/deferrals.

None of these ambiguities blocks DL-03 protocol lock because this decision does not authorize schema-dependent or production implementation; each dependent implementation lane remains blocked until its required owners are green.
