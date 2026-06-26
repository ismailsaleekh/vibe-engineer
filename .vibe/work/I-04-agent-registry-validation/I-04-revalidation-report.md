# I-04 Agent Registry Validation — Q06 Revalidation Report

## Checkpoint 0 — initialized
- Status: in progress.
- Provisional verdict: BLOCKED until required reading, file inspection, dirty-tree probes, real-boundary witnesses, negative/positive/regression witnesses, and blast-radius checks complete.
- Files inspected: none yet (report created first per instruction).
- Files changed: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-04-agent-registry-validation/I-04-revalidation-report.md` only.
- Commands/witnesses run: none yet.
- Evidence: report artifact initialized before product inspection.
- Blockers/rulings needed: none at initialization.
- Next step: inspect required ground-truth reading list and update this report.

## Checkpoint 1 — evidence directory initialized
- Status: in progress.
- Provisional verdict: BLOCKED until required validation completes.
- Files inspected: none beyond this report.
- Files changed: report plus validation-owned evidence directories under `revalidation-evidence/{commands,harness,outputs}`.
- Commands/witnesses run: `mkdir -p .../revalidation-evidence/{commands,harness,outputs}`; exit code 0; output: `created evidence directories`.
- Evidence: writable evidence tree exists for all future generated artifacts.
- Blockers/rulings needed: none.
- Next step: read required ground-truth documents and prior reports.

## Checkpoint 2 — required ground-truth reading complete
- Status: in progress.
- Provisional verdict: BLOCKED until product inspection and witnesses complete.
- Files inspected: required reading list from harness-starter and vibe-engineer: `README.md`, `docs/locked-decisions.md`, `docs/verification-layer.md`, `docs/mechanical-verification-gates.md`, `docs/planning-research-backlog.md`, `guides/high-level-orchestrator-playbook.md`, `prompts/quality-bar.md`, original Q06 brief/brief-validation/brief-validation-report, Q06 implementation report, Q06 validation report, Q06 fix brief/fix-brief-validation/fix report, HLO `status.md`, `handoff.md`, and relevant Q06/state ledger entries.
- Files changed: report plus evidence file `revalidation-evidence/commands/ground_truth_line_counts.txt` and `revalidation-evidence/commands/ledger_q06_relevant.txt`.
- Commands/witnesses run: line-count probe for required reading list (exit 0, artifact `revalidation-evidence/commands/ground_truth_line_counts.txt`); ledger Q06/state extraction with `rg -n -C 2` (exit 0, artifact `revalidation-evidence/commands/ledger_q06_relevant.txt`).
- Evidence cited: locked product/CLI name `vibe-engineer`; six skills `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`; artifact flow Raw Intent → Work Brief → Implementation Plan → Build Result → Ship Packet; `plan` owns Verification Delta; `build`/`ship` own automatic verification/context/evidence; DL-05 registry validation requires schema-backed entries, no self-validation/orphans, validator/fixer graph integrity, maturity evidence, domain-neutral core, and recommendation-only meta-agents; prior Q06 validation was `NEEDS-FIX`/`major-local` for graph/orphan, evidence-reference, and validator/fixer target type policy; fix report claims Q06-owned repairs, real I-01A/public API witness, package suite pass, and no root/lockfile/sibling mutation; HLO status/ledger state Q06 fix done but closing revalidation required before green.
- Blockers/rulings needed: none from reading stage.
- Next step: inspect actual Q06 product/contract files, inventories, scoped status/diffs, and safe package scripts.

## Checkpoint 3 — product/contract inspection and dirty-tree probes
- Status: in progress.
- Provisional verdict: BLOCKED until witnesses complete.
- Files inspected: `packages/registry/package.json`, `src/index.js`, `src/index.d.ts`, `tsconfig.json`, `tests/run-tests.mjs`, `tests/fixture-witness.mjs`, `scripts/build-smoke.mjs`, package fixtures/evidence inventory, `.vibe/registry/core-agents/**`, `.vibe/registry/evidence/**`, Q06 prior work/evidence inventories, and I-01A public surfaces `packages/artifacts/package.json`, `src/index.js`, `src/validation.js`, `src/schema-registry.js`, `schemas/agent-registry-entry.schema.json`, `schemas/evidence-packet.schema.json`, `src/generated/types.d.ts` excerpt.
- Files changed: report plus validation-owned command artifacts `q06_owned_inventory.txt`, `q06_scoped_status.txt`, `sentinel_tracked_diff_names.txt`, `sentinel_scoped_status.txt`, and `registry_carrier_summary.json`.
- Commands/witnesses run: Q06 owned-path inventory/status/diff probes (exit 0; artifacts under `revalidation-evidence/commands/`); registry carrier summary script (exit 0; artifact `registry_carrier_summary.json`).
- Evidence: registry package scripts are `typecheck`, `test`, `test:fixtures`, `build` (no lint); package has no dependencies/devDependencies and no `@vibe-engineer/testing`; `test` writes `packages/registry/.generated-fixtures/invalid`, so in-place `pnpm ... test` is not validation-safe and will be rerun through a validation-owned copy/harness; source imports real I-01A public `validateArtifactFile`/`loadSchema` from `packages/artifacts/src/index.js`; I-01A validator uses Ajv 2020 strict schema validation; schemas include `agent_registry_entry` and `evidence_packet`; actual core and fixture entries cover orchestrator, specialist, validator, fixer, reviewer, meta, and skill_adapter with typed eval/smoke `evidence_packet` refs; Q06 scoped status shows untracked greenfield Q06 outputs, and tracked sentinel diff names are empty.
- Blockers/rulings needed: none; product `test` must be run via validation-owned copy to avoid out-of-license generated fixture rewrites.
- Next step: run safe package-local commands and real-boundary positive witnesses without product-path writes beyond allowed evidence.

## Checkpoint 4 — safe package commands and positive real-boundary witness
- Status: in progress.
- Provisional verdict: BLOCKED until adversarial negatives/regressions complete.
- Files inspected: package scripts and positive witness outputs.
- Files changed: validation-owned `positive-boundary-witness.mjs`, `positive-boundary-witness.output.json`, `safe_package_commands.txt`, `core_domain_term_scan.txt`, copied-harness inventory/output from an abandoned copied-package attempt, plus this report.
- Commands/witnesses run: `pnpm --filter @vibe-engineer/registry typecheck` exit 0; `pnpm --filter @vibe-engineer/registry test:fixtures` exit 0; `pnpm --filter @vibe-engineer/registry build` exit 0; output artifact `revalidation-evidence/outputs/safe_package_commands.txt`. Positive real-boundary script importing the exported registry entrypoint and I-01A validator exit 0; output artifact `revalidation-evidence/outputs/positive-boundary-witness.output.json`.
- Evidence: real on-disk `.vibe/registry/core-agents` and package fixtures both load through public registry API; all actual core/package agent_registry_entry carriers and 28 evidence_packet carriers validate through I-01A `validateArtifactFile`; loaded entries cover orchestrator/specialist/validator/fixer/reviewer/meta/skill_adapter; non-self top-level links are present and resolved; eval/smoke refs are typed required passed `evidence_packet` links; validatorRefs target validator/reviewer and fixerRefs target fixer/orchestrator; project-extension and sample/demo are rejected by default and accepted only with explicit options; meta entry is recommendation-only with planning/build/verification route and no writes; product name, locked skills, artifact flow, no `packages/core`, and no registry `@vibe-engineer/testing` dependency are confirmed. Domain scan found only `git_checkout` safety forbiddance, not business checkout leakage.
- Blockers/rulings needed: none. A copied-package test attempt failed because copied `packages/artifacts` lacked its package-local `node_modules/ajv`; this was not used as evidence, and subsequent validation uses the actual product public API with validation-owned carriers instead of mutating product `.generated-fixtures`.
- Next step: construct and run adversarial negative witnesses under `revalidation-evidence/**` using actual Q06 code paths and validation-owned carrier roots.

## Checkpoint 5 — adversarial negative witnesses
- Status: in progress.
- Provisional verdict: PASS candidate pending final regression/blast-radius/write-safety closure.
- Files inspected: adversarial witness script and output JSON.
- Files changed: validation-owned `adversarial-negative-witness.mjs`, generated adversarial carriers under `revalidation-evidence/harness/adversarial-case-root/**`, `outputs/adversarial-negative-witness.output.json`, `outputs/adversarial-negative-witness.run.txt`, plus this report.
- Commands/witnesses run: `node revalidation-evidence/harness/adversarial-negative-witness.mjs`; exit code 0; summary output `{ ok: true, total: 34, failureCount: 0 }`; full artifact `revalidation-evidence/outputs/adversarial-negative-witness.output.json`.
- Evidence: validation-owned positive fixture copy passed; negatives rejected through actual Q06 registry entrypoint and real I-01A evidence validation for self-only `registry_entry_for`, disconnected stable/core graph, missing top-level agent link, missing eval file, missing smoke file, out-of-owned evidence path, evidence artifactId/path mismatch, evidence wrong artifact kind, failed/stale evidence status, subjectRef mismatch, agent id mismatch, agent version mismatch, evidence-type mismatch, validatorRef-to-fixer, fixerRef-to-validator, missing validator/fixer as `registry.graph.ref_resolution` not wrong-type, duplicate id, missing metadata, wrong schema version, wrong artifact kind, invalid schema refs, tool/forbidden contradiction, self-validation-only, independence cycle, unused validator, deprecation/supersession gap, unknown skill link, domain leakage, meta mutation/bypass, adapter assumptions, and scope-gate defaults for project-extension/sample-demo.
- Blockers/rulings needed: none.
- Next step: complete regression and sibling/blast-radius sweeps, then final write-safety confirmation and verdict.

## Checkpoint 6 — regression/blast-radius sweep and additional policy-gap witness
- Status: complete.
- Provisional verdict: NEEDS-FIX.
- Files inspected: root manifests/config sentinels (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`), DL-05 decision policy, registry imports/dependencies, package/core sentinel, registry entries for meta/adapter/non-pi metadata, and final dirty-tree/write inventories.
- Files changed: validation-owned `policy-gap-witness.mjs`, generated carriers under `revalidation-evidence/harness/policy-gap-case-root/**`, `outputs/policy-gap-witness.output.json`, `outputs/policy-gap-witness.run.txt`, `commands/blast_radius_contract_sweep.txt`, `commands/final_dirty_tree_and_writes.txt`, `commands/final_dirty_tree_after_policy_gap.txt`, plus this report.
- Commands/witnesses run:
  - Blast-radius/contract sweep over registry imports/dependency fields/package-core sentinel/build-ship/meta-adapter terms; exit 0; artifact `revalidation-evidence/commands/blast_radius_contract_sweep.txt`.
  - Policy-gap witness `node revalidation-evidence/harness/policy-gap-witness.mjs`; exit code 1 expected for product defect; artifact `revalidation-evidence/outputs/policy-gap-witness.output.json`.
  - Final dirty-tree/status/write-safety probes; exit 0; artifacts `final_dirty_tree_and_writes.txt` and `final_dirty_tree_after_policy_gap.txt`.
- Evidence for regressions/blast radius: registry source imports only Node builtins and real I-01A artifacts source; no imports from config/orchestration/mechanical-gates/skills/adapters/testing sibling packages (only a test assertion string mentions `@vibe-engineer/testing`); registry manifest dependency fields are empty; `packages/core` is absent; exported constants and positive witness preserve `vibe-engineer`, six skills, and raw-intent→Work-Brief→Implementation-Plan→Build-Result→Ship-Packet flow; registry metadata keeps `nonPiHarnessSupport: deferred_blocked`, `adapterRuntimeImplemented: false`, and meta `outputAuthority: recommendation_only`; no tracked diffs appear for root/package/lockfile/workspace/decision/artifact/sibling sentinel paths.
- Evidence for NEEDS-FIX:
  - `policy-gap-witness.output.json` case `missing-independent-validator`: a connected active stable/core specialist with `validatorRefs=[]` returned `actualOk: true` and no errors. DL-05 requires every load-bearing stable/core producer to name an independent default validator or be explicitly blocked; accepting this weakens no-self/independent validation policy.
  - `policy-gap-witness.output.json` case `allow-dormant-without-rationale`: an active stable/core entry with only a self `registry_entry_for` link plus `allowDormant=true` and no rationale returned `actualOk: true` and no errors. The Q06 requirement allows disconnected stable/core entries only with an explicit allowed dormant/deprecated/sample rationale; a bare boolean silently bypasses graph/orphan validation.
- Blockers/rulings needed: none; both defects are fixable within Q06-owned registry source/tests/fixtures.
- Next step: final report classification and handoff to Q06 fixer.

## Final verdict
NEEDS-FIX

Severity classification: major-local.

Q06 fix closed the previously demonstrated self-only link, disconnected component, missing top-level link, evidence-reference, and validator/fixer wrong-type cases, and real-boundary positive/package witnesses pass. Q06 still cannot close because DL-05 graph/validator policy remains permissive for (1) load-bearing stable/core producers with no independent validator and (2) bare `allowDormant=true` without explicit rationale.

## Findings

### F1 — major-local — Stable/core load-bearing producers can omit independent validators
- Evidence: `revalidation-evidence/outputs/policy-gap-witness.output.json` case `missing-independent-validator` returned `actualOk: true`, `actualRuleIds: []` for a connected active stable/core specialist with `validatorRefs=[]`.
- Contract violated: DL-05 validator/fixer and no-self-validation policy requires every load-bearing producer agent to name an independent default validator or be explicitly blocked from load-bearing use; validators themselves require appropriate registry entries and maturity evidence.
- Required fix: add a DL-05 policy rule for stable/core load-bearing producer entries requiring at least one non-self required `validatorRefs` target of type validator/reviewer unless a typed explicit non-load-bearing/dormant/deprecated/sample rationale applies; add positive/negative fixtures and public API witnesses.

### F2 — major-local — Dormant graph bypass accepts no-rationale stable/core orphans
- Evidence: `revalidation-evidence/outputs/policy-gap-witness.output.json` case `allow-dormant-without-rationale` returned `actualOk: true`, `actualRuleIds: []` for an active stable/core entry reachable only from itself with `extensions.dev.vibe.registry.allowDormant=true` and no rationale.
- Contract violated: Q06 graph/orphan requirement says active stable/core entries disconnected from the loaded registry graph must reject unless an explicit allowed dormant/deprecated/sample rationale applies. A bare boolean is a silent fallback, not explicit rationale.
- Required fix: require typed dormant metadata with owner/rationale/status or equivalent policy fields before bypassing reachability/unused checks; add negative for bare `allowDormant` and positive for any explicitly allowed dormant/deprecated/sample case.

## Closure evidence summary
- Safe package commands: `typecheck`, `test:fixtures`, and `build` all exit 0 (`revalidation-evidence/outputs/safe_package_commands.txt`). In-place `test` was not run because it rewrites product `.generated-fixtures`; equivalent adversarial harnesses used validation-owned carriers.
- Positive real-boundary: actual core entries, fixture entries, and 28 evidence packets validate through I-01A and load through public registry API (`positive-boundary-witness.output.json`).
- Required prior-finding adversarial negatives: 34-case witness exits 0 and rejects graph/orphan, evidence-reference, ref-type, existing negative, scope, domain, meta, and adapter cases (`adversarial-negative-witness.output.json`).
- Dirty-tree safety: validation writes are confined to this report and `revalidation-evidence/**`; tracked sentinel diff names remain empty; broad untracked root/sibling/Q06 baseline is recorded as greenfield dirty-tree state, not a cleanup requirement.

## Blockers
None. This is a Q06-owned fix requirement, not a validation blocker.

## Next step
Route a Q06 fixer to repair F1/F2 within Q06-owned paths, then rerun package commands, real-boundary witnesses, and independent revalidation.
