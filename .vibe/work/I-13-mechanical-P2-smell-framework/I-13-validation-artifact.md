# I-13 Implementation Validation Artifact

## Checkpoint 0 — Report initialized

- Timestamp: 2026-06-26
- Validator: independent adversarial validation for `I-13-mechanical-P2-smell-framework`.
- Current status: `in-progress`.
- Write license acknowledged: only this report and `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/**` may be written.
- Product/source inspection before this checkpoint: none.
- Commands run before this checkpoint: none.
- Files changed by validator so far: this report only.
- Blockers: none yet.
- Next step: create validation evidence directory, capture dirty-tree/status/diff/inventory evidence, then inspect controlling docs and implementation files read-only.

## Checkpoint 1 — Initial evidence directory and partial dirty-tree capture

- Current status: `in-progress`.
- Files written by validator:
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/I-13-validation-artifact.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/dirty-tree-status.txt`
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; command attempted as a grouped shell to `mkdir -p` validation evidence and capture path-scoped `git status`, `git diff --name-only`, and `find` inventories into validation-evidence. Tool output returned no stdout/stderr; only `dirty-tree-status.txt` was created from this attempt. Exact subcommand recorded in that file exited 0.
  2. cwd `/Users/lizavasilyeva/work/vibe-engineer`; command `ls -la .vibe/work/I-13-mechanical-P2-smell-framework && find .vibe/work/I-13-mechanical-P2-smell-framework -maxdepth 2 -type f | sort`; exit status 0; used only to diagnose the partial capture and list validation/implementation work artifacts.
- Evidence inspected:
  - `validation-evidence/dirty-tree-status.txt`: scoped status shows I-13/source/fixture/work paths and sentinel manifests/aggregate/P0/P1/package-root are untracked (`??`), indicating this repository has no tracked baseline for these paths or they are currently entirely untracked. No clean-tree assumption is made.
- Limitations/blockers: initial capture incomplete; must rerun formal diff/inventory evidence with exit-status files.
- Next step: rerun formal path-scoped status/diff/inventory evidence and record exact exits.

## Checkpoint 2 — Formal dirty-tree/status/diff/inventory evidence

- Current status: `in-progress`.
- Files written by validator under `validation-evidence/**`:
  - `status.scoped.stdout`, `status.scoped.stderr`, `status.scoped.status`
  - `diff-name-only.scoped.stdout`, `diff-name-only.scoped.stderr`, `diff-name-only.scoped.status`
  - `inventory.scoped.stdout`, `inventory.scoped.stderr`, `inventory.scoped.status`
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `git status --short -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell .vibe/work/I-13-mechanical-P2-smell-framework packages/mechanical-gates/src/aggregate packages/mechanical-gates/src/p0 packages/mechanical-gates/src/p1 packages/mechanical-gates/package.json package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .github scripts infra .git`; exit 0; stdout in `validation-evidence/status.scoped.stdout`; stderr in `validation-evidence/status.scoped.stderr`.
  2. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `git diff --name-only -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell .vibe/work/I-13-mechanical-P2-smell-framework packages/mechanical-gates/src/aggregate packages/mechanical-gates/src/p0 packages/mechanical-gates/src/p1 packages/mechanical-gates/package.json package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .github scripts infra`; exit 0; stdout in `validation-evidence/diff-name-only.scoped.stdout`; stderr in `validation-evidence/diff-name-only.scoped.stderr`.
  3. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `find packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell .vibe/work/I-13-mechanical-P2-smell-framework -maxdepth 8 -type f | sort`; exit 0; stdout in `validation-evidence/inventory.scoped.stdout`; stderr in `validation-evidence/inventory.scoped.stderr`.
- Evidence inspected:
  - `status.scoped.stdout`: repo reports all scoped product/package/work paths as untracked (`??`), including package/root manifests and P0/P1/aggregate sentinels. Therefore `git diff --name-only` is not sufficient as an ownership baseline for these paths.
  - `diff-name-only.scoped.stdout`: empty with exit 0, consistent with untracked/no-index limitation.
  - `inventory.scoped.stdout`: confirms I-13 lane source contains `index.ts` and `node-shims.d.ts`; fixture tree includes clean/smelly/parse-failure/stable projects, ratchet fixtures, typecheck consumer, witness harness, and existing implementer evidence artifacts.
- Dirty-tree safety limitation: because this workspace is largely untracked for the requested paths, validation must rely on path-scoped inventory, file inspection, implementer changed-file report, and sentinel source inspection rather than tracked diffs. This is recorded as a limitation, not a blocker by itself.
- Next step: read controlling source-truth docs and implementation report, then inspect I-13-owned product code and fixtures read-only.

## Checkpoint 3 — Controlling source-truth documents inspected

- Current status: `in-progress`.
- Files changed by validator: report only.
- Files inspected read-only:
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-13-implementation.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-13-prompt-validation-artifact.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md` (read through EOF using offset 373 for tail)
  - `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/I-13-implementation-report.md`
- Commands run: none in this checkpoint; read tool only.
- Source-truth summary:
  - I-13 owns only `packages/mechanical-gates/src/p2/code-smell/**`, `packages/mechanical-gates/fixtures/p2/code-smell/**`, and its workdir.
  - Required P2 source must be strict TypeScript only, with typed `validateCodeSmells`, family/tool `p2.code-smell`, stable finding/result schema, bounded reads, strict options/policy parsing, fail-closed malformed handling, AST/structure-first detectors, and no load-bearing regex/text heuristics.
  - Required detectors: `deep-control-flow-nesting`, `combinatorial-path-explosion`, `catch-log-continue`, `silent-no-op-dispatcher`, `serialized-json-assembled-as-strings` with hard/advisory/ratcheted calibration.
  - Required real-boundary seam: actual P2 output/carrier consumed by actual read-only `validateQualityRatchet` from P1/I-12, including unchanged pass, new-debt fail, malformed fail-closed.
  - Shared package exports/aggregate registration are explicitly not I-13-owned; if needed, they must be pending serialized handoff or cause BLOCKED depending on whether lane-owned API and P2→I-12 seam are truth-proven.
  - I-20 remains blocked regardless of I-13 result until the full DAG dependencies and scheduler/deployment-scope gates are clean.
- Implementation report claims: DONE within owned paths; no allowlist support; pending package export/public package subpath and aggregate-level P2 registration; P2→I-12 witness claimed through actual P1 API; P0/P1 witness evidence claimed.
- Blockers: none determined yet; claims require independent inspection and rerun.
- Next step: inspect actual I-13 product source, fixtures, implementer evidence, and sentinel sibling paths read-only.

## Checkpoint 4 — I-13 owned source/fixture/API evidence inspected read-only

- Current status: `in-progress`.
- Files changed by validator: report only.
- Files inspected read-only:
  - `packages/mechanical-gates/src/p2/code-smell/index.ts`
  - `packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts`
  - `packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts`
  - `packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`
  - `packages/mechanical-gates/fixtures/p2/code-smell/projects/smelly/src/smells.ts`
  - `packages/mechanical-gates/fixtures/p2/code-smell/projects/clean/src/clean.ts`
  - `packages/mechanical-gates/fixtures/p2/code-smell/projects/stable-before/src/stable.ts`
  - `packages/mechanical-gates/fixtures/p2/code-smell/projects/stable-after/src/stable.ts`
  - `packages/mechanical-gates/fixtures/p2/code-smell/projects/parse-failure/src/broken.ts`
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.js` and `.d.ts`
  - P2 ratchet fixture `findings.json` for unchanged/new-debt/malformed variants
  - `.vibe/work/I-13-mechanical-P2-smell-framework/changed-files-final.txt`
- Commands run: none in this checkpoint; read tool only.
- Source/API observations:
  - `index.ts` exports `CODE_SMELL_FAMILY`/`CODE_SMELL_TOOL` as `p2.code-smell`, `validateCodeSmells(projectRoot, options)`, typed result/finding/identity/calibration interfaces, and five required detector IDs.
  - Source is TypeScript in lane-owned source; no `.js` source observed in `src/p2/code-smell` inventory at this point (`compiled-p2-code-smell/index.js` is in workdir evidence, not production source).
  - Options parsing rejects non-object options, unknown options, unsupported detectors, invalid suffixes, absolute/traversal include paths, invalid max file sizes; source root/read/file-size/parse errors become blocking findings.
  - Detector implementations are AST traversal over TypeScript `SourceFile`/function/catch/switch/template/concat nodes. JSON-string detector reads string-literal content for JSON-shaped literal structure; no regex observed in source read.
  - Finding schema includes required family/rule/detector/severity/blocking/path/message/evidence plus identity/confidence/mode/threshold fields; identities include tool/rule/path/symbol/structuralSignature/contentHash and intentionally omit line from generated finding identity.
  - Fixture harness compiles the real P2 source to workdir, imports compiled API, runs smelly/clean/malformed/stable identity checks, converts P2 findings to P1 ratchet carrier, and calls actual read-only `validateQualityRatchet` from `src/p1/quality-ratchet/index.js`; harness also writes ratchet fixture files during execution.
  - Implementer `changed-files-final.txt` lists product changes only under owned P2 source/fixture paths plus I-13 workdir artifacts; no out-of-license product file is listed there.
- Potential validation focus items:
  - Because the harness rewrites lane-owned ratchet fixture files, rerunning it is within product fixture path ownership for implementer but not within validator write license; validator must not run this harness directly if it writes product fixtures. Need use read-only/adversarial scripts under `validation-evidence/**` for independent rerun where possible.
  - Stable identity uses source-excerpt/content hash as part of identity; current fixture proves line movement outside the function only. Need adversarially determine whether this satisfies required stable-identity contract.
- Blockers: none final yet.
- Next step: run independent read-only/static sweeps and write-only-under-validation-evidence witness scripts that import the real product API without modifying product fixtures.

## Checkpoint 5 — Package/root manifests inspected read-only

- Current status: `in-progress`.
- Files changed by validator: report only.
- Files inspected read-only:
  - `package.json`
  - `packages/mechanical-gates/package.json`
  - `pnpm-workspace.yaml`
  - `turbo.json`
- Commands run: none in this checkpoint; read tool only.
- Evidence/observations:
  - Root `package.json` is `type: module` and has `typescript` devDependency, so independent strict `pnpm exec tsc` witnesses can use the repo compiler without manifest edits.
  - `packages/mechanical-gates/package.json` exports P0 surfaces only and does not export P2; this matches implementer pending handoff claim and the I-13 STOP boundary forbidding shared package export edits.
  - Package scripts still point at P0 witnesses only; no I-13-owned edit to shared scripts/aggregate/package exports is present in inspected manifest content.
  - `pnpm-workspace.yaml` and `turbo.json` do not mention P2 and are shared/root surfaces outside I-13 ownership.
- Blockers: none yet; package export/aggregate disposition remains dependent on proving lane-owned API and P2→I-12 seam independently.
- Next step: run static/source sweeps and strict no-emit typecheck, then create independent validation witness scripts under `validation-evidence/**` only.

## Checkpoint 6 — Static sweeps, strict typecheck, witness syntax check

- Current status: `in-progress`.
- Files written by validator under `validation-evidence/**`:
  - `static-p2-source-inventory.*`
  - `static-p2-production-js.*` and `static-p2-production-js-grouped.*`
  - `static-banned-escapes.*`
  - `static-regex-search.*`
  - `static-string-methods.*`
  - `tsc-noemit.*`
  - `node-check-implementer-witness.*`
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `find packages/mechanical-gates/src/p2/code-smell -maxdepth 8 -type f | sort`; exit 0; stdout `validation-evidence/static-p2-source-inventory.stdout`.
  2. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `find packages/mechanical-gates/src/p2/code-smell -maxdepth 8 -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) | sort`; exit 0; stdout `validation-evidence/static-p2-production-js-grouped.stdout` (empty).
  3. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `rg "\\bany\\b|@ts-ignore|@ts-expect-error|as unknown" packages/mechanical-gates/src/p2/code-smell`; exit 1/no matches; stdout `validation-evidence/static-banned-escapes.stdout`.
  4. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `rg "RegExp|\\.match\\(|\\.test\\(|new RegExp" packages/mechanical-gates/src/p2/code-smell`; exit 1/no matches; stdout `validation-evidence/static-regex-search.stdout`.
  5. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `rg "includes\\(|startsWith\\(|endsWith\\(|replaceAll\\(" packages/mechanical-gates/src/p2/code-smell`; exit 0; stdout `validation-evidence/static-string-methods.stdout`.
  6. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false --lib ES2022 packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts packages/mechanical-gates/src/p2/code-smell/index.ts packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts`; exit 0; stdout/stderr `validation-evidence/tsc-noemit.*`.
  7. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --check packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`; exit 0; stdout/stderr `validation-evidence/node-check-implementer-witness.*`.
- Evidence/observations:
  - Source inventory contains exactly `index.ts` and `node-shims.d.ts`; grouped production-JS inventory is empty, satisfying no production `.js` drift under lane source.
  - Banned escape sweep found no `any`, `@ts-ignore`, `@ts-expect-error`, or `as unknown` in P2 production source.
  - Regex sweep found no `RegExp`, `.match(`, `.test(`, or `new RegExp` in P2 production source.
  - String-method sweep identifies path normalization/suffix logic plus JSON literal-shape detection via `text.includes("{"/"}"/":"/'"')`; this is not regex and is tied to AST string-literal/template/concat nodes, but remains a lower-confidence detector to probe in runtime witnesses.
  - Strict `tsc --noEmit` over lane source and typecheck consumer passed with repo TypeScript compiler.
  - Implementer MJS witness syntax passes, but the validator did not run the implementer witness because it writes outside validator evidence license (`witness-evidence/**`, `typecheck-evidence/**`, compiled workdir, and ratchet fixture files). Independent witness scripts will be used instead.
- Blockers: none from static/typecheck stage.
- Next step: write and run independent validation witness scripts under `validation-evidence/**` only, using compiled real P2 API and actual P1 ratchet consumer.

## Checkpoint 7 — Independent P2 witness script created under validation license

- Current status: `in-progress`.
- Files written by validator under `validation-evidence/**`:
  - `independent-p2-witness.mjs`
  - `node-check-independent-p2-witness.stdout`
  - `node-check-independent-p2-witness.stderr`
  - `node-check-independent-p2-witness.status`
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --check .vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/independent-p2-witness.mjs`; exit 0; stdout/stderr/status in `validation-evidence/node-check-independent-p2-witness.*`.
- Witness design:
  - Compiles the actual lane-owned P2 TypeScript source to `validation-evidence/compiled-p2-independent/**` and imports the compiled API.
  - Runs actual `validateCodeSmells` over product smelly/clean/stable/parse-failure fixtures and scratch projects created only under `validation-evidence/scratch-projects/**`.
  - Checks detector positives, negative clean behavior, schema/identity fields, calibration modes, malformed options/paths/oversize/parse cases, no-allowlist suppression behavior, and stable identity line movement.
  - Builds ratchet artifacts only under `validation-evidence/ratchet-project/**` and feeds converted real P2 findings into actual read-only `validateQualityRatchet` from `packages/mechanical-gates/src/p1/quality-ratchet/index.js`.
  - Intentionally exits non-zero if any required witness fails or an adversarial defect is observed.
- Blockers: none before execution.
- Next step: execute the independent P2 witness and inspect generated evidence/defects.

## Checkpoint 8 — Independent P2 witness first execution failed due validator-script bug

- Current status: `in-progress`; no product conclusion from this failed run.
- Files written by validator under `validation-evidence/**`:
  - `independent-p2-witness.stdout`
  - `independent-p2-witness.stderr`
  - `independent-p2-witness.status`
  - partial `scratch-projects/**` may have been initialized before script failure.
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node .vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/independent-p2-witness.mjs`; exit 1; stdout/stderr/status in `validation-evidence/independent-p2-witness.*`.
- Evidence/diagnosis:
  - `independent-p2-witness.stderr` shows `ReferenceError: value is not defined` while generating scratch fixture code in the validator script (`writeScratchProjects`), before any product API execution or summary output.
  - No `independent-output/summary.json`, malformed, scratch-smelly, or ratchet evidence existed from this failed run.
  - This is a validation harness authoring bug, not a product finding.
- Blockers: none; fix validation script under authorized `validation-evidence/**` and rerun.
- Next step: correct scratch fixture string generation in `independent-p2-witness.mjs`, syntax-check, and rerun.

## Checkpoint 9 — Independent P2 witness script corrected and syntax-checked

- Current status: `in-progress`.
- Files written/updated by validator under `validation-evidence/**`:
  - `independent-p2-witness.mjs` corrected scratch template fixture generation.
  - Preserved first failed run as `independent-p2-witness.first-run.*`.
  - `node-check-independent-p2-witness.rerun.*`.
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `cp validation-evidence/independent-p2-witness.{stdout,stderr,status} validation-evidence/independent-p2-witness.first-run.* || true`; exit 0 overall; preserves failed-run evidence under authorized evidence path.
  2. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --check .vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/independent-p2-witness.mjs`; exit 0; stdout/stderr/status in `validation-evidence/node-check-independent-p2-witness.rerun.*`.
- Evidence/observations: corrected validator script is syntactically valid.
- Blockers: none.
- Next step: rerun independent P2 witness and inspect summary/defects.

## Checkpoint 10 — Independent P2 witness rerun produced evidence and exposed fail-open option defects; scratch fixture bug remains

- Current status: `in-progress`; provisional severity includes a product `critical` fail-open malformed-handling defect pending cleaned rerun.
- Files written by validator under `validation-evidence/**`:
  - `independent-p2-witness.stdout`, `independent-p2-witness.stderr`, `independent-p2-witness.status`
  - `independent-output/**`
  - `compiled-p2-independent/**`
  - `scratch-projects/**`
  - `ratchet-project/**`
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node .vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/independent-p2-witness.mjs`; exit 1; stdout/stderr/status in `validation-evidence/independent-p2-witness.*`; summary in `validation-evidence/independent-output/summary.json`.
- Evidence/observations:
  - Actual P2 product smelly fixture via compiled API produced 8 findings; clean fixture produced 0 findings; schema checks did not report product fixture schema defects.
  - Actual P2→P1 ratchet seam succeeded in validator-owned scratch carrier: unchanged baseline `ok:true`, new-debt `ok:false` with `debt.new-finding`, malformed carrier/evidence `ok:false` fail-closed. Evidence: `validation-evidence/independent-output/ratchet-seam.json`.
  - Stable identity line-move check passed: identity before/after equal while evidence line changed 3→4. Evidence: `validation-evidence/independent-output/summary.json`.
  - Malformed cases for unknown option, non-object options, traversal include path, absolute include path, missing root, oversized file cap, parse failure, unsupported detector, unknown allowlist option, and malformed suffix failed closed as expected. Evidence: `validation-evidence/independent-output/malformed-results.json`.
  - Product defect found: `includePaths: []` over the smelly project returned `ok:true`, no findings, `inspectedFiles: []`, `parsedFiles: 0`, `failClosed:false`; `fileSuffixes: []` likewise returned `ok:true` with zero inspected files. These malformed/empty policy arrays can silently skip all files and greenwash findings, violating strict option/policy parsing and fail-closed requirements.
  - Validation-script scratch fixture issue: `scratch-smelly-result.json` contains only parse errors because the validator-generated scratch `jsonConcat` source was malformed. The scratch-specific missing-rule defects are validation harness noise and require script correction/rerun; product fixture positives remain valid.
- Blockers: none to rerun; product fail-open defect already evidenced, but scratch evidence should be cleaned to remove validator-noise from final classification.
- Next step: fix validator scratch `jsonConcat` generation under `validation-evidence/**`, preserve this run, syntax-check, and rerun independent witness.

## Checkpoint 11 — Scratch fixture corrected and witness syntax-checked again

- Current status: `in-progress` with product fail-open defect still provisional.
- Files written/updated by validator under `validation-evidence/**`:
  - `independent-p2-witness.mjs` corrected `jsonConcat` scratch source generation.
  - Preserved previous run as `independent-p2-witness.second-run.*` and `independent-output.second-run/**`.
  - `node-check-independent-p2-witness.final.*`.
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `cp validation-evidence/independent-p2-witness.{stdout,stderr,status} validation-evidence/independent-p2-witness.second-run.* && cp -R validation-evidence/independent-output validation-evidence/independent-output.second-run`; exit 0 overall.
  2. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --check .vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/independent-p2-witness.mjs`; exit 0; evidence `validation-evidence/node-check-independent-p2-witness.final.*`.
- Blockers: none.
- Next step: final independent P2 witness rerun and evidence inspection.

## Checkpoint 12 — Final independent P2 witness completed with product fail-open defects

- Current status: `NEEDS-FIX` provisional; severity `critical` for fail-open malformed policy handling in I-13-owned source.
- Files written by validator under `validation-evidence/**`:
  - refreshed `independent-p2-witness.stdout`, `independent-p2-witness.stderr`, `independent-p2-witness.status`
  - refreshed `independent-output/**`, `compiled-p2-independent/**`, `scratch-projects/**`, `ratchet-project/**`
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node .vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/independent-p2-witness.mjs`; exit 1; summary/evidence in `validation-evidence/independent-output/summary.json`.
- Passing evidence:
  - Compiled real P2 API from lane source: `validation-evidence/compiled-p2-independent/index.js`; source API constants `family/tool = p2.code-smell`.
  - Product smelly fixture: 8 findings; product clean fixture: 0 findings. Evidence `validation-evidence/independent-output/smelly-result.json`, `clean-result.json`.
  - Scratch positive fixture: 8 findings proving AST/structured detector behavior for deep hard nesting, combinatorial advisory/ratcheted/hard thresholds, catch-log-continue, switch default no-op, if/else no-op, and JSON string concat advisory. Evidence `validation-evidence/independent-output/scratch-smelly-result.json`.
  - Scratch clean fixture: `ok:true`, 0 findings. Evidence `validation-evidence/independent-output/scratch-clean-result.json`.
  - Malformed cases that passed fail-closed: unknown option, non-object options, traversal include, absolute include, missing root, oversized file cap, TypeScript parse failure, unsupported detector, unknown allowlist option, bad suffix. Evidence `validation-evidence/independent-output/malformed-results.json`.
  - Stable identity line movement passed: identity equal before/after, evidence line changed 3→4. Evidence `validation-evidence/independent-output/summary.json`.
  - P2→I-12 real-boundary seam passed: converted actual P2 finding carrier consumed by actual `validateQualityRatchet`; unchanged pass, new-debt fail, malformed evidence fail-closed. Evidence `validation-evidence/independent-output/ratchet-seam.json`.
- Product defects:
  - `includePaths: []` over the smelly project returned `ok:true`, `findings: []`, `inspectedFiles: []`, `parsedFiles: 0`, `failClosed:false`, `defaultPolicyUsed:false`.
  - `fileSuffixes: []` over the smelly project returned `ok:true`, `findings: []`, `inspectedFiles: []`, `parsedFiles: 0`, `failClosed:false`, `defaultPolicyUsed:false`.
  - These empty policy arrays silently skip all source files and can greenwash P2 findings; this violates strict option/policy parsing and malformed fail-closed requirements. Under the severity policy, permissive fail-open malformed handling that can greenwash findings is `critical`.
- Blockers: no external blocker; defect is fixable within I-13-owned `packages/mechanical-gates/src/p2/code-smell/index.ts` and fixture/witness coverage.
- Next step: sibling/blast-radius status and permitted witness reruns; then final docs/contract/shared-surface classification.

## Checkpoint 13 — Sibling/blast-radius inventory and witness reruns

- Current status: `NEEDS-FIX` provisional due I-13 fail-open defects; sibling witnesses inspected for additional blockers.
- Files written by validator under `validation-evidence/**`:
  - `sibling-inventory.*`
  - initial mis-cwd P0 witness outputs `p0-allowlist-domain-aggregate.*`, `p0-surface-config-boundaries.*`, `p0-testing-boundary.*`
  - corrected P0 witness outputs `p0-allowlist-domain-aggregate.rerun.*`, `p0-surface-config-boundaries.rerun.*`, `p0-testing-boundary.rerun.*`, `p0-testing-boundary.tmpdir.*`
  - `p1-aggregate-node-check.*`, `p1-aggregate-readonly-smoke.*`
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `find packages/mechanical-gates/src/aggregate packages/mechanical-gates/src/p0 packages/mechanical-gates/src/p1 packages/mechanical-gates/fixtures/p0 packages/mechanical-gates/fixtures/p1 -maxdepth 6 -type f | sort`; exit 0; evidence `validation-evidence/sibling-inventory.*`.
  2. cwd `/Users/lizavasilyeva/work/vibe-engineer`; initial `node fixtures/p0/{allowlist-domain-aggregate,surface-config-boundaries,testing-boundary}/witness.mjs`; exit 1 each due wrong cwd/module-not-found; evidence `validation-evidence/p0-*.stderr`; validation command error only.
  3. cwd `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates`; `node fixtures/p0/allowlist-domain-aggregate/witness.mjs`; exit 0; evidence `validation-evidence/p0-allowlist-domain-aggregate.rerun.*`.
  4. cwd `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates`; `node fixtures/p0/surface-config-boundaries/witness.mjs`; exit 0; evidence `validation-evidence/p0-surface-config-boundaries.rerun.*`.
  5. cwd `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates`; `node fixtures/p0/testing-boundary/witness.mjs`; exit 0; evidence `validation-evidence/p0-testing-boundary.rerun.*`. This witness created an OS temp helper workspace as shown in stdout, so a second run was performed with `TMPDIR` under validation-evidence.
  6. cwd `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates`; `TMPDIR=/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/tmp node fixtures/p0/testing-boundary/witness.mjs`; exit 0; evidence `validation-evidence/p0-testing-boundary.tmpdir.*`; temp helper workspace under authorized evidence tmp.
  7. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --check packages/mechanical-gates/fixtures/p1/aggregate/witness.mjs`; exit 0; evidence `validation-evidence/p1-aggregate-node-check.*`.
  8. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `node --input-type=module -e "import { runP1Aggregate } ... runP1Aggregate(process.cwd(), { families: ['p1.quality-ratchet'] }) ..."`; exit 0; evidence `validation-evidence/p1-aggregate-readonly-smoke.*`.
- Evidence/observations:
  - P0 allowlist/domain/aggregate witness passed with aggregate summary all P0 families `ok:true` and 34 negative witnesses.
  - P0 surface/config/boundaries witness passed with governed/config/boundary positives and 54 negative witnesses.
  - P0 testing-boundary witness passed; rerun with `TMPDIR` under validation evidence proves helper temp writes can be contained in authorized evidence path.
  - P1 aggregate full witness was not run because inspected `packages/mechanical-gates/fixtures/p1/aggregate/witness.mjs` and `src/aggregate/p1/run-p1-aggregate.js` write bridge/evidence artifacts under the I-12 workdir, outside validator write license. Node syntax check passed; read-only smoke of `runP1Aggregate` with only `p1.quality-ratchet` returned family `p1.aggregate`, actual `p1.quality-ratchet` subresult `ok:true`, and omitted-family findings for intentionally omitted P1 families.
  - No P0/P1 weakening was observed in rerun evidence. Full P1 aggregate positive remains not rerun due validator write-license boundary; this is recorded but does not change the I-13-owned fail-open product defect classification.
- Blockers/gaps: full P1 aggregate witness rerun is blocked by validator write license unless a ruling authorizes writes to I-12 aggregate workdir or the aggregate can be configured to write under I-13 validation evidence. Since final verdict is already `NEEDS-FIX`, this remains a validation limitation rather than a PASS-blocker analysis.
- Next step: final status/diff/inventory after validation, docs/contract consistency, allowlist/shared-surface/I-20 classification, and final severity/verdict.

## Checkpoint 14 — Final dirty-tree/status/diff/inventory evidence

- Current status: `NEEDS-FIX` provisional due I-13 fail-open defects.
- Files written by validator under `validation-evidence/**`:
  - `final-status.scoped.*`
  - `final-diff-name-only.scoped.*`
  - `final-owned-inventory.*`
  - `final-ci-infra-inventory.*`
- Commands run:
  1. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `git status --short -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell .vibe/work/I-13-mechanical-P2-smell-framework packages/mechanical-gates/src/aggregate packages/mechanical-gates/src/p0 packages/mechanical-gates/src/p1 packages/mechanical-gates/fixtures/p0 packages/mechanical-gates/fixtures/p1 packages/mechanical-gates/package.json package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .github scripts infra .git`; exit 0; evidence `validation-evidence/final-status.scoped.*`.
  2. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `git diff --name-only -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell .vibe/work/I-13-mechanical-P2-smell-framework packages/mechanical-gates/src/aggregate packages/mechanical-gates/src/p0 packages/mechanical-gates/src/p1 packages/mechanical-gates/fixtures/p0 packages/mechanical-gates/fixtures/p1 packages/mechanical-gates/package.json package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .github scripts infra`; exit 0; evidence `validation-evidence/final-diff-name-only.scoped.*`.
  3. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `find packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell .vibe/work/I-13-mechanical-P2-smell-framework -maxdepth 10 -type f | sort`; exit 0; evidence `validation-evidence/final-owned-inventory.*`.
  4. cwd `/Users/lizavasilyeva/work/vibe-engineer`; `find .github scripts infra -maxdepth 5 -type f | sort`; recorded status file 0 from shell wrapper; stderr notes `.github`, `scripts`, and `infra` are absent in this workspace; evidence `validation-evidence/final-ci-infra-inventory.*`.
- Evidence/observations:
  - Final status still shows the repo's scoped product/package/work paths as untracked (`??`), including root/package manifests, P0/P1/aggregate sentinels, P2 lane source/fixtures, and I-13 workdir. This confirms the no-HEAD/untracked limitation; no path-scoped tracked diff names exist.
  - Final owned inventory lists I-13 source/fixture files plus implementer artifacts and validator evidence only under I-13 workdir. Validator-created product-adjacent scratch/compiled/ratchet artifacts are under authorized `validation-evidence/**`.
  - `.github`, `scripts`, and `infra` are absent, so no I-13 edit to CI/scripts/infra/Pulumi paths was observed.
  - Implementer changed-files report plus inventories show no package/root manifest, shared aggregate, P0/P1 source/fixture, CI/scripts/infra, I-18/I-20, or git path listed as I-13 product changes. Because the repo is largely untracked, this is inventory/status evidence, not a tracked-diff proof.
- Dirty-tree safety classification: safe limitation for validation; no clean tree assumed and no forbidden git command used. Product defect remains unrelated to dirty-tree safety.
- Next step: final synthesis, severity table, shared-surface disposition, I-20 invariant, and final verdict.

## Final synthesis

- Final verdict: `NEEDS-FIX`.
- Final severity classification: `critical` due fail-open malformed policy handling that can greenwash findings.
- Product source edits by validator: none.
- Validator writes: report and `validation-evidence/**` only, except one noted P0 testing witness run created an OS temp helper workspace before the same witness was rerun with `TMPDIR` under validation evidence; no product source/fixture/shared path was modified by the validator.

### Findings

| ID | Severity | Path | Evidence | Required fix |
| --- | --- | --- | --- | --- |
| F1 | critical | `packages/mechanical-gates/src/p2/code-smell/index.ts` option parsing (`readStringArray` / `normalizeOptions`) | `validation-evidence/independent-output/summary.json`; `validation-evidence/independent-output/malformed-results.json` show `includePaths: []` over smelly project returns `ok:true`, zero findings, zero inspected/parsed files, `failClosed:false`. | Reject empty `includePaths` as a blocking input/policy finding; add regression witness. |
| F2 | critical | `packages/mechanical-gates/src/p2/code-smell/index.ts` option parsing (`readStringArray` / `normalizeOptions`) | Same evidence shows `fileSuffixes: []` over smelly project returns `ok:true`, zero findings, zero inspected/parsed files, `failClosed:false`. | Reject empty `fileSuffixes` as a blocking input/policy finding; add regression witness. |

### Requirements classification

- Ownership/dirty-tree safety: no I-13 out-of-license product changes observed from implementer changed-file inventory and scoped inventories/status; limitation is that repo paths are largely untracked/no tracked diff baseline.
- Product API/strict TypeScript: passed static/typecheck evidence except the fail-open option parsing defect. No production JS drift under `src/p2/code-smell`; no `any`, TS suppressions, `as unknown`, or regex patterns found.
- AST/structure-first detector behavior: passed source inspection and independent runtime witnesses for required detectors; JSON detector uses AST string-literal/template/concat nodes and is advisory.
- Witness matrix: positive, negative, calibration, malformed, schema, stable identity, and P2→I-12 seam witnesses were run independently. Malformed empty-array policy cases failed the validator due product fail-open behavior.
- P2→I-12 real producer→consumer seam: truth-proven using compiled P2 output/carrier and actual `validateQualityRatchet` with unchanged pass, new-debt fail, and malformed evidence fail-closed.
- Allowlist: not implemented; no suppressor observed. Unknown allowlist option fails closed, so omission is acceptable for initial closure after F1/F2 are fixed.
- Sibling/blast-radius: P0 witness reruns passed; P1 aggregate syntax/read-only smoke passed. Full P1 aggregate witness was not rerun because it writes I-12 workdir artifacts outside validator write license; this must be handled by ruling/configuration before a future PASS if full P1 aggregate rerun remains mandatory.
- Docs/schema/contract consistency: implementation report claims malformed fail-closed coverage, but missed empty `includePaths`/`fileSuffixes`; that report claim is stale/overbroad. Controlling docs/prompts require strict policy parsing and fail-closed behavior, so F1/F2 block green.

### Shared-surface and scheduling disposition

- Implementer pending summary `package export/aggregate registration pending serialized handoff`: accepted as an allowed pending shared-surface handoff, not the cause of failure, because lane-owned API and P2→I-12 ratchet seam are truth-proven and shared package exports/aggregate registration are outside I-13 ownership.
- No shared-surface edit/ruling is required to fix F1/F2; fixes are within I-13-owned source/fixture/witness paths.
- I-20 remains blocked regardless of I-13 result until all master-DAG dependencies are clean and a fresh scheduler/deployment-scope gate authorizes downstream work. I-13 `PASS` alone would not mark I-20 ready.
