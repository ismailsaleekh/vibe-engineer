# TS-ROOT build/export contract post-fix validation artifact

- verdict: `PASS`
- severity: `clean`
- `I-09A protected-drift routing: PROCEED` — TS-ROOT post-fix validation passed clean; no root/shared drift, missing witness, out-of-license edit, ownership conflict, or pending-live blocker found. I-09A post-fix validation may start.
- `I-09B routing: BLOCKED pending I-09A post-fix validation PASS / W-RB2.5 truth-green` — TS-ROOT itself passed, but I-09A post-fix validation has not independently passed.
- `I-11/root-baseline/shared-package lanes: PROCEED` — TS-ROOT no longer blocks these lanes; scheduler/other lane gates still apply.

## Inspected / changed summary

Inspected actual current product/config files: root `package.json`, `turbo.json`, `tsconfig.base.json`, `packages/mechanical-gates/src/p0/build-export-contract/{build-export-contract.schema.json,build-export-contract.json}`, `packages/verification/package.json`, package manifests/tsconfigs/source/dist inventories, docs/scripts/CI surfaces, HLO docs/prompts/status/handoff/ledger, TS-ROOT implementation/prior validation/fix reports, and prior evidence/log trees.

Validator writes were limited to:
- `TS-ROOT-build-export-contract-post-fix-validation-report.md`
- `TS-ROOT-build-export-contract-post-fix-validation-artifact.md`
- `post-fix-validation-evidence/**`
- `post-fix-validation-command-log/**`

Prior `NEEDS-FIX` validation report/artifact and their `validation-evidence/**` / `validation-command-log/**` were not overwritten. Validation-fix evidence/logs and implementer witness output were read-only inputs and not overwritten.

## Command table

| id | cwd | command | exit | evidence |
| --- | --- | --- | ---: | --- |
| 001 | target repo | baseline dirty tree + protected hashes/inventories | 0 | `post-fix-validation-command-log/001-baseline-dirty-tree.log` |
| 002 | harness-starter | ledger tail/routing grep for TS-ROOT/I-09A/I-09B/I-11 | 0 | `post-fix-validation-command-log/002-hlo-ledger-tail.log` |
| 003 | target repo | post-fix structured contract validator | 0 | `post-fix-validation-evidence/post-fix-structured-contract-validator-result.json` |
| 004 | target repo/bg `b07a8e0d0` | post-fix real-boundary root/Turbo/export witness | 0 | `post-fix-validation-evidence/real-boundary-output/post-fix-real-boundary-root-turbo-witness-result.json` |
| 005 | target repo | final protected hashes, prior evidence sentinels, blast-radius scan | 0 | `post-fix-validation-command-log/006-final-regression-blast-radius.log` |
| 006 | target repo | robust manifest source-JS debt scan | 0 | `post-fix-validation-command-log/007-manifest-source-js-debt-scan.log` |
| 007 | target repo | corrected source-root JS export/bin/types debt scan | 0 | `post-fix-validation-command-log/008-manifest-source-js-debt-scan-corrected.log` |
| 008 | target repo | final post-scan protected hash diff/status | 0 | `post-fix-validation-command-log/009-final-post-scan-sentinel.log` |

No git/package-manager/install/stash/reset/clean/checkout/restore mutation commands were run.

## Evidence summary

- Positive: root `build`, `typecheck`, `test` are `pnpm exec turbo run <task>`; `workspace:graph` and `workspace:surface` remain; Turbo tasks are exactly `build/typecheck/test`; strict flags hold and `allowJs` is absent.
- F-MAJOR-01 structural fix: JSON Schema 2020-12 validation available and actual contract validates; schema/JSON require exact four `exceptionClasses`, both preserved root scripts, both `I-09S + I-09A`, typed package tsconfig/export/generated-dist policies, `additionalProperties:false`, consts/enums/bounds, and no final source-JS allowlist.
- Negative: validator-owned fixtures rejected missing/extra/malformed exception classes, missing `workspace:graph`/`workspace:surface`, missing `I-09S`/`I-09A`, freeform `requirements` policies, omitted TS-09V deferral, audited JS final allowlist, source-JS final state, weakened strict flag, `allowJs:true`, Turbo bypass/missing task, source-JS export/bin/types, and generated dist without TS/declaration/build evidence.
- Real boundary: transient owned workspace ran actual `pnpm run build` → `pnpm exec turbo run build`; Turbo built `@vibe-engineer/artifacts` and `@vibe-engineer/orchestration`; Node consumer imported `@vibe-engineer/orchestration` through package exports resolving to owned transient `packages/orchestration/dist/src/index.js` with declaration present.
- Regression/blast radius: final protected hash diff exit 0; no validator drift in root/package-manager/workspace/package manifests/tsconfigs/source/product dist/verification/docs/scripts/CI. Current 43 audited production JS/MJS remain migration debt; source-root JS package exports/bins remain debt, including `packages/verification/package.json`.

## Findings

None. Non-blocking witness caveat only: Turbo warned it used global 2.9.18 because transient workspace did not install local dependencies; root devDependency is also 2.9.18, command exited 0, and all outputs stayed validation-owned.

## TS-09V / verification package

`TS-09V` remains gated on independent `I-09S + I-09A PASS`. `packages/verification/**` was untouched by this validator; `packages/verification/package.json` still exports `./src/index.js` and is classified only as TS-09V debt, not closed or bypassed here.
