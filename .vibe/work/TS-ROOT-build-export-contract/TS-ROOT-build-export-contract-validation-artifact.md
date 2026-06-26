# TS-ROOT Build/Export Contract — Validation Artifact

## Verdict

- verdict: `NEEDS-FIX`
- severity: `major-local`
- downstream gate: `I-11/root-baseline/shared-package lanes BLOCKED` — TS-ROOT validation is not PASS because the build/export contract schema/JSON has blocking coverage/fail-closed gaps.
- protected-drift route: `I-09A protected-drift routing: BLOCKED` — TS-ROOT validation is not PASS; I-09A post-fix validation remains blocked until TS-ROOT is fixed and independently revalidated PASS.
- `TS-09V`: remains gated on independent `I-09S + I-09A PASS`; `packages/verification/**` was not edited by this validator and current `packages/verification/package.json` still exports `./src/index.js` as TS-09V debt.

## Inspected / changed summary

Inspected: mandatory harness-starter docs/HLO prompt/status/ledger/readiness artifacts; implementation report/evidence; actual `package.json`, `turbo.json`, `tsconfig.base.json`, build-export contract schema/JSON, `packages/verification/package.json`, workspace/lock/package manifests/tsconfigs/source/dist blast-radius surfaces.

Implementation-owned product changes observed read-only: root `package.json` scripts, `turbo.json`, and `packages/mechanical-gates/src/p0/build-export-contract/{build-export-contract.schema.json,build-export-contract.json}`. Validator changed only the validation report/artifact plus `validation-evidence/**` and `validation-command-log/**`.

Dirty-tree safety: repo has no HEAD and broad untracked baseline; no clean tree was required. No stash/reset/clean/checkout/restore, install/add/update/remove, lockfile mutation, package-manager mutation, or product build-output write was performed. Final protected hash diff (`011`) was empty.

## Finding

### F-MAJOR-01 — incomplete/flexible build-export contract schema coverage

Severity: `major-local`.

Evidence: `validation-evidence/structured-contract-validator-result.json` from command `004` reports:
- `CONTRACT_EXCEPTION_CLASSES_MISSING`: contract JSON lacks exact exception classes required by the TS amendment.
- `SCHEMA_PRESERVED_SCRIPTS_NOT_FAIL_CLOSED`: schema only requires `workspace:graph`, not `workspace:surface`.
- `SCHEMA_TS09V_PASSES_NOT_FAIL_CLOSED`: schema only requires `I-09A`, not both `I-09S` and `I-09A`.
- `SCHEMA_PACKAGE_EXPORT_POLICY_FREEFORM`, `SCHEMA_GENERATED_DIST_POLICY_FREEFORM`, `SCHEMA_PACKAGE_TSCONFIG_POLICY_FREEFORM`: key policies are freeform `requirements: string[]`, not typed fail-closed fields.

Fix routing: TS-ROOT owner should tighten `packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.schema.json` and `.json`; validator made no product edits.

## Evidence summary

- Positive: root `build/typecheck/test` scripts delegate to `pnpm exec turbo run <task>`; `workspace:graph` and `workspace:surface` remain; Turbo tasks are exactly `build/typecheck/test`; strict TS flags hold and `allowJs` is absent.
- Negative: validator-owned fixtures rejected weakened strictness, `allowJs`, Turbo bypass/missing task, source-JS export/bin final state, generated dist without TS/declaration/build evidence, missing `I-09S` TS-09V deferral, and production-JS final allowlist.
- Real boundary: final transient witness command `009` ran `pnpm run build` in validator-owned workspace, exercising root script → Turbo → `@vibe-engineer/orchestration` build; consumer import resolved to validation-owned `packages/orchestration/dist/src/index.js` with declaration present.
- Regression: audited 43 production JS debt files remain present; `packages/verification/package.json` remains TS-09V debt; baseline-vs-final protected hash diff exit 0 proves validator did not mutate protected product paths.

## Command table

| id | cwd | command | exit | evidence |
| --- | --- | --- | ---: | --- |
| 001 | target repo | `git status --short --untracked-files=all` | 0 | `validation-command-log/001-git-status-short.stdout` |
| 002 | target repo | baseline protected hashes | 0 | `validation-command-log/002-baseline-protected-hashes.stdout` |
| 003 | target repo | implementer evidence inventory | 0 | `validation-command-log/003-implementer-evidence-inventory.stdout` |
| 004 | target repo | structured contract validator | 1 | `validation-evidence/structured-contract-validator-result.json` |
| 005-006 | target repo | transient witness setup attempts | 1/1 | `validation-command-log/005-*`, `006-*` |
| 007-009 | target repo | transient root/Turbo/export witness reruns | 0/0/0 | `validation-evidence/real-boundary-output/real-boundary-root-turbo-witness-result.json` |
| 010 | target repo | final protected hashes | 0 | `validation-command-log/010-final-protected-hashes.stdout` |
| 011 | target repo | baseline/final protected hash diff | 0 | `validation-command-log/011-protected-hash-diff.stdout` |
| 012 | target repo | final targeted git status | 0 | `validation-command-log/012-final-targeted-git-status.stdout` |
| 013 | target repo | supplemental read-only sentinels | 0 | `validation-command-log/013-supplemental-readonly-sentinels.stdout` |

## Validator write scope

Changed by validator only: this report/artifact plus `validation-evidence/**` and `validation-command-log/**` under `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/TS-ROOT-build-export-contract/`.
