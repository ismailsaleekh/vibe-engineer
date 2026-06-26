# I-12B Second Fix Report

## Status
- Stage: targeted witnesses complete
- Verdict: DONE for second fix lane; pending independent second post-fix revalidation
- This is fixer evidence only; no truth-green claim is made.

## Scope
- Task: fix only remaining post-fix revalidation PF1/F1 false negative in I-12B test anti-pattern scanner.
- F2/F3 were not broadened; targeted witness rerun preserved their closures.

## Files inspected
- `/Users/lizavasilyeva/work/harness-starter/README.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-12-mechanical-P1-ratchet-test-scanner-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12B-implementation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-implementation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-validation-artifact.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-fix-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-post-fix-revalidation-artifact.md`
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.d.ts`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/smoke-tautology/tests/case.test.ts`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/smoke-tautology/test-anti-pattern.policy.json`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/positive/tests/meaningful.test.ts`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/positive/test-anti-pattern.policy.json`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/witness-evidence/test-anti-pattern-witness.json`

## Files changed
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-second-fix-report.md`
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/literal-alias-public-claim-tautology/README.md`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/literal-alias-public-claim-tautology/resources/required-resource.txt`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/literal-alias-public-claim-tautology/resources/setup-sentinel.txt`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/literal-alias-public-claim-tautology/test-anti-pattern.policy.json`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/literal-alias-public-claim-tautology/tests/case.test.ts`
- Existing lane evidence files refreshed by allowed witness commands under `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/typecheck-evidence/**` and `witness-evidence/**`.

## Root cause and fix
- Post-fix revalidation remaining finding PF1: a non-smoke public-claim test with only const literal alias assertions returned `ok: true`; direct literal tautologies were fixed, but local const literal aliases and self-comparisons still counted as meaningful assertions.
- Source root cause confirmed: `isVacuousLiteralAssertion` only rejected direct literal/object/array subjects; assertion classification did not model per-test const literal bindings or matcher self-comparisons.
- Implemented AST-backed fix in `index.js`:
  - assertion records now carry matcher arguments;
  - per-test `const` literal bindings are collected from AST variable declarations;
  - meaningful assertion filtering rejects literal-bound identifier subjects, exact expression self-comparisons, and direct literal/object/array tautologies before counting assertions.
- Added real on-disk regression fixture `literal-alias-public-claim-tautology` where `public claim: validates documented behavior` uses only local const literal alias assertions and must fail with `test.no-meaningful-assertions`.
- Positive public-claim fixture remains based on object property assertions and still passes; the fix avoids a broad object-property ban.

## Commands run and exit status
1. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck` — exit 0. Evidence: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/typecheck-evidence/test-anti-pattern-typecheck.json`.
2. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 0. Evidence: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/witness-evidence/test-anti-pattern-witness.json`.
3. `git status --short -- <I-12B owned paths + forbidden/sibling sentinels> && git diff --name-only -- <same>` — exit 0. Output shape: I-12B owned paths and pre-existing untracked sentinel surfaces are visible; `git diff --name-only` produced no tracked diff names in this no-HEAD/untracked repo.
4. `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern` — exit 1 expected no-match; no production/fixture dependency reference introduced.

## Targeted evidence
- PF1 regression fixture `literal-alias-public-claim-tautology` is included in the witness negative cases and fails with expected `test.no-meaningful-assertions` (`findingCount: 2`).
- Required positive fixture still passes with typed result, real discovered test file `tests/meaningful.test.ts`, `testCaseCount: 5`, `parser: "typescript"`, and `proofMode: "typescript-ast"`.
- Existing F1 smoke-tautology fixture still fails with `test.no-meaningful-assertions` / `test.smoke-only` coverage in the full witness.
- F2 preservation: `missing-public-claim-source` still fails with `public-claim.source-unreadable`; `public-claim-source-mismatch` still fails with `public-claim.source-missing-text` in the full witness.
- F3 preservation: malformed `maxFileBytes` still fails closed with `policy.invalid-validator-option`; unknown option still fails with `policy.unknown-validator-option`.
- Existing required negatives still pass in the witness, including exit-code-only, no assertions, smoke-only, happy-path-only risky behavior, weak count, silent fallback, skipped metadata, volatile snapshot, setup/resource failures, parser-self-agreement, public-claim gap, malformed/missing policy, path traversal policy, parser failure, regression missing failure shape, and untyped finding rejection.

## Dirty-tree / ownership notes
- Edited only I-12B owned product source/fixtures and the I-12B workdir report/evidence.
- Did not edit root manifests, lock/workspace files, package manifests, aggregate/P0/I-11/I-12A/I-12C/I-13/I-18/I-20/contracts/testing/CI/scripts/infra/docs surfaces.
- Dirty tree is baseline; scoped status shows sibling/forbidden sentinels as pre-existing untracked baseline in this repo.
- No `git stash/reset/clean/checkout/restore`, commit, push, package install/add/update/remove, or package-manager mutation used.

## Blockers
- None.

## Next step
- Stop for independent second post-fix revalidation; do not claim final truth-green.
