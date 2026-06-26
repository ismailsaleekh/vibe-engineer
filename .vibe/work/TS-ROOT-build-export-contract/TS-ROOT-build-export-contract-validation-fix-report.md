# TS-ROOT build/export contract validation-fix report

## Terminal status
- Verdict: `DONE_PENDING_INDEPENDENT_REVALIDATION`
- Scope fixed: `F-MAJOR-01 — incomplete/flexible build-export contract schema coverage`.
- Implementer note: this is not independent validation PASS; downstream gates remain blocked until a separate validator revalidates.

## Exact files changed by this fix
Product contract files:
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.schema.json`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.json`

Fix report/evidence/log paths:
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/TS-ROOT-build-export-contract/TS-ROOT-build-export-contract-validation-fix-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/TS-ROOT-build-export-contract/validation-fix-evidence/**`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/TS-ROOT-build-export-contract/validation-fix-command-log/**`

No other writes were intentionally made. Existing `validation-evidence/**`, `validation-command-log/**`, implementation witness outputs, unrelated `.vibe/work/**`, root scripts/Turbo/root tsconfig/package-manager files, package manifests, package source, package tsconfigs, product `dist/**`, CI/workflows/scripts/docs, and `packages/verification/**` were treated as read-only.

## Required source reads / inspected ground truth
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md` tail entries for TS-ROOT and I-09A protected-drift routing
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/TS-ROOT-build-export-contract/TS-ROOT-build-export-contract-implementation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/TS-ROOT-build-export-contract/TS-ROOT-build-export-contract-validation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/TS-ROOT-build-export-contract/TS-ROOT-build-export-contract-validation-artifact.md`
- Current build-export contract schema/JSON, root `package.json`, `turbo.json`, `tsconfig.base.json`, and `packages/verification/package.json`.

## Root-cause fix implemented
- Added an exact typed `exceptionClasses` array with four permitted exception/debt classes:
  - workspace surface witness is evidence-only and not production runtime/export/bin source;
  - audited production JS/MJS is migration debt, not a final allowlist;
  - `TS-09V` verification source-JS export debt is deferred;
  - transient build outputs are allowed only under `.vibe/work/TS-ROOT-build-export-contract/**`, not product `packages/**/dist/**`.
- Made `rootScripts.preserved` fail closed for both `workspace:graph` and `workspace:surface`.
- Made `ts09vDeferral.requiredIndependentPasses` fail closed for both `I-09S` and `I-09A`; `packages/verification/**` remains forbidden until ready.
- Replaced load-bearing freeform `requirements: string[]` models for package tsconfig convention, package export/types/bin convention, and generated dist policy with typed structured fields/consts/enums.
- Continued to encode root scripts, Turbo tasks, strict compiler flags, source-JS debt policy, witness policy, audited count `43`, and `TS-09V` deferral.
- Did not silently allow source-JS exports/bin or audited production JS/MJS as final state.

## Command / evidence table
| id | command | exit | evidence |
| --- | --- | ---: | --- |
| source | `tail -n 120 .../ledger-compact.md` | 0 | terminal output during source-read stage; TS-ROOT/I-09A routing read |
| 001 | targeted `git status --short --untracked-files=all -- <paths>` | 0 | `validation-fix-command-log/001-baseline-targeted-git-status.stdout` |
| 002 | baseline protected hash inventory | 0 | `validation-fix-command-log/002-baseline-protected-hashes.stdout` |
| 003 | `node validation-fix-evidence/structured-contract-witness.mjs ...` | 0 | `validation-fix-evidence/structured-contract-witness-result.json`; `validation-fix-command-log/003-structured-contract-witness.*` |
| 004 | background wrapper `b3b5857d8` for real-boundary witness | 0 | `validation-fix-command-log/004-real-boundary-witness.*` |
| 004a | transient `pnpm run build` from real-boundary witness | 0 | `validation-fix-command-log/004-real-boundary-root-pnpm-run-build.*` |
| 005 | transient consumer import of `@vibe-engineer/orchestration` | 0 | `validation-fix-command-log/005-real-boundary-consumer-import.*`; `validation-fix-evidence/real-boundary-output/consumer-import-result.json` |
| 006 | final protected hash inventory | 0 | `validation-fix-command-log/006-final-protected-hashes.stdout` |
| 007 | baseline/final hash diff excluding owned contract files | 0 | `validation-fix-command-log/007-protected-hash-diff-excluding-owned-contract.stdout` (empty) |
| 008 | final targeted git status | 0 | `validation-fix-command-log/008-final-targeted-git-status.stdout` |
| 009 | logged JSON Schema 2020-12 sanity check | 0 | `validation-fix-command-log/009-json-schema-sanity.stdout` |

## Positive structured contract witness
- Result: `validation-fix-evidence/structured-contract-witness-result.json` has `ok: true`.
- Node witness parsed actual JSON files, not regex/prose: contract schema, contract JSON, root `package.json`, `turbo.json`, `tsconfig.base.json`, and `packages/verification/package.json`.
- Python `jsonschema` Draft 2020-12 check/validation passed for the actual schema+contract.
- Witness confirmed fixed typed fail-closed coverage for exact `exceptionClasses`, exact preserved root scripts, exact `I-09S + I-09A` deferral, no freeform `requirements` keys in the three load-bearing policies, root script → Turbo declarations, Turbo tasks, and strict flags.

## Negative/fail-closed witnesses
Fixtures under `validation-fix-evidence/negative-fixtures/**` were rejected for:
- missing `exceptionClasses`;
- preserving only `workspace:graph` and omitting `workspace:surface`;
- `ts09vDeferral.requiredIndependentPasses` missing `I-09S`;
- package tsconfig/export/generated-dist policies represented only as freeform `requirements: string[]`;
- source-JS export/bin treated as allowed final state;
- audited production JS/MJS treated as final allowlist;
- weakened strict contract, weakened strict tsconfig, and `allowJs: true`.

## Regression evidence
- Audited production JS/MJS count remains `43`, all audited debt files remain present, and the contract classifies them as migration debt rather than final allowlist.
- `packages/verification/package.json` still exports `./src/index.js`, remains `TS-09V` debt, and `packages/verification/**` was not edited by this fix.
- `TS-09V` remains gated on independent `I-09S + I-09A PASS`; `packages/verification/**` remains forbidden until ready.
- Baseline/final protected hash diff excluding the two owned contract files is empty (`007`), proving no witness/fix drift in root `package.json`, `turbo.json`, `tsconfig.base.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, package manifests, package tsconfigs, package source, product `dist/**`, CI/workflows/scripts/docs, or unrelated work artifacts.

## Real build/export boundary witness
- Result: `validation-fix-evidence/real-boundary-output/real-boundary-root-turbo-export-witness-result.json` has `ok: true`.
- Owned transient workspace: `validation-fix-evidence/transient-workspaces/root-turbo-orchestration-consumer/**`.
- Ran actual root `pnpm run build`, which exercised root script `pnpm exec turbo run build` and Turbo built `@vibe-engineer/artifacts` + `@vibe-engineer/orchestration` with 2 successful / 2 total.
- Transient consumer imported `@vibe-engineer/orchestration` through package exports; resolution was under the owned transient workspace at `packages/orchestration/dist/src/index.js`, declaration file existed, and `DEFAULT_ORCHESTRATION_LIMITS.maxParallelAgents === 8`.
- Emitted JS/declaration outputs, cache, temp files, and package-resolution symlinks stayed under `validation-fix-evidence/**`, not product `packages/orchestration/dist/**` or other product `packages/**/dist/**`.
- Caveat for independent validator: Turbo reported the same environmental warning as prior validation about no locally installed Turbo and no `dist/**` output for `@vibe-engineer/artifacts#build`; command still exited 0 and all outputs were confined to the owned transient workspace.

## Dirty-tree / ownership safety
- Dirty/no-HEAD tree is expected; no clean tree requested.
- No `git stash/reset/clean/checkout/restore` was run.
- No package-manager install/add/update/remove was run; no lockfile/package-manager state mutation was performed.
- Existing validator artifacts under `validation-evidence/**` and `validation-command-log/**` were read-only and not overwritten.
- Only the two build-export contract product JSON files plus `validation-fix-*` report/evidence/log paths were written by this fix.

## Downstream routing (unchanged / still blocked)
- `I-09A protected-drift routing: BLOCKED pending independent TS-ROOT revalidation PASS`.
- `I-09B: BLOCKED pending I-09A post-fix validation PASS / W-RB2.5 truth-green`.
- `I-11/root-baseline/shared-package lanes: BLOCKED pending independent TS-ROOT revalidation PASS`.
- `I-11/root-baseline/shared-package lanes`, `I-09A`, `I-09B`, and related shared-package/root lanes must not proceed from this implementer report alone.

## Blockers
- None known within the owned fix lane.

## Next step
- Independent Triad-B revalidation must inspect the actual changed files/diffs and rerun positive/negative/regression/real-boundary witnesses before any downstream route changes.
