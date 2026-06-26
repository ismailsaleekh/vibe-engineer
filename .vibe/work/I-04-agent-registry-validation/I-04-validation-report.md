# I-04 Agent Registry Validation Report

## Final verdict
NEEDS-FIX

Severity classification: major-local.

Q06 is not validation-green. The real schema/API boundary and several package-local witnesses pass, but independent adversarial witnesses found missing DL-05 policy enforcement for graph reachability/orphan links, maturity evidence references, and validator/fixer type compatibility.

## Checkpoints

### Checkpoint 0 — report initialized first
- Status: COMPLETE
- Verdict then: BLOCKED pending validation
- Files inspected: none at creation time.
- Files changed: this validation report only.
- Evidence: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-04-agent-registry-validation/I-04-validation-report.md` was created before product/source inspection.
- Blockers: none.
- Next step completed: required orchestration inputs read.

### Checkpoint 1 — required inputs read
- Status: COMPLETE
- Verdict then: BLOCKED pending source and witness validation
- Files inspected: Q06 finisher log `.pi/tasks/session-81315-81315/b61990a9a.output`; Q06 implementation report; Q06 finisher wrapper; wrapper validation PASS report; Q06 cutoff forensics; Q06 brief/validation; current HLO status; ledger tail.
- Files changed: this validation report only.
- Evidence: finisher log ended `VERDICT: DONE`; implementation report claims final combined package suite passed; wrapper/brief require actual I-01A schema boundary, positive/negative/regression witnesses, no root/lockfile/install/shared mutation, and independent validation before consumption.
- Blockers: none.
- Next step completed: actual Q06 owned files and dirty state inspected.

### Checkpoint 2 — owned files, dirty state, contracts inspected
- Status: COMPLETE
- Verdict then: NEEDS-FIX candidate pending witnesses
- Files inspected: `packages/registry/package.json`, `src/index.js`, `src/index.d.ts`, `tests/run-tests.mjs`, `tests/fixture-witness.mjs`, `scripts/build-smoke.mjs`, `tsconfig.json`; core entries under `.vibe/registry/core-agents/*.json`; valid/scoped/invalid fixtures; I-01A artifact API/schema/validation source; root/package-manager files read-only; DL-05/DL-20A/DL-03/DL-06 context.
- Files changed: this validation report and validation evidence only.
- Evidence: Q06 inventory contains registry package source/tests/fixtures, 7 actual core entries, generated invalid fixtures, and implementation report. Source uses real I-01A `validateArtifactFile(..., { kind: 'agent_registry_entry' })`; core entry schema validation passed for all 7 entries.
- Blockers: none.
- Next step completed: package-local and real-boundary witnesses run.

### Checkpoint 3 — safe package-local and real-boundary witnesses run
- Status: COMPLETE
- Verdict then: NEEDS-FIX candidate
- Files changed: validation evidence under `.vibe/work/I-04-agent-registry-validation/validation-evidence/**` only.
- Evidence:
  - `pnpm --filter @vibe-engineer/registry typecheck && pnpm --filter @vibe-engineer/registry test:fixtures && pnpm --filter @vibe-engineer/registry build` bg `bb5bc95d1` exit 0.
  - Import smoke from `packages/registry` printed product `vibe-engineer`, six skills, artifact flow, and canonical agent-registry schema id.
  - Direct I-01A boundary witness validated all 7 `.vibe/registry/core-agents/*.json` through `validateArtifactFile` with `allOk: true`.
  - Public registry boundary witness loaded 7 core entries through `@vibe-engineer/registry`, with expected agent types and validator/fixer graph links.
  - Exact product `test` script was not run in-place by this validator because `tests/run-tests.mjs` deletes/writes `packages/registry/.generated-fixtures/invalid` (product read-only for validation). The same test logic was run against a validation-owned copy under `validation-evidence/package-test-copy`, output `registry tests passed`.
- Blockers: none.
- Next step completed: independent adversarial negative/regression witnesses run.

### Checkpoint 4 — adversarial witnesses and blast-radius sweep complete
- Status: COMPLETE
- Verdict: NEEDS-FIX
- Files changed: this report plus validation evidence scripts/outputs/cases under `validation-evidence/**`.
- Evidence:
  - `adversarial-witness.output.json`: positives and several negatives passed, but `ADVERSARIAL_DEFECTS 2` because a stable/core entry with only a self `registry_entry_for` link was accepted and a top-level required `agent_registry_entry` link to a missing entry was accepted.
  - `evidence-reference-witness.output.json`: `ADVERSARIAL_DEFECT evidence-reference-missing-not-rejected`; missing eval/smoke evidence paths were accepted.
  - `ref-type-witness.output.json`: `ADVERSARIAL_DEFECT validator-fixer-type-mismatch-not-rejected`; validatorRef targeting a fixer and fixerRef targeting a validator were accepted.
  - Root/package-manager mtimes remained unchanged after validation commands; tracked diff names for root/shared/sibling/artifacts/decision paths were empty.
  - Sibling sweep found no Q06 imports/writes into Q04/Q05/Q07 packages beyond read-only path metadata in registry entries; `packages/core` absent; no production `@vibe-engineer/testing` dependency in registry manifest.
- Blockers: none.
- Next step: Q06 fixer should repair validator policy gaps within Q06-owned paths, then rerun package suite and independent validation.

## Files inspected

### Required orchestration inputs
- `/Users/lizavasilyeva/work/harness-starter/.pi/tasks/session-81315-81315/b61990a9a.output`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-04-agent-registry-validation/implementation-report.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/q06-finisher-execute.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/q04-q07-finisher-wrapper-validation.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/q06-i04-agent-registry-validation-cutoff-forensics.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q06-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q06-brief-validation.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger.md` tail

### Product/contracts/context
- `/Users/lizavasilyeva/work/vibe-engineer/packages/registry/package.json`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/registry/src/index.js`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/registry/src/index.d.ts`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/registry/tsconfig.json`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/registry/tests/run-tests.mjs`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/registry/tests/fixture-witness.mjs`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/registry/scripts/build-smoke.mjs`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/registry/fixtures/**`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/registry/.generated-fixtures/invalid/**`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/registry/core-agents/*.json`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/artifacts/package.json`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/artifacts/src/index.js`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/artifacts/src/validation.js`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/artifacts/schemas/agent-registry-entry.schema.json`
- `/Users/lizavasilyeva/work/vibe-engineer/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root configs read-only
- Foundation reports: I-00A revalidation PASS, I-00B validation PASS, I-01A revalidation PASS, I-00A ownership handoff
- Decision/context docs: DL-05, DL-20A, DL-03, DL-06 excerpts relevant to registry graph, domain neutrality, skills, and adapter deferral

## Files changed by this validator
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-04-agent-registry-validation/I-04-validation-report.md`
- Validation-only evidence under `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-04-agent-registry-validation/validation-evidence/**`, including:
  - `adversarial-witness.mjs`, `adversarial-witness.output.json`, `adversarial-cases/**`
  - `evidence-reference-witness.mjs`, `evidence-reference-witness.output.json`, `evidence-ref-case/**`
  - `ref-type-witness.mjs`, `ref-type-witness.output.json`, `ref-type-case/**`
  - `import-smoke.output.json`, `artifact-boundary.output.json`, `registry-boundary.output.json`
  - `package-test-copy/**`, `package-test-copy-test.output`

No product/source/root/lockfile/sibling/decision file was edited by this validator.

## Command and witness evidence

| Witness | Result | Evidence |
| --- | ---: | --- |
| Q06 owned inventory/status | PASS inventory obtained | `find packages/registry .vibe/registry .vibe/work/I-04-agent-registry-validation`; scoped `git status` shows Q06 paths untracked/dirty as expected. |
| Root/shared/sibling tracked diff names | PASS | `git diff --name-only -- package.json pnpm-lock.yaml pnpm-workspace.yaml ... packages/artifacts docs/decisions` printed no tracked diffs. |
| Root/shared mtimes after validation | PASS | root/package-manager mtimes unchanged: package/workspace/root configs `16:39`, lockfile `19:08`, node_modules `18:47`; Q06 writes are later and path-scoped. |
| Safe package suite | PASS | bg `bb5bc95d1` exit 0: typecheck, `test:fixtures`, build. |
| Import smoke | PASS | `import-smoke.output.json` shows `PRODUCT_NAME`, `LOCKED_SKILLS`, `ARTIFACT_FLOW`, and I-01A schema id. |
| Direct I-01A boundary | PASS | `artifact-boundary.output.json`: 7/7 core registry entries validated by `validateArtifactFile(...agent_registry_entry)`. |
| Public registry boundary | PASS | `registry-boundary.output.json`: `loadRegistry` loaded 7 core entries, expected types, and validator/fixer graph. |
| Package test logic without product writes | PASS | validation-owned copy of package/core/artifact carriers ran `tests/run-tests.mjs`, output `registry tests passed`. |
| Independent adversarial graph/link witness | FAIL as expected for product defect | `adversarial-witness.output.json`: self-linked stable/core and missing top-level agent link accepted. |
| Independent evidence-reference witness | FAIL as expected for product defect | `evidence-reference-witness.output.json`: missing eval/smoke evidence paths accepted. |
| Independent ref-type witness | FAIL as expected for product defect | `ref-type-witness.output.json`: validator/fixer type mismatch accepted. |
| Domain/sibling sweep | PASS with known expected terms | Forbidden business terms only in source denylist/test negative; `git_checkout` false-positive appears in forbidden action strings; Q06 source imports no Q04/Q05/Q07 packages. |

## Findings

### F1 — major-local — Graph reachability and orphan-link validation is incomplete
Evidence:
- `packages/registry/src/index.js` `validateGraph` resolves only `validatorRefs`/`fixerRefs` lines 308-315.
- The unlinked stable/core calculation counts any top-level `links` item with `artifactKind === 'agent_registry_entry'` as outbound at line 329, including self `registry_entry_for` links or missing top-level links.
- `adversarial-witness.output.json` shows:
  - `stable core with only self registry_entry_for link rejects as unlinked`: `actualOk: true`, no errors.
  - `top-level required agent_registry_entry link to missing entry rejects`: `actualOk: true`, no errors.
Requirement violated: DL-05 requires IDs/references resolve exactly, orphaned references reject, and every stable/core agent is reachable from a real skill/orchestrator/validator/fixer/meta/registry group or explicit dormant/deprecated/sample rationale.
Required fix: top-level `agent_registry_entry` links that are load-bearing must resolve or be explicitly scoped; self `registry_entry_for` must not satisfy stable/core reachability; add positive/negative fixtures and rerun real-boundary suite.

### F2 — major-local — Stable/core maturity evidence accepts missing/stale evidence references
Evidence:
- Actual core entries point evals to `.vibe/work/I-04-agent-registry-validation/evidence/*.json`; those files do not exist. Smoke refs are symbolic `smoke:*` strings with no evidence carriers.
- `validateMaturityEvidence` lines 179-194 checks only owner/version, non-empty `changelog`, non-empty `evals`, and non-empty `smokeRefs`; it does not validate evidence link targets or evidence packet carriers.
- `evidence-reference-witness.output.json` shows a full valid fixture set with missing eval/smoke evidence paths returned `actualOk: true`, `hasExpectedRule: false`, and `ADVERSARIAL_DEFECT evidence-reference-missing-not-rejected`.
Requirement violated: Q06/DL-05 requires stale/missing version/changelog/eval evidence to reject and stable/core entries to have real maturity evidence.
Required fix: validate stable/core eval links and smoke refs as real, existing, schema-valid evidence carriers or change the contract to a typed non-file evidence model with corresponding schema/tests; add negative for nonexistent/stale evidence references.

### F3 — major-local — Validator/fixer reference type compatibility is not enforced
Evidence:
- `validateGraph` lines 308-315 checks only whether `validatorRefs`/`fixerRefs` targets exist; it does not check target `agentType`.
- `ref-type-witness.output.json` shows a fixture set where `fixture-specialist.validatorRefs` targets `fixture-fixer` and `fixture-specialist.fixerRefs` targets `fixture-validator`; `actualOk: true`, no errors.
Requirement violated: DL-05 says validator/fixer references must exist and be type-compatible; fixer links must point to fixers or typed orchestrators, and validators must be independent validator/reviewer-compatible agents.
Required fix: add type compatibility checks, rule IDs/pointers, and positive/negative fixtures for validatorRef/fixerRef target types.

## Non-blocking observations
- Exact `pnpm --filter @vibe-engineer/registry test` is not validator-safe in-place because it rewrites product path `packages/registry/.generated-fixtures/invalid`. The package test logic passed in a validation-owned copy, but future validators would benefit from a temp-dir/env override.
- `packages/registry/src/index.js` consumes I-01A through a relative source import `../../artifacts/src/index.js` and declarations import generated types by relative path. This did exercise the real I-01A validator, and no root/lockfile mutation occurred; dependency formalization remains a future/root-lockfile ownership consideration if package-graph contracts require it.

## Dirty-tree and blast-radius safety
- Dirty tree is broad and expected; no clean-tree request or forbidden git operation was used.
- Q06 product paths are untracked/dirty as implementation output; validator writes are confined to the validation report/evidence subtree.
- Root/package-manager/shared files are read-only in this validation. Scoped status shows them untracked as greenfield baseline; tracked diff names are empty and mtimes did not change during validation.
- Q04/Q05/Q07 sibling paths remain outside Q06 writes; only read-only status/inventory/source-reference sweeps were performed.
- `packages/core` is absent; registry package does not declare `@vibe-engineer/testing`.

## Required fix/revalidation scope
A Q06 fixer should stay within Q06-owned paths unless it determines a root/lockfile/dependency ruling is required. Minimum fix scope:
1. Repair graph/link reachability so self `registry_entry_for` and unresolved top-level `agent_registry_entry` links cannot mask orphan/unlinked stable/core entries.
2. Repair stable/core maturity evidence validation so missing/stale eval/smoke evidence is rejected through typed evidence rules.
3. Repair validator/fixer target type compatibility.
4. Add package-owned positive/negative/regression fixtures for all three findings.
5. Rerun package suite and real-boundary witnesses, then relaunch independent validation.
