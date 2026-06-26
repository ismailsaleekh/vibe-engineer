# DL-02 — Artifact Schemas

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-02 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-02-artifact-schemas/reports/decision-lock-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.1 `Harness repo package hypothesis`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`; §6 `Dependency DAG with scheduler gates`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity policy.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §9 `Severity gate and closure criteria check`; §10 `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§3.5–6 `Artifacts over chat history` and `Artifact model`; §§4–5 core workflow and skill responsibilities; §§9–10 verification and context requirements.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§6–11 skills, schematics, automatic verification/context, verification-layer decisions, and mechanical gates.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1–4 evidence, artifact flow, skill responsibilities, and Verification Delta; §§5, 11, 13–16 verification catalog, registry, config, blocking policy, and final invariant.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1, 5, 7, 11–13 mechanical doctrine, schema/contract strictness, wiring integrity, implementation priority, and final invariant.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §2 `Artifact schemas`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2 and 10 Triad B, evidence-bound validation, quality bar, and real-boundary truth.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-02-brief-validation.md` — `Verdict`; `Coverage matrix`; `Required validation plan`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

`vibe-engineer` v1 artifact contracts are strict, JSON-native, schema-versioned, runtime-validated, and type-generated. The canonical carrier for all load-bearing artifact data is UTF-8 JSON validated against JSON Schema 2020-12 in strict mode, with TypeScript types generated from the same schemas. Markdown, YAML, chat text, and TypeScript object literals may be generated as human projections or authoring conveniences only; they are not canonical carriers and are never accepted through heuristic or regex parsing for load-bearing handoffs.

The locked v1 schema catalog covers Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet, Evidence Packet, Agent Registry entry, Context file header, Schematic manifest, and Skill manifest. The artifact chain remains raw intent → Work Brief → Implementation Plan containing a machine-readable Verification Delta → Build Result plus Evidence Packet references → Ship Packet. Registry, context, schematic, and skill manifests are side-linked typed artifacts that must validate before their consumers may rely on them.

## Decision details

### Canonical schema technology and carrier

1. The normative schema language is JSON Schema 2020-12.
2. Runtime validation in `packages/artifacts` must use a strict JSON Schema validator. The v1 implementation owner should use Ajv in strict mode unless a later explicit decision replaces it with an equivalent strict JSON Schema 2020-12 validator; replacing it must preserve all behavior in this decision.
3. TypeScript types must be generated from the same canonical schemas or from a schema-authoring source that emits byte-equivalent committed JSON Schemas. Hand-authored TypeScript interfaces are not the source of truth.
4. Canonical artifact files are UTF-8 JSON objects with `additionalProperties: false` at every modeled object boundary except explicitly namespaced extension maps.
5. Unknown top-level fields are invalid. Extension data must live under `extensions` with a namespace key, its own `schemaVersion`, and no ability to satisfy required core fields.
6. Validation failure behavior is fail-closed: no silent fallback, no best-effort acceptance, no defaulting missing load-bearing fields, no unsupported-version acceptance, and no narrative evidence substituted for typed evidence.
7. Typed validation errors must include artifact path, artifact kind, schema id, schema version, JSON Pointer path, error code, and human-readable message. Errors themselves become evidence entries when used by verification or blockers.

### Common artifact envelope

Every artifact class except embedded `VerificationDeltaV1` uses this common envelope; `VerificationDeltaV1` uses the same identity/version/producer/link conventions inside the Implementation Plan.

Required common fields:

- `schemaVersion`: semantic version string; v1 locked value is `1.0.0`.
- `artifactKind`: one of `work_brief`, `implementation_plan`, `verification_delta`, `build_result`, `ship_packet`, `evidence_packet`, `agent_registry_entry`, `context_file_header`, `schematic_manifest`, `skill_manifest`.
- `artifactId`: stable globally unique string generated by the producing system; it must not change when the file path changes.
- `title`: concise domain-neutral title.
- `createdAt`: RFC 3339 UTC timestamp.
- `updatedAt`: RFC 3339 UTC timestamp.
- `producer`: object with `kind` (`skill`, `agent`, `cli`, `schematic`, `verification_runner`, `human_operator`, `system`), `id`, `name`, optional `version`, and optional `runId`.
- `status`: artifact-class-specific enum.
- `ownership`: object with `ownerLane`, `ownedWritePaths`, `readOnlyPaths`, `untouchablePaths`, `concurrencyNotes`, and optional `handoffPolicy`.
- `links`: typed array of artifact links.
- `extensions`: object map keyed by reverse-DNS or package-like namespace; each extension value must include `schemaVersion` and may not redefine core fields.

Required link shape:

- `rel`: enum from `raw_intent`, `derived_from`, `supersedes`, `superseded_by`, `implements`, `verifies`, `evidence_for`, `consumed_by`, `produced_by`, `context_for`, `registry_entry_for`, `manifest_for`, `verification_delta_of`, `build_result_of`, `ship_packet_of`.
- `artifactKind`: target artifact kind where known.
- `artifactId`: target artifact id where known.
- `path`: repository-relative or absolute path when the target is on disk.
- `required`: boolean.
- `statusAtLinkTime`: target status observed by the producer when linked.

Common optional fields:

- `description`.
- `tags`: domain-neutral string array.
- `sourceRefs`: links to source docs, prompts, issue URLs, or raw-intent records.
- `approvedBy`: producer-like object plus timestamp for approval gates.
- `supersessionReason`.
- `retention`: object for future storage policy; optional in v1 and non-authoritative until later storage decisions.

### Required status discipline

- A consumer must check both schema validity and artifact status before use.
- `build` accepts only an Implementation Plan with `status: approved`.
- `ship` accepts only a Build Result with `status: passed` unless a later security/ship decision explicitly defines a blocked handoff mode; it must never ship from `failed` or `blocked`.
- `plan` consumes Work Brief only; raw intent is not a valid substitute for a Work Brief.
- Narrative summaries may explain decisions but cannot replace required typed fields, links, or evidence references.

## Alternatives considered

### Pure JSON canonical artifacts

- decision: accepted
- rationale: JSON is portable, stable for on-disk validation, directly expressible through JSON Schema 2020-12, easy to consume from CLI/skills/CI, and avoids YAML/frontmatter ambiguity.
- consequences: human-readable rendering may be generated, but consumers validate JSON, not prose.

### Pure YAML artifacts

- decision: rejected
- rationale: YAML has ambiguous scalar coercions and multiple parser behaviors, which weakens strict runtime contracts and negative invalid-version witnesses.
- consequences: YAML may appear in docs snippets only, not as the v1 canonical carrier.

### Markdown with frontmatter

- decision: rejected as canonical; allowed only as generated projection
- rationale: Work Briefs and plans need human context, but load-bearing handoffs cannot depend on narrative parsing, regex extraction, or frontmatter conventions.
- consequences: if a Markdown view exists, it must be generated from validated JSON or explicitly marked non-authoritative.

### TypeScript-only objects/interfaces

- decision: rejected
- rationale: TypeScript types alone do not validate on-disk artifacts at runtime and do not provide language-neutral CLI/CI/schema evidence.
- consequences: TypeScript types are generated outputs, not the canonical contract.

### Hybrid carrier

- decision: accepted only as strict JSON canonical data plus optional projections/sidecars
- rationale: humans benefit from readable summaries, but machines need one typed source of truth.
- consequences: projections must link back to the canonical artifact id/version and must never be accepted as the source for a producer→consumer seam.

### Strict versus permissive versioning

- decision: strict versioning accepted; permissive fallback rejected
- rationale: downstream lanes must fail loudly on unsupported schema versions rather than silently accepting stale or future contracts.
- consequences: unsupported major, unknown minor without declared compatibility, missing version, or malformed version is a validation failure with typed evidence.

### Embedded versus referenced Evidence Packets

- decision: referenced Evidence Packets accepted; embedding rejected for canonical Build/Ship handoffs
- rationale: evidence can be large and multi-layered, and later verification/storage lanes need standalone packets with deterministic/advisory classification.
- consequences: Build Results and Ship Packets carry evidence references and summaries; the Evidence Packet is the canonical evidence artifact.

### Schema-library/runtime-validation options

- decision: JSON Schema 2020-12 plus strict runtime validator accepted; Zod-only/Valibot-only/TypeScript-only rejected as canonical
- rationale: artifact files are a cross-package, CLI, CI, registry, context, and skill boundary. JSON Schema is the portable contract. Ajv strict mode is the expected v1 validator implementation because it supports JSON Schema and fail-closed behavior.
- consequences: `I-01-artifact-schemas-config` may use a TypeScript schema builder internally only if the committed JSON Schema and generated types remain the audited source of truth.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy is safe for decision execution planning.
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision template, dependency format, evidence checklist, validation checklist, and dirty-tree policy.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies core/extension/sample-demo boundary and vocabulary policy for all artifact schemas.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, backlog, strategy, playbook, and validated DL-02 brief define artifact flow and proof requirements.
  blocks:
    - id: I-01-artifact-schemas-config
      reason: Needs this catalog to implement schema validators, migrations, generated types, and config consequences.
    - id: I-04-agent-registry-validation-meta
      reason: Needs Agent Registry entry schema and links to input/output artifact schemas.
    - id: I-05-input-skills-work-brief-vertical
      reason: Needs Work Brief schema and actual writer/plan-intake seam requirements.
    - id: I-06-plan-skill-verification-delta
      reason: Needs Implementation Plan and Verification Delta schema.
    - id: I-07-schematics-engine
      reason: Needs Schematic manifest schema.
    - id: I-08-context-memory-drift
      reason: Needs Context file header schema.
    - id: I-09-verification-runner-evidence-failure-routing
      reason: Needs Evidence Packet schema and deterministic/advisory result model.
    - id: I-14-pi-adapter-skill-consumption
      reason: Needs Skill manifest schema and selected-harness proof consequences.
    - id: I-21-build-skill-orchestration
      reason: Needs Build Result schema and evidence linkage.
    - id: I-22-ship-skill-orchestration
      reason: Needs Ship Packet schema and no-push handoff fields.
    - id: skills, CLI validation, context, verification, registry, schematic/skill manifest consumers
      reason: All consume or validate one or more DL-02 artifact classes.
  blocked_dependents:
    - id: DL-03-skill-protocols
      blocked_until: DL-02 schema contracts are locked.
      relying_on: Skill input/output artifact schemas and allowed schema references.
    - id: DL-05-agent-registry-validation-meta
      blocked_until: Agent Registry entry schema is locked.
      relying_on: Registry metadata and schema-reference fields.
    - id: DL-07-cli-primitives
      blocked_until: Canonical artifact carrier/validation behavior is locked.
      relying_on: CLI machine-readable validation/error output semantics.
    - id: DL-08-schematics-system
      blocked_until: Schematic manifest schema is locked.
      relying_on: Manifest identity/input/idempotency/conflict metadata.
    - id: DL-09-context-memory-drift
      blocked_until: Context file header schema is locked.
      relying_on: Header identity, drift, dependency, and update metadata.
    - id: DL-10-verification-implementation
      blocked_until: Verification Delta and Evidence Packet schemas are locked.
      relying_on: Evidence/failure taxonomy carrier fields.
    - id: DL-14-api-contract-mechanism
      blocked_until: Artifact schema strictness consequences are locked.
      relying_on: Boundary validation doctrine alignment.
    - id: DL-15-mechanical-engine
      blocked_until: Artifact validation and schema/contract strictness consequences are locked.
      relying_on: Mechanical gate schema strictness implications.
    - id: DL-22-security-safety-model
      blocked_until: Allowed/forbidden artifact validation failure behavior is locked.
      relying_on: Safe failure/error evidence fields.
  required_before_finalizing:
    - id: I-01-artifact-schemas-config
      required_content: Real validators/types/migrations for every DL-02 artifact class.
    - id: I-05/I-06/I-21/I-22
      required_content: Actual on-disk producer/carrier/consumer handoff witnesses.
    - id: I-04/I-07/I-08/I-09/I-14
      required_content: Actual registry/schematic/context/evidence/skill-manifest consumers accept valid artifacts and reject invalid ones.
  deferrals:
    - deferred_question: Exact file storage directories and naming templates for every artifact emitted by every skill.
      rationale: Storage layout belongs to DL-03 skill protocols, DL-07 CLI, DL-09 context, and implementation lanes; this decision locks schema/carrier/link contracts.
      future_owner: DL-03/DL-07/DL-09 and relevant I-* lanes
      allowed_now: true
      blocked_dependents:
        - any dependent attempting to finalize storage paths without its owner decision
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - docs/decisions/DL-02-artifact-schemas.md
    - .vibe/work/DL-02-artifact-schemas/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/**
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/**
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-02 owned paths
  untouchable_paths:
    - .git/**
    - package source paths
    - root config files
    - CI files
    - generated starter files
    - CLI source
    - schema package source
    - context/verification/registry/schematic package source
    - all non-DL-02 decision/report/work paths
  handoff_notes:
    - from: DL-02
      to: I-01-artifact-schemas-config
      condition: After DL-02 validation passes.
      shared_path_policy: disjoint
    - from: DL-02
      to: DL-03/DL-07/DL-08/DL-09/DL-10/DL-14/DL-15/DL-22
      condition: Later decisions may refine owned internals but must preserve DL-02 schema contracts.
      shared_path_policy: disjoint
```

## Blocked dependents

Until this decision is independently validated, these dependents remain blocked or unable to close:

- `I-01-artifact-schemas-config`.
- Skill lanes: `I-05`, `I-06`, `I-21`, `I-22`, and `DL-03`.
- CLI validation and primitive lanes: `DL-07`, `I-02`, and later command consumers.
- Context lanes: `DL-09`, `I-08`, `I-21`, `I-22`.
- Verification lanes: `DL-10`, `I-09`, `I-20`, `I-21`, `I-22`.
- Registry lanes: `DL-05`, `I-04`.
- Schematic manifest consumers: `DL-08`, `I-07`.
- Skill manifest/adapter consumers: `DL-06`, `I-14`.
- Contract/mechanical/security decisions that rely on strict schema behavior: `DL-14`, `DL-15`, `DL-22`.
- Audits: `DL-20B`, `DL-24B`, and final bughunt must confirm this decision is preserved.

## Artifact schema catalog

### Work Brief

- purpose and owner/producer: Captures normalized user intent. Produced by `brainstorm`, `grill-me`, or `task`; may be created by a human/operator importer only if it validates as the same schema.
- canonical carrier/format: UTF-8 JSON object, usually stored as `work-brief.json` or a storage-owner equivalent; Markdown summaries are projections only.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/work-brief.schema.json`, `WorkBriefV1`.
- required fields:
  - common envelope fields with `artifactKind: work_brief`.
  - `status`: `draft | ready | blocked | superseded`.
  - `sourceSkill`: `brainstorm | grill-me | task`.
  - `workType`: `feature | bug | chore | refactor | research | decision`.
  - `background`: string.
  - `problemOrOpportunity`: string.
  - `desiredOutcome`: string.
  - `constraints`: array of strings.
  - `userVisibleBehavior`: array of strings.
  - `nonGoals`: array of strings.
  - `risksAndUnknowns`: array of strings.
  - `acceptanceNotes`: array of objects with `id`, `description`, optional `candidateScenarioRefs`.
  - `sourceMetadata`: object with `rawIntentRefs`, `conversationRefs`, `operatorRefs`, and optional `inputTimestamp`.
- optional fields:
  - `observedBehavior`, `expectedBehavior`, `reproductionSteps`, `logsOrErrors`, `affectedSurface`, `suspectedCause`, and `urgency` for bug-shaped work.
  - `candidateE2ECases`, `candidateUIStates`, `openQuestions`, `assumptions`, `relatedArtifacts`.
- links to predecessor/successor/evidence:
  - Must link to raw intent/source metadata with `rel: raw_intent` where a source exists.
  - Successor Implementation Plans link back with `rel: derived_from` and `artifactKind: work_brief`.
  - Evidence links are optional at Work Brief stage and must be advisory/source-only if present.
- version/migration fields: `schemaVersion` required; unsupported versions reject before planning.
- validation requirements and failure behavior: `plan` intake must reject missing title/type/sourceSkill/background/outcome/link fields; no skill-specific divergent Work Brief schemas are allowed.
- domain-neutrality notes: Core fields use generic work/verification vocabulary only. Project/business terms may appear only as user-supplied content or extension data, not required core fields.
- downstream consumers and proof owners: `plan` intake in `I-05/I-06`; schema validators/types in `I-01`; CLI/context consumers in later lanes.

### Implementation Plan

- purpose and owner/producer: Converts an approved Work Brief into an actionable, verifiable plan. Produced by `plan` only.
- canonical carrier/format: UTF-8 JSON object, `implementation-plan.json` or storage-owner equivalent.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/implementation-plan.schema.json`, `ImplementationPlanV1`.
- required fields:
  - common envelope fields with `artifactKind: implementation_plan`.
  - `status`: `draft | approved | blocked | superseded`.
  - `workBriefRef`: required link to a `WorkBriefV1` with acceptable status.
  - `objective`: string.
  - `scope`: array of strings.
  - `nonScope`: array of strings.
  - `contextClosure`: array of context/artifact references required before build.
  - `affectedAreas`: array of objects with `kind` (`app | package | module | contract | adapter | test | docs | context | schematic | skill | other`), `path`, and `reason`.
  - `schematics`: array of planned schematic refs/usages.
  - `implementationSteps`: ordered array with `id`, `description`, optional `dependsOn`, expected touched areas, and acceptance links.
  - `acceptanceCriteria`: array with stable ids and descriptions.
  - `definitionOfDone`: array of typed checklist items.
  - `risks`: array of risk/sensitive-area objects.
  - `openBlockers`: array with `id`, `description`, `blocking`, and owner.
  - `verificationDelta`: full embedded `VerificationDeltaV1` object.
- optional fields:
  - `workDecompositionHints`, `parallelismHints`, `docsContextUpdatesExpected`, `approval`, `reviewNotes`.
- links:
  - Must link to exactly one Work Brief as predecessor.
  - Must include `verificationDelta.artifactId` and link relation `verification_delta_of` inside the embedded delta.
  - Build Results link to the Implementation Plan using `rel: implements` / `build_result_of`.
- version/migration fields: plan and embedded delta each carry `schemaVersion`. A plan is invalid if plan and delta schemas are incompatible.
- validation/failure behavior: `build` intake must reject any plan not `approved`, any missing Work Brief link, any missing Verification Delta catalog evaluation, or any unresolved blocking open blocker.
- domain-neutrality notes: Affected areas use generic harness surface kinds. Project-specific names may be data values only.
- downstream consumers/proof owners: `build` intake in `I-06/I-21`, schema/types in `I-01`, verification implementation in `I-09/I-10+`.

### Verification Delta

- purpose and owner/producer: Machine-readable statement of verification work required by the plan. Produced by `plan` and embedded in `ImplementationPlanV1`.
- canonical carrier/format: JSON object using the same canonical JSON validation; embedded in Implementation Plan. A standalone file may be emitted only as a duplicate validated artifact linked to the plan; consumers read through the approved plan unless a later storage decision explicitly permits otherwise.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/verification-delta.schema.json`, `VerificationDeltaV1`.
- required fields:
  - `schemaVersion`, `artifactKind: verification_delta`, `artifactId`, `createdAt`, `updatedAt`, `producer`, `status`.
  - `status`: `complete | blocked | superseded`.
  - `summary`: string.
  - `implementationPlanRef`: link to enclosing or standalone Implementation Plan.
  - `sensitiveAreas`: array of strings or typed area refs.
  - `catalogVersion`: string identifying the verification catalog version used.
  - `requiredItems`: array containing every applicable catalog item.
  - Each `requiredItems[]` entry requires `id`, `layer`, `action`, `rationale`, `expectedArtifacts`, `blocking`, `validationOwner`, `fixerOwner`, and `evidenceRequired`.
  - `action`: `add | update | reuse | not_applicable | blocked`.
  - `blocking`: boolean; blocked items require `blockedBy` and `unblockCondition`.
- optional fields:
  - `mechanicalGateImpacts`, `advisoryReviewItems`, `rerunHints`, `riskLinks`.
- links:
  - Links to Work Brief through the enclosing plan; links to expected Evidence Packets via `evidenceRequired` descriptors.
- version/migration fields: `catalogVersion` and `schemaVersion` required. Unknown catalog items or missing catalog categories are validation failures unless explicitly marked `not_applicable` with rationale.
- validation/failure behavior: Silent skipped verification catalog categories are invalid. `not_applicable` requires rationale. `blocked` requires blocking owner/condition.
- domain-neutrality notes: Layers and catalog ids describe generic verification surfaces, not business domains.
- downstream consumers/proof owners: `I-06` planner, `I-09` verification runner, `I-21` build orchestration, `I-01` schema validation.

### Build Result

- purpose and owner/producer: Records implementation outcome, changed-file summary, verification assets, command results, context updates, and blockers. Produced by `build` only after consuming an approved Implementation Plan.
- canonical carrier/format: UTF-8 JSON object.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/build-result.schema.json`, `BuildResultV1`.
- required fields:
  - common envelope fields with `artifactKind: build_result`.
  - `status`: `passed | failed | blocked | superseded`.
  - `implementationPlanRef`: required link to approved Implementation Plan.
  - `implementationSummary`: string.
  - `changedFilesSummary`: array with `path`, `changeKind` (`created | modified | deleted | moved | unchanged_validated`), `ownerLane`, and summary.
  - `schematicsUsed`: array with schematic manifest refs, input refs, dry-run/conflict status, and output paths.
  - `testsAndVerificationChanged`: array of added/updated/reused verification assets.
  - `verificationRuns`: array of Evidence Packet refs plus result summary.
  - `warningsAndBlockers`: array with `severity` (`critical | major-local | minor-local | advisory`), `blocking`, owner, and evidence ref.
  - `contextDocsUpdates`: array of context/header refs and docs updates.
  - `finalStatusReason`: string.
- optional fields:
  - `iterationHistory`, `fixAttempts`, `parallelWorkPackages`, `remainingFollowUps`, `advisoryFindings`.
- links:
  - Must link to exactly one approved Implementation Plan.
  - Must reference Evidence Packet artifacts for every verification claim.
  - Ship Packet links back with `rel: derived_from` or `ship_packet_of`.
- version/migration fields: `schemaVersion` required; build consumers reject unsupported versions.
- validation/failure behavior: Narrative claims without Evidence Packet refs are invalid for verification status. `passed` is invalid when any deterministic blocking evidence failed or is missing.
- domain-neutrality notes: Changed areas and summaries use generic module/package/contract/test vocabulary.
- downstream consumers/proof owners: `ship` intake in `I-21/I-22`, verification/evidence in `I-09`, context in `I-08`, schema in `I-01`.

### Ship Packet

- purpose and owner/producer: Final handoff that records final verification, context preservation, commit/PR preparation material, release/migration notes, reviewer notes, and explicit no-push semantics. Produced by `ship` only.
- canonical carrier/format: UTF-8 JSON object.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/ship-packet.schema.json`, `ShipPacketV1`.
- required fields:
  - common envelope fields with `artifactKind: ship_packet`.
  - `status`: `ready_for_review | blocked | superseded | approved_for_operator_action`.
  - `buildResultRef`: required link to `BuildResultV1`.
  - `finalVerification`: array of Evidence Packet refs and summaries.
  - `contextPreservation`: object with context header refs, drift-check evidence refs, and update status.
  - `commitPreparation`: object with `suggestedCommitMessage`, optional `commitBody`, and `commitPerformedByAgent: false`.
  - `prPreparation`: object with `suggestedTitle`, `suggestedBody`, `reviewerNotes`, and `prOpenedByAgent: false`.
  - `releaseOrMigrationNotes`: array; empty array allowed with rationale.
  - `followUps`: array with owner and blocking/non-blocking classification.
  - `noPushWithoutApproval`: literal `true`.
- optional fields:
  - `operatorApprovalRef`, `rollbackNotes`, `knownAdvisoryWarnings`, `artifactBundleRefs`.
- links:
  - Must link to Build Result and final Evidence Packets.
  - Must not claim verification without evidence refs.
- version/migration fields: `schemaVersion` required.
- validation/failure behavior: Any packet with `commitPerformedByAgent: true`, `prOpenedByAgent: true`, or missing `noPushWithoutApproval: true` is invalid in v1 unless a later explicit operator-owned decision changes the policy.
- domain-neutrality notes: Release/migration notes describe generic technical changes; project-specific semantics live in consuming-project content only.
- downstream consumers/proof owners: final DoD/schema checks in `I-22/I-23`, CI/context verification in `I-20/I-08`, schema in `I-01`.

### Evidence Packet

- purpose and owner/producer: Canonical record of deterministic and advisory evidence. Produced by verification runner, build, ship, validators, or tools.
- canonical carrier/format: UTF-8 JSON object; standalone artifact referenced by Build Result and Ship Packet.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/evidence-packet.schema.json`, `EvidencePacketV1`.
- required fields:
  - common envelope fields with `artifactKind: evidence_packet`.
  - `status`: `passed | failed | blocked | advisory_warning | not_run | superseded`.
  - `evidenceClass`: `deterministic | advisory | informational`.
  - `layer`: verification layer enum including `safety_hooks`, `typecheck`, `lint_format`, `mechanical_gate`, `unit`, `integration`, `contract_adapter`, `e2e`, `ui_verification`, `ai_eval`, `build_package`, `context_drift`, `observability`, `advisory_review`, `final_dod`, `schema_validation`.
  - `subjectRefs`: links to plan/build/ship/artifacts/files being evaluated.
  - `commandOrTool`: object with `kind` (`command | tool | validator | agent | manual_operator`), `name`, optional `argv`, version, working directory, and environment summary.
  - `startedAt`, `endedAt`: RFC 3339 UTC timestamps.
  - `exitStatus`: object with `kind` (`exit_code | tool_status | not_applicable`), `code` or `status`.
  - `result`: `pass | fail | blocked | advisory | skipped`.
  - `blocking`: boolean.
  - `artifacts`: array of output artifact paths/refs.
  - `warnings`: array.
  - `failureDetails`: required when result is `fail` or `blocked`.
- optional fields:
  - `stdoutRef`, `stderrRef`, `logsRef`, `screenshots`, `traces`, `metrics`, `rerunOf`, `normalizationNotes`.
- links:
  - Must link to the artifact it proves via `evidence_for`.
  - Build/Ship/Verification Delta reference Evidence Packets by id/path.
- version/migration fields: `schemaVersion` required; evidence readers reject unsupported versions.
- validation/failure behavior: Deterministic evidence with `result: fail` and `blocking: true` hard-blocks dependent `passed` statuses. Advisory evidence cannot be the sole hard blocker unless promoted by task-specific criteria recorded in the plan.
- domain-neutrality notes: Evidence layers are generic; command output may contain project data only as observed subject content.
- downstream consumers/proof owners: `I-09` verification runner, `I-21/I-22` build/ship, `I-20` CI, validators, `I-01` schemas.

### Agent Registry entry

- purpose and owner/producer: Declares an agent/skill/meta-agent so registry consumers can validate identity, triggers, schemas, tools, context needs, paths, safety, maturity, owner, evals, and deprecation. Produced by registry/agent owners.
- canonical carrier/format: UTF-8 JSON object.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/agent-registry-entry.schema.json`, `AgentRegistryEntryV1`.
- required fields:
  - common envelope fields with `artifactKind: agent_registry_entry`.
  - `status`: `active | disabled | deprecated | experimental`.
  - `agentId`, `displayName`.
  - `agentType`: `orchestrator | specialist | validator | fixer | reviewer | meta | skill_adapter`.
  - `purpose`: string.
  - `triggers`: array of typed trigger descriptors.
  - `inputSchemas`: array of schema refs to DL-02 or later schema ids.
  - `outputSchemas`: array of schema refs.
  - `allowedTools`: array of tool/action ids.
  - `forbiddenActions`: array of action ids/descriptions.
  - `contextRequirements`: array of context/header refs or retrieval requirements.
  - `expectedArtifactPaths`: array of path descriptors.
  - `safety`: object with `parallelSafe`, `writesAllowed`, `requiresApprovalFor`, and optional `maxIterations`.
  - `validatorRefs`, `fixerRefs`: arrays or explicit empty arrays.
  - `maturity`: `experimental | stable | core`.
  - `owner`: string/object.
  - `agentVersion`: semver string.
  - `evals`: array of eval/smoke test refs.
  - `deprecation`: object or null.
- optional fields:
  - `runtimeCostClass`, `examples`, `changelog`, `selectedHarnessAdapters`, `domainNeutralityReview`.
- links:
  - Links to skill manifests when the agent implements a skill; links to schema artifacts for input/output.
- version/migration fields: `schemaVersion` and `agentVersion` required.
- validation/failure behavior: Missing schema refs, allowed/forbidden actions, validator/fixer link validation, or orphaned references are invalid.
- domain-neutrality notes: Core entries must pass DL-20A vocabulary rules; project-specific agents must be clearly extension-owned.
- downstream consumers/proof owners: `I-04` registry validation, `I-14` adapter, `I-21` build orchestration, `I-01` schemas.

### Context file header

- purpose and owner/producer: Typed header metadata for context files so context retrievers can determine identity, scope, ownership, dependencies, verification status, update/drift status, and related artifacts. Produced by context writers, build, ship, or schematics.
- canonical carrier/format: JSON object `ContextHeaderV1`. If a context body is Markdown or another human format, the canonical header must be a JSON sidecar or a JSON `header` member parsed by a typed JSON parser; Markdown/YAML frontmatter is not the load-bearing header.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/context-file-header.schema.json`, `ContextHeaderV1`.
- required fields:
  - common envelope fields with `artifactKind: context_file_header`.
  - `status`: `current | stale | needs_review | deprecated`.
  - `contextId`.
  - `scope`: object with `kind` (`repo | app | package | module | contract | adapter | test | standard | skill | schematic | decision | work_item | other`), `paths`, and `description`.
  - `owner`: lane/team/agent id.
  - `dependencies`: array of typed refs.
  - `dependents`: array of typed refs.
  - `relatedDecisions`: array of decision refs.
  - `relatedPlansArtifacts`: array of artifact refs.
  - `verificationMetadata`: object with last validation evidence refs and status.
  - `updateMetadata`: object with `lastReviewedAt`, `lastUpdatedBy`, `updateReason`.
  - `driftMetadata`: object with `driftStatus` (`unknown | clean | suspected | confirmed`), `lastDriftCheckAt`, and evidence refs.
- optional fields:
  - `retrievalHints`, `summary`, `standardsRefs`, `ttl`, `replacementRef`.
- links:
  - Links to decisions/plans/build/ship/evidence and governed paths.
- version/migration fields: `schemaVersion` required; stale unsupported headers are invalid for trusted retrieval.
- validation/failure behavior: Missing identity/scope/owner/dependency/update/drift fields rejects context as authoritative; consumers may show it as untrusted only if explicitly modeled.
- domain-neutrality notes: Scope kinds are generic harness surfaces.
- downstream consumers/proof owners: `DL-09/I-08` context engine, `I-21/I-22` build/ship context updates, `I-01` schemas.

### Schematic manifest

- purpose and owner/producer: Declares deterministic generator identity, inputs, generated paths, idempotency/conflict/dry-run behavior, tests/context obligations, domain-neutrality, and ownership. Produced by schematic owners.
- canonical carrier/format: UTF-8 JSON object.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/schematic-manifest.schema.json`, `SchematicManifestV1`.
- required fields:
  - common envelope fields with `artifactKind: schematic_manifest`.
  - `status`: `active | deprecated | experimental | disabled`.
  - `schematicId`, `schematicVersion`, `purpose`.
  - `inputs`: array with name, schema, required flag, defaults policy, and domain-neutrality classification.
  - `generatedPaths`: array with path template, ownership, conflict policy, and generated/vendor/operator-owned classification.
  - `idempotency`: object with strategy, stable identifiers, and rerun behavior.
  - `conflictBehavior`: `fail | merge_with_typed_strategy | skip_if_identical`.
  - `dryRunBehavior`: object requiring planned changes without writes.
  - `requiredTests`: array of test/evidence requirements.
  - `contextUpdates`: array of context header obligations.
  - `domainNeutrality`: object with `coreSurface`, allowed generic terms, and extension boundaries.
  - `owner`: string/object.
- optional fields:
  - `examples`, `fixtures`, `deprecation`, `changelog`, `adapterRequirements`.
- links:
  - Links to generated artifact schemas, context headers, and evidence requirements.
- version/migration fields: `schemaVersion` and `schematicVersion` required.
- validation/failure behavior: Missing input/output schema refs, missing conflict/dry-run/idempotency behavior, or unlabeled project-specific defaults are invalid.
- domain-neutrality notes: Core schematics must generate generic names/slots; project-specific values only enter as validated inputs or extension content.
- downstream consumers/proof owners: `DL-08/I-07` schematic engine, `I-15` create/import, `I-01` schemas, `DL-20B` audit.

### Skill manifest

- purpose and owner/producer: Declares a skill's identity, artifact inputs/outputs, allowed/forbidden actions, blocking behavior, subagent relationships, storage/handoff contract, selected-harness hooks, and versioning. Produced by skill/adaptor owners.
- canonical carrier/format: UTF-8 JSON object.
- schema identifier/name: `https://schemas.vibe-engineer.dev/artifacts/v1/skill-manifest.schema.json`, `SkillManifestV1`.
- required fields:
  - common envelope fields with `artifactKind: skill_manifest`.
  - `status`: `active | deprecated | experimental | disabled`.
  - `skillId`: `brainstorm | grill-me | task | plan | build | ship` for core v1 skills.
  - `skillVersion`: semver string.
  - `purpose`: string.
  - `inputArtifactSchemas`: array of schema refs; may be empty only for raw-intent producing skills.
  - `outputArtifactSchemas`: array of schema refs.
  - `allowedActions`: array.
  - `forbiddenActions`: array.
  - `clarifyingQuestionPolicy`: object describing when to ask versus proceed.
  - `blockingPolicy`: object describing when to stop as blocked.
  - `subagentRelationships`: array of agent registry refs and roles (`orchestrator | specialist | validator | fixer | reviewer | meta`).
  - `validatorFixerPolicy`: object with max iterations and required independent validation.
  - `storageHandoffContract`: object with artifact refs, write paths delegated by later storage decisions, and next-skill handoff constraints.
  - `selectedHarnessIntegrationHooks`: array of adapter hook refs or explicit empty array.
  - `owner`: string/object.
- optional fields:
  - `examples`, `evals`, `changelog`, `deprecation`, `securityNotes`, `contextRequirements`.
- links:
  - Links to Agent Registry entries, input/output artifact schemas, context headers, and evidence requirements.
- version/migration fields: `schemaVersion` and `skillVersion` required.
- validation/failure behavior: Missing input/output schema refs, forbidden action policy, blocking/clarifying behavior, or handoff contract invalidates the manifest.
- domain-neutrality notes: Core skill prompts/manifests use generic harness vocabulary and locked skill names only.
- downstream consumers/proof owners: `DL-03/I-05/I-06/I-21/I-22`, `DL-06/I-14` selected harness adapter, `I-04` registry, `I-01` schemas.

## Cross-artifact linking model

1. Raw intent is captured as source metadata and cannot be consumed directly by `plan`.
2. `brainstorm`, `grill-me`, or `task` produces exactly one canonical `WorkBriefV1` per normalized work item. Multiple drafts may exist only through `supersedes`/`superseded_by` links; the planner consumes a `ready` Work Brief.
3. `plan` consumes a Work Brief only and produces an `ImplementationPlanV1` with an embedded `VerificationDeltaV1` that evaluates the verification catalog item by item.
4. `build` consumes an `approved` Implementation Plan only, performs implementation plus verification work, writes standalone `EvidencePacketV1` artifacts for commands/tools/runs, and writes a `BuildResultV1` that references those Evidence Packets.
5. `ship` consumes a `passed` Build Result only, runs final verification/context checks, writes any final Evidence Packets, and writes a `ShipPacketV1` with commit/PR preparation material and `noPushWithoutApproval: true`.
6. Agent Registry entries side-link to Skill manifests and input/output schemas.
7. Skill manifests side-link to core artifact schemas and selected harness integration hooks.
8. Schematic manifests side-link to generated paths, context header obligations, tests, and evidence requirements.
9. Context file headers side-link to decisions, plans, build/ship artifacts, affected paths, dependencies/dependents, and drift evidence.
10. Links are by stable `artifactId` plus path when available. Consumers must treat path-only links as incomplete unless the artifact id is not yet generated and the field explicitly permits pending resolution.

## Versioning and migrations

- V1 schema versions are `1.0.0` for every artifact class.
- Major versions are incompatible by default. A v1 consumer must reject `2.x.x` or `0.x.x` artifacts unless an explicit migration has run and produced a new valid v1 artifact.
- Minor versions may add optional fields only when the schema declares backward compatibility. Consumers must reject unknown minor versions unless `packages/artifacts` has an explicit compatibility table entry.
- Patch versions may clarify constraints without changing accepted data shape.
- Future migrations are owned by `packages/artifacts` in `I-01` and by later explicit migration/update lanes. They must be typed, evidence-producing transformations from one schema version to another.
- No silent migration is allowed during normal consumption. If a migration is needed, the consumer returns a typed unsupported-version/migration-required error and records evidence.
- Migration outputs must preserve `artifactId` only when semantics remain the same; otherwise they must create a new artifact with `derived_from`/`supersedes` links.

## Validation and type-generation consequences

`I-01-artifact-schemas-config` must implement these consequences without inventing new schema contracts:

1. Commit or generate canonical JSON Schemas for all ten DL-02 artifact classes.
2. Generate TypeScript types from the same schemas and make schema/type drift a test failure.
3. Provide runtime validators that accept valid on-disk JSON artifacts and reject invalid artifacts for all ten classes.
4. Provide typed validation errors with JSON Pointer paths and stable error codes.
5. Enforce `additionalProperties: false` except extension maps.
6. Enforce schema version and artifact kind before consumer-specific validation.
7. Enforce link shape and required predecessor/successor links.
8. Expose fixture/witness sets containing valid and invalid examples for every artifact class.
9. Reject heuristic parsing, regex extraction from Markdown/YAML/chat text, and TypeScript-interface-only validation as load-bearing mechanisms.
10. Align mechanical schema/contract strictness gates with generated artifact validation: generated artifact files are boundary data and must be validated before use.

## Verification/witness consequences

- deterministic checks affected: schema validation, type generation drift checks, artifact link validation, version/unsupported-version rejection, registry/context/schematic/skill manifest validation, verification/evidence consistency checks.
- positive witnesses required downstream:
  - `I-01`: actual validator accepts valid on-disk JSON artifacts for all ten classes.
  - `I-05`: actual `brainstorm`/`grill-me`/`task` writers produce Work Briefs consumed by actual plan intake.
  - `I-06`: actual `plan` consumes Work Brief and writes Implementation Plan with complete machine-readable Verification Delta consumed by build intake/schema validator.
  - `I-21`: actual `build` consumes Implementation Plan and writes Build Result plus Evidence Packet refs consumed by ship intake.
  - `I-22`: actual `ship` consumes Build Result/Evidence and writes Ship Packet consumed by final DoD/schema checks.
  - `I-04`: actual registry consumer loads valid Agent Registry entries.
  - `I-07`: actual schematic runner/validator consumes Schematic manifests.
  - `I-08`: actual context writer/retriever consumes Context headers and detects drift metadata.
  - `I-09`: actual verification runner writes Evidence Packets consumed by build/ship/CI failure routing.
  - `I-14`: actual selected-harness adapter consumes Skill manifests, or marks live proof `pending-live/BLOCKED` if unavailable.
- negative witnesses required downstream:
  - Missing artifact kind, schema version, stable id, required predecessor link, or required evidence ref is rejected.
  - Unsupported major/minor versions are rejected without fallback.
  - Verification Delta missing a catalog category is rejected.
  - Build Result/Ship Packet narrative claims without Evidence Packet refs are rejected.
  - Evidence Packet that cannot distinguish deterministic hard blockers from advisory review is rejected.
  - Agent/Skill/Schematic manifests without schema refs or allowed/forbidden actions are rejected.
  - Context headers missing scope/owner/drift/update metadata are rejected as authoritative context.
- regression witnesses required downstream:
  - Product/package/CLI name remains `vibe-engineer`.
  - Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
  - Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
  - `plan` consumes Work Brief only and owns Verification Delta.
  - `build` consumes approved Implementation Plan only and records verification/evidence/context.
  - `ship` consumes Build Result only, runs final checks, prepares commit/PR material, and does not push without approval.
- real_boundary_required: no for this decision artifact itself; yes for downstream implementation seams.
- real_boundary_status: not_applicable for DL-02 decision closure; required_before_closure for the listed downstream implementation lanes.
- if no live seam: this decision defines schemas only and does not implement validators, writers, consumers, commands, or adapters.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-02-artifact-schemas/**`
- read_only_paths:
  - source docs and orchestration artifacts in `/Users/lizavasilyeva/work/harness-starter/**`;
  - prior decisions and validation reports for `DL-24A` and `DL-20A`;
  - target repo inventory outside DL-02 owned paths.
- untouchable_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.git/**`;
  - production package/source/root config/CI/generated starter paths;
  - CLI/source/schema/context/verification/registry/schematic package paths;
  - all non-DL-02 decision/report/work paths.
- serialized/shared ownership notes: none for DL-02. Later implementation lanes own disjoint package paths and must record handoffs if they need shared/root paths.

## Domain-neutrality check

- DL-20A status consulted: green/LOCKED/PASS.
- governed surfaces affected: core artifact schemas, registry entries, context headers, schematic manifests, skill manifests, validation errors, examples/fixtures in future `I-01`.
- surface classification: core harness schema decision.
- permitted generic terms: apps, packages, modules, contracts, adapters, tests, standards, context, plans, verification, schematics, skills, agents, artifacts, evidence, registry, CLI, config, docs.
- project/business terms: none used as required schema fields. Any future consuming-project vocabulary belongs in user-supplied artifact content or explicit extension metadata and must not become required core defaults.
- extension boundary: only `extensions` accepts namespaced project-specific metadata; it cannot satisfy required core fields.
- sample/demo boundary: future fixtures/examples must be labeled sample/demo/reference and replaceable.
- enforcement owner: `I-01` schema fixtures plus `DL-20B` audit; `I-04/I-07/I-14/I-24` validate their manifests/docs/prompts where applicable.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- shell/process commands used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none in DL-02 owned decision path or report path. Target inventory shows unrelated concurrent decision-owned paths for other `DL-*` items, which are disjoint and not touched by this lane.
- production/root/config/CI/package/generated starter writes: none.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Narrow non-blocking implementation/storage details assigned to future owners:

- deferred_question: Exact artifact storage directory templates and file naming for every skill/CLI command.
- reason_now: Storage layout and command UX belong to `DL-03`, `DL-07`, `DL-09`, and implementation lanes. DL-02 locks carrier/schema/link/version requirements needed by `I-01`.
- future_owner: `DL-03`, `DL-07`, `DL-09`, `I-01`, `I-05`, `I-06`, `I-21`, `I-22`.
- required_before_finalizing: any dependent that claims concrete storage paths.
- blocked_dependents: only dependents attempting to finalize path layout without their owner decision.
- proof_no_dependent_relies_now: `I-01` can implement schemas/validators/types from this decision without exact skill storage paths; skill/CLI/context lanes remain blocked on their own path/protocol decisions before closing.

No schema class, required field family, versioning rule, validation behavior, or link model is deferred.

## Evidence checklist

1. Report artifact was created first at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-02-artifact-schemas/reports/decision-lock-execution-report.md`.
2. Source files inspected are listed in the execution report and cited above by path/section.
3. Files changed are this decision artifact and the DL-02 execution report only.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
7. No unresolved schema field relied on by `I-01`, skills, CLI, context, verification, registry, or schematics is deferred.
8. All ten required artifact classes have catalog sections with carrier, schema id, fields, status/enums, links, versions, validation behavior, domain-neutrality notes, consumers, and proof owners.
9. Cross-artifact linking from raw intent through Ship Packet is explicit.
10. Versioning, migrations, unsupported-version handling, and no-silent-fallback behavior are explicit.
11. Validation/type-generation consequences identify JSON Schema 2020-12, strict runtime validation, generated TypeScript types, and invalid-artifact witnesses.
12. Real-boundary status is stated: not applicable for this decision itself; required for downstream implementation seams.
13. DL-20A domain-neutrality rules are applied.
14. Locked decisions remain uncontradicted: `vibe-engineer`, six skills, artifact flow, Verification Delta, automatic verification/context, registry validation, mechanical gates, and no push/PR without approval.

## Validation plan and severity policy

Independent Triad-B validation must inspect the actual changed/owned files and available inventory/diff evidence, not only this report.

### Positive witnesses

- Report exists and predates the decision artifact.
- Decision artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md`.
- Status/output class is DL-24A-compatible and exactly one output class is used.
- All ten artifact classes have concrete schema catalog sections.
- Work Brief → Implementation Plan → Verification Delta → Build Result → Evidence Packet → Ship Packet link model is explicit.
- Registry entry, context header, schematic manifest, and skill manifest are included and not silently deferred.
- `I-01` can implement validators/types without inventing schema classes, versions, carriers, core fields, or validation failure behavior.
- Domain-neutrality uses generic core vocabulary.

### Negative witnesses

- Missing any required artifact class is critical.
- Accepting unknown/invalid artifact versions silently is critical.
- Missing stable id/version/link semantics for Work Brief/Plan/Build/Ship is critical.
- Verification Delta that can skip catalog categories silently is critical.
- Build Result or Ship Packet narrative verification without Evidence Packet refs is critical.
- Evidence Packet that cannot distinguish deterministic blockers from advisory review is critical.
- Registry/Skill/Schematic manifests lacking input/output schema refs or allowed/forbidden actions are critical.
- Any load-bearing parsing plan based on heuristic text/regex rather than typed JSON schema validation is critical.
- Any deferred schema field relied on by `I-01`, skills, CLI, context, verification, registry, or schematics is critical.
- Core schema/examples leaking project-specific business vocabulary violate DL-20A unless clearly negative-example/sample-demo-labeled.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- `plan` consumes Work Brief only and produces machine-readable Verification Delta.
- `build` consumes approved Implementation Plan only and records verification/evidence/context.
- `ship` consumes Build Result only, runs final checks, prepares commit/PR material, and does not push without approval.
- Fixed starter stack/E2E, automatic verification/context, agent registry validation, and mechanical gate families remain uncontradicted.
- DL-24A output discipline, DL-20A domain-neutrality, DL-20B audit, and DL-24B audit roles remain intact.

### Sibling/blast-radius checks

- Check final strategy §§3–11 and §§17–19 for consistency.
- Check README artifact model and skill sections for field coverage.
- Check verification-layer Verification Delta, evidence, agent registry, blocking policy, and final invariant sections.
- Check mechanical gates schema/contract strictness and wiring doctrine for schema consequences.
- Confirm DL-02 does not over-decide full skill protocols, CLI UX, context storage engine, verification runner internals, API contract mechanism, mechanical implementation, or security policy.
- Confirm only `docs/decisions/DL-02-artifact-schemas.md` and `.vibe/work/DL-02-artifact-schemas/**` changed for this lane.

### Severity policy

- `critical`: missing prerequisite; source/locked-decision contradiction; out-of-license write; production implementation; missing required artifact class; schema system relies on heuristic parsing/silent fallback; invalid deferral relied on by dependents; no versioning/linking model; false real-boundary closure; domain-neutrality violation.
- `major-local`: incomplete field catalog, unclear owner handoff, insufficient validation/type-generation consequence, or missing witness design limited to DL-02 paths.
- `minor-local`: wording/citation/table clarity issue that does not weaken schema gates or unblock dependents incorrectly.
- `clean`: all schema, source, ownership, dependency, domain-neutrality, and witness requirements satisfied.

## Known ambiguities / future owners

No blocking ambiguity remains for DL-02. Future owners must preserve these handoffs:

- `I-01-artifact-schemas-config`: implement JSON Schemas, strict validators, generated TypeScript types, migrations, fixtures, positive/negative/regression tests, and real on-disk validation witnesses.
- `DL-03` and skill implementation lanes: define full skill protocols, prompt behavior, storage paths, and handoff UX while using DL-02 schemas.
- `DL-07`: define CLI command surface/output contracts while invoking DL-02 validators and errors.
- `DL-08/I-07`: decide schematic engine internals while preserving `SchematicManifestV1` contract.
- `DL-09/I-08`: decide context graph/storage/retrieval while preserving `ContextHeaderV1` contract.
- `DL-10/I-09`: decide verification runner internals/failure taxonomy while preserving `VerificationDeltaV1` and `EvidencePacketV1` contracts.
- `DL-14`: decide API contract mechanism without weakening artifact schema validation.
- `DL-15`: wire mechanical schema/contract strictness to generated artifact validation.
- `DL-22`: define security/safety policy without allowing unsafe artifact fallback behavior.
- `DL-20B/DL-24B`: audit domain-neutrality and decision-output compliance across decisions.
