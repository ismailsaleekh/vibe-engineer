# I-10A Q07 Revalidation Report

## Stage 0 — report initialized
- Status: in progress
- Tentative verdict: pending
- Files inspected: none yet (report-first requirement satisfied before inspection)
- Commands run: none
- Files changed by validator: `.vibe/work/I-10A-mechanical-P0-surface-config-boundaries/I-10A-revalidation-report.md`
- Evidence: report artifact created
- Blockers: none
- Next step: read required source-of-truth documents and prior reports, then update this report.

## Stage 1a — evidence directory and required-reading inventory
- Status: in progress
- Tentative verdict: pending
- Files inspected: required-reading path existence/line counts only; full reading pending
- Commands run:
  - `mkdir -p .vibe/work/I-10A-mechanical-P0-surface-config-boundaries/revalidation-evidence/logs` — exit 0
  - `wc -l <required reading files>` — exit 0
- Files changed by validator:
  - `.vibe/work/I-10A-mechanical-P0-surface-config-boundaries/revalidation-evidence/logs/required-reading-wc.txt`
  - `.vibe/work/I-10A-mechanical-P0-surface-config-boundaries/I-10A-revalidation-report.md`
- Evidence: `revalidation-evidence/logs/required-reading-wc.txt` records all required files present, 3442 total lines.
- Blockers: none
- Next step: read the required source documents/reports completely.

## Stage 1b — required reading completed
- Status: in progress
- Tentative verdict: pending
- Files inspected:
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` sections 5.3 and 5.3a for lint/format/boundary rules and mechanical quality gates
  - `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q07-brief-generated.md`
  - `.vibe/work/I-10A-mechanical-P0-surface-config-boundaries/implementation-report.md`
  - `.vibe/work/I-10A-mechanical-P0-surface-config-boundaries/I-10A-validation-report.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/q07-fix-brief-generated.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/q07-fix-brief-validation.md`
  - `.vibe/work/I-10A-mechanical-P0-surface-config-boundaries/I-10A-fix-report.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`, `ledger.md`, and `handoff.md`
- Commands run:
  - `rg -n 'Q07|I-10A|closing revalidation|strict config|NEEDS-FIX major-local|fix DONE' .pi/hlo/vibe-engineer/ledger.md` — exit 0
  - `nl -ba .pi/hlo/vibe-engineer/ledger.md | tail -n 140` — exit 0
- Files changed by validator: this report; `revalidation-evidence/logs/required-reading-wc.txt`
- Evidence summary:
  - Locked docs require deterministic mechanical P0 gates: governed quality surface, strict config guards, and package/import boundary enforcement; lint/format/boundary evidence must include actual command/rule tests, and mechanical gates must prevent fake-green quality checks.
  - Prior validation found `major-local` strict-config false-green: empty ESLint, bad Prettier, and echo-only scripts returned `ok:true`.
  - Fix brief/fix report claim structural ESLint/Prettier/script validation added, negative/regression fixtures added, and package-local/real-boundary witnesses passed.
  - Status/ledger/handoff show Q07 fix DONE but not green pending this independent revalidation.
- Blockers: none
- Next step: run required scoped dirty-state and inventory commands, store evidence under `revalidation-evidence/**`.

## Stage 2 — scoped dirty state, diffs, and inventory
- Status: in progress
- Tentative verdict: pending
- Files inspected: path-scoped git status/diff and `packages/mechanical-gates` file/forbidden-dir inventories.
- Commands run:
  - `git status --short -- packages/mechanical-gates .vibe/work/I-10A-mechanical-P0-surface-config-boundaries` — exit 0
  - `git diff --name-only -- packages/mechanical-gates .vibe/work/I-10A-mechanical-P0-surface-config-boundaries` — exit 0
  - `git status --short -- package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs prettier.config.mjs .github scripts packages/artifacts packages/core packages/testing` — exit 0
  - `git diff --name-only -- package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs prettier.config.mjs .github scripts packages/artifacts packages/core packages/testing` — exit 0
  - `find packages/mechanical-gates -maxdepth 6 -type f | sort` — exit 0
  - `find packages/mechanical-gates -type d \( -name aggregate -o -name allowlist -o -name domain-purity -o -name testing-boundary \) -print` — exit 0
- Files changed by validator:
  - `.vibe/work/I-10A-mechanical-P0-surface-config-boundaries/revalidation-evidence/logs/scoped-dirty-inventory.txt`
  - this report
- Evidence:
  - `revalidation-evidence/logs/scoped-dirty-inventory.txt`
  - Q07 scope is untracked (`?? packages/mechanical-gates/`, `?? .vibe/work/I-10A.../`), and scoped `git diff --name-only` is empty because these are untracked paths; this requires inspecting actual full files, not relying on diff.
  - Root/shared sentinel status shows untracked baseline files/packages, with empty tracked diff names.
  - Forbidden `aggregate`, `allowlist`, `domain-purity`, and `testing-boundary` directories under `packages/mechanical-gates` produced no output.
- Blockers: none
- Next step: inspect actual package manifest, source contracts/validators/declarations, fixtures, prior/fix evidence.

## Stage 3 — actual source, manifest, fixtures, and prior/fix evidence inspected
- Status: in progress
- Tentative verdict: pending, with one adversarial TS-flag gap requiring live proof
- Files inspected:
  - `packages/mechanical-gates/package.json`
  - `packages/mechanical-gates/src/p0/config-guards/{validate-strict-config.js,index.js,index.d.ts}`
  - `packages/mechanical-gates/src/p0/boundaries/{contracts.js,index.js,index.d.ts,validate-package-boundaries.js}`
  - `packages/mechanical-gates/src/p0/governed-surface/{validate-governed-surface.js,index.js,index.d.ts}`
  - `packages/mechanical-gates/fixtures/p0/surface-config-boundaries/witness.mjs`
  - `packages/mechanical-gates/fixtures/p0/surface-config-boundaries/public-api-consumer.ts`
  - valid fixture: `valid-workspace/{package.json,tsconfig.json,mechanical-surface.json,mechanical-boundaries.json,eslint.config.mjs,prettier.config.mjs,packages/**}`
  - invalid config fixtures: false-green regression, ESLint empty/downgraded/ban-ts-comment/missing JSON.parse, Prettier missing/wrong/omitted defaults, missing/placeholder/partial/unrelated scripts
  - governed-surface invalid fixtures: omitted file, duplicate row, empty tool surface, excluded path leak, missing required path
  - boundary invalid fixtures: cycle, forbidden direction, private reach-in, parser-self-agreement-only, regex-only proof
  - prior validation evidence under `.vibe/work/I-10A.../validation-evidence/config-false-green/**`
  - fix evidence `.vibe/work/I-10A.../fix-evidence/config-guards-boundary-witness.json`
  - read-only root baselines: `eslint.config.mjs`, `prettier.config.mjs`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
- Commands run: file reads only in this stage
- Files changed by validator: this report only
- Evidence summary:
  - Package manifest exports public subpaths `./p0/governed-surface`, `./p0/config-guards`, and `./p0/boundaries`; package scripts are local witness scripts (`typecheck`, `test`, `test:p0`).
  - Typed findings/results require `family`, `ruleId`, `severity`, `blocking`, `path`, `message`, and `evidence`; public declarations expose `P0Finding`/`P0ValidatorResult` and validators.
  - Boundary discovery uses TypeScript AST (`typescript` import, `ts.createSourceFile`) and rejects `regex-only` proof and parser-self-agreement-only configs.
  - Fix appears to close the prior ESLint/Prettier/script false-green in source and fixtures: ESLint rules/defaults are loaded structurally, Prettier exact defaults checked, and scripts are tokenized/checked for real tools and governed-surface coverage.
  - Fix evidence shows `valid-workspace` passes and original validation evidence false-green now fails with typed `config-guards.*` rule IDs.
  - Adversarial concern: locked mechanical spec and root baseline require `noUnusedLocals` and `noUnusedParameters`, but `validateStrictConfig()` and shipped fixture/witness required flag lists omit both. Next stage will prove whether weakening those flags false-greens through the public subpath.
- Blockers: none
- Next step: create validation-only adversarial fixture(s)/runner under `revalidation-evidence/**`, run real-boundary public-subpath checks for positive/negative/regression cases, including the suspected TS flag gap.

## Stage 4 — real-boundary revalidation runner and adversarial TS flag witness
- Status: in progress
- Tentative verdict: NEEDS-FIX
- Files inspected/created:
  - Created validation-only fixture copy `.vibe/work/I-10A.../revalidation-evidence/adversarial/no-unused-flags-weakened/**` from product `valid-workspace`, with `tsconfig.json` setting `noUnusedLocals:false` and `noUnusedParameters:false`.
  - Created validation-only runners `.vibe/work/I-10A.../revalidation-evidence/real-boundary-revalidator.mjs` and `real-boundary-revalidator-stdin.mjs`.
  - Created results `.vibe/work/I-10A.../revalidation-evidence/real-boundary-results.json` and summary `ts-no-unused-gap-summary.json`.
- Commands run:
  - `cp -R packages/mechanical-gates/fixtures/p0/surface-config-boundaries/valid-workspace .../revalidation-evidence/adversarial/no-unused-flags-weakened` and Node tsconfig mutation — exit 0
  - `node .vibe/work/I-10A.../revalidation-evidence/real-boundary-revalidator.mjs` — exit 1; validation harness issue only: CJS `require.resolve` could not resolve import-only package exports (`ERR_PACKAGE_PATH_NOT_EXPORTED`).
  - From `packages/mechanical-gates`, `node --input-type=module < .../revalidation-evidence/real-boundary-revalidator-stdin.mjs` — exit 1, expected for adversarial defect; wrote `real-boundary-results.json`.
  - Python summary extraction from `real-boundary-results.json` — exit 0.
- Files changed by validator:
  - `.vibe/work/I-10A.../revalidation-evidence/adversarial/no-unused-flags-weakened/**`
  - `.vibe/work/I-10A.../revalidation-evidence/real-boundary-revalidator.mjs`
  - `.vibe/work/I-10A.../revalidation-evidence/real-boundary-revalidator-stdin.mjs`
  - `.vibe/work/I-10A.../revalidation-evidence/logs/real-boundary-revalidator.log`
  - `.vibe/work/I-10A.../revalidation-evidence/logs/real-boundary-revalidator-stdin.log`
  - `.vibe/work/I-10A.../revalidation-evidence/real-boundary-results.json`
  - `.vibe/work/I-10A.../revalidation-evidence/ts-no-unused-gap-summary.json`
  - this report
- Evidence:
  - `real-boundary-results.json` proves actual public package subpath resolution from package context: `@vibe-engineer/mechanical-gates/p0/{governed-surface,config-guards,boundaries}` resolved through manifest exports to product source indexes.
  - Positive and required prior-fix checks passed in the real-boundary runner: valid strict config/governed/boundary fixtures `ok:true`; invalid ESLint, Prettier, script, governed-surface, boundary, false-green regression, and original validation-evidence false-green fixtures all returned `ok:false` with typed expected rule IDs.
  - Remaining failed expectation: `strict-config.adversarial-noUnusedLocals-noUnusedParameters-false` returned `ok:true`, no rule IDs, despite locked spec/root baseline requiring `noUnusedLocals` and `noUnusedParameters`.
  - `real-boundary-results.json` shows validator evidence `requiredTrueFlags` omits `noUnusedLocals` and `noUnusedParameters`; `ts-no-unused-gap-summary.json` records both as missing from validator required flags.
- Severity classification so far: `major-local` (strict TypeScript config guard family incomplete; a locked required TS weakening can false-green dependents). Could be `critical` if treated as invalid config false-green, but scoped to TS flags rather than the prior ESLint/Prettier/script false-green.
- Blockers: none
- Next step: still run package-local witness commands and final blast-radius/status sweeps, then close verdict.

## Stage 5 — package-local runner behavior
- Status: in progress
- Tentative verdict: NEEDS-FIX
- Files inspected: package-local witness output via commands.
- Commands run (all from `/Users/lizavasilyeva/work/vibe-engineer` or package dir as specified):
  - `pnpm --filter @vibe-engineer/mechanical-gates typecheck` — exit 0
  - `pnpm --filter @vibe-engineer/mechanical-gates test` — exit 0
  - `pnpm --filter @vibe-engineer/mechanical-gates test:p0` — exit 0
  - `cd packages/mechanical-gates && node fixtures/p0/surface-config-boundaries/witness.mjs` — exit 0
  - `cd packages/mechanical-gates && node fixtures/p0/surface-config-boundaries/witness.mjs --typecheck` — exit 0
- Files changed by validator:
  - `.vibe/work/I-10A.../revalidation-evidence/logs/package-local-witnesses.log`
  - this report
- Evidence:
  - `revalidation-evidence/logs/package-local-witnesses.log`
  - Product package-local witnesses pass their own 49 negative witnesses and positive governed/config/boundary checks.
  - The emitted config evidence again lists required true TS flags without `noUnusedLocals` and `noUnusedParameters`, corroborating the Stage 4 gap.
  - Public API consumer/typecheck witness loads the three package subpaths and typed boundaries API.
- Blockers: none
- Next step: final targeted contract/blast-radius sweep and verdict classification.

## Stage 6 — final blast-radius and contract sweep
- Status: complete
- Tentative verdict: NEEDS-FIX
- Files inspected: final scoped status/diff, forbidden path probes, manifest dependency keys, P0 source dirs, product/domain leakage string sweep, revalidation evidence inventory.
- Commands run:
  - `git status --short -- packages/mechanical-gates .vibe/work/I-10A-mechanical-P0-surface-config-boundaries` — exit 0
  - `git diff --name-only -- packages/mechanical-gates .vibe/work/I-10A-mechanical-P0-surface-config-boundaries` — exit 0
  - `git status --short -- package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs prettier.config.mjs .github scripts packages/artifacts packages/core packages/testing` — exit 0
  - `git diff --name-only -- package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs prettier.config.mjs .github scripts packages/artifacts packages/core packages/testing` — exit 0
  - `find packages/mechanical-gates -type d \( -name aggregate -o -name allowlist -o -name domain-purity -o -name testing-boundary \) -print | sort` — exit 0, no output
  - `find packages/mechanical-gates/src/p0 -maxdepth 1 -mindepth 1 -type d | sort` — exit 0
  - Node manifest dependency/export summary — exit 0
  - `rg -n 'packages/core|Billz|Telegram|ecommerce|inventory' packages/mechanical-gates/src packages/mechanical-gates/fixtures || true` — exit 0; only the deliberate no-`packages/core` regression assertion mentions `packages/core`.
  - `find .../revalidation-evidence -maxdepth 4 -type f | sort` — exit 0
- Files changed by validator:
  - `.vibe/work/I-10A.../revalidation-evidence/logs/final-blast-radius.txt`
  - this report
- Evidence:
  - `revalidation-evidence/logs/final-blast-radius.txt`
  - Q07 package/work paths remain untracked; scoped tracked diffs empty. Root/shared/sibling sentinels remain untracked baseline with empty tracked diff names.
  - No aggregate/allowlist/domain-purity/testing-boundary scope theft found; P0 source dirs are only `boundaries`, `config-guards`, `governed-surface`.
  - `packages/mechanical-gates/package.json` has no `dependencies` or `devDependencies`, exports only Q07-owned P0 subpaths, and scripts are package-local witnesses.
  - No installs/package-manager mutation observed by scoped status/diff; no CI/scripts/docs-decision/shared package/sibling lane edits found by scoped sweep.
- Blockers: none
- Next step: final verdict.

## Findings

| Severity | Finding | Evidence | Required fix |
| --- | --- | --- | --- |
| critical | Strict TypeScript config guard still false-greens a locked required TS flag weakening: `noUnusedLocals:false` and `noUnusedParameters:false` pass through the actual public package subpath with `ok:true` and no findings. | Locked mechanical spec and root `tsconfig.base.json` require `noUnusedLocals` and `noUnusedParameters`; `src/p0/config-guards/validate-strict-config.js` `REQUIRED_TS_FLAGS` omits both; product `valid-workspace/tsconfig.json` and `witness.mjs` required flag list omit both; `revalidation-evidence/real-boundary-results.json` failed only `strict-config.adversarial-noUnusedLocals-noUnusedParameters-false`; `revalidation-evidence/ts-no-unused-gap-summary.json` records both flags missing from validator required flags and the adversarial case `ok:true`. | Add `noUnusedLocals` and `noUnusedParameters` to the strict config contract, validator required flags, positive fixture, negative/adversarial fixture coverage, witness expectations, and declarations/evidence as needed; rerun public-subpath real-boundary and package-local witnesses. |

## Closing assessment by required family

- Governed surface: positive valid fixture and negative omitted file, duplicate row, empty tool surface, excluded path leak, and missing required path pass/fail as expected through the public package subpath.
- Strict config guard: prior ESLint/Prettier/script false-green is closed; invalid empty ESLint, missing rule, downgraded severity, invalid `ban-ts-comment`, missing raw `JSON.parse` boundary, missing/bad Prettier defaults, placeholder/missing/partial/unrelated scripts, false-green regression, and original validation-evidence fixture now fail with typed `config-guards.*` findings. However strict TS flag coverage is incomplete because `noUnusedLocals` and `noUnusedParameters` false-green.
- Boundary/package surfaces: positive valid graph passes; cycle, forbidden direction, private reach-in, parser-self-agreement-only, and regex-only proof fail; validator uses TypeScript AST import discovery.
- Package-local runner: required package-local commands and direct witness commands all exited 0, but their emitted config evidence corroborates the missing TS flags.
- Contract/schema/docs consistency: typed finding/result carrier is stable; package exports/declarations exist; locked docs/root baseline contradict the current strict config guard flag list.
- Dirty-tree/blast-radius: no root/lockfile/workspace/CI/shared/sibling tracked diffs; no forbidden mechanical lane dirs; no package deps added; untracked Q07/root/sibling paths are dirty-tree baseline and were inspected as actual files.

## Final verdict

NEEDS-FIX

Highest severity: critical.

Summary: The fix closes the prior ESLint/Prettier/script false-green, but Q07 cannot go green because the strict TypeScript config guard omits locked `noUnusedLocals`/`noUnusedParameters` enforcement and false-greens those weakened flags through the real package subpath.
