# DL-08 — Schematics System

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-08 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-08-schematics-system.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-08-schematics-system/reports/decision-lock-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.1 `Harness repo package hypothesis`; §5.2 `Decision-lock table`; §6.2 `Implementation DAG`; §8 `Pass sizing and allocation`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity policy.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §8 `Coverage by product surface`; §9 `Severity gate and closure criteria check`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Findings`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Findings`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-01-repo-package-structure.md` — `Decision summary`; `Package and publishability table`; `Starter consumption model` (read-only parallel decision artifact present during final inventory; independent validation not observed by this lane).
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md` — `Decision summary`; `Schematic manifest`; `Validation and type-generation consequences`; `Known ambiguities / future owners` (read-only parallel decision artifact present during final inventory; independent validation not observed by this lane).
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-03-skill-protocols.md` — `Shared protocol rules`; `Handoff contracts`; `Known ambiguities / future owners` (read-only parallel decision artifact present during final inventory; independent validation not observed by this lane).
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-04-orchestration-runtime.md` — `Decision summary`; `Runtime scope and non-scope`; `Orchestration state model requirements`; `Known ambiguities / future owners` (read-only parallel decision artifact present during final inventory; independent validation not observed by this lane).
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-05-agent-registry-validation-meta.md` — `Decision summary`; `Meta-agent policy`; `Project-specific extension model`; `Verification/witness consequences` (read-only parallel decision artifact present during final inventory; independent validation not observed by this lane).
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-06-agentic-harness-integrations.md` — `Decision summary`; `Common harness adapter abstraction`; `Pi v1 integration decision`; `Blocked dependents` (read-only parallel decision artifact present during final inventory; independent validation not observed by this lane).
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` — `Decision summary`; `CLI surface matrix`; `Machine-readable output and error contract`; `Known ambiguities / future owners` (read-only parallel decision artifact present during final inventory; independent validation not observed by this lane).
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §1 `Product vision`; §3.1 `Domain-neutral core`; §3.2 `User interacts with skills, not low-level tooling`; §3.3 `Schematics are not skills`; §3.4 `Verification/context updates are automatic`; §7 `CLI role`; §8 `Schematics`; §10 `Context preservation and retrieval`; §15 `Success criteria`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §7 `Schematics are internal/agent-facing`; §8 `Verification and context updates are automatic`; §11 `Mechanical verification gates`.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §8 `Schematics system`; §2 `Artifact schemas`; §7 `CLI primitive design`; §§11, 15–17, 20–22 related dependent decisions.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§5.3a, 5.11, 7, 12.3 for mechanical/context planning and schematic-gap detection.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§2, 5, 7, 9, 11–13 for governed surfaces, schema/contract strictness, wiring integrity, test quality, and mechanical-gate priority.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2 and 10 for Triad discipline, evidence-bound validation, dirty-tree safety, and real-boundary truth.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger.md` and `status.md` — concurrency context only.

## Decision summary

The v1 schematics system is a deterministic, typed, manifest-driven, agent-facing generator system. Schematics are not normal user-facing skills; normal users continue to operate through `brainstorm`, `grill-me`, `task`, `plan`, `build`, and `ship`.

DL-08 locks the schematic API semantics, manifest fields, template engine, typed inputs, idempotency, dry-run, conflict behavior, extension boundaries, and proof obligations. Exact global artifact encoding remains compatible with `DL-02`; exact CLI command names/options remain compatible with `DL-07`; starter-specific template content waits for `DL-16`/`DL-17` and related decisions. No dependent implementation may finalize until those sibling-owned exact contracts exist where required.

## Decision details

1. A schematic is a registered generator definition containing a manifest, typed input schema, templates/assets, and a deterministic planner that produces a typed file-operation plan.
2. Schematics are invoked by agents/skills/orchestrators or low-level CLI primitives. They are not one of the six user-facing skills and must not be marketed as the normal user workflow.
3. Core schematics must be domain-neutral. Project-specific values may enter only as typed inputs at consuming-project extension or generated-starter boundaries.
4. Every schematic run has two phases:
   - `plan`: validate/normalize inputs, load manifest/templates, inspect existing target files, and emit a machine-readable operation/conflict/verification/context plan.
   - `apply`: execute the already computed plan with the same input/manifest/template versions, aborting if the target filesystem no longer matches the plan preconditions.
5. Dry-run is the default proof surface for agents and validators. It must perform no filesystem writes and must emit the same operation/conflict model that apply would use.
6. V1 conflict policy is fail-closed. No schematic may overwrite or semantically merge handwritten/unowned content. Generated content may be replaced only when generated ownership is proven by exact structured generated markers or by create-only same-content no-op rules.
7. V1 template rendering uses a logic-light Mustache engine and schema-validated variables; no arbitrary code execution, shell interpolation, model calls, network calls, time/random input, or heuristic/regex production substitution is allowed.
8. Schematics must generate verification/context/docs stubs where applicable, but they do not replace `build`/`ship` automatic verification/context duties.
9. Where parallel sibling decision artifacts are present but not yet independently validated, DL-08 treats them as read-only consistency inputs, not as green prerequisites. DL-08 currently conforms to DL-01 package naming for `packages/schematics` / `@vibe-engineer/schematics`, DL-02 canonical JSON `SchematicManifestV1` carrier semantics, DL-03 skill-vs-schematic boundaries, DL-04 durable orchestration/ownership/conflict requirements, DL-05 registry/extension/meta-agent safety direction, DL-06 pi-first adapter/generated-asset boundaries, and DL-07 `vibe-engineer schematic run <schematic-id>` CLI primitive requirements without relying on their unvalidated status for closure.

## Alternatives considered

### Generic text replacement or regex generator

- decision: rejected
- rationale: Regex/text replacement is not a typed contract and cannot safely prove manifest/input/schema/path ownership. It violates the quality bar for load-bearing producer→consumer seams.
- consequences: Text scanning may support diagnostics/tests only; production generation must use typed manifests, typed inputs, templates, exact path operations, and structured generated markers.

### Ad-hoc handwritten scaffolding by agents

- decision: rejected
- rationale: The product vision requires agents to use schematics instead of inventing repetitive structure. Handwritten scaffolding causes drift, weakens idempotency, and blocks later schematic-gap detection.
- consequences: Agents may fill domain-specific implementation after a schematic creates structure, but they must not hand-author repeatable core scaffolds when a schematic exists.

### One-off CLI commands without manifests

- decision: rejected
- rationale: Commands without manifests cannot expose touched paths, idempotency, conflict rules, verification expectations, context/docs stubs, domain-neutrality class, or extension boundaries to validators.
- consequences: Every built-in or project-owned schematic must have a manifest. CLI commands are only invocation surfaces.

### Template engine options

- decision: accepted option is Mustache (`mustache` npm package semantics) with strict DL-08 constraints.
- rejected: EJS/Eta/JS-evaluable templates because they execute arbitrary JavaScript and blur generation logic with code.
- rejected: Handlebars with custom helpers as the default because helpers can become hidden logic unless heavily constrained.
- rationale: Mustache is logic-light, agent-readable, deterministic, and adequate when all branching/list data and case conversions are prepared as typed normalized variables before rendering.
- consequences: Core templates may use Mustache variables, sections, inverted sections, and partials only. Triple-mustache/raw insertion is forbidden in core templates unless a future security decision explicitly permits a target-specific escaped value class.

### Strict conflict-fail vs overwrite/merge strategies

- decision: strict fail-closed is accepted for v1.
- rejected: implicit overwrite, best-effort merge, AST merge by default, or append-to-unknown-file.
- rationale: Dirty-tree safety and multi-orchestrator operation require schematics to preserve handwritten and unowned work.
- consequences: Existing different content is a conflict unless generated ownership and exact marker/version rules permit replacement. Semantic merge strategies may be researched later but cannot be required by I-07/I-15 v1 closure.

### All-in v1 schematic set vs minimal v1 with deferred built-ins

- decision: minimal but representative v1 built-ins are accepted for `I-07`; starter-heavy built-ins are blocked on their owning decisions.
- rationale: `I-07` is ≤6h and can split engine/built-ins if risky. It must prove the engine with representative code/test/context/docs generation before create/starter lanes depend on it.
- consequences: `I-07` cannot close with zero built-ins, but `I-15` starter/create cannot rely on app/API/UI/E2E template content until the sibling decisions that own starter/test/contract/UI/context details are locked.

## Schematic scope and initial set

| Candidate schematic | Classification | Rationale / blocked dependents |
| --- | --- | --- |
| `module` | v1 required for `I-07` | Generic core structural proof. Must create code stub, test stub, and context/docs stub in a lane-owned fixture. |
| `contract` | v1 required for `I-07` | Proves typed/schema boundary generation and schema/contract strictness hooks. Exact contract library remains with `DL-14`; `I-07` uses generic placeholder contract semantics until reconciled. |
| `adapter` | v1 required for `I-07` unless split built-ins are formally separated | Proves extension/integration shell generation without business vocabulary. Adapter-specific live integrations remain with `DL-06`/`I-14`. |
| `test-fixture` | v1 required for `I-07` | Proves generated tests are meaningful, normalized, and not smoke-only. Exact runner choices remain with `DL-11`. |
| `context-file` | v1 required for `I-07` | Proves context/docs stub generation and later context consumer expectations. Exact context graph/storage remains with `DL-09`/`I-08`. |
| `standard-doc` | v1 required for `I-07` | Proves docs/standards stubs with domain-neutral labels. Public docs system remains with `DL-21`. |
| `package` | v1 deferred until repo/package decisions are available; required before package scaffolding consumers close | Exact package layout/public names belong to `DL-01`; implementation must block if it needs package schematic content before DL-01/I-00 resolve paths. |
| `app` | v1 deferred until starter architecture is available; required before create/starter closure | Exact generated app layout belongs to `DL-16` and create/import UX to `I-15`. |
| `API endpoint` | deferred built-in content | Requires `DL-14` contract mechanism, `DL-16` starter architecture, and `DL-11` test tooling before final template content. |
| `UI feature shell` | deferred built-in content | Requires `DL-13` UI verification and `DL-16` starter architecture. |
| `E2E spec shell` | deferred built-in content | Requires `DL-11`, `DL-12`, `DL-13`, and starter layout decisions. |
| `UI verification shell` | deferred built-in content | Requires `DL-13` and verification implementation details. |
| `skill scaffold` | deferred built-in content | Requires `DL-03` skill protocols and registry decisions. |
| `agent scaffold` | deferred built-in content | Requires `DL-05` registry/agent validation and adapter decisions. |
| Domain-specific business schematics | out-of-scope for core | Allowed only as project-owned extensions or labeled sample/demo fixtures; never core defaults. |

The v1 required set is intentionally representative: it forces the engine to prove code, tests, context/docs, schema-like contracts, adapters, manifests, dry-run, idempotency, conflicts, and domain-neutrality without pretending starter-specific choices are already locked.

## Schematic API and execution model

A schematic definition has this conceptual TypeScript shape; exact package names are owned by implementation lanes, but these fields are normative:

```ts
type SchematicDefinition<Input, NormalizedInput> = {
  manifest: SchematicManifest;
  inputSchema: RuntimeSchema<Input>;
  normalize(input: Input, context: SchematicContext): NormalizedInput;
  plan(input: NormalizedInput, context: SchematicContext): SchematicOperationPlan;
};
```

Execution requirements:

- Invocation inputs:
  - schematic id and optional version/range;
  - target project root;
  - typed input object;
  - mode: `dry-run` or `apply`;
  - output format request, with machine-readable JSON required;
  - optional agent/work artifact references for provenance;
  - explicit project-owned extension registry path when invoking non-core schematics.
- Invocation outputs:
  - normalized input object;
  - resolved manifest id/version/source;
  - ordered file operation plan;
  - conflict list;
  - idempotency classification for each operation;
  - generated artifact type list;
  - verification expectations;
  - context/docs stub expectations;
  - domain-neutrality classification;
  - apply result with written/skipped/failed operations when mode is `apply`.
- File operation model:
  - `create_file`: create a missing file; existing same bytes is `noop`; existing different bytes is conflict.
  - `replace_generated_file`: replace only when exact generated marker and expected previous content/hash/version preconditions match.
  - `create_directory`: create directory if missing; existing directory is `noop`; existing file at directory path is conflict.
  - `replace_marked_section`: replace only a generated section bounded by exact structured generated markers owned by the same schematic/block.
  - `report_stale_generated`: report generated artifacts no longer produced; v1 must not delete by default.
- Agents/skills call schematics through the future CLI/engine surface owned by `DL-07`/`I-07`; they must consume the JSON plan/result rather than scraping human text.
- The planner must sort operations deterministically by explicit dependency then path. Apply must execute in plan order and stop on first failed precondition without partial hidden fallback.

## Manifest format

DL-08 locks schematic manifest semantics and now conforms to the parallel DL-02 artifact decision if that artifact validates clean. The canonical v1 carrier is `SchematicManifestV1`: a UTF-8 JSON object validated by JSON Schema 2020-12, with the DL-02 common envelope (`schemaVersion`, `artifactKind: schematic_manifest`, `artifactId`, timestamps, producer, status, ownership, links, and namespaced `extensions`). Markdown/YAML examples are documentation only, not load-bearing carriers.

Required DL-08 semantics must be represented in DL-02-compatible fields as follows:

```json
{
  "schemaVersion": "1.0.0",
  "artifactKind": "schematic_manifest",
  "schematicId": "core.module",
  "schematicVersion": "<semver>",
  "purpose": "<domain-neutral description>",
  "status": "active | deprecated | experimental | disabled",
  "inputs": [
    {
      "name": "<input name>",
      "schema": "<JSON Schema/runtime schema ref>",
      "required": true,
      "defaultsPolicy": "declared-only",
      "domainNeutralityClassification": "core | project_extension | sample_demo"
    }
  ],
  "generatedPaths": [
    {
      "pathTemplate": "<relative target path template>",
      "ownership": "generated | create_only | context_stub | docs_stub",
      "conflictPolicy": "hard_fail_unless_identical_or_owned_generated_marker",
      "classification": "core | project_extension | sample_demo"
    }
  ],
  "idempotency": {
    "strategy": "noop_when_same_input_templates_and_existing_generated_content",
    "stableIdentifiers": ["schematicId", "schematicVersion", "blockId", "inputFingerprint", "templateFingerprint"],
    "rerunBehavior": "create_missing_noop_same_replace_owned_generated_report_stale"
  },
  "conflictBehavior": "fail",
  "dryRunBehavior": {
    "supported": true,
    "writesFilesystem": false,
    "machineReadableOperationPlanRequired": true
  },
  "requiredTests": ["positive", "negative", "regression", "idempotency", "conflict", "domain-neutrality"],
  "contextUpdates": ["context-header-or-stub-obligations"],
  "domainNeutrality": {
    "coreSurface": true,
    "allowedGenericTerms": ["module", "contract", "adapter", "schema", "test", "context", "docs"],
    "extensionBoundaries": ["project_extension", "sample_demo"]
  },
  "owner": "<owning package or project extension owner>",
  "extensions": {
    "dev.vibe-engineer.schematics.dl08": {
      "schemaVersion": "1.0.0",
      "templateRoots": ["<manifest-relative template directory>"],
      "partials": [],
      "operationKinds": ["create_file", "replace_generated_file", "create_directory", "replace_marked_section", "report_stale_generated"],
      "touchedPathPatterns": [],
      "forbiddenPathPatterns": [],
      "generatedArtifactTypes": ["code", "test", "fixture", "context", "docs", "standard", "config", "registry_entry"],
      "generatedMarkerRequiredForUpdates": true,
      "overwriteAllowedByDefault": false,
      "semanticMergeAllowedInV1": false,
      "projectOwned": false,
      "coreDefault": true,
      "requiresExplicitRegistration": true,
      "securitySafety": { "noNetwork": true, "noShell": true, "deterministicOnly": true }
    }
  }
}
```

Compatibility with `DL-02`:

- `DL-02` owns canonical JSON carrier, envelope, schema ids, JSON Schema 2020-12 validation, versioning, links, and validator/type-generation mechanics.
- `DL-08` owns the additional schematic semantics that must fit inside `SchematicManifestV1` core fields or namespaced extensions without weakening DL-02 strictness.
- `I-07` cannot finalize manifest validators until `I-01` can validate an on-disk `SchematicManifestV1` with these DL-08 semantics.
- If DL-02 validation later rejects the namespaced extension layout above, `I-01`/`I-07` must route a compatibility fix before closure; they may not drop manifest/conflict/idempotency/dry-run/domain-neutrality requirements.

## Template engine and variable/input system

Accepted template engine:

- Core v1 uses Mustache semantics via the `mustache` npm package or a strictly compatible renderer selected by `I-07`.
- Allowed template features: variables, sections, inverted sections, partials, comments.
- Forbidden in core templates: arbitrary JavaScript, shell evaluation, network/model calls, filesystem reads from templates, dynamic partial paths from untrusted input, helper-defined hidden logic, raw triple-mustache insertion, and regex-driven substitution as a production contract.

Variable/input rules:

- Every schematic has a required input schema. Input validation fails before planning when required fields are missing, unknown fields are disallowed by the schema, or values do not satisfy type/range/pattern constraints.
- Defaults must be declared in the input schema or manifest. No default may be inferred from a project business domain.
- Name normalization is deterministic and typed. The engine computes normalized values such as `kebabName`, `camelName`, `pascalName`, `constantName`, `pathSegment`, and `humanTitle` from explicit input fields using one implementation-owned normalizer.
- Templates may only reference the normalized variable bag. They may not perform case conversion or path construction themselves.
- Path variables must be validated as relative, normalized, within target root, and not matching forbidden path patterns.
- Core schematic variables may use generic terms such as app, package, module, contract, adapter, schema, validator, rule, standard, context, evidence, registry, schematic, skill, agent, fixture, test, E2E, UI verification, and mechanical gate.
- Core schematic variables must not assume ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout/product/customer-order-like models, or any consuming-project business concept.
- Project-specific values are allowed only when the manifest visibility is `project_extension` or `sample_demo`, or when a starter boundary explicitly receives typed project input. They must remain outside core defaults.

## Idempotency rules

Acceptance criteria for idempotency:

1. Same schematic id/version, same normalized input, same templates, and unchanged target generated files must produce an operation plan where every previously applied operation is `noop`.
2. Re-running after a partially failed apply must recompute from disk and only apply operations whose preconditions are satisfied; it must not assume prior progress from memory.
3. Generated files or sections that can be updated must contain exact structured generated markers. The marker records at least schematic id, schematic version, generated block id, normalized input fingerprint, and template/content fingerprint.
4. Existing same bytes at a create-only path is `noop` even if unmarked. Existing different bytes at that path is conflict.
5. Existing marked generated content with matching owner/block and expected prior fingerprint may be replaced deterministically.
6. Existing marked generated content with mismatched owner, version incompatibility, unknown block, missing fingerprint, or edited content is conflict unless a future migration schematic explicitly owns the migration.
7. V1 must not delete stale generated files by default. It reports `stale_generated` with path, marker, and recommended future owner.
8. Append behavior is allowed only through `replace_marked_section` with exact markers. Appending to arbitrary handwritten files is forbidden.
9. Stable formatting is required: output file ordering, newline style, generated timestamps, random IDs, and snapshot values must be deterministic. Timestamps/randomness are forbidden in generated core output unless supplied as explicit typed input and documented in the manifest.

## Dry-run behavior

Dry-run requirements:

- Dry-run performs no filesystem writes, including no marker, lockfile, cache, evidence, or context writes.
- Dry-run may read the target filesystem under declared touched/read patterns to classify existing files and conflicts.
- Dry-run emits machine-readable JSON with this minimum envelope:

```yaml
status: ok | conflicts | invalid_input | blocked
schematic:
  id: <id>
  version: <version>
  manifest_path: <path or package ref>
mode: dry-run
normalized_input: <schema-valid object>
operations:
  - op_id: <stable id>
    kind: create_file | replace_generated_file | create_directory | replace_marked_section | report_stale_generated
    path: <relative target path>
    artifact_type: <code|test|context|docs|...>
    action: create | replace | noop | conflict | report_only
    content_hash_before: <hash|null|unavailable>
    content_hash_after: <hash|null>
    marker: <expected marker metadata|null>
    preconditions: []
conflicts:
  - path: <relative target path>
    reason: existing_different_unmarked | generated_marker_mismatch | forbidden_path | outside_root | invalid_input | stale_generated_requires_migration
    severity: hard_fail
verification_preview:
  expected_tests: []
  expected_validators: []
context_docs_preview:
  expected_context_stubs: []
  expected_docs_stubs: []
domain_neutrality:
  classification: core | project_extension | sample_demo
  findings: []
```

- Human-readable summaries are allowed only in addition to the machine-readable output and must not be the parse contract.
- Apply mode must be able to reference a dry-run plan fingerprint and fail if manifest/templates/inputs/filesystem preconditions changed.

## Conflict behavior and dirty-tree safety

Conflict policy is fail-closed:

- Any path outside the target root is a hard failure.
- Any path not declared by the manifest touched path patterns is a hard failure.
- Any path matching a manifest forbidden path pattern is a hard failure.
- Existing different unmarked content is handwritten/unowned and must not be overwritten.
- Existing generated markers from another schematic, package, project extension, or incompatible version are conflicts.
- Hidden merge, heuristic patching, fuzzy marker search, and semantic merge are forbidden in v1.
- Apply must stop on conflicts before writing any operation that depends on the conflicted path.
- A stale dry-run/apply precondition is a hard failure, not a prompt to regenerate silently.
- A dirty ambient tree is normal. Schematics preserve unrelated work through path ownership, manifest touched patterns, exact markers, and hard-fail conflicts.

Generated markers:

- Required for any file or section a schematic may later replace.
- Must be exact and structured, with a parser owned by the schematic engine; no fuzzy/heuristic marker detection.
- File types that cannot safely carry markers may be create-only in v1 or must store generated ownership in a DL-02/DL-09-compatible sidecar decided before implementation closure.

STOP cases for implementation lanes:

- Manifest schema cannot represent required fields.
- CLI cannot emit machine-readable dry-run/apply output.
- Template engine cannot be constrained to deterministic no-code execution.
- Conflict policy would require overwriting handwritten/unowned files.
- Domain-specific core output is required by a built-in schematic.
- A live CLI/engine witness cannot run in `I-07`; closure must be `pending-live/BLOCKED`.

## Tests and evidence requirements

`I-07` and later schematic consumers must provide these witnesses in lane-owned fixtures/evidence:

### Positive witnesses

- Valid `module` schematic manifest validates, dry-runs, applies to an empty fixture, generates code/test/context/docs stubs, and repeat-run is all `noop`.
- Valid `contract` schematic manifest validates and generates typed contract/schema-like stub plus a test stub consumed by the selected validator/test path when available.
- A representative manifest maps to typed inputs → normalized variables → dry-run operation plan → apply write plan → verification/context expectations without missing fields.
- Project-owned extension schematic registers only through explicit extension config and is not a core default.

### Negative witnesses

- Invalid input schema fails before planning.
- Unknown manifest field or missing required manifest field fails schema validation once `DL-02` encoding exists.
- Existing different unmarked file causes hard conflict and no overwrite.
- Existing generated marker mismatch causes hard conflict.
- Dry-run that writes any file fails.
- Core schematic output containing forbidden business-domain concepts fails unless negative-example/sample-demo labeled per `DL-20A`.
- A template attempting arbitrary code/helper/shell/network/time/random behavior fails validation.
- A weak generated test with only smoke/exit-code assertion is rejected by test anti-pattern expectations when that gate is available.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six user-facing skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- `build` and `ship` remain responsible for automatic verification/context/evidence; schematics only emit expected stubs and previews.
- Fixed starter stack/E2E decisions are not contradicted.
- Mechanical gate families remain intact and are not replaced by schematic tests alone.

### Real-boundary witnesses

- `I-07` must run the actual schematic engine/CLI command against a lane-owned fixture.
- The producer is an actual on-disk manifest/template registered in `packages/schematics/**`.
- The carrier is typed input plus on-disk manifest/template plus generated operation plan/output files.
- The consumer is actual validator/test/context/schema consumers available in the lane.
- Fake/mock/synthetic fixture success is not final proof.

## How schematics generate code + tests + context/docs stubs without becoming user-facing skills

- Schematics create structure and stubs only; they do not decide product intent, acceptance criteria, risk, or final implementation detail.
- `plan` may list required schematics in the Implementation Plan.
- `build` agents may invoke schematics to create consistent structure, then fill implementation and verification assets according to the approved plan.
- `build` and `ship` still run verification, drift checks, evidence capture, and context updates automatically.
- Generated context/docs stubs must identify ownership, dependencies, verification expectations, and TODO slots for agents; they must not become a substitute for real context updates.
- Generated tests must contain meaningful acceptance/regression placeholders tied to generic harness concepts; smoke-only test generation is forbidden.

## Extension model for project-owned schematics

- Project-owned schematics are allowed only through explicit extension registration in a future config/registry surface.
- Project-owned manifests use the same manifest/input/dry-run/conflict/idempotency contracts as core manifests.
- Project-owned schematics may contain consuming-project vocabulary because they are outside harness core, but they must declare `visibility: project_extension` and `project_owned: true`.
- Project-owned schematics cannot be bundled as core defaults, imported by core packages as policy, or silently selected by core skills.
- Sample/demo schematics must declare `visibility: sample_demo`, live only in sample/demo/reference paths allowed by later decisions, and be labeled as sample/demo.
- Security/safety constraints for untrusted project schematics are owned by `DL-22`; until those are locked, implementation must treat extension execution as blocked or limited to trusted local project code with explicit registration.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies output class, template, dependency declaration, evidence, validation, real-boundary, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies core/extension/sample-demo boundary and forbidden core vocabulary policy.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification, mechanical gates, backlog, strategy, and playbook define schematic positioning and proof requirements.
  blocks:
    - id: I-07-schematics-engine
      reason: I-07 requires this manifest/API/template/idempotency/dry-run/conflict decision.
    - id: I-15-create-import-starter-UX
      reason: Starter generation depends on schematic engine semantics and later starter-specific built-ins.
    - id: I-23-end-to-end-real-boundary-witness
      reason: Full witness must rerun create/schematic/starter seams.
  blocked_dependents:
    - id: I-07-schematics-engine
      blocked_until: DL-08 is independently validated and DL-02/DL-07 are independently validated clean with I-01/I-02-compatible schema/CLI foundations available for implementation closure.
      relying_on: Schematic API, SchematicManifestV1 fields/extensions, template engine, idempotency, dry-run, conflict behavior, CLI result envelope, and witnesses.
    - id: I-15-create-import-starter-UX
      blocked_until: I-07 is clean and starter-specific decisions DL-16/DL-17 plus CLI/schema dependencies are available.
      relying_on: Schematics producing starter fixtures that import harness packages without copying harness logic.
    - id: generated test/starter lanes I-16/I-17/I-19
      blocked_until: required schematic built-ins and test/context/starter decisions are locked and implemented.
      relying_on: generated API/UI/E2E/observability template content.
  required_before_finalizing:
    - id: DL-02-artifact-schemas / I-01-artifact-schemas-config
      required_content: Exact on-disk schematic manifest schema, schema refs, validators, and migrations compatible with DL-08 semantics.
    - id: DL-07-cli-primitives / I-02-cli-primitive-foundation
      required_content: Exact CLI invocation/output contract for schematic dry-run/apply JSON outputs.
    - id: DL-11-test-runner-tooling
      required_content: Exact generated test runner/tooling expectations for schematic test stubs.
    - id: DL-15-mechanical-engine
      required_content: How manifest/domain/template/test anti-pattern checks integrate with mechanical gates.
    - id: DL-16-starter-architecture
      required_content: Exact starter app/package/API/UI template content and paths.
    - id: DL-17-bootstrap-context-generation
      required_content: Exact bootstrap context placeholders/stubs for create/import.
    - id: DL-21-documentation-system
      required_content: Exact docs/reference locations and labels for generated docs/standards.
    - id: DL-22-security-safety-model
      required_content: Security policy for extension schematics, template execution, path safety, and command/network bans.
  deferrals:
    - deferred_question: Exact implementation of DL-02 `SchematicManifestV1` validators/types and acceptance of DL-08 namespaced extension fields.
      rationale: DL-02 now locks canonical JSON schema semantics if validated clean; implementation belongs to I-01/I-07 and must prove compatibility.
      future_owner: I-01-artifact-schemas-config / I-07-schematics-engine
      allowed_now: true
      blocked_dependents: [I-07-schematics-engine closure]
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact implementation of the DL-07 `vibe-engineer schematic run <schematic-id>` payload and result envelope consumers.
      rationale: DL-07 now locks the command family and common CLI envelope if validated clean; I-02/I-07 must implement and prove it.
      future_owner: I-02-cli-primitive-foundation / I-07-schematics-engine
      allowed_now: true
      blocked_dependents: [I-07-schematics-engine closure, I-15-create-import-starter-UX]
      invalid_if_any_dependent_relies: true
    - deferred_question: Starter-heavy built-in template content for app/package/API/UI/E2E/UI verification/skill/agent scaffolds.
      rationale: Content depends on starter, contract, test, UI, skill, registry, docs, and security decisions.
      future_owner: DL-16, DL-17, DL-14, DL-11, DL-12, DL-13, DL-03, DL-05, DL-21, DL-22 and their implementation lanes
      allowed_now: true
      blocked_dependents: [I-15-create-import-starter-UX, I-16, I-17, I-19]
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - docs/decisions/DL-08-schematics-system.md
    - .vibe/work/DL-08-schematics-system/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-*.md except DL-08
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-08 owned paths
  untouchable_paths:
    - .git/**
    - package source paths
    - root config files
    - CLI source paths
    - schematic package source paths
    - schema package source paths
    - tests
    - CI files
    - generated starter files
    - docs outside docs/decisions/DL-08-schematics-system.md
    - .vibe/work/** outside .vibe/work/DL-08-schematics-system/**
  handoff_notes:
    - from: DL-08
      to: I-07-schematics-engine
      condition: After DL-08 independent validation passes and required sibling decisions for implementation closure are available.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-07-schematics-engine`: blocked until DL-08 is independently validated; final closure additionally requires validated DL-02 `SchematicManifestV1`/I-01 schema validation and validated DL-07 `vibe-engineer schematic run <schematic-id>` CLI result-envelope implementation.
- `I-15-create-import-starter-UX`: blocked until `I-07` is clean and starter/context/create decisions provide exact generated content and paths.
- `I-16-starter-api-contracts-client-golden`, `I-17-web-mobile-e2e-ui-verification`, and `I-19-observability-defaults-tests`: blocked for any generated template content that relies on deferred starter/API/UI/E2E/observability details.
- `I-23-end-to-end-real-boundary-witness`: blocked until earlier create/schematic/starter seams are implemented and validated.
- Any future lane that would overwrite handwritten files, parse human summaries instead of machine-readable dry-run/apply output, or rely on unresolved exact manifest/CLI/schema encoding is blocked.

## Verification/witness consequences

- deterministic checks affected: manifest schema validation, input schema validation, template safety validation, path/touched-pattern validation, generated marker validation, dry-run/apply output schema validation, idempotency/conflict tests, domain-neutrality scans, generated test anti-pattern checks, and context/docs stub validation.
- positive witnesses required downstream: valid core module/contract/adapter/context/docs/test-fixture schematics dry-run/apply/idempotency; project extension registration; generated stubs consumed by available validators.
- negative witnesses required downstream: invalid input/manifest, forbidden path, unmarked existing conflict, marker mismatch, unsafe template feature, dry-run write attempt, domain-specific core output, weak generated tests.
- regression witnesses required downstream: `vibe-engineer` name, six skills, artifact flow, automatic build/ship verification/context, fixed starter stack/E2E choices, mechanical gate families.
- real_boundary_required: yes for later implementation.
- real_boundary_status: required_before_closure for `I-07`/`I-15`/`I-23`; not_applicable for this decision artifact.
- if no live seam: this decision creates no runtime engine and claims no runtime proof.

## Ownership/path consequences

- owned_write_paths now:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-08-schematics-system.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-08-schematics-system/**`
- future implementation ownership per final strategy:
  - `I-07-schematics-engine`: `packages/schematics/**`, `packages/cli/src/commands/schematic/**`, `.vibe/work/I-07-schematics-engine/**`.
  - `I-15-create-import-starter-UX`: create/import CLI and starter reference fixture paths named by the strategy.
- read-only paths: source docs, DL-24A/DL-20A, sibling decisions if present, and target repo inventory outside owned paths.
- untouchable paths now: `.git/**`, root config, package/CLI/schema/schematic source, tests, CI, generated starter files, unrelated docs, and unrelated `.vibe/work/**`.
- serialized/shared ownership notes: DL-08 has none. Future CLI/package shared metadata edits require the owning implementation lane/handoff from the final strategy.

## Domain-neutrality check

- DL-20A status consulted: green / LOCKED / PASS.
- Governed surfaces affected: schematic manifests, templates, generated code/test/context/docs stubs, extension registration, sample/demo labeling, and later docs.
- Surface classification:
  - core schematics: core harness;
  - project-owned schematics: consuming-project extension;
  - sample/demo schematics/templates: sample/demo only when explicitly labeled;
  - starter generated content: sample/reference or consuming-project boundary depending on later starter decisions.
- Positive generic terms allowed: app, package, module, contract, adapter, schema, validator, rule, standard, context, evidence, registry, schematic, skill, agent, fixture, test, E2E, UI verification, mechanical gate.
- Forbidden project/business terms: ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout/product/customer-order-like models, or any consuming-project business concept in core output. Mentions in this artifact are negative examples only.
- Consuming-project extensions have explicit boundaries through `visibility: project_extension`, `project_owned: true`, and explicit registration.
- Sample/demo artifacts require `visibility: sample_demo`, path/README labels, and no import as core defaults.
- Deterministic enforcement owners: `DL-15`/`I-10` for mechanical surface checks, `I-07` for schematic fixture checks, `I-15` for create/starter boundaries, `I-24` for docs/examples, and `DL-20B` for audit.
- Advisory enforcement owners: later validators, docs/reference validators, and final bug hunt.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes
- conflicts discovered: none in DL-08 owned paths at report creation and drafting time.
- sibling D1 decision work areas exist and are parallel/disjoint; they were treated as read-only.
- no package source, root config, CLI source, schematic source, schema package, tests, CI, generated starter file, git metadata, or unrelated decision artifact was edited.

## Deferral rationale

This decision is `LOCKED`. The following implementation-detail deferrals are allowed because their dependents are explicitly blocked from relying on them until the future owners resolve them:

1. Exact global manifest schema encoding:
   - reason_now: `DL-02` owns global artifact schema/version/migration choices.
   - future_owner: `DL-02`/`I-01`.
   - required_before_finalizing: `I-07` manifest validation closure.
   - blocked_dependents: `I-07` if exact schema validation is unavailable.
   - proof_no_dependent_relies_now: no implementation closure is authorized by this decision alone.
2. Exact schematic CLI spelling/options:
   - reason_now: `DL-07` owns CLI primitive surface.
   - future_owner: `DL-07`/`I-02` plus `I-07` for schematic command implementation.
   - required_before_finalizing: actual CLI dry-run/apply witness.
   - blocked_dependents: `I-07`, `I-15`.
   - proof_no_dependent_relies_now: DL-08 locks required machine-readable behavior, not broader CLI UX.
3. Starter-heavy built-in template content:
   - reason_now: exact app/package/API/UI/E2E/context/docs/security details belong to sibling decisions.
   - future_owner: `DL-16`, `DL-17`, `DL-14`, `DL-11`, `DL-12`, `DL-13`, `DL-03`, `DL-05`, `DL-21`, `DL-22` and implementation lanes.
   - required_before_finalizing: `I-15` and downstream starter/golden lanes.
   - blocked_dependents: `I-15`, `I-16`, `I-17`, `I-19`, `I-23` for the relevant generated content.
   - proof_no_dependent_relies_now: v1 `I-07` required schematics are representative and generic; starter closure remains blocked.

No deferral weakens the locked DL-08 decisions for manifest required fields, API semantics, template engine class, typed inputs, idempotency, dry-run, conflict behavior, tests, extension model, or domain-neutral boundaries.

## Evidence checklist

1. Report artifact was created before the decision artifact and updated after reading and drafting stages.
2. Required source files inspected are listed in the report and cited above by path/section.
3. Files changed are this decision artifact and the DL-08 execution report only.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
7. Deferrals name future owners and blocked dependents; no dependent implementation may rely on them unresolved.
8. Verification/witness consequences list positive, negative, regression, and real-boundary expectations.
9. Real-boundary status is stated: later implementation required; this decision artifact does not claim runtime proof.
10. Ownership/path consequences are explicit and dirty-tree-safe.
11. Domain-neutrality check applies DL-20A to core, extension, and sample/demo schematic surfaces.
12. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, `plan` Verification Delta, automatic `build`/`ship` verification/context, fixed starter stack/E2E, mechanical gate families, and no push/PR without approval.
13. Downstream dependents and blockers are explicit.
14. Validator checklist and severity policy are included below.

## Validation plan and severity policy

Independent Triad-B validation must inspect the actual changed/owned files and any available diff, not just this report.

### Positive witnesses

- DL-08 artifact exists at the required path and has DL-24A-compliant status/output class/template fields.
- Backlog §8 topics are resolved or explicitly deferred with blocked dependents.
- A representative `module` or `contract` schematic can be described from manifest → typed inputs → normalized variables → dry-run plan → apply plan → verification/context expectations without missing fields.
- Locked positioning is preserved: schematics are deterministic, agent-facing/internal, and not user-facing skills.
- Future proof maps to `I-07`, `I-15`, and `I-23` without hidden ownership.
- DL-20A generic core names/slots are accepted; project-specific content is only extension/starter/sample-demo bounded.

### Negative witnesses

- Reject ad-hoc regex/text replacement as the load-bearing generation contract.
- Reject implicit overwrite/merge of handwritten or unowned files.
- Reject dry-run output that omits machine-readable file operation/conflict details.
- Reject idempotency language that lacks concrete repeat-run semantics.
- Reject core schematic output with forbidden business-domain concepts except negative-example/sample-demo labels.
- Reject any implementation lane that proceeds while exact required manifest/schema/CLI/conflict/idempotency content it relies on remains unresolved.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Artifact flow remains raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.
- `build` and `ship` still run verification/context/evidence automatically.
- Fixed starter stack/E2E decisions are not contradicted.
- Mechanical gate families remain intact and are not replaced by schematic tests alone.
- DL-24A remains output-discipline owner; DL-20A remains domain-neutrality foundation.

### Sibling/blast-radius checks

- Check consistency against strategy §§3–11, DL-24A, DL-20A, README §§1/3.3/7/8/10/15, locked decisions §7, backlog §8, verification-layer schematic/context/mechanical sections, and mechanical gates §§2/5/7/9/11–13.
- Inspect target inventory to confirm only the DL-08 decision artifact and DL-08 work/report area changed by this lane.
- Check no package source, CLI source, schematic package, generated starter, tests, CI, root config, source docs, git metadata, or unrelated decision path was touched.
- Check interactions with any already-present sibling decisions. At final inventory, parallel sibling decision artifacts for DL-01, DL-02, DL-03, DL-04, DL-05, DL-06, and DL-07 were present and read read-only; no contradiction was found, but independent validation for them was not observed by this lane. No sibling decision artifacts for DL-11/DL-15/DL-16/DL-17/DL-21/DL-22 were present, so this artifact uses compatibility hooks and blockers for those owners.

### Severity policy

- `critical`: locked decision contradiction; missing DL-24A/DL-20A prerequisite; out-of-license write; production implementation by this decision lane; missing output class; invalid deferral relied on by a dependent; no concrete manifest/API/idempotency/dry-run/conflict decision while dependents proceed; false real-boundary closure; domain-specific core schematic policy; unsafe overwrite behavior.
- `major-local`: incomplete schematic set classification, incomplete template/input/conflict detail, unclear dependency/owner mapping, weak but repairable validation plan, or missing source citation limited to DL-08 paths.
- `minor-local`: wording/citation clarity issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all schema, source, ownership, domain-neutrality, dependency, and witness requirements satisfied.

## Known ambiguities / future owners

- `DL-02` owns exact global artifact schema encoding, schema refs, versioning, and migrations for schematic manifests.
- `DL-07` owns exact CLI primitive spelling/options/output-envelope conventions beyond DL-08 schematic requirements.
- `DL-11` owns exact test runner/tooling expectations for generated tests.
- `DL-15` owns exact mechanical engine integration for manifest/template/domain-neutrality/generated-test checks.
- `DL-16` owns starter architecture and generated app/package/API/UI layout.
- `DL-17` owns bootstrap context generation details.
- `DL-21` owns public docs/reference/tutorial structure.
- `DL-22` owns security/safety policy for template execution, extension schematics, path safety, command/network bans, and untrusted inputs.
- `DL-01` has appeared as a parallel decision artifact and locks `packages/schematics` / `@vibe-engineer/schematics`; DL-08 conforms to that package identity if DL-01 validates clean.
- `DL-02` has appeared as a parallel decision artifact and locks canonical JSON `SchematicManifestV1`; DL-08 conforms by mapping its manifest semantics into DL-02 fields and namespaced extensions if DL-02 validates clean.
- `DL-03` has appeared as a parallel decision artifact and locks skill protocols; DL-08 conforms by keeping schematics internal/agent-facing and never a seventh normal user-facing skill.
- `DL-04` has appeared as a parallel decision artifact and locks durable orchestration, ownership checks, conflict rejection, and cap preservation; DL-08 conforms by making schematic runs typed, idempotent, ownership-scoped DAG steps rather than hidden agent side effects.
- `DL-05` has appeared as a parallel decision artifact and locks registry/meta-agent policy including schematic-gap detector recommendations; DL-08 conforms by keeping schematic-gap detection recommendation-only until normal planning/build/verification routes apply.
- `DL-06` has appeared as a parallel decision artifact and locks pi-first adapter integration; DL-08 conforms by treating adapter-generated assets as downstream consumers, not as core schematic user-facing skills.
- `DL-07` has appeared as a parallel decision artifact and locks `vibe-engineer schematic run <schematic-id>` plus the common CLI result envelope; DL-08 conforms by requiring machine-readable schematic dry-run/apply payloads under that command if DL-07 validates clean.
- `I-07` owns actual schematic engine/built-in implementation and must split engine vs built-ins if the ≤6h scope is risky.
- `I-15` owns create/import use of schematics for starter fixtures and must prove starter imports harness packages rather than copying harness logic.
- `I-23` owns full rerun of load-bearing create/schematic/starter seams.
