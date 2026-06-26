# I-13 Post-Fix Independent Validation Artifact

## Status checkpoint 0 — artifact created first
- Verdict: IN-PROGRESS
- Severity: unclassified
- Created before source/product inspection or validation commands.
- Owned write paths: this artifact and `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence/**` only.
- Files inspected/changed so far: changed this artifact only; no product files inspected or edited.
- Evidence: none yet.
- Blockers: none yet.
- Next step: create evidence directory, capture dirty-tree/path-scoped inventories, then read source truth.

## Status checkpoint 1 — report-first dirty-tree/path inventory captured
- Verdict: IN-PROGRESS
- Severity: unclassified
- Files changed by validator: this artifact; evidence script/output under `post-fix-validation-evidence/`.
- Product edits: none.
- Evidence files:
  - `post-fix-validation-evidence/01_dirty_tree_inventory.sh`
  - `post-fix-validation-evidence/01_git_identity.txt`
  - `post-fix-validation-evidence/01_git_status_scoped.txt`
  - `post-fix-validation-evidence/01_git_diff_name_only_scoped.txt`
  - `post-fix-validation-evidence/01_git_diff_stat_scoped.txt`
  - `post-fix-validation-evidence/01_git_diff_p2_code_smell.patch`
  - `post-fix-validation-evidence/01_find_inventory_scoped.txt`
- Commands recorded with cwd `/Users/lizavasilyeva/work/vibe-engineer` and exit statuses in the evidence files.
- Observations:
  - Git top-level resolves to `/Users/lizavasilyeva/work/vibe-engineer`.
  - `git rev-parse --verify HEAD` exits 128 (`fatal: Needed a single revision`), so `git diff` cannot prove changes against a commit; this is a no-HEAD/untracked-worktree limitation, not a clean-tree requirement.
  - Scoped `git status --short` reports the I-13 source/fixture/work tree plus package/workspace/P0/P1/aggregate surfaces as untracked (`??`); no tracked diff is available.
  - `find` inventory confirms P2 code-smell production currently contains only `index.ts` and `node-shims.d.ts`; `.github`, `scripts`, Pulumi files/dir are missing.
- Interpretation: validation must rely on source truth, inventories, actual file inspection, and executable witnesses rather than HEAD diffs; no forbidden git operation used.
- Blockers: none yet.
- Next step: read all source-truth documents before judging product state.

## Status checkpoint 2 — source-truth inputs read
- Verdict: IN-PROGRESS
- Severity: unclassified
- Files changed by validator: artifact only since checkpoint 1; no product edits.
- Source-truth files inspected read-only:
  - `/Users/lizavasilyeva/work/harness-starter/README.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
  - `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md` (tail/active entries through latest I-13 launch)
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-13-post-validation-fix.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-13-post-validation-fix-prompt-validation-artifact.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/I-13-validation-artifact.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/I-13-post-validation-fix-report.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`
- Source-truth summary:
  - Mechanical code-smell P2 scope must be AST/structure-first, strict TypeScript, domain-neutral, fail-closed on malformed policy, preserve stable schema/identity/calibration, and prove actual P2→I-12 ratchet seam.
  - Prior I-13 validation found critical F1/F2: `includePaths: []` and `fileSuffixes: []` silently inspected zero files and returned green; fixable inside I-13-owned P2 paths.
  - Fix report claims root-cause fix in `packages/mechanical-gates/src/p2/code-smell/index.ts`, specifically rejecting zero-length string-array policy carriers in `readStringArray`, with post-fix self-witnesses passing.
  - Package export/public package subpath and aggregate-level P2 registration remain pending serialized shared-surface handoffs; a PASS must not claim those truth-green.
  - `I-20` remains blocked until I-13 and I-18B are independently green plus later scheduler/deployment-scope authorization; no source-truth input unblocks it by this fix alone.
- Interpretation: proceed to actual on-disk product/source inspection and independent witnesses; implementer self-witnesses are not accepted as truth-green.
- Blockers: none yet.
- Next step: inspect actual current I-13 source/fixtures, sentinel surfaces, and claimed changed files/diff evidence read-only.

## Status checkpoint 3 — actual source/fixture/shared-surface inspection
- Verdict: IN-PROGRESS
- Severity: unclassified
- Files changed by validator: artifact plus evidence under `post-fix-validation-evidence/**`; no product edits.
- Files inspected read-only:
  - `packages/mechanical-gates/src/p2/code-smell/index.ts`
  - `packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts`
  - `packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`
  - `packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts`
  - P2 clean/smelly/stable/parse-failure fixtures
  - `package.json`, `pnpm-workspace.yaml`, `packages/mechanical-gates/package.json`
  - `packages/mechanical-gates/src/aggregate/index.js`, `packages/mechanical-gates/src/aggregate/p1/run-p1-aggregate.js`
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.js`
  - prior `changed-files-final.txt` and post-fix evidence summaries
- Evidence files:
  - `post-fix-validation-evidence/02_actual_source_inspection.sh`
  - `post-fix-validation-evidence/02_p2_source_fixture_inventory.txt`
  - `post-fix-validation-evidence/02_key_contract_hashes_and_lines.txt`
  - `post-fix-validation-evidence/02_sentinel_p2_mentions.txt`
  - `post-fix-validation-evidence/02_git_diff_p2_after_inspection.patch`
- Observations:
  - Current `index.ts` has `CODE_SMELL_FAMILY`/`CODE_SMELL_TOOL` as `p2.code-smell` and `CODE_SMELL_RATCHET_CARRIER_VERSION` as `quality-ratchet.findings/1`.
  - Current `readStringArray` includes the root-cause guard `value.length === 0` at line 227, so empty provided string-array policies should produce `input.invalid-option` rather than selecting zero files.
  - P2 source/fixture inventory matches the lane-owned surfaces: production source is `index.ts` plus `node-shims.d.ts`; fixtures are P2 code-smell projects, ratchet fixtures, typecheck consumer, and witness.
  - `packages/mechanical-gates/package.json` contains no meaningful P2 code-smell export; aggregate index/P1 runner contain no P2 code-smell registration. This preserves the pending package-export/aggregate handoffs rather than silently closing them.
  - `git diff -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell` remains empty due untracked/no-HEAD baseline; product state is therefore judged from actual file contents, inventories, and witnesses.
  - Existing implementer/fixer evidence claims F1/F2 pass, but this remains self-witness evidence only; independent execution is required.
- Blockers: none yet.
- Next step: run strict TypeScript/API witness and static hygiene/syntax checks, then independent P2 API regression witness.

## Status checkpoint 4 — strict TypeScript and static hygiene witnesses
- Verdict: IN-PROGRESS
- Severity: unclassified
- Files changed by validator: artifact plus evidence under `post-fix-validation-evidence/**`; no product edits.
- Evidence files:
  - `post-fix-validation-evidence/03_typecheck_static_hygiene.sh`
  - `post-fix-validation-evidence/03_tsc_noemit.txt`
  - `post-fix-validation-evidence/03_node_check_witness.txt`
  - `post-fix-validation-evidence/03_source_inventory.txt`
  - `post-fix-validation-evidence/03_production_js_inventory.txt`
  - `post-fix-validation-evidence/03_banned_escapes.txt`
  - `post-fix-validation-evidence/03_regex_string_risk.txt`
- Commands and results:
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false --lib ES2022 packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts packages/mechanical-gates/src/p2/code-smell/index.ts packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts`; exit 0.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --check packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`; exit 0.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; production source inventory; exit 0, only `index.ts` and `node-shims.d.ts`.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; production JS inventory; exit 0, empty.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; banned escape sweep for `any`, TS suppressions, `as unknown`, `as any`, eslint disables; exit 1/no matches.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; regex/string-risk sweep; exit 0 with string/path operations and AST JSON literal-shape `includes` lines, but no RegExp/`.match`/`.test` usage.
- Interpretation:
  - Strict TypeScript/API consumer witness passes.
  - MJS witness syntax passes.
  - No production JS drift under `src/p2/code-smell`.
  - No banned TS escape/suppression observed in P2 production source.
  - String operations are path/suffix/schema-prefix checks and advisory AST string-literal JSON-shape detection; no load-bearing regex replacement for typed contracts observed.
- Blockers: none yet.
- Next step: create and run independent actual P2 API + P2→I-12 ratchet regression witness under the validator evidence path.

## Status checkpoint 5 — independent actual P2 API and P2→I-12 regression witness
- Verdict: IN-PROGRESS
- Severity: unclassified
- Files changed by validator: artifact plus evidence under `post-fix-validation-evidence/**`; no product edits.
- Evidence files:
  - `post-fix-validation-evidence/04_independent_p2_api_witness.mjs`
  - `post-fix-validation-evidence/04_node_check_independent_witness.txt`
  - `post-fix-validation-evidence/04_independent_witness_run.txt`
  - `post-fix-validation-evidence/04-output/summary.json`
  - `post-fix-validation-evidence/04-output/policy-results.json`
  - `post-fix-validation-evidence/04-output/malformed-results.json`
  - `post-fix-validation-evidence/04-output/smelly-result.json`
  - `post-fix-validation-evidence/04-output/clean-result.json`
  - `post-fix-validation-evidence/04-output/stable-identity.json`
  - `post-fix-validation-evidence/04-output/ratchet-seam.json`
  - `post-fix-validation-evidence/04-output/commands/compile-p2-source.json`
- Commands and results:
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --check .vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence/04_independent_p2_api_witness.mjs`; exit 0.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node .vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence/04_independent_p2_api_witness.mjs`; exit 0.
  - Witness-internal compile command: cwd `/Users/lizavasilyeva/work/vibe-engineer`; `pnpm exec tsc --outDir .vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence/04-output/compiled-p2-source --rootDir packages/mechanical-gates/src/p2/code-smell --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false --lib ES2022 packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts packages/mechanical-gates/src/p2/code-smell/index.ts`; exit 0.
- Passing P2 API evidence:
  - Actual compiled P2 source imported from `post-fix-validation-evidence/04-output/compiled-p2-source/index.js`.
  - Constants stable: family/tool `p2.code-smell`, result schema `p2.code-smell.result/1`, finding schema `p2.code-smell.finding/1`, ratchet carrier version `quality-ratchet.findings/1`, detectors exactly the five required IDs.
  - F1 fixed: `validateCodeSmells(smellyProject, { includePaths: [] })` returns `ok:false`, `evidence.failClosed:true`, one blocking `input.invalid-option`, zero inspected/parsed files.
  - F2 fixed: `validateCodeSmells(smellyProject, { fileSuffixes: [] })` returns the same fail-closed properties.
  - Omitted options still use defaults and inspect normal TS files: smelly parsed `src/smells.ts` and failed on smells; clean parsed `src/clean.ts` and passed.
  - Valid non-empty `includePaths: ["src"]` and `fileSuffixes: [".ts"]` both parsed one file and detected smelly fixture findings.
  - Smelly fixture produced required detector findings across hard/advisory/ratcheted calibration; clean fixture passed with zero findings.
  - Malformed policy carriers all fail closed: non-object options, unknown option, unsupported detector, traversal include, absolute include, bad suffix, missing root, oversized file cap, parse failure, unknown allowlist option.
  - Stable identity proof: `stable-before` and `stable-after` identities match while evidence line moved 3→4; identity excludes line.
  - Result/finding schema assertions checked top-level schema, evidence schema, family/tool, identity shape, calibration fields, threshold shape, and hard/advisory/ratcheted blocking semantics for every finding.
- Real-boundary P2→I-12 evidence:
  - The script generated a ratchet scratch project only under `post-fix-validation-evidence/04-output/scratch-ratchet-root/**`.
  - Actual P2 finding output was converted to a `quality-ratchet.findings/1` carrier and consumed by actual `packages/mechanical-gates/src/p1/quality-ratchet/index.js#validateQualityRatchet`.
  - Unchanged baseline passed (`ok:true`), new-debt baseline failed with `debt.new-finding`, malformed carrier failed closed with `finding-carrier.schema-invalid`, and malformed runner evidence failed closed with `evidence.missing-runner`.
- Interpretation: independent real-boundary witnesses prove F1/F2 root cause fixed for lane-owned P2 API and preserve P2→I-12 ratchet compatibility.
- Blockers: none from P2 API/P2→I-12 witnesses.
- Next step: run sibling/blast-radius P0/P1 witnesses and docs/contracts/prompts consistency checks.

## Status checkpoint 6 — sibling/blast-radius P0/P1 sweep
- Verdict: IN-PROGRESS
- Severity: unclassified
- Files changed by validator: artifact plus evidence under `post-fix-validation-evidence/**`; no product edits. `TMPDIR` was set to `post-fix-validation-evidence/tmp` for witness side effects.
- Evidence files:
  - `post-fix-validation-evidence/05_sibling_blast_radius.sh`
  - `post-fix-validation-evidence/05_p0_allowlist_domain_aggregate.*`
  - `post-fix-validation-evidence/05_p0_surface_config_boundaries.*`
  - `post-fix-validation-evidence/05_p0_testing_boundary.*`
  - `post-fix-validation-evidence/05_p1_aggregate_source_check.*`
  - `post-fix-validation-evidence/05_p1_aggregate_witness_check.*`
  - `post-fix-validation-evidence/05_p1_aggregate_quality_readonly_smoke.*`
  - `post-fix-validation-evidence/05_sibling_inventory.txt`
- Commands and results:
  - cwd `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates`; `node fixtures/p0/allowlist-domain-aggregate/witness.mjs`; exit 0.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates`; `node fixtures/p0/surface-config-boundaries/witness.mjs`; exit 0.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates`; `TMPDIR=post-fix-validation-evidence/tmp node fixtures/p0/testing-boundary/witness.mjs`; exit 0; helper workspace path stayed under validator evidence tmp.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --check packages/mechanical-gates/src/aggregate/p1/run-p1-aggregate.js`; exit 0.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --check packages/mechanical-gates/fixtures/p1/aggregate/witness.mjs`; exit 0.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --input-type=module -e "import { runP1Aggregate } ... families: ['p1.quality-ratchet'] ..."`; exit 0.
- Passing evidence:
  - P0 allowlist/domain aggregate witness returned `ok:true`, P0 aggregate summary all families green, 34 negative witnesses, no testing production dependency/P1/P2 testing-boundary regression.
  - P0 surface/config/boundaries witness returned `ok:true`, strict config/governed surface/boundary positives, 54 negative witnesses, domain-neutral/fixed-stack invariants not contradicted.
  - P0 testing-boundary witness returned `ok:true`, production/test boundary positives and 9 negative witnesses; helper temp workspace was under `post-fix-validation-evidence/tmp`.
  - P1 aggregate source and witness syntax passed.
  - Read-only P1 aggregate smoke requested only `p1.quality-ratchet`; aggregate returned family `p1.aggregate`, quality-ratchet subresult `ok:true`, and expected `aggregate.omitted-family` findings for intentionally omitted P1 families.
- P1 aggregate full-witness disposition:
  - The full `fixtures/p1/aggregate/witness.mjs` writes bridge/evidence artifacts under `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/**`, outside this validator's write license, and `runP1Aggregate` does not permit bridge output under the I-13 evidence directory.
  - For I-13 post-fix truth-green, the load-bearing seam is P2 findings/carrier into actual I-12 `validateQualityRatchet`, which was proven in checkpoint 5. The P1 aggregate check here is sibling/blast-radius only; no I-13 product edit touched aggregate/P1 sources, syntax/read-only smoke passed, and package/aggregate P2 registration remains explicitly pending.
  - Therefore full P1 aggregate positive witness is not required to close this I-13 lane-owned post-fix validation; no downstream live claim depends on aggregate-level P2 registration.
- Blockers: none from sibling sweep.
- Next step: docs/contracts/prompts consistency checks and final path-scoped status/diff/inventory.

## Status checkpoint 7 — docs/contracts/prompts consistency
- Verdict: IN-PROGRESS
- Severity: unclassified
- Files changed by validator: artifact plus evidence under `post-fix-validation-evidence/**`; no product edits.
- Evidence files:
  - `post-fix-validation-evidence/06_docs_prompts_consistency.sh`
  - `post-fix-validation-evidence/06_pending_i20_rg.txt`
  - `post-fix-validation-evidence/06_docs_consistency_assertions.txt` (first assertion run had a validator-script string-matching false negative for handoff wording)
  - `post-fix-validation-evidence/06_docs_consistency_assertions.corrected.txt` (corrected assertion run exits 0)
- Commands and results:
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `rg` over I-13 artifacts, prompts, status/handoff, ledger, and strategy for pending-handoff/`I-20` terms; exit 0.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; corrected Python consistency assertions; exit 0.
- Passing consistency checks:
  - Fix report says `DONE for fixer scope`, not truth-green, and explicitly says independent post-fix revalidation remains required.
  - Fix report, prompt, and prior validation preserve package export/public package subpath and aggregate-level P2 registration as pending serialized handoffs.
  - Strategy confirms I-13 ownership is limited to P2 code-smell source/fixtures/workdir and `I-20` depends on broader DAG inputs (`I-13`, `I-18`, and others) plus DL-18.
  - Status/handoff say `I-20` remains blocked by `I-13` + `I-18B` plus fresh scheduler/deployment-scope gate.
  - Mechanical-gate docs still require AST/structure-first detectors and stable detector schema.
  - Current package manifest and aggregate sources do not register/export P2 code-smell.
  - No inspected report/source claims `I-20` is unblocked or ready due this fix alone.
- Interpretation: docs/contracts/prompts are consistent with a scoped P2 lane PASS if final status remains clean; pending package-export/aggregate seams and `I-20` blocked invariant are preserved.
- Blockers: none.
- Next step: final path-scoped status/diff/inventory and final severity/verdict synthesis.

## Status checkpoint 8 — final status/diff/inventory and verdict
- Verdict: PASS
- Severity classification: clean
- Files changed by validator: this artifact and `post-fix-validation-evidence/**` only; no product files edited.
- Evidence files:
  - `post-fix-validation-evidence/07_final_status_inventory.sh`
  - `post-fix-validation-evidence/07_final_git_status_scoped.txt`
  - `post-fix-validation-evidence/07_final_git_diff_name_only_scoped.txt`
  - `post-fix-validation-evidence/07_final_git_diff_stat_scoped.txt`
  - `post-fix-validation-evidence/07_final_git_head.txt`
  - `post-fix-validation-evidence/07_final_find_inventory.txt`
- Commands and results:
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `git status --short -- <scoped paths>`; exit 0; scoped I-13/source/fixture/work and sentinel package/root/P0/P1/aggregate paths remain untracked (`??`).
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `git diff --name-only -- <scoped paths>`; exit 0; empty due no tracked baseline.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `git diff --stat -- <scoped paths>`; exit 0; empty due no tracked baseline.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; `git rev-parse --verify HEAD`; exit 128 (`fatal: Needed a single revision`).
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`; final `find` inventories; exit 0.
- Final dirty-tree interpretation:
  - The repository still has no HEAD/tracked baseline for these paths, so tracked diffs cannot prove change boundaries. This limitation was present at start and end; no clean tree was required.
  - Final inventories show P2 production source remains `index.ts` and `node-shims.d.ts`; no P2 production JS exists.
  - `.github`, `scripts`, `infra`, `pulumi`, Pulumi files, and root `tsconfig.json` are missing in this workspace; no CI/Pulumi/deployment surface was touched by this validator or required for I-13 post-fix validation.
  - Package/root manifests, aggregate/P0/P1 sentinels remain read-only inspection/witness surfaces; no I-13 product edit to shared package exports or aggregate registration was observed.

## Final synthesis
- Final verdict: PASS.
- Final severity classification: clean.
- Product/source edits by validator: none.
- Validator-owned writes: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/I-13-post-fix-validation-artifact.md` and `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence/**` only.

### Requirements closure
- F1 root cause closed: independent actual P2 API witness proves `validateCodeSmells(smellyProject, { includePaths: [] })` returns `ok:false`, `evidence.failClosed:true`, and a typed blocking `input.invalid-option` finding; no silent zero-file greenwash.
- F2 root cause closed: independent actual P2 API witness proves `validateCodeSmells(smellyProject, { fileSuffixes: [] })` returns the same fail-closed properties.
- Omitted options still use defaults and inspect normal TS files; smelly fixture fails on required smells and clean fixture passes.
- Valid non-empty `includePaths` and `fileSuffixes` still parse source and detect smelly fixture findings.
- Malformed policy/input carriers fail closed: non-object options, unknown option, unsupported detector, traversal include, absolute include, invalid suffix, missing root, oversized file cap, parse failure, and unknown allowlist option.
- Stable result/finding schema, family/tool constants, detector IDs, identity shape, calibration fields, hard/advisory/ratcheted modes, and line-independent identity movement are independently asserted.
- Real P2→I-12 boundary is truth-proven: compiled actual P2 source output was converted into a `quality-ratchet.findings/1` carrier and consumed by actual `validateQualityRatchet`; unchanged baseline passed, new debt failed, malformed carrier/evidence failed closed.
- Strict TS/static hygiene passed: exact strict `tsc --noEmit` command exit 0; MJS syntax check exit 0; no P2 production JS; no P2 production `any`, TS suppressions, `as unknown`, `as any`, or regex detector implementation.
- Sibling/blast radius clean: P0 allowlist/domain aggregate, P0 surface/config/boundaries, and P0 testing-boundary witnesses exit 0; P1 aggregate source/witness syntax checks exit 0; P1 aggregate read-only quality-ratchet smoke proves current P1 aggregate can invoke actual quality-ratchet without writes.
- Full P1 aggregate witness not rerun because it writes outside this validator's license under I-12 workdir; it is not required for this I-13 lane-owned PASS because no P1/aggregate product surface was edited, direct P2→I-12 ratchet seam is proven, and aggregate-level P2 registration remains a pending non-green handoff.
- Docs/contracts/prompts consistency clean: fix report does not self-certify truth-green; pending shared-surface handoffs are preserved; no inspected source/report claims `I-20` is unblocked by this fix.

### Shared-surface and downstream disposition
- Package export/public package subpath registration for P2 remains pending serialized shared-surface handoff and is not claimed green.
- Aggregate-level P2 registration remains pending serialized shared-surface handoff and is not claimed green.
- PASS is scoped to the lane-owned P2 code-smell API/witnesses plus actual P2→I-12 quality-ratchet carrier seam.
- `I-20` remains blocked until I-13 and I-18B are independently green and a later scheduler/deployment-scope gate authorizes downstream work.

### Severity table
| ID | Severity | Classification evidence |
| --- | --- | --- |
| F1 | clean | Empty `includePaths: []` now fails closed through actual P2 API with typed blocking finding and failClosed evidence. |
| F2 | clean | Empty `fileSuffixes: []` now fails closed through actual P2 API with typed blocking finding and failClosed evidence. |
| Shared package export/public subpath | clean pending handoff | Still absent from package manifest, explicitly pending serialized shared-surface work, no downstream live claim. |
| Aggregate-level P2 registration | clean pending handoff | Still absent from aggregate sources, explicitly pending serialized shared-surface work, no downstream live claim. |
| Dirty-tree/no-HEAD limitation | clean limitation | Recorded at start and end; no ownership conflict; validation relied on inventories/file inspection/witnesses. |
