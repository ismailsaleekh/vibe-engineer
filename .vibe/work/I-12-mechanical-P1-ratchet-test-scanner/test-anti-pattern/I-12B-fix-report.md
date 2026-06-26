# I-12B Post-Validation Fix Report

## Status
- Stage: targeted witnesses complete
- Verdict: DONE for fix lane; pending independent post-fix revalidation
- Created first per checkpointing requirement before source reads or product edits.
- Independent validation defects in scope: F1 tautological smoke assertions accepted; F2 missing/unread public-claim source accepted; F3 malformed `maxFileBytes` runtime option accepted.

## Scope
- Task: fix independent validation `critical`/`major-local` findings for I-12B test anti-pattern scanner only.
- Owned report path: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-fix-report.md`

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
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.d.ts`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs`
- Representative fixture policies/tests under `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/**`
- Validator-owned adversarial witness `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/validation-evidence/i12b-validation-witness.mjs` (read-only reference)

## Files changed
- `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-fix-report.md` (this report)
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/*/test-anti-pattern.policy.json` (valid JSON policies gained explicit `requiredClaimText`)
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/smoke-tautology/**`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/missing-public-claim-source/**`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/public-claim-source-mismatch/**`

## Evidence
- Source reading complete. Validation artifact final verdict `NEEDS-FIX` / `major-local` with F1-F3 root-cause requirements.
- Scanner root causes confirmed in source: meaningful assertion count treats vacuous assertions as meaningful, public claim coverage never reads `claimPath`, and options only reject unknown keys without type/range validation.
- Implemented AST-level vacuous literal assertion classification, bounded public-claim source reads/content binding, and runtime option schema/range validation.
- Added owned regression fixtures/witness expectations for tautological smoke assertions, missing claim source, claim text mismatch, and malformed `maxFileBytes`.

## Commands run
1. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck` — exit 0. Evidence: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/typecheck-evidence/test-anti-pattern-typecheck.json`.
2. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 0. Evidence: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/witness-evidence/test-anti-pattern-witness.json`.
3. `git status --short -- <I-12B owned paths + forbidden sentinels> && git diff --name-only -- <same>` — exit 0. Evidence: output showed I-12B paths plus pre-existing untracked sentinel surfaces; no tracked diff names in this no-HEAD/untracked repo.
4. `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern` — exit 1 expected no-match; no production/testing-package dependency reference introduced.
5. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck && node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 0 after strengthening literal-subject assertion handling; same evidence files refreshed.
6. Final `git status --short -- <I-12B owned paths + forbidden sentinels> && git diff --name-only -- <same>` — exit 0; same dirty-tree shape, with no out-of-scope tracked diff names.
7. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck && node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs && rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern` — exit 1 because final `rg` had expected no matches; both witness commands printed `ok:true` before the expected no-match.

## Targeted evidence
- F1: `smoke-tautology` fixture now fails via `test.no-meaningful-assertions` and also emits `test.smoke-only`; scanner no longer counts literal-subject assertions such as `expect(true).toBe(true)` or `expect("loaded").toBe("loaded")` as meaningful AST assertions.
- F2: `missing-public-claim-source` now fails via `public-claim.source-unreadable`; `public-claim-source-mismatch` fails via `public-claim.source-missing-text`; public claims are bounded-read from `claimPath` before coverage is accepted.
- F3: malformed runtime `{ maxFileBytes: "not-a-number" }` now fails closed via `policy.invalid-validator-option`; unknown options still fail via `policy.unknown-validator-option`.
- Required positives still pass: meaningful explicit assertions, allowed skipped metadata, normalized snapshot, and regression failure-shape fixture in `positive`.
- Existing negatives still pass, including exit-code-only, no assertions, smoke-only, happy-path-only risky behavior, weak count, silent fallback, skipped metadata, volatile snapshot, setup/resource failures, parser-self-agreement, public claim gap, malformed/missing policy, path traversal, parser failure, and untyped finding rejection.
- Real-boundary witness remains actual source module over real fixture workspaces with `parser: "typescript"` and `proofMode: "typescript-ast"`.

## Dirty-tree / ownership notes
- Edited only I-12B owned product fixture/source paths and I-12B workdir report/evidence.
- Did not edit root manifests, lock/workspace files, package manifests, aggregate/P0/I-11/contracts/testing/CI/scripts/infra/docs surfaces; scoped status shows those as pre-existing untracked baseline in this repo.
- No `git stash/reset/clean/checkout/restore`, commit, push, package install/add/update/remove, or package-manager mutation used.

## Blockers
- None.

## Next step
- Stop for independent post-fix revalidation; do not claim truth-green.
