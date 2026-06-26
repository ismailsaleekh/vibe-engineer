# I-12B Third Fix Report

## Status
- 2026-06-26: DONE for third fix implementation. This is implementer evidence only; independent revalidation must judge truth-green.

## Files inspected
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-12-mechanical-P1-ratchet-test-scanner-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12B-implementation.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12B-post-validation-fix.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12B-second-post-fix-fix.md`
- User-provided validated prompt `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12B-third-post-fix-fix.md`
- Prior reports/artifacts: `I-12B-implementation-report.md`, `I-12B-validation-artifact.md`, `I-12B-fix-report.md`, `I-12B-post-fix-revalidation-artifact.md`, `I-12B-second-fix-report.md`, `I-12B-second-post-fix-revalidation-artifact.md`
- Second post-fix revalidation witness/result under `second-post-fix-revalidation-evidence/`
- Read-only adjacent contract surfaces: `packages/mechanical-gates/src/p0/boundaries/contracts.js`, `packages/mechanical-gates/src/aggregate/index.js`, `packages/mechanical-gates/src/aggregate/index.d.ts`, `packages/mechanical-gates/src/p1/schema-contract-strictness/index.ts`, `validate-schema-contract-strictness.ts`
- Current I-12B product files: `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`, `index.d.ts`, `fixtures/p1/test-anti-pattern/witness.mjs`, `typecheck-consumer.ts`, and workspace inventory under `fixtures/p1/test-anti-pattern/workspaces/**`.

## Files changed
- `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-third-fix-report.md`
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/positive/tests/meaningful.test.ts`
- Added product fixture workspaces under `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/`: `typescript-wrapper-literal-alias-tautology/**`, `skipped-public-claim-only/**`, `skipped-risky-negative-only/**`.

## Root cause / implementation notes
- SPF1 fixed in `index.js` with AST-based `unwrapExpression()` over parenthesized, `as`, type assertion, `satisfies`, and non-null expression wrappers. Literal value/identity, literal binding, and expression self-comparison now classify unwrapped expressions before deciding vacuous literal assertions.
- SPF2/SPF3 fixed in `index.js` by carrying per-test facts (`executable`, `assertionCount`, `meaningfulAssertionCount`, `hasFailureShape`, `skipped`) from `inspectTestFile()` into `inspectPolicyCoverage()`; public-claim and risky behavior closure now considers only executable, non-skipped tests with meaningful assertions, and risky closure still requires failure-shape evidence when policy requires it.
- Positive no-false-positive fixture updated so a subject-derived alias (`actualStatus = result.status`) compared with a literal expected alias still passes with another semantic assertion.
- Negative product fixtures added for exact `as const` literal alias tautology, skipped public-claim-only coverage, and skipped risky-negative-only coverage.

## Commands and evidence
- Preflight dirty-tree/status command from repo root: `git status --short -- packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json packages/mechanical-gates/package.json packages/mechanical-gates/tsconfig.json packages/mechanical-gates/src/aggregate packages/mechanical-gates/src/p0 packages/mechanical-gates/fixtures/p0 packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet packages/mechanical-gates/src/p1/schema-contract-strictness packages/mechanical-gates/fixtures/p1/schema-contract-strictness packages/contracts packages/testing .github scripts infra docs && git diff --name-only -- <same paths>` — exit 0. Evidence: no-HEAD repo reports I-12B owned paths and sibling/forbidden sentinels as untracked baseline; `git diff --name-only` emitted no paths.
- Fixture inventory command: `find packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces -maxdepth 3 -type f | sort` — exit 0; showed current owned workspace files.
- Syntax check: `node --check packages/mechanical-gates/src/p1/test-anti-pattern/index.js && node --check packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 0.
- Required typecheck witness: `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck` — exit 0; evidence path `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/typecheck-evidence/test-anti-pattern-typecheck.json`.
- Required real-boundary witness: `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 0; evidence path `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/witness-evidence/test-anti-pattern-witness.json`.
- Regression rerun combined command after exact `as const` fixture adjustment: `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck && node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 0.
- Required scanner syntax check: `node --check packages/mechanical-gates/src/p1/test-anti-pattern/index.js` — exit 0.
- Required dependency-leak check: `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern` — exit 1 expected no-match; no testing dependency/reference leak.
- Final dirty-tree/status command with the same scoped paths as preflight — exit 0. Evidence: same no-HEAD untracked baseline shape for owned and sibling/forbidden sentinels; `git diff --name-only` emitted no paths.

## Positive / negative / regression / real-boundary evidence
- Positive fixture `positive` passes through actual scanner with real discovered file `tests/meaningful.test.ts`, `testCaseCount: 5`, `parser: typescript`, `proofMode: typescript-ast`.
- Valid subject-derived alias compared to literal expected alias passes in `positive` public-claim test: `actualStatus = result.status`, `expectedStatus = "documented"`, plus `expect(result.count).toBe(3)`.
- Product literal-alias public-claim tautology still fails with `test.no-meaningful-assertions`.
- New exact `as const` wrapper fixture `typescript-wrapper-literal-alias-tautology` fails with `test.no-meaningful-assertions`.
- New skipped public-claim-only fixture with complete `@owner`, `@date`, `@reason` metadata fails with `public-claim.coverage-gap` and no skip-metadata finding is required for closure.
- New skipped risky-negative-only fixture with complete skip metadata and failure-shape comment fails with `risky-behavior.happy-path-only`.
- F2/F3 regressions preserved in witness: `missing-public-claim-source` -> `public-claim.source-unreadable`, `public-claim-source-mismatch` -> `public-claim.source-missing-text`, malformed `maxFileBytes` -> `policy.invalid-validator-option`, unknown option -> `policy.unknown-validator-option`.
- Original required negatives still exercised in the actual scanner witness: exit-code-only, no assertions, smoke-only, smoke-tautology, happy-path-only, weak count, silent fallback, skipped missing metadata, volatile snapshot, setup/resource failures, parser self-agreement, public-claim gap, regression missing shape, malformed/missing policy, path traversal, parser failure, untyped finding rejection.
- Real-boundary witness imports actual `packages/mechanical-gates/src/p1/test-anti-pattern/index.js` and calls `validateTestAntiPatterns(projectRoot, options)` over real on-disk fixture workspaces/source files.

## Dirty-tree / ownership notes
- Dirty tree is baseline. No concrete ownership conflict found in I-12B-owned paths from path-scoped evidence.
- Edits stayed within I-12B owned paths and I-12B workdir report/evidence.
- Did not edit root manifests, lock/workspace files, package manifests, aggregate, P0, I-11/schema-contract strictness, I-12A/quality-ratchet, I-12C, I-13, I-18, I-20, contracts, testing, CI/scripts/infra/docs surfaces.
- No `git stash`, `git reset`, `git clean`, `git checkout`, `git restore`, commit, push, package install/add/update/remove, or package-manager mutation used.

## Blockers
- None.

## Next step
- Stop for independent third post-fix revalidation; do not claim truth-green.
