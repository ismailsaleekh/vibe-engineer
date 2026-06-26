# DL-09 — Context Memory and Drift

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-09 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-09-context-memory-drift.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-09-context-memory-drift/DL-09-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §9 `Context and memory system`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §4.1 `Harness repo package hypothesis`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`, row `DL-09-context-memory-drift`; §6 `Dependency DAG with scheduler gates`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity policy.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §§4–10 source coverage, DAG, real-boundary, severity, and recommendation.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md` — `Decision summary`; `Context file header`; `Cross-artifact linking model`; `Versioning and migrations`; `Validation and type-generation consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-02-artifact-schemas/reports/decision-lock-validation-report.md` — `Verdict`; `Planning-backlog coverage`; `Source-doc consistency check`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-03-skill-protocols.md` — `Shared protocol rules`; `Handoff contracts`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-04-orchestration-runtime.md` — `Runtime scope and non-scope`; `Context contamination prevention rules`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-05-agent-registry-validation-meta.md` — `Registry scope and boundary`; `Required registry metadata model`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-06-agentic-harness-integrations.md` — `Common harness adapter abstraction`; `Pi v1 integration decision`; `Pi generated-file families`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` — `CLI surface matrix`; `Machine-readable output and error contract`; `Known ambiguities / future owners`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-08-schematics-system.md` — `Schematic scope and initial set`; `How schematics generate code + tests + context/docs stubs`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §3.5 `Artifacts over chat history`; §4 `Core workflow`; §6 `Artifact model`; §7 `CLI role`; §9 `Verification model`; §10 `Context preservation and retrieval`; §15 `Success criteria`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§6–8 six skills, schematics boundary, and automatic verification/context updates.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §1.4 `Evidence over assertion`; §3.3 `build`; §3.4 `ship`; §5.11 `Context and drift checks`; §8 `Build orchestrator design`; §9 `Failure routing and fixing`; §16 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1 and 11 for deterministic evidence and context/docs drift as part of verification.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2, 10, and 11 for Triad execution, evidence-bound validation, dirty-tree safety, and real-boundary doctrine.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

`vibe-engineer` memory is durable, artifact-first, source-linked context stored on disk, not raw chat history. The accepted model is a strict `.vibe/context/**` context store plus `.vibe/work/**` work-artifact store, connected by a typed graph/index and fail-closed drift checks. Agents retrieve a task-specific context closure through progressive disclosure, update context automatically during `build` and `ship`, preserve source citations, and block when required context is missing, stale, misleading, or mislinked.

DL-09 locks context storage families, graph/index concepts, retrieval/progressive-disclosure rules, drift/update behavior, compression rules, cross-link requirements, and later proof obligations. Exact schema fields, CLI payload details, verification/evidence taxonomy, bootstrap UX, and security/safety mechanics remain with their owner decisions and implementation lanes.

## Decision details

1. Durable context lives in repository-local `.vibe/context/**`. A harness repo has harness-core context; a consuming/generated project has project-owned context. They share contracts but not ownership.
2. Work artifacts live in `.vibe/work/**` and evidence artifacts live in `.vibe/evidence/**` or the evidence owner path chosen by the verification decision. Context links to them; it does not duplicate them as prose memory.
3. Context is indexed as a typed graph over artifacts, files, code areas, docs, decisions, agents, schematics, standards, verification results, owners, dependencies, and drift state.
4. Retrieval returns a task-specific closure, not the whole repo. The closure must cite source artifacts and context nodes, classify mandatory versus optional material, and block if mandatory context is absent or untrusted.
5. `build` and `ship` must run context update and drift checks automatically. Users should not need to run context commands manually during normal work.
6. Summaries are derived projections. They aid progressive disclosure but never replace source-linked context, typed artifacts, decisions, evidence, or code.
7. All context producers and consumers must fail closed on invalid schema versions, stale links, unresolved required sources, or unsupported migrations.
8. Runtime proof is not claimed by this decision artifact. `I-08-context-memory-drift` must later prove the actual context writer → on-disk graph/index/artifacts → validator/retriever seam.

## Alternatives considered

### Raw chat history as memory

- decision: rejected
- rationale: README §3.5 requires artifacts over chat history. Chat is not schema-versioned, not source-linked, not independently retrievable, and cannot support drift blocking.
- consequences: raw conversation may be cited as source metadata only when captured into a validated artifact; it is never durable memory.

### Flat unindexed Markdown only

- decision: rejected
- rationale: Markdown-only context cannot reliably answer dependencies, dependents, ownership, stale links, graph traversal, or task-specific closure without heuristic parsing.
- consequences: human-readable Markdown bodies are allowed only when paired with typed headers/index entries and source links.

### Database-first context store before file artifacts

- decision: rejected for v1
- rationale: the harness must preserve memory through auditable repository artifacts, dirty-tree-safe ownership, and simple real-boundary witnesses. A database-first store would obscure diffs and introduce extra operational state before file contracts are proven.
- consequences: future databases/search backends may be cache/acceleration layers only; on-disk artifacts remain canonical unless a later decision changes this.

### Per-package docs only with no graph/index

- decision: rejected
- rationale: package docs help humans but do not capture cross-package, work-artifact, decision, agent, schematic, verification, and drift relationships.
- consequences: per-area context files are required, but they must be indexed into the graph.

### Fully automated summarization with no drift gates

- decision: rejected
- rationale: summaries can hallucinate, omit sources, and go stale. Verification-layer §5.11 requires context/drift checks, and the quality bar forbids shape-green/fake certainty.
- consequences: compression is allowed only as source-linked, invalidatable derived data.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms the final strategy is safe for decision-lock execution and names DL-09/I-08 context proof obligations.
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision template, dependency fields, evidence, validation, real-boundary, and dirty-tree policy.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core/extension/sample-demo context vocabulary and checklist.
    - id: DL-02-artifact-schemas
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies strict canonical artifact carrier, ContextHeaderV1 semantics, links, versioning, and fail-closed schema behavior.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: Backlog, README, locked decisions, verification, mechanical gates, strategy, playbook, and quality bar define context/memory/drift obligations.
  blocks:
    - id: I-08-context-memory-drift
      reason: Implements the context package, on-disk context graph/index/artifacts, retriever, updater, validator, and drift checks.
    - id: I-15-create-import-starter-UX
      reason: Create/import must generate or skip/bootstrap project context according to DL-17 while using DL-09 storage and graph rules.
    - id: I-21-build-skill-orchestration
      reason: Build must retrieve context closure, update context, run drift checks, and write context/evidence links.
    - id: I-22-ship-skill-orchestration
      reason: Ship must run final context validation/drift checks and include context preservation in the Ship Packet.
    - id: I-23-end-to-end-real-boundary-witness
      reason: Full witness reruns context producer/carrier/consumer joins across create/build/ship.
    - id: DL-20B-domain-neutrality-compliance-audit
      reason: Must audit context core/sample/extension boundaries.
    - id: DL-24B-cross-decision-output-audit
      reason: Must audit that DL-09 dependencies and deferrals are respected.
  blocked_dependents:
    - id: I-08-context-memory-drift
      blocked_until: DL-09, DL-02/I-01 schema validation, and required CLI/security/verification prerequisites for implementation closure are available.
      relying_on: Context storage, graph/index, retrieval, drift/update, compression, and real-boundary proof rules.
    - id: I-15-create-import-starter-UX
      blocked_until: I-08 is clean and DL-16/DL-17/DL-06/DL-07 dependencies are satisfied.
      relying_on: Generated/consuming-project context storage, bootstrap/skipped-context boundary, and adapter context output.
    - id: I-21-build-skill-orchestration
      blocked_until: I-08, I-09, I-15, I-20 and skill/runtime prerequisites are clean.
      relying_on: Automatic context retrieval/update/drift behavior and Build Result context links.
    - id: I-22-ship-skill-orchestration
      blocked_until: I-21, I-08, I-09, and CI/local verification prerequisites are clean.
      relying_on: Final context preservation, drift validation, and Ship Packet context status.
    - id: CLI context command-family implementation
      blocked_until: DL-07 is independently clean and I-02 provides compatible CLI foundation.
      relying_on: Exact command names, payload fields, exit/result envelope behavior, and machine-readable output.
    - id: verification/evidence context integration
      blocked_until: DL-10 is locked and I-09 provides evidence/failure taxonomy and runner behavior.
      relying_on: Exact evidence packet, failure classification, rerun, and hard/advisory context result representation.
    - id: create/import context bootstrap behavior
      blocked_until: DL-17 is locked and create/import implementation owns the UX.
      relying_on: Exact files and inference rules for optional project brief or skipped brief.
    - id: security-sensitive context policy
      blocked_until: DL-22 is locked and relevant implementation lanes enforce it.
      relying_on: Secret/sensitive data handling, destructive updates, trust, redaction, and safe external behavior for context files.
  required_before_finalizing:
    - id: I-01-artifact-schemas-config
      required_content: Runtime validators/types for ContextHeaderV1 and linked artifact classes consumed by context.
    - id: I-08-context-memory-drift
      required_content: Actual writer/indexer/validator/retriever with positive stale/missing/mislinked negative cases.
    - id: DL-03-skill-protocols / I-21 / I-22
      required_content: Build/ship skill implementation consumes context closures and writes context status without changing skill artifact flow.
    - id: DL-04-orchestration-runtime / I-03
      required_content: Runtime prevents context contamination and passes only dependency-approved context closures.
    - id: DL-07-cli-primitives / I-02
      required_content: Machine-readable context command capabilities if exposed through CLI.
    - id: DL-10-verification-implementation / I-09
      required_content: Evidence and failure routing model for context/drift check results.
    - id: DL-17-bootstrap-context-generation
      required_content: Exact create/import bootstrap context behavior for optional brief and skipped brief.
    - id: DL-22-security-safety-model
      required_content: Policy for sensitive context, trust, redaction, destructive updates, and safe command/file access.
  deferrals:
    - deferred_question: Exact graph/index JSON schema fields, validator code, and migration implementation.
      rationale: DL-09 locks semantic requirements; exact schema/code belongs to DL-02/I-01 and I-08.
      future_owner: DL-02-artifact-schemas / I-01-artifact-schemas-config / I-08-context-memory-drift
      allowed_now: true
      blocked_dependents:
        - I-08-context-memory-drift closure
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact CLI spelling, payloads, and exit/result behavior for context commands.
      rationale: CLI surface belongs to DL-07/I-02; observed DL-07 validation was not final PASS during this execution, so DL-09 cannot rely on it as clean.
      future_owner: DL-07-cli-primitives / I-02-cli-primitive-foundation / I-08-context-memory-drift
      allowed_now: true
      blocked_dependents:
        - CLI context command-family implementation
        - I-21/I-22 CLI-mediated context behavior if applicable
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact verification evidence packet format, failure taxonomy, and hard/advisory representation for drift checks.
      rationale: Owned by DL-10 and I-09; DL-09 defines required context/drift evidence only.
      future_owner: DL-10-verification-implementation / I-09-verification-runner-evidence-failure-routing
      allowed_now: true
      blocked_dependents:
        - I-08/I-21/I-22 context evidence closure where exact taxonomy is needed
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact bootstrap files and inference behavior from optional project brief.
      rationale: Owned by DL-17 and I-15; DL-09 only preserves storage and project-owned boundaries.
      future_owner: DL-17-bootstrap-context-generation / I-15-create-import-starter-UX
      allowed_now: true
      blocked_dependents:
        - create/import bootstrap context closure
      invalid_if_any_dependent_relies: true
    - deferred_question: Security/safety policy for sensitive context content and context mutations.
      rationale: Owned by DL-22 and security implementation lanes.
      future_owner: DL-22-security-safety-model / I-18-security-safety-hooks-policy
      allowed_now: true
      blocked_dependents:
        - security-sensitive context closure
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-09-context-memory-drift.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-09-context-memory-drift/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** except DL-09
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** except DL-09
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-09 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - production package/source paths
    - root config files
    - CI files
    - CLI source paths
    - context package source paths
    - schema implementation paths
    - generated starter files
    - source docs, strategy files, ledger/status, prompts, and non-owned reports
  handoff_notes:
    - from: DL-09
      to: I-08-context-memory-drift
      condition: After DL-09 validation passes and I-08 prerequisites are green.
      shared_path_policy: disjoint
    - from: DL-09
      to: I-15/I-21/I-22
      condition: These lanes consume context storage/retrieval/update/drift requirements after I-08 proof exists.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-08-context-memory-drift` — blocked until DL-09 is clean and schema/artifact prerequisites are implementable; must prove actual writer → graph/index/artifacts → validator/retriever.
- `I-15-create-import-starter-UX` — blocked for context bootstrap/create/import behavior until I-08 plus DL-17/create dependencies are green.
- `I-21-build-skill-orchestration` — blocked for automatic build context retrieval/update/drift behavior until I-08/I-09/runtime/skill prerequisites are clean.
- `I-22-ship-skill-orchestration` — blocked for final context preservation/drift checks until build/context/verification prerequisites are clean.
- `I-23-end-to-end-real-boundary-witness` — blocked until context seam is proven in earlier lanes and rerunnable in full flow.
- `DL-10-verification-implementation`, `DL-17-bootstrap-context-generation`, and `DL-22-security-safety-model` are related future owners for evidence/runner, bootstrap UX, and security/safety details; dependents relying on those details remain blocked.
- `DL-20B` and `DL-24B` must later audit DL-09 domain-neutrality and output/dependency compliance.

## Context storage decision

### Canonical locations

1. `.vibe/context/**` is the canonical durable context store for each repository.
2. `.vibe/context/index/**` holds generated graph/index artifacts and retrieval indexes.
3. `.vibe/context/areas/**` holds durable area context for repo, app, package, module, contract, adapter, test, standard, skill, schematic, decision, and work-item scopes.
4. `.vibe/context/summaries/**` holds derived summary/compression projections.
5. `.vibe/context/schema/**` is reserved for context-system schema/migration fixtures owned by `I-08`, coordinated with DL-02/I-01 artifact schemas.
6. `.vibe/work/**` holds Work Briefs, Implementation Plans, Build Results, Ship Packets, execution reports, validation reports, and lane work artifacts.
7. `.vibe/evidence/**` holds evidence artifacts where DL-10/I-09 chooses that path; otherwise Build/Ship artifacts must link to the evidence owner path.
8. Human docs under `docs/**` can explain architecture or standards, but docs are not a replacement for `.vibe/context/**` graph-indexed context.

### Harness core vs consuming project vs starter

- Harness-core context describes `vibe-engineer` packages, commands, schematics, skills, registry, verification, standards, adapters, and decisions using domain-neutral vocabulary.
- Consuming-project context is project-owned extension data. It may include project-specific vocabulary, but only under that project's `.vibe/context/**` or explicit extension paths and never as harness core policy.
- Generated starter context is sample/reference/project-initial context. It must be labeled as generated/sample/reference or project-owned according to DL-17/I-15 and must not be imported as harness core defaults.
- Decision and execution reports remain in `docs/decisions/**` and `.vibe/work/**`; context graph entries link to them by stable artifact/decision ids and paths.

## Context graph/index decision

### Minimal node categories

The graph/index must support at least these semantic node categories:

- repository, app, package, module, contract, adapter, test, standard, docs page;
- decision, ADR, Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet, Evidence Packet;
- context file/header, context summary, context index artifact;
- agent, skill, schematic, registry entry, generated asset;
- verification run/result, mechanical gate result, drift check result;
- owner/lane and dependency gate.

Exact schema field names are owned by DL-02/I-01/I-08. DL-09 locks the semantics and requires strict schema validation before a graph/index is trusted.

### Minimal edge categories

The graph/index must support at least:

- `contains` / `contained_by`;
- `owns` / `owned_by`;
- `depends_on` / `depended_on_by`;
- `implements` / `implemented_by`;
- `verifies` / `verified_by`;
- `evidence_for` / `has_evidence`;
- `derived_from`, `supersedes`, `superseded_by`;
- `context_for` / `has_context`;
- `generated_by`, `uses_schematic`, `uses_agent`, `uses_skill`;
- `references_decision`, `blocked_by`, `unblocks`;
- `updates`, `invalidates`, `drift_checked_by`;
- `source_citation_for`.

### Identity, versioning, and stale-link requirements

- Artifact nodes use DL-02 stable `artifactId` where available.
- Context nodes require stable context ids, scope kind, owner, source refs, update metadata, and drift metadata aligned with DL-02 ContextHeaderV1 semantics.
- File/path nodes must not rely on path alone when a stable artifact/context id exists. Path-only references are pending or untrusted unless explicitly modeled.
- Graph/index artifacts must include schema version, index version, producer, generation time, source set, and source fingerprints or version refs sufficient for stale-link detection.
- Migrations are explicit typed transformations; unsupported versions block trusted retrieval rather than falling back.
- A link to a missing, moved, superseded, or changed source must be classified as clean/stale/missing/mislinked/untrusted and must produce evidence.

## Retrieval and progressive disclosure decision

### Context closure construction

Every agent or skill that needs context must request or receive a task-specific closure derived from:

1. input artifact kind and id, such as Work Brief, Implementation Plan, Build Result, or Ship Packet;
2. skill/agent role and allowed action;
3. affected paths/areas from the plan or detected change;
4. required standards, decisions, schemas, agents, schematics, and verification layers;
5. dependency and dependent edges;
6. recent work/evidence relevant to the area;
7. explicit user/operator-provided project context when present.

The retriever returns a closure manifest/result, not an unbounded dump. The closure must list loaded nodes, omitted optional nodes, blocked/missing nodes, source citations, freshness status, and why each mandatory item is included.

### Progressive disclosure levels

- Level 0: identity and current task artifact summary with source ids.
- Level 1: mandatory context required for safe action: owned paths, relevant area contexts, locked decisions, schemas/protocols, standards, dependencies, and active blockers.
- Level 2: directly linked evidence, prior plans/builds/ships, verification history, and drift results.
- Level 3: broader related background and optional summaries.
- Level 4: full source expansion only when a lower level cites the source as necessary or a validator/debugger requests it.

Agents must not load everything by default. Missing Level 1 context blocks the action when it affects correctness, ownership, schema/protocol, verification, security, or domain-neutrality. Optional Level 2–4 material can be omitted only with a recorded rationale.

### Citation and anti-contamination rules

- Every retrieved summary must cite underlying graph nodes/artifacts/paths.
- An agent may summarize retrieved context for its own work, but downstream handoff must cite durable artifacts, not the agent's chat.
- Runtime/orchestration must pass only dependency-approved closures to specialists to prevent context contamination.
- A stale or untrusted context item may be shown as diagnostic evidence but not used as authoritative truth unless a later policy explicitly permits advisory use.

## Drift detection and update decision

### What creates drift

Context drift exists when any source-linked context claim is stale, missing, misleading, mislinked, unsupported by evidence, or no longer aligned with its governed source. Triggers include:

- file creation, deletion, move, or modification under a governed area;
- artifact status changes or supersession;
- decision changes or new decisions affecting an area;
- schema/version changes or migration requirements;
- package/module/contract/adapter dependency changes;
- verification/evidence result changes;
- generated schematic output changes;
- registry/agent/skill behavior changes;
- docs/standards changes;
- unresolved path ownership or dirty-tree conflict affecting context;
- summary source fingerprint changes.

### When checks run

- `build` must retrieve context before implementation, update context after changes, validate the graph/index, run drift checks, and record evidence in the Build Result.
- `ship` must run final context validation/drift checks, verify context preservation evidence, and record context status in the Ship Packet.
- Create/import/bootstrap must initialize or intentionally skip project context according to DL-17 while respecting DL-09 storage and graph rules.
- Low-level context index/validate/update capabilities may exist for agents/CI/debug, but normal users should not need to run them manually.
- `plan` owns context-closure requirements in the Implementation Plan; DL-09 does not move Verification Delta or planning responsibility into context storage.

### Blocking policy

Hard-blocking drift cases:

- required context for an affected area is missing;
- context header/index schema is invalid or unsupported;
- context claims a dependency/owner/decision/evidence link that is missing or contradicts source;
- summary is the only source for a load-bearing claim;
- a stale context item would affect implementation, verification, security, ownership, or domain-neutrality;
- context update cannot be written where build/ship requires it;
- drift checker cannot consume the actual graph/index artifacts.

Advisory drift cases:

- optional background summaries are stale but not used for decisions;
- docs/reference background needs refresh but no task-critical area depends on it;
- advisory review suggests context improvement without deterministic stale/missing proof.

Advisory findings must be recorded and may become blockers when the plan, verification decision, or task acceptance criteria says so.

### Update strategy

- Context updates are incremental, source-linked, and generated by the actual context writer in `I-08` or later build/ship consumers.
- Updates must preserve source ids, previous context history or supersession links, producer, reason, and evidence refs.
- A writer must not overwrite project-owned extension context from harness core unless the context owner and path policy allow it.
- Updates must invalidate dependent summaries and indexes before any consumer can treat them as current.
- If context cannot be updated safely, build/ship must stop blocked with exact paths, sources, and owner/ruling needed.

## Summary compression decision

- Compression is allowed only as a derived, source-linked projection stored under `.vibe/context/summaries/**` or an equivalent context-owned summary path.
- A summary must record the source node/artifact ids, source paths, source versions/fingerprints, producer, compression level, created/updated time, and validity status.
- A summary cannot be the sole source of truth for a load-bearing claim. Consumers must be able to expand to cited source nodes/artifacts.
- If any linked source changes, is missing, is superseded, or has unknown freshness, dependent summaries become stale/untrusted until regenerated.
- Compression must preserve decision outcomes, blockers, ownership, dependencies, evidence links, verification/drift status, and open questions. If it cannot preserve them within size limits, retrieval must keep the source in the closure rather than dropping information.
- Summaries must not infer unstated facts, resolve ambiguity, or normalize project-specific vocabulary into harness core.
- Maximum-size behavior is fail-closed: if a closure exceeds context budget, the retriever must disclose omitted optional context and block if mandatory context cannot fit without losing source citations.

## Cross-linking decision

The context graph must cross-link these relationships:

- code areas/packages/modules/contracts/adapters/tests ↔ owning context headers;
- context headers ↔ source files, docs, decisions, standards, and owners;
- Work Brief ↔ raw intent/source metadata ↔ Implementation Plan;
- Implementation Plan ↔ Verification Delta ↔ required context closure;
- Implementation Plan ↔ schematics expected/used;
- Build Result ↔ changed files ↔ Evidence Packets ↔ context updates/drift results;
- Ship Packet ↔ final Evidence Packets ↔ final context status;
- decisions/ADRs ↔ affected packages/modules/standards/context;
- agents/skills/registry entries ↔ input/output artifact schemas and context requirements;
- schematics/manifests ↔ generated files, context stubs, and verification expectations;
- verification results/mechanical gates ↔ affected artifacts/context nodes;
- generated starter/sample/demo context ↔ its label and boundary;
- consuming-project extension context ↔ extension owner and isolation from harness core.

A cross-link missing from a load-bearing seam is a validation failure unless it is explicitly pending with a blocked dependent.

## Verification/witness consequences

- deterministic checks affected: context header validation, graph/index schema validation, link resolution, stale/missing/mislinked context detection, summary invalidation, retrieval closure completeness, build/ship context update/drift checks.
- positive witnesses required downstream:
  - actual writer creates/updates context headers, area context, graph/index, and summaries under decided paths;
  - actual validator consumes those artifacts and reports clean;
  - actual retriever returns a task-specific closure with source citations;
  - build/ship paths record context update/drift evidence.
- negative witnesses required downstream:
  - missing required context blocks;
  - stale source fingerprint invalidates summary/index;
  - path-only/mislinked artifact is untrusted;
  - no-graph flat Markdown context is rejected as authoritative;
  - load-everything retrieval by default is rejected;
  - compression without source links or invalidation is rejected;
  - mocked/hand-authored-only context artifacts cannot close the seam.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet;
  - `plan` owns Verification Delta;
  - `build` and `ship` automatically run verification, evidence capture, context update, and drift checks;
  - domain-neutral core and sample/demo/project extension boundaries remain explicit.
- real_boundary_required: yes for later implementation; no live seam is created by this decision artifact itself.
- real_boundary_status: not_applicable for DL-09 decision artifact; required_before_closure for `I-08`, `I-15`, `I-21`, `I-22`, and `I-23`.
- earliest proof lane: `I-08-context-memory-drift`.
- later required seam:
  - Producer: actual context update/index writer implemented in `I-08` and later invoked by build/ship paths.
  - Carrier: on-disk context graph/index/artifacts and linked work/evidence artifacts under decided locations.
  - Consumer: actual context validator/drift checker/retriever, plus downstream build/ship or skill consumer where applicable.

## Ownership/path consequences

- Current DL-09 writes are limited to this decision artifact and the DL-09 work report.
- Future `I-08-context-memory-drift` owns `packages/context/**`, `.vibe/context/schema/**`, and `.vibe/work/I-08-context-memory-drift/**` per final strategy.
- Future context graph/index artifacts are written only by context/build/ship/create lanes that explicitly own those paths.
- `I-21` and `I-22` must invoke context update/drift behavior but do not own broad context package internals.
- Docs/reference changes belong to docs owner lanes; DL-09 does not authorize edits outside `docs/decisions/DL-09-context-memory-drift.md`.
- Shared/root/CLI paths require their own lane handoffs; DL-09 grants none.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected: core context package, graph/index concepts, context templates, retriever/updater prompts, generated starter context, consuming-project extension context, docs/reference examples, agent/schematic context requirements.
- surface classification:
  - context machinery and graph/index rules are core harness;
  - consuming-project context is project-owned extension data;
  - generated starter context is generated/sample/reference or project-owned bootstrap data, depending on DL-17/I-15 labels;
  - negative examples are documentation-only.
- allowed generic terms: apps, packages, modules, contracts, adapters, tests, standards, context, plans, verification, schematics, skills, agents, artifacts, evidence, decisions, graph, index, node, edge, owner, dependency, drift, summary, retrieval.
- forbidden project/business vocabulary in core: ecommerce, inventory, fashion, Billz, Telegram, Instagram, product catalog, shopping cart, customer order, checkout flow, or equivalent project-specific concepts. These may appear only as negative examples, project-owned extension data, or explicitly labeled sample/demo content.
- result: PASS for this decision artifact. No core context rule encodes a business model.
- future enforcement owners: `I-08` for context fixtures, `I-10`/mechanical lanes for governed-surface checks when assigned, `I-15` for starter boundary, `I-24` for docs labels, `DL-20B` for audit.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- shell/process commands used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none. Pre-write inventory showed no existing DL-09 decision artifact and no DL-09 work directory before the execution report was created. Visible sibling decision/work paths were read-only and disjoint.
- no production package source, root config, CI, CLI, context package, schema implementation, generated starter, source-doc, strategy, ledger/status, prompt, or git path was written.

## Deferral rationale

This decision is `LOCKED`; backlog §9 is resolved at the planning/requirements level. The following details are intentionally deferred to owner decisions/lanes and block only dependents that rely on them:

1. Exact graph/index/context-header schema fields and validators:
   - future_owner: `DL-02`/`I-01`/`I-08`.
   - blocked_dependents: `I-08` closure and any consumer that needs exact fields.
   - proof_no_dependent_relies_now: DL-09 defines semantic requirements; implementation remains blocked until validators exist.
2. Exact context CLI command spelling, payloads, output, and exit behavior:
   - future_owner: `DL-07`/`I-02`/`I-08`.
   - blocked_dependents: CLI context command-family implementation and CLI-mediated build/ship context flows.
   - proof_no_dependent_relies_now: DL-09 requires capabilities only and does not rely on non-clean DL-07 validation.
3. Exact evidence/failure taxonomy and runner integration:
   - future_owner: `DL-10`/`I-09`.
   - blocked_dependents: context evidence/failure routing and build/ship hard/advisory result rendering.
4. Exact create/import bootstrap context generation from optional project brief:
   - future_owner: `DL-17`/`I-15`.
   - blocked_dependents: create/import starter context UX.
5. Security/safety policy for sensitive context files and context mutation:
   - future_owner: `DL-22`/`I-18`.
   - blocked_dependents: any security-sensitive context storage, redaction, trust, destructive update, or external-operation behavior.

No dependent implementation may treat these deferred details as decided by DL-09.

## Evidence checklist

1. Execution report was created before this decision artifact and updated after source/dependency inspection.
2. Exact source files inspected are listed in the execution report and cited above by path/section.
3. Files changed are limited to:
   - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-09-context-memory-drift/DL-09-execution-report.md`;
   - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-09-context-memory-drift.md`.
4. No production/package/root/config/CI/generated starter/CLI/context/schema implementation files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
7. Backlog §9 is covered: context file location, graph/index format, work artifact storage, retrieval rules, progressive disclosure rules, drift detection, context update, summary compression, and cross-linking are resolved or owner-deferred with blocked dependents.
8. Artifacts-over-chat-history is preserved; raw chat is rejected as durable memory.
9. `build` and `ship` automatic context updates/drift checks are preserved.
10. Exact schema boundaries owned by DL-02 are respected; exact CLI details, verification taxonomy, bootstrap UX, and security policy are not silently decided.
11. Positive, negative, regression, and real-boundary witnesses are stated.
12. DL-20A domain-neutrality checklist is applied to core, sample/demo, and project-extension context boundaries.
13. Dirty-tree safety and path ownership are explicit.
14. Real-boundary proof is not falsely claimed by this decision artifact.

## Validation plan and severity policy

Independent Triad-B validation must inspect the actual changed/owned files and any available diff, not just this report.

### Positive witnesses

- Decision artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-09-context-memory-drift.md` and execution report exists at the required report path.
- Report-first ordering is evident.
- Artifact uses DL-24A output discipline and applies DL-20A domain-neutrality.
- Every backlog §9 research area is resolved or explicitly deferred/blocked.
- Downstream dependents include at least `I-08`, `I-15`, `I-21`, and `I-22`.
- Automatic build/ship context update/drift behavior and artifact-driven memory over chat history are preserved.
- Later real proof owners and producer/carrier/consumer seam are named.

### Negative witnesses

- A design relying on raw chat history as durable memory is rejected.
- A context design with no graph/index, no source links, or no stale-link/drift failure mode is rejected.
- A retrieval design that loads everything by default with no progressive disclosure is rejected.
- A compression design that allows summaries to replace source-cited truth without invalidation is rejected.
- A DL-09 artifact that silently decides exact schema fields, CLI command details, verification runner taxonomy, bootstrap UX, or security policy is rejected unless the owner decision is green and cited.
- Later implementation relying only on mocked/hand-authored context fixtures remains `pending-live/BLOCKED`.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- `build` and `ship` automatically run verification, evidence capture, context update, and drift checks.
- `plan` continues to own Verification Delta and context-closure requirements.
- Domain-neutral core remains preserved; sample/demo and consuming-project context boundaries remain explicit.
- `DL-24A`, `DL-20A`, `DL-20B`, and `DL-24B` roles remain uncontradicted.

### Sibling/blast-radius checks

- Check final strategy §§4–11 and §§14–18.
- Check README §§3.5, 4, 6, 9, 10, and 15.
- Check locked decisions §§6–8.
- Check verification-layer §§3.3, 3.4, 5.11, 8, 9, and 16.
- Check mechanical gates §§1 and 11.
- Check sibling decisions for owner-boundary contradictions, especially DL-02, DL-03, DL-04, DL-07, DL-10, DL-17, and DL-22.
- Confirm no non-owned decision/source/production/git paths were written.

### Severity policy

- `critical`: out-of-license write; missing report-first artifact; missing decision artifact; contradiction of locked decisions; missing DL-24A/DL-20A compliance; unbounded deferral relied on by dependents; no drift/update strategy; false live/real-boundary closure; no deterministic path for stale/missing context blocking where required; raw-chat durable memory accepted.
- `major-local`: incomplete backlog §9 coverage; unclear dependency on sibling decisions; incomplete witness plan; unclear later proof owner; insufficient domain-neutrality; ambiguous graph/index/retrieval/drift/compression requirements.
- `minor-local`: wording/citation clarity issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all schema, source, dependency, ownership, witness, domain-neutrality, and dirty-tree requirements satisfied.

## Known ambiguities / future owners

- `DL-02`/`I-01`: exact artifact schemas, ContextHeaderV1 fields, graph/index artifact schemas, validators, type generation, and migrations.
- `DL-03`: exact skill prompt/protocol integration with context closure requirements.
- `DL-04`/`I-03`: runtime context-contamination prevention and scheduler handoff of context closures.
- `DL-05`/`I-04`: registry metadata for agents' context requirements and validators.
- `DL-06`/`I-14`: selected harness context-file conventions and live adapter proof.
- `DL-07`/`I-02`: exact CLI command names, flags, payloads, and result/exit behavior for context capabilities; observed validation was not final PASS during this execution.
- `DL-08`/`I-07`: schematic-generated context stubs and context-file schematic behavior.
- `DL-10`/`I-09`: verification evidence packet, failure taxonomy, rerun, advisory/hard representation, and runner integration for context/drift checks.
- `DL-17`/`I-15`: bootstrap context generation from optional project brief or skipped brief.
- `DL-22`/`I-18`: security/safety for sensitive context content, trust, redaction, destructive updates, and command/file policy.
- `DL-20B` and `DL-24B`: later audits for domain-neutrality and cross-decision output compliance.
