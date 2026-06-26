# DL-17 — Bootstrap Project Context Generation

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-17 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-17-bootstrap-context-generation.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-17-bootstrap-context-generation/DL-17-execution-report.md`

This decision locks the bootstrap-context semantic contract for create/import. It intentionally does not invent `DL-16` starter-layout details. Physical starter-template paths and exact filenames remain blocked where they depend on `DL-16`, `I-08`, `I-15`, or final `DL-02` schema implementation.

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §5.2 `Decision-lock table`; §§6–11 dependency, ownership, verification, and real-boundary sections; §§14–18 evidence, dirty-tree, closure, and severity rules.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §§4–5 source coverage and DAG safety; §7 `Verification and real-boundary witness check`; §§9–10 severity and recommendation.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md` — `Decision summary`; `Work Brief`; `Context file header`; `Cross-artifact linking model`; `Validation and type-generation consequences`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-03-skill-protocols.md` — `brainstorm`; `task`; `Shared protocol rules`; `Handoff contracts`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-06-agentic-harness-integrations.md` — `Common harness adapter abstraction`; `Pi v1 integration decision`; `Pi generated-file families`; `Blocked dependents`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` — `CLI surface matrix`; `Machine-readable output and error contract`; `Interactive and non-interactive behavior`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-08-schematics-system.md` — `Schematic scope and initial set`; `How schematics generate code + tests + context/docs stubs without becoming user-facing skills`; `Dependencies and prerequisites`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-09-context-memory-drift.md` — `Context storage decision`; `Context graph/index decision`; `Drift detection and update decision`; `Cross-linking decision`; `Known ambiguities / future owners`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md` — `Decision summary`; `Evidence packet requirements`; `Failure classification taxonomy`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-15-mechanical-engine.md` — `Gate-family matrix`; `Boundary, dependency, and domain-purity rules`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-22-security-safety-model.md` — `Security/safety scope`; `Generated env/config conventions`; `Audit/evidence log policy`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§3.4–3.5 verification/context and artifacts; §§4–10 workflow, artifacts, CLI, verification, context; §§12–16 starter shape, relationship, success criteria, locked decisions.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §4 `App creation UX`; §§5–8 generated config, skills, schematics, verification/context.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §§2, 3, 7, 8, 9, 16, 17, 20, 24.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1.4–1.6; §3; §5.11; §§7–8; §11; §§14–16.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1 and 7.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2, 10, 11.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

`vibe-engineer create` and `vibe-engineer import` must initialize project context from the optional project brief without adding any extra creation prompt. If the user provides a valid non-empty brief, bootstrap writes sparse, provenance-labeled high-level context derived only from the brief and locked harness defaults. If the user skips the brief, bootstrap writes neutral incomplete placeholders plus a clear instruction to run the locked `brainstorm` skill later to create the missing high-level context.

Bootstrap context is not product planning. It must not produce a feature roadmap, database schema, domain model, architecture, user-role model, integration list, or business workflow unless those facts are explicitly user-provided, and even then they are recorded as user-provided context, not as a finalized design.

DL-17 locks the semantic artifact set, provenance labels, inference boundaries, skipped-brief behavior, later skill recommendation, validation obligations, and cross-decision owner boundaries. Exact physical filenames, starter-template placement, and final JSON schema fields are delegated to `DL-09`/`I-08`, `DL-16`, `DL-02`/`I-01`, and `I-15` and block physical-path-dependent closure if unavailable.

## Decision details

1. Create/import has exactly the locked inputs: project naming values, selected default `agenticHarness`, and optional project brief. There is no stack prompt, max-parallel prompt, or separate bootstrap/skip prompt.
2. Bootstrap behavior is determined only by the optional project brief value after validation:
   - valid non-empty brief: provided-brief bootstrap path;
   - skipped, empty, or whitespace-only brief: skipped-brief bootstrap path;
   - invalid/unreadable/unsafe/too-large input: typed create/import validation error or blocked result, not silent fallback to confident context.
3. Sparse non-empty input is still a provided brief. A one-word or vague brief may produce only a minimal source record and unknowns; it must not be inflated into a product design.
4. Project-local bootstrap context belongs under the consuming/generated project's `DL-09` context storage families, especially `.vibe/context/**`, `.vibe/context/areas/**`, `.vibe/context/index/**`, and linked `.vibe/work/**` artifacts. Exact filenames and generated starter template placement remain owned by `I-08`/`I-15` and blocked on `DL-16` where starter layout is needed.
5. Every generated bootstrap statement must carry provenance and confidence. Valid provenance labels are:
   - `user_provided`: exact or direct paraphrase of text supplied by the user;
   - `normalized_from_user`: deterministic normalization of a user-provided value, such as title casing or project-name normalization;
   - `harness_default`: locked harness/starter fact from source decisions, such as six skills or selected `agenticHarness` config concept;
   - `inferred_from_user`: a bounded inference that is directly entailed by user text and cites the source span;
   - `placeholder`: neutral intentionally incomplete content created because no brief fact exists;
   - `assumption`: non-authoritative assumption requiring later confirmation;
   - `unknown`: a required context category with no reliable source yet.
6. `placeholder`, `assumption`, and `unknown` content cannot satisfy product requirements, plan acceptance criteria, context truth, or verification proof. Consumers must treat them as incomplete context.
7. Bootstrap may initialize a context graph/index entry and context header, but it must not run `plan`, `build`, `ship`, schematics, product generation, or verification beyond validating its own generated context.
8. Bootstrap must include links from generated context to the create/import result, selected `agenticHarness`, optional brief source record, and relevant context headers/index entries.
9. If a provided brief contains project-specific vocabulary, that vocabulary may appear only as user-provided project context with provenance. It must not be normalized into harness core defaults.
10. The selected later skill for skipped-brief high-level context creation is `brainstorm` because it is the locked exploratory intake skill for shaping raw intent into a Work Brief. Adapter-specific invocation syntax is owned by `DL-06`/`I-14` and `DL-07`/`I-02`; the semantic instruction must name `brainstorm`.

## Alternatives considered

### No bootstrap artifacts

- decision: rejected
- rationale: locked create UX says a provided brief should bootstrap context where possible, and skipped brief should generate placeholders plus instruction.
- consequences: create/import must write intentional context state for both paths.

### Over-infer full product model from a short brief

- decision: rejected
- rationale: backlog §17 explicitly says bootstrap should create useful high-level context, not prematurely design the full product.
- consequences: short/vague briefs create sparse context with unknowns; planning and product design remain with later Work Brief/plan/build flows.

### Ask a separate skip-bootstrap prompt

- decision: rejected
- rationale: locked creation UX forbids a separate bootstrap prompt; skipped/provided behavior follows from optional brief value.
- consequences: create/import cannot add `skip bootstrap?`, `generate full context?`, or equivalent prompts.

### Only raw brief storage

- decision: rejected as insufficient
- rationale: raw source must be preserved, but future agents need minimal high-level context, provenance labels, unknown markers, and graph/index links.
- consequences: raw brief source record is required for provided briefs but is not the only output.

### Selected balanced approach

- decision: accepted
- rationale: generated context is useful immediately, remains source-linked and sparse, validates both provided and skipped paths, and preserves owner boundaries for context storage, schemas, starter layout, CLI, schematics, skills, harness integration, security, and verification.
- consequences: `I-15` can implement create/import UX without guessing semantic behavior, but cannot close physical-path/schema/runtime seams until owner decisions and real-boundary witnesses are available.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy is safe for decision execution and requires DL-17 for bootstrap UX.
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies decision template, dependency declaration, evidence, validation, real-boundary, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutrality rules for generated context, placeholders, and project-specific vocabulary boundaries.
    - id: DL-09-context-memory-drift
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies `.vibe/context/**` storage families, graph/index, retrieval, drift, and context writer/consumer seam requirements.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification, mechanical gates, backlog, strategy, playbook, and quality bar define bootstrap-context obligations.
  blocks:
    - id: I-15-create-import-starter-UX
      reason: Create/import must implement provided-brief and skipped-brief bootstrap behavior.
    - id: I-08-context-memory-drift
      reason: Context writer/validator/retriever must encode generated bootstrap context semantics and incomplete-intentional placeholder state.
    - id: I-23-end-to-end-real-boundary-witness
      reason: Full witness must rerun create/import brief and no-brief context seams.
    - id: DL-20B-domain-neutrality-compliance-audit
      reason: Audit must confirm bootstrap context rules do not leak business domains into core.
    - id: DL-24B-cross-decision-output-audit
      reason: Audit must confirm DL-17 deferrals and blocked dependents are respected.
  blocked_dependents:
    - id: I-15-create-import-starter-UX
      blocked_until: DL-17 is independently validated clean; final physical-path closure also requires DL-16, DL-02/I-01, DL-07/I-02, DL-08/I-07, DL-09/I-08, DL-06/I-14, DL-10/I-09, and DL-22 where applicable.
      relying_on: Provided-brief artifacts, skipped-brief placeholders, later-skill instruction, inference boundaries, provenance, and validation obligations.
    - id: physical generated starter context fixture closure
      blocked_until: DL-16 starter layout is locked and I-15 owns the generated fixture/template paths.
      relying_on: Exact physical placement of generated context and selected harness instruction files.
    - id: exact bootstrap schema implementation
      blocked_until: DL-02/I-01 and I-08 encode the required context header/source/provenance/index fields.
      relying_on: Exact JSON schema fields, validators, migrations, and context graph carrier format.
    - id: selected-harness instruction rendering
      blocked_until: DL-06/I-14 and DL-07/I-02 provide adapter-specific invocation/rendering details.
      relying_on: Exact syntax for telling the user how to run `brainstorm` in the selected harness.
  required_before_finalizing:
    - id: I-15-create-import-starter-UX
      required_content: Actual create/import writes provided-brief context or skipped placeholders plus `brainstorm` instruction and validates them.
    - id: I-08-context-memory-drift
      required_content: Context writer/indexer/validator/retriever accepts intentional placeholder state and rejects over-inferred/domain-leaking context.
    - id: DL-16-starter-architecture
      required_content: Exact starter root/layout and generated context fixture locations before physical path closure.
    - id: DL-02-artifact-schemas / I-01-artifact-schemas-config
      required_content: Schema-valid carriers for source record, context header, provenance labels, graph/index links, and validation errors.
    - id: DL-03-skill-protocols / I-05-input-skills-work-brief-vertical
      required_content: `brainstorm` remains the selected later skill and produces a Work Brief through the locked protocol.
    - id: DL-06/I-14 and DL-07/I-02
      required_content: Selected harness and CLI invocation/rendering contracts for user-facing instructions and machine-mode create/import results.
    - id: DL-10/I-09
      required_content: Evidence/failure taxonomy for generated-context validation results.
    - id: DL-22/I-18
      required_content: Security/safety treatment for invalid, oversized, unsafe, or secret-bearing brief input and generated context evidence.
  deferrals:
    - deferred_question: Exact physical starter-template paths and filenames for generated bootstrap context.
      rationale: DL-16 was not visible as a green decision during DL-17 execution; starter layout belongs to DL-16/I-15.
      future_owner: DL-16-starter-architecture / I-15-create-import-starter-UX
      allowed_now: true
      blocked_dependents:
        - physical generated starter context fixture closure
        - any implementation relying on exact starter paths
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact JSON schema fields for bootstrap source records, provenance labels, context headers, index entries, and validation diagnostics.
      rationale: DL-17 locks semantics; DL-02/I-01/I-08 own exact schema and validators.
      future_owner: DL-02-artifact-schemas / I-01-artifact-schemas-config / I-08-context-memory-drift
      allowed_now: true
      blocked_dependents:
        - exact bootstrap schema implementation
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact adapter-specific text/command syntax for running `brainstorm`.
      rationale: DL-17 chooses the semantic later skill; DL-06/I-14 and DL-07/I-02 own selected-harness rendering and CLI syntax.
      future_owner: DL-06-agentic-harness-integrations / I-14-pi-adapter-skill-consumption / DL-07-cli-primitives / I-02-cli-primitive-foundation
      allowed_now: true
      blocked_dependents:
        - selected-harness instruction rendering
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-17-bootstrap-context-generation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-17-bootstrap-context-generation/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** except DL-17
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** except DL-17
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-17 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - production package/source paths
    - root config files
    - CLI source paths
    - schematic/source/template paths
    - context package implementation paths
    - generated starter files
    - CI files
    - docs outside /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-17-bootstrap-context-generation.md
    - any .vibe/work/** path not under DL-17 ownership
  handoff_notes:
    - from: DL-17
      to: I-15-create-import-starter-UX
      condition: After DL-17 independent validation is clean and I-15 prerequisites are green.
      shared_path_policy: disjoint
    - from: DL-17
      to: I-08-context-memory-drift
      condition: Context implementation encodes provenance, placeholder, index, drift, and validation semantics.
      shared_path_policy: disjoint
    - from: DL-17
      to: DL-16/I-15
      condition: Physical starter layout and generated fixture paths must be chosen by those owners before physical-path closure.
      shared_path_policy: serialized
```

## Blocked dependents

- `I-15-create-import-starter-UX` — blocked until DL-17 is independently validated for semantic behavior; final closure also waits for physical layout/schema/context/CLI/adapter/security prerequisites named above.
- `I-08-context-memory-drift` — blocked for bootstrap-specific validation states until it encodes provided/skipped context semantics, provenance, and placeholder acceptance/rejection rules.
- Physical generated starter fixture/template closure — blocked until `DL-16` is green and `I-15` owns exact generated fixture paths.
- Selected-harness bootstrap instruction rendering — blocked until `DL-06`/`I-14` and `DL-07`/`I-02` provide exact invocation/rendering details.
- `I-23-end-to-end-real-boundary-witness` — blocked until create/import, context writer/validator/retriever, and selected-harness instruction paths are all proven with actual seams.
- `DL-20B` and `DL-24B` — later audits must include DL-17 domain-neutrality and output/deferral compliance.

## Provided-brief bootstrap behavior

When the user provides a valid non-empty brief, create/import must generate this semantic artifact set in the consuming/generated project:

1. **Bootstrap source record**
   - Preserves the exact user-provided brief text or a canonical reference to it.
   - Records create/import invocation metadata, selected `agenticHarness`, project naming values, timestamp, producer, and source hash/fingerprint where available.
   - Marks source status as `provided` and every direct use as `user_provided`.
2. **Bootstrap high-level project context**
   - A context artifact/header/body under the DL-09 project-local context store.
   - Contains only bounded high-level fields: project title/name, one brief summary, explicitly stated goals/outcomes, explicitly stated constraints, explicitly stated non-goals, explicitly stated audience/users only if the user stated them, explicitly stated integrations only if the user stated them, unknowns, assumptions needing confirmation, and provenance map.
   - Status is a bootstrap/sparse context state, not a completed product plan.
3. **Bootstrap unknowns and assumptions section**
   - Records missing product facts as `unknown` rather than inventing them.
   - Records any non-authoritative interpretation as `assumption` with confirmation required.
4. **Context graph/index entries**
   - Adds source-linked nodes/edges tying the project context, source record, create/import result, selected harness config concept, and future Work Brief/skill path.
   - Must be valid for context retrieval but may be marked sparse/bootstrap until later context is enriched.
5. **Validation evidence/result reference**
   - Records that generated context passed bootstrap-context validation or failed/blocked with typed diagnostics.
   - Exact Evidence Packet fields are owned by `DL-02`/`DL-10`.
6. **Optional refinement instruction**
   - If the provided brief is sparse or contains many unknowns, generated context may advise running `brainstorm` to refine context; this is advisory and does not replace the required provided-brief context.

Allowed inference categories:

- deterministic normalization of project names/titles from provided names;
- concise summarization of stated user text;
- extraction of explicitly stated goals, constraints, non-goals, risks, unknowns, project vocabulary, and acceptance hints;
- classification of missing categories as `unknown`;
- direct entailments clearly tied to a source span, labeled `inferred_from_user`.

Forbidden provided-brief outputs unless explicitly user-provided and provenance-labeled:

- full feature roadmap;
- database schema or domain entity model;
- architecture or package/module/API design;
- user roles/personas;
- business workflow;
- third-party integrations;
- authentication/payment/admin assumptions;
- implementation plan, Verification Delta, Build Result, Ship Packet, or schematics output;
- business-domain examples as core defaults.

## Skipped-brief bootstrap behavior

When the user skips the optional project brief or supplies only empty/whitespace text, create/import must generate intentional neutral placeholders, not confident product context.

Required semantic artifact set:

1. **Bootstrap absence record**
   - Records `brief_status: skipped` or equivalent.
   - Records that no user-provided project brief facts are available.
2. **Neutral high-level context placeholder**
   - A context artifact/header/body under the DL-09 project-local context store.
   - Status is intentionally incomplete, such as `needs_user_context` or equivalent schema-owned value.
   - It may include project/repo/app naming values and selected `agenticHarness` only as setup facts, not as product goals.
   - It must not invent a product summary, domain, users, roadmap, data model, workflow, integrations, or acceptance criteria.
3. **Unknowns list**
   - Explicitly marks missing project purpose, desired outcome, constraints, non-goals, risks, acceptance notes, and domain-specific context as `unknown`.
4. **Later-skill instruction**
   - The generated project must clearly instruct the user to run `brainstorm` later to create the missing high-level context.
   - Adapter-specific rendering is deferred, but the semantic instruction is: `Run the brainstorm skill with several sentences describing the project to create the initial Work Brief and project context.`
5. **Context graph/index placeholder entries**
   - Adds nodes/edges so context validation can distinguish intentional missing brief from broken/missing context.
   - Placeholder state is acceptable only for create/import bootstrap; later build/ship tasks that need high-level project context must block or request/refine context.
6. **Validation evidence/result reference**
   - Records validation acceptance of incomplete-but-intentional skipped state.

Skipped brief must not silently create confident product context. The absence of a brief is a first-class, validated incomplete state.

## Inference boundaries and anti-overdesign rules

Bootstrap may answer only: what the user explicitly said, what harness setup decided, what is unknown, and what the user should do next.

Rules:

1. No product design from vibe. A vague phrase such as `collaboration app`, `AI assistant`, or a one-word idea cannot produce a roadmap, domain model, user-role list, integration list, database schema, or workflow.
2. No architecture inference. The locked starter stack may be recorded as harness/starter setup context, but bootstrap cannot decide product architecture beyond locked starter defaults.
3. No acceptance criteria invention. Candidate acceptance notes may be recorded only if user-provided; otherwise acceptance remains unknown until Work Brief/plan flow.
4. No schema/contract invention. Runtime schemas, API contracts, data models, and package boundaries belong to later Work Brief/plan/build/starter decisions.
5. No implicit business domain. Project-specific terms appear only because the user brief supplied them, or inside clearly labeled sample/demo/negative-example contexts.
6. No hidden certainty. Every non-user-provided statement must be labeled as harness default, bounded inference, placeholder, assumption, or unknown.
7. No overwrite of later skill responsibilities. `brainstorm`/`task` create Work Briefs; `plan` owns risk analysis and Verification Delta; `build` owns implementation plus verification/context; `ship` owns final verification and handoff.
8. No prompt proliferation. Bootstrap must not ask extra create-time questions to compensate for missing context. Missing information is represented as unknown and repaired later through `brainstorm` or the normal skill flow.

## Generated context validation requirements

Later implementation must provide a deterministic bootstrap-context validator consumed by create/import and context validation. It must run over actual generated files/artifacts, not just hand-authored shapes.

### Positive validation obligations

- Provided brief path writes all required semantic artifacts and provenance labels.
- Sparse provided brief path records only sparse user-provided facts and unknowns.
- Skipped brief path writes neutral placeholders, absence record, unknowns, and `brainstorm` instruction.
- Context graph/index can distinguish `provided`, `sparse_provided`, and `skipped_intentional` states.
- Context retriever can load the bootstrap context closure and cite source records.
- Domain-neutral generic placeholders pass.

### Negative validation obligations

- Empty/whitespace brief must not be treated as provided product context.
- Invalid/unreadable/unsafe/too-large brief input must produce a typed blocked/invalid result rather than silent fallback.
- Short/vague brief must not generate full product model, database schema, feature roadmap, business workflow, architecture, integrations, invented users, or acceptance criteria.
- Skipped brief must not generate a confident summary or domain-specific context.
- Missing provenance labels for user-provided/inferred/unknown content must fail.
- Core-generated bootstrap output containing ecommerce/inventory/fashion/Billz/Telegram/Instagram-like business defaults must fail unless clearly source-provided, negative-example, or sample/demo labeled under DL-20A.
- Generated context with summary-only load-bearing claims and no source record/index link must fail.

### Regression validation obligations

- Product/package/CLI name remains `vibe-engineer`.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- `build` and `ship` continue to run verification/context/evidence automatically.
- `DL-09` remains owner of full context storage/graph/index/drift architecture.
- `DL-16` remains owner of starter layout.
- `DL-02`, `DL-03`, `DL-06`, `DL-07`, `DL-08`, `DL-10`, and `DL-22` retain their respective schema, skill, adapter, CLI, schematic, verification, and security ownership.

### Schema/context/drift obligations

- All context headers, source records, and index entries must validate against final schemas before use.
- Unsupported schema versions, missing source refs, stale/mislinked context, or untrusted placeholders must fail closed according to DL-09.
- Placeholder state is valid only when explicitly intentional and linked to skipped brief; it must not satisfy later mandatory context closure for build/ship if high-level context is required.

## CLI/create UX consequences

- Preserve locked create/import prompts only:
  - project/repo/app naming values needed to generate files;
  - default agentic harness selection;
  - optional project brief.
- Do not ask stack preset.
- Do not ask max parallel agents.
- Do not ask separate bootstrap/skip-bootstrap or confidence-level prompts.
- In non-interactive mode, provided/skipped behavior is determined from explicit flags/inputs:
  - absent/empty brief input means skipped path;
  - non-empty valid brief means provided path;
  - invalid brief input means typed error/block.
- Machine result envelopes for create/import must link generated bootstrap context artifacts/placeholders and validation evidence where implemented.

## Context/system integration consequences

- `DL-09`: owns canonical context storage families, graph/index, retrieval, drift, update, and context writer/retriever proof. DL-17 supplies bootstrap-specific semantic content and validation rules.
- `DL-02`: owns exact JSON schemas, artifact envelope, ContextHeaderV1 fields, links, versioning, validation errors, and type generation.
- `DL-03`: owns skill protocols. DL-17 selects `brainstorm` for skipped brief because `brainstorm` is the exploratory input skill; it does not alter Work Brief flow.
- `DL-06`: owns selected harness adapter file families and invocation/rendering. DL-17 only requires the later instruction to name `brainstorm`.
- `DL-07`: owns create/import CLI surface and machine envelope. DL-17 constrains create/import bootstrap payload semantics.
- `DL-08`: owns schematic engine/content-stub generation. DL-17 context stubs/placeholders must not be implemented through ad-hoc generators that bypass DL-08 where schematics are used.
- `DL-10`: owns verification evidence/failure taxonomy for bootstrap-context validation results.
- `DL-16`: owns exact starter architecture/layout. DL-17 does not choose physical starter paths; physical-path-dependent implementation remains blocked until `DL-16` is green.
- `DL-20A`: governs domain-neutrality and core/sample/project boundaries for bootstrap content.
- `DL-22`: owns security/safety behavior for invalid/sensitive brief input, secret-bearing generated context, and safe CLI handling.

## Verification/witness consequences

- deterministic checks affected: create/import bootstrap context validation, context header/schema validation, source/provenance validation, domain-neutrality checks, skipped-placeholder validation, selected-harness instruction validation, and context graph/index link validation.
- positive witnesses required downstream:
  - actual `vibe-engineer create`/import with provided brief writes source record, sparse high-level context, provenance, graph/index entries, and validation evidence;
  - actual create/import with skipped brief writes absence record, neutral placeholders, unknowns, `brainstorm` instruction, graph/index entries, and validation evidence;
  - actual context validator/retriever consumes both states and reports expected clean/incomplete status.
- negative witnesses required downstream:
  - invalid/empty/sparse/over-inferred/domain-leaking cases are rejected or downgraded to unknowns as specified;
  - missing provenance fails;
  - shape-only generated files without actual writer/carrier/consumer proof do not close implementation.
- regression witnesses required downstream: locked name, six skills, artifact flow, no extra create prompts, automatic build/ship context behavior, `DL-09`/`DL-16` ownership, and domain-neutral core.
- real_boundary_required: yes for later implementation; no live seam is created by this decision artifact.
- real_boundary_status: not_applicable for this DL-17 decision artifact; required_before_closure for `I-15`, `I-08`, and `I-23`.
- later real seam:
  - Producer: actual `vibe-engineer create`/`import` path or selected harness bootstrap entrypoint.
  - Carrier: generated on-disk context source records, context headers/bodies, placeholders, graph/index entries, create/import result artifacts, and selected-harness instruction files/fields in the generated starter fixture.
  - Consumer: actual context validator/retriever plus selected harness/user instruction path that consumes or repairs missing high-level context.
- closure rule: if the actual create/import → on-disk context → validator/retriever/instruction seam cannot run, dependent closure is `pending-live/BLOCKED`, not shape-green.

## Ownership/path consequences

- DL-17 writes only this decision artifact and the DL-17 work report.
- Future `I-15` owns create/import CLI and generated starter fixture/template paths.
- Future `I-08` owns context package internals and context schema fixtures.
- Future `I-14` owns pi adapter integration assets; other adapter support remains evidence-gated by DL-06.
- Future `I-01` owns schema implementation and type generation.
- Future `DL-16`/starter lanes own exact starter layout and app/package generated content.
- No production/package/source/root/CI/generated-starter path is authorized by this decision.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected: create/import bootstrap context rules, placeholder content, generated context validation, selected-harness user instruction, context graph/index labels, future starter generated context.
- surface classification:
  - bootstrap rules and validators are core harness surfaces;
  - provided brief content is consuming-project context with source provenance;
  - skipped placeholders are neutral project-owned incomplete context;
  - future starter sample/demo content remains governed by DL-16/DL-20A labels.
- allowed generic terms: project, context, brief, goal, constraint, non-goal, unknown, assumption, provenance, source record, placeholder, context graph, index, skill, Work Brief, create, import, harness.
- forbidden core defaults: ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout, product catalog, customer order, or equivalent project-specific business models.
- project-specific vocabulary may appear only when the user brief supplied it or in explicitly labeled sample/demo/negative examples.
- skipped-brief placeholders must be neutral and must not invent a domain.
- deterministic enforcement owners: `I-08`/`I-15` for context/create validation, `I-10`/mechanical domain-purity where assigned, `I-24` docs labels, `DL-20B` audit.
- result: PASS for this decision artifact; no business domain is encoded as a core default.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none. The DL-17 decision artifact was not visible before drafting; DL-17 work area contained the report created first.
- no package source, root config, CI, generated starter, context implementation, CLI implementation, source-doc, strategy, ledger/status, prompt, or git path was written.

## Evidence checklist

1. Execution report was created before this decision artifact and updated after source inspection.
2. Source files inspected are listed in the execution report and cited above by path/section.
3. Files changed by this lane are:
   - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-17-bootstrap-context-generation/DL-17-execution-report.md`;
   - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-17-bootstrap-context-generation.md`.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
7. Backlog §17 is resolved at semantic decision level: generated outputs, skipped placeholders, inference allowance, anti-overdesign, later skill, and validation are specified.
8. Physical starter layout and exact schema fields are explicitly deferred to owners with blocked dependents; no implementation may rely on them unresolved.
9. Provided/skipped paths require provenance labels and validation.
10. Anti-overdesign rules explicitly prevent premature full product design.
11. Skipped brief explicitly becomes neutral placeholders plus `brainstorm` instruction.
12. Real-boundary proof is not falsely claimed by this decision; later proof is required using actual create/import, on-disk context carrier, and actual validator/retriever/instruction consumer.
13. DL-20A domain-neutrality checklist is applied.
14. Locked create UX, six skills, product name, artifact flow, and automatic build/ship context behavior are preserved.

## Validation plan and severity policy

Independent Triad-B validation must inspect the actual changed/owned files and any available diff, not just this report.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-17-bootstrap-context-generation.md` and uses DL-24A schema with exactly one output class.
- Backlog §17 topics are resolved or owner-deferred with blocked dependents.
- Provided-brief and skipped-brief outputs are unambiguous at the semantic level.
- Later skill recommendation is `brainstorm` and does not add a new skill.
- DL-20A checklist is applied and no core business domain is encoded.
- Locked create UX is preserved with no forbidden prompts.
- `I-15` can implement semantic behavior without guessing; physical path closure is explicitly blocked on DL-16/I-15 where needed.

### Negative witnesses

- Reject any bootstrap decision that turns a vague brief into roadmap/schema/domain model/users/integrations/architecture.
- Reject skipped-brief behavior that creates confident product context.
- Reject missing provenance labels.
- Reject extra create prompts for bootstrap/stack/max-parallel.
- Reject core defaults with ecommerce/inventory/fashion/Billz/Telegram/Instagram-like vocabulary unless source-provided, sample/demo, or negative-example labeled.
- Reject implementation closure that relies on shape-only files instead of actual create/import writer → on-disk context → validator/retriever/instruction consumer.

### Regression witnesses

- `vibe-engineer` name remains unchanged.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- `build`/`ship` automatic verification/context behavior remains intact.
- `DL-09` remains owner of full context architecture; `DL-16` remains owner of starter layout.
- `DL-20B` and `DL-24B` audit roles remain intact.

### Sibling/blast-radius checks

- Check consistency with planning backlog §§2, 3, 7, 8, 9, 16, 17, 20, 24.
- Check consistency with README context/artifact/create sections and locked-decisions create UX.
- Check source-doc consistency for verification/context validation in verification-layer §5.11 and final invariant.
- Check that only DL-17 owned paths changed.
- Check cross-decision references do not allow dependent implementation to proceed from unresolved physical/schema details.

### Severity policy

- `critical`: locked create UX contradiction; out-of-license write; missing DL-24A/DL-20A application; hidden dependency/invalid deferral; green closure while relying on unresolved physical-path/schema dependencies; over-designed product bootstrap; false real-boundary closure; domain-neutrality violation.
- `major-local`: incomplete output set, unclear inference/provenance rules, missing later-skill recommendation, incomplete validation plan, or unclear cross-decision owner mapping repairable within DL-17 paths.
- `minor-local`: citation/wording issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all DL-17 requirements, source consistency, ownership, validation, and dependency evidence satisfied.

## Known ambiguities / future owners

- `DL-16-starter-architecture`: exact generated starter layout and physical context file placement. Not green/visible during this decision; physical-path closure remains blocked.
- `DL-02`/`I-01`: exact schemas, validation errors, source/provenance carrier fields, and migrations.
- `DL-09`/`I-08`: context writer, graph/index artifact format, retrieval, drift, and placeholder state validation implementation.
- `DL-03`/`I-05`: exact `brainstorm` Work Brief creation behavior after user follows skipped-brief instruction.
- `DL-06`/`I-14`: selected-harness rendering and live pi adapter instruction proof.
- `DL-07`/`I-02`/`I-15`: exact create/import flags, prompts, non-interactive behavior, result payloads, and machine envelope.
- `DL-08`/`I-07`: schematic-generated context stubs if create/import uses schematics.
- `DL-10`/`I-09`: evidence and failure classification for bootstrap validation results.
- `DL-22`/`I-18`: invalid/sensitive brief input, secret redaction, command safety, and generated artifact safety policy.
- `DL-20B` and `DL-24B`: cross-decision audits before broader implementation/final closure.
