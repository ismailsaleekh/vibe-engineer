# Standards

> **Source of truth:** `packages/standards/src/catalog-data.js` (`STANDARDS_CATALOG`, `STANDARD_DEFINITIONS`). This page is generated from the actual catalog and checked by the stale-doc witness. The authoritative text is the catalog source; if this page and the source disagree, the source wins.

The core standards catalog is `vibe-engineer-core-standards` (`SUPPORTED_SCHEMA_VERSION = '1.0.0'`, neutrality: `core`). It defines the domain-neutral standards that govern harness implementation, verification, package boundaries, and evidence discipline.

## Catalog summary

- **Catalog id:** `vibe-engineer-core-standards`
- **Title:** Vibe Engineer Core Standards Catalog
- **Neutrality:** `core`
- **Schema kinds:** `standard-definition`, `standards-catalog`

## Standards at a glance

| Standard id | Category | Level | Neutrality | Requirements |
| --- | --- | --- | --- | --- |
| [`typed-boundary-contracts`](#typed-boundary-contracts) | contracts | required | core | `named-runtime-contract`, `fail-closed-boundary` |
| [`real-boundary-witnesses`](#real-boundary-witnesses) | verification | required | core | `actual-consumer`, `negative-boundary` |
| [`domain-neutral-core`](#domain-neutral-core) | domain-neutrality | required | core | `core-vocabulary`, `sample-boundary` |
| [`dirty-tree-ownership`](#dirty-tree-ownership) | orchestration | required | core | `owned-paths-only`, `no-destructive-git` |
| [`report-first-evidence`](#report-first-evidence) | evidence | required | core | `first-artifact`, `command-evidence` |
| [`dependency-hygiene`](#dependency-hygiene) | package-boundaries | required | core | `declared-imports`, `no-package-manager-mutation` |
| [`deterministic-schematics`](#deterministic-schematics) | schematics | recommended | core | `typed-manifest`, `dry-run-first` |

---

## typed-boundary-contracts

- **Title:** Typed boundary contracts
- **Summary:** External and generated carriers enter through named runtime contracts before any package consumes them.
- **Rationale:** Boundary validation keeps artifacts, schemas, config, commands, and adapters fail-closed instead of relying on prose or parser self-agreement.
- **Applies to:** `artifacts`, `commands`, `config`, `schemas`, `verification`.
- **References:** DL-15 mechanical engine; Verification layer specification.

| Requirement | Statement | Verification |
| --- | --- | --- |
| `named-runtime-contract` | Every load-bearing carrier must have a named structural contract and a typed result surface. | Run a positive fixture through the real producer and consumer, then run negative fixtures for missing fields, unknown fields, and unsupported versions. |
| `fail-closed-boundary` | Malformed input must return typed blocking errors and must not silently fall back to default acceptance. | Assert invalid carriers produce stable error codes with JSON-pointer paths where available. |

## real-boundary-witnesses

- **Title:** Real boundary witnesses
- **Summary:** A seam is green only after the actual producer, carrier, and consumer run together.
- **Rationale:** Shape-only checks can hide broken joins; early real-boundary proof turns interface claims into executable evidence.
- **Applies to:** `evidence`, `fixtures`, `packages`, `verification`.
- **References:** Vibe Engineer HLO Quality Bar; Verification layer specification.

| Requirement | Statement | Verification |
| --- | --- | --- |
| `actual-consumer` | Each standard-bearing package must provide a lane-owned fixture that imports the real public API and consumes real output. | Run the witness with Node and record command, exit code, stdout, stderr, and evidence artifact path. |
| `negative-boundary` | The same seam must reject invalid, missing, duplicate, and unsupported carriers with typed errors. | Exercise negative fixtures against the same public API used by the positive witness. |

## domain-neutral-core

- **Title:** Domain-neutral core surfaces
- **Summary:** Core harness packages use generic engineering vocabulary and isolate extension or sample content from core defaults.
- **Rationale:** Reusable harness behavior must not encode a consuming workspace model, workflow, organization, or external service assumption.
- **Applies to:** `agents`, `docs`, `fixtures`, `packages`, `prompts`, `schematics`, `standards`.
- **References:** DL-20A domain-neutrality foundation; DL-15 mechanical engine.

| Requirement | Statement | Verification |
| --- | --- | --- |
| `core-vocabulary` | Core text, identifiers, schema fields, and defaults must use generic package, module, contract, adapter, test, context, evidence, standard, and verification vocabulary. | Run the actual domain-purity validator over governed core surfaces classified as core. |
| `sample-boundary` | Sample, demo, fixture, and negative surfaces must be explicitly classified and must not become core defaults. | Run paired domain-purity fixtures proving core leakage fails while labeled sample or negative content remains isolated. |

## dirty-tree-ownership

- **Title:** Dirty-tree ownership discipline
- **Summary:** Agents edit only owned paths, preserve unrelated work, and stop on concrete ownership conflict.
- **Rationale:** Multi-agent work requires exact path ownership so evidence stays attributable and parallel lanes do not overwrite each other.
- **Applies to:** `agents`, `evidence`, `packages`, `prompts`, `verification`.
- **References:** Vibe Engineer HLO Quality Bar.

| Requirement | Statement | Verification |
| --- | --- | --- |
| `owned-paths-only` | Write access is limited to explicit owned paths; read-only and untouchable paths remain unchanged. | Record the changed-path list and compare it to the lane ownership list. |
| `no-destructive-git` | Agents must not request a clean tree and must not use destructive git state operations. | Report command history and confirm no stash, reset, clean, checkout, or restore command was used. |

## report-first-evidence

- **Title:** Report-first evidence
- **Summary:** Every implementation or validation lane creates its report before inspection or edits and updates it after each stage.
- **Rationale:** Crash-safe checkpointing lets future agents recover exact status, touched paths, commands, evidence, blockers, and next steps.
- **Applies to:** `agents`, `evidence`, `packages`, `verification`.
- **References:** Vibe Engineer HLO Quality Bar; Verification layer specification.

| Requirement | Statement | Verification |
| --- | --- | --- |
| `first-artifact` | Create the lane report before reading target files or modifying package files. | The report stage log records creation before subsequent inspection and product changes. |
| `command-evidence` | Every meaningful command records working directory, exit code, stdout or stderr summary, and evidence path when produced. | Compare witness commands with evidence files under the lane work directory. |

## dependency-hygiene

- **Title:** Dependency hygiene
- **Summary:** Packages import only declared package dependencies, local owned modules, or allowed Node built-ins.
- **Rationale:** Undeclared imports and hidden package-manager mutations make private workspace packages non-repeatable and break package boundary proof.
- **Applies to:** `packages`, `schemas`, `standards`, `verification`.
- **References:** DL-01 repository and package structure; DL-15 mechanical engine.

| Requirement | Statement | Verification |
| --- | --- | --- |
| `declared-imports` | Runtime source must not rely on hoisted or phantom dependencies absent from the package manifest. | Scan package source imports and confirm every external module is declared or is a Node built-in. |
| `no-package-manager-mutation` | A lane must stop rather than run install or add commands when a new dependency would be required. | Confirm root manifests, lockfile, workspace files, and node_modules were not mutated by the lane. |

## deterministic-schematics

- **Title:** Deterministic schematic behavior
- **Level:** recommended
- **Summary:** Schematics use typed manifests, deterministic path planning, dry-run safety, and fail-closed conflict handling.
- **Rationale:** Generated structure must be predictable and inspectable before files are written so agents can build on reusable scaffolds safely.
- **Applies to:** `fixtures`, `schemas`, `schematics`, `verification`.
- **References:** Verification layer specification.

| Requirement | Statement | Verification |
| --- | --- | --- |
| `typed-manifest` | A schematic declares its inputs, generated paths, conflict policy, and verification expectations in a strict manifest. | Validate manifest fixtures and reject unknown fields, missing path policy, and unsupported versions. |
| `dry-run-first` | Dry-run mode reports planned changes without writing and apply mode refuses conflicting files. | Run dry-run, apply, repeat-apply, and conflict fixtures at the real engine boundary. |

---

## API

```js
import {
  listStandards,              // () => standardId[]
  loadStandard,               // (id) => StandardDefinition
  getStandardsCatalog,        // () => StandardsCatalog
  validateStandardDefinition, // (definition) => { ok, errors }
  validateStandardsCatalog,   // (catalog) => { ok, errors }
  STANDARD_IDS,
  STANDARDS_CATALOG,
  STANDARD_SCHEMA_KINDS,      // ["standard-definition","standards-catalog"]
  STANDARD_SCHEMA_FILES,
  STANDARD_SCHEMA_IDS,
  loadStandardsSchema,
  loadAllStandardsSchemas,
  STANDARD_ERROR_CODES,
  StandardsError
} from "@vibe-engineer/standards";
```

Canonical schemas: `packages/standards/schemas/standard-definition.schema.json` and `packages/standards/schemas/standards-catalog.schema.json`.

## Related

- [Mechanical gates model](../architecture/mechanical-gates.md)
- [DL-20A — Domain-Neutrality Foundation](../decisions/DL-20A-domain-neutrality-foundation.md)
- [DL-15 — Mechanical Engine](../decisions/DL-15-mechanical-engine.md)
