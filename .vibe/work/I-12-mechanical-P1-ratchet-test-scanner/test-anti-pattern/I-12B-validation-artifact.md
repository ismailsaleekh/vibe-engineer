# I-12B Validation Artifact

Status: COMPLETE
Verdict: NEEDS-FIX
Severity: major-local
Artifact path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-validation-artifact.md`
Evidence root: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/validation-evidence/`

## Checkpoint 0 — initialized

- Status: in-progress
- Role: independent adversarial validator; no product-file edits permitted.
- Allowed write scope: this artifact and validator-only evidence under `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/validation-evidence/`.
- Product source/config/manifests and listed HLO docs are read-only.
- Next step: read source-of-truth docs/prompts/reports, inspect dirty tree, then run targeted witnesses through actual scanner entrypoint.

## Checkpoint 1 — source-of-truth reading complete

- Status: in-progress; source docs/prompts/reports loaded.
- Files changed: this validation artifact only.
- Files inspected/read: all required validation-prompt sources, including `README.md`, `docs/locked-decisions.md`, `docs/verification-layer.md`, `docs/mechanical-verification-gates.md`, `docs/planning-research-backlog.md`, `guides/high-level-orchestrator-playbook.md`, master strategy, validated I-12 brief, Fork-B ruling/revalidation, I-12AB prompt validation, I-12B implementation prompt/report, ledger/status/handoff.
- Key requirements carried forward: I-12B owns only `packages/mechanical-gates/src/p1/test-anti-pattern/**`, `packages/mechanical-gates/fixtures/p1/test-anti-pattern/**`, and its workdir; no product edits by validator; scanner must be typed/AST/structured, stable finding schema, real on-disk fixture boundary, positive/negative/regression witnesses, sibling/blast-radius/dirty-tree proof; I-12C/I-13/I-20/I-18/CI/root/package surfaces remain read-only/untouchable.
- Blockers: none.

## Checkpoint 2 — product/source and dirty-tree inspection

- Status: in-progress; product inspection found no ownership-conflict blocker.
- Files changed by validator: this artifact and validator-only evidence under `validation-evidence/**`.
- Product files inspected read-only: `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`, `index.d.ts`, fixture `witness.mjs`, `typecheck-consumer.ts`, representative fixture policies/tests, `packages/mechanical-gates/package.json`, root `package.json`, workspace/tsconfig, aggregate `index.js`/`index.d.ts`, and P0 typed carrier style `src/p0/boundaries/contracts.js`.
- Runtime/dirty evidence:
  - `bg_status`: no background tasks in this Pi extension runtime.
  - Path-scoped `git status --short -- <I-12B owned + forbidden sentinels>` shows I-12B owned paths untracked plus existing dirty/untracked baseline in root/P0/I-11/I-12A/aggregate/I-18/docs sentinels; no tracked diff output from `git diff --name-only` in this no-HEAD/untracked repo.
- Implementation facts inspected:
  - Scanner exposes `validateTestAntiPatterns(projectRoot, options)`, `TEST_ANTI_PATTERN_FAMILY`, and finding assertion helpers.
  - Source imports `typescript` and uses `ts.createSourceFile`/AST traversal for test declarations, assertions, skips, snapshots, setup calls, and parser-self-agreement tokens; it also uses string/regex checks for comments/test names.
  - Finding/result carriers include `family`, `ruleId`, `severity`, `blocking`, `path`, `message`, `evidence`, `ok`, `projectRoot`, and result evidence.
  - Implementer witness imports actual lane source and exercises on-disk fixture workspaces, but writes to implementer evidence dirs; validator avoided rerunning it directly and used validation-owned witness script.

## Checkpoint 3 — independent witnesses run

Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:

1. `node --check packages/mechanical-gates/src/p1/test-anti-pattern/index.js` → exit 0; log `validation-evidence/command-logs/node-check-index.log`.
2. `node --check validation-evidence/i12b-validation-witness.mjs` → initial path bug fixed in validator-owned script, then exit 0; logs `node-check-validation-witness.log`, `node-check-validation-witness-2.log`.
3. `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM packages/mechanical-gates/fixtures/p1/test-anti-pattern/typecheck-consumer.ts` → exit 0; log `tsc-typecheck-consumer.log`.
4. `node validation-evidence/i12b-validation-witness.mjs` → exit 1; evidence `i12b-validation-witness-result.json`, stdout/stderr logs under `command-logs/validation-witness-2.*`.
5. Final path-scoped `git status --short` + `git diff --name-only` over I-12B owned paths and forbidden sentinels → exit 0; log `scoped-status-diff-final.log`.
6. `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern` → exit 1 expected no-match; log `rg-testing-boundary-product-only.log`.
7. `rg` root-cause line extraction → exit 0; log `root-cause-rg.log`.

Positive/negative witnesses that passed:

- Positive valid fixture passed with typed AST evidence: `parser: "typescript"`, `proofMode: "typescript-ast"`, discovered real file `tests/meaningful.test.ts`, `testCaseCount: 5`.
- Required negative fixtures produced expected typed rule IDs for exit-code-only, no assertions, smoke-only canned case, happy-path-only risky behavior, weak count assertion, silent fallback, missing skipped metadata, unnormalized snapshot, setup-silent-pass, missing resource, parser-self-agreement, public-claim gap, missing regression failure shape, malformed/missing policy, path traversal policy, parser failure, unknown option, and untyped finding rejection.

Adversarial witnesses that failed the implementation:

- `smoke-tautology-evades`: actual scanner returned `ok: true` and no findings for a smoke/public-claim test containing only tautological assertions (`expect(true).toBe(true)`, literal equality) plus a separate risky negative. This violates meaningful-assertion and smoke-only false-confidence requirements.
- `missing-readme-evades`: actual scanner returned `ok: true` and no findings when `publicClaims[].claimPath` pointed at missing `README.md`; implementation never bounded-reads the claim source and checks only test-name inclusion.
- `malformed-maxFileBytes-option`: actual scanner returned `ok: true` and no findings for `{ maxFileBytes: "not-a-number" }`, allowing malformed runtime config to disable the bounded-read comparison by JS coercion.

## Finding table

| ID | Severity | Finding | Evidence | Required root-cause fix |
| --- | --- | --- | --- | --- |
| F1 | major-local | Meaningful-assertion/smoke-only contract has a false negative: tautological smoke QA with two vacuous assertions is accepted. | `i12b-validation-witness-result.json` adversarial `smoke-tautology-evades` has `actualOk: true`, `findings: []`. Root code: `index.js:419-425` counts all non-exit/non-unnormalized-snapshot assertions as meaningful and only flags smoke names when meaningful assertion count is `< 2`. | Strengthen AST assertion classification so tautologies/literal self-equality/generic load assertions do not count as meaningful, and smoke-only tests cannot evade by adding multiple vacuous assertions. Add adversarial fixture/witness. |
| F2 | major-local | README/public-claim coverage is shape-only for claim source: `claimPath` is validated as a string but never read/checked, so missing README/public claim source passes. | `missing-readme-evades` has `actualOk: true`, `findings: []`. Root code: `index.js:186-188` validates only field types; `index.js:496-500` compares test names only and never calls bounded read on `claim.claimPath`. | For each `publicClaims[]` entry, normalize and bounded-read `claimPath`, fail closed on missing/unreadable/path traversal, and mechanically bind the required claim to source content/coverage policy rather than only test-name inclusion. Add missing-claim-source negative. |
| F3 | major-local | Runtime option schema is incomplete: malformed `maxFileBytes` is accepted and can disable bounded-read enforcement. | `malformed-maxFileBytes-option` has `actualOk: true`, `findings: []`. Root code: `index.js:517-526` rejects only unknown option keys and assigns `options.maxFileBytes` without type/range validation. | Validate options at runtime: `policyPath` non-empty safe string, `maxFileBytes` finite positive safe integer within an explicit cap; malformed options must return blocking typed findings before any reads. Add malformed-option negative fixtures. |

## Sibling / blast-radius / dirty-tree assessment

- Validator wrote only this artifact plus `validation-evidence/**`; no product source/config/manifests were edited.
- Final scoped status/diff evidence: `scoped-status-diff-final.log` shows dirty/untracked baseline for root/package/P0/I-11/I-12A/aggregate/I-18/docs sentinels and no tracked diff names. I-12B product source/fixtures are untracked as expected in the no-HEAD repo.
- No `@vibe-engineer/testing` reference in I-12B product source/fixtures (`rg-testing-boundary-product-only.log` exit 1).
- Aggregate `index.js`/`index.d.ts` still export only P0; I-12B did not edit I-12C aggregate surfaces.
- No evidence of I-12B edits to root/package-manager/lockfile/shared build/export/package manifest surfaces, CI/Pulumi/scripts/infra, P0, I-11, contracts, testing, I-13, I-18, or I-20 surfaces beyond existing dirty baseline.
- No `git stash`, `git reset`, `git clean`, `git checkout`, `git restore`, commit, push, package install/add/update/remove, or package-manager mutation was used.

## Final verdict

`NEEDS-FIX` / `major-local`: required scanner witnesses pass for canned fixtures, but adversarial real-boundary fixtures prove fixable false negatives and fail-closed schema gaps in the I-12B scanner. I-12B must not be treated truth-green, and I-12C/I-13/I-20 remain blocked on this lane until root-cause fixes and independent revalidation pass.
