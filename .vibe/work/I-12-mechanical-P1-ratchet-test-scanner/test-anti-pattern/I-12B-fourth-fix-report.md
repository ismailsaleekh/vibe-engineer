# I-12B Fourth Fix Report

## Current status
- DONE for fourth fix implementation. This is implementer evidence only; I-12B is not truth-green until independent revalidation PASS.
- I-12C remains blocked until both I-12A and I-12B have independent revalidation PASS recorded in HLO ledger/status.

## Files inspected
- Required HLO/source-truth: quality bar, ledger-compact, status, handoff, I-12 generated brief, I-12B implementation/fix prompts through fourth prompt.
- Prior I-12B evidence: implementation report, validation artifact, first/second/third fix reports, post-fix/second-post-fix/third-post-fix revalidation artifacts, third prompt validation artifact.
- Current I-12B product: `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`, `index.d.ts`, `packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs`, fixture workspace inventory and representative positive/skipped fixtures.
- Read-only adjacent contracts: `packages/mechanical-gates/src/p0/boundaries/contracts.js`, `packages/mechanical-gates/src/aggregate/index.js`, `index.d.ts`, `packages/mechanical-gates/src/p1/schema-contract-strictness/index.ts`, `validate-schema-contract-strictness.ts`.

## Files changed
- `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-fourth-fix-report.md`.
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`.
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs`.
- Updated existing direct skipped fixtures: `workspaces/skipped-public-claim-only/tests/case.test.ts`, `workspaces/skipped-risky-negative-only/tests/case.test.ts`.
- Added fixture workspaces under `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/`: `nested-suite-positive`, `describe-skip-public-claim-only`, `describe-skip-risky-negative-only`, `nested-describe-skip-public-claim`, `nested-describe-skip-risky-negative`, `inherited-describe-skip-public-claim`, `inherited-describe-skip-risky-negative`, `deep-describe-skip-public-claim`.
- Witness evidence refreshed under `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/typecheck-evidence/**` and `witness-evidence/**` by allowed witness commands.

## Root cause and implementation notes
- Root cause: `extractTestCases()` marked only the current `describe.skip` call skipped and recursively visited descendants without skipped ancestry, so nested `test(...)` / `it(...)` were recorded as executable meaningful tests and could satisfy public-claim/risky coverage.
- Fix: `extractTestCases(sourceFile)` now carries typed AST traversal state: `skippedAncestor` and inherited skip metadata from `describe.skip(...)` through descendant nodes.
- Descendant tests under skipped suites now get `skipped: true`, `skippedByAncestor: true`, inherited/fallback metadata for skip-policy checks, and remain non-executable/non-coverage in `inspectTestFile()` / `inspectPolicyCoverage()`.
- Preserved direct `test.skip` / `it.skip`, SPF1 literal-wrapper/alias AST unwrapping, F2/F3 public-claim/options fail-closed behavior, and typed result carrier shape.

## Commands run
1. Preflight scoped dirty-tree command: `git status --short -- <owned + sibling/forbidden sentinel paths>; git diff --name-only -- <same>` — exit 0. Evidence: no-HEAD/untracked baseline; scoped diff emitted no paths.
2. `node --check packages/mechanical-gates/src/p1/test-anti-pattern/index.js` — exit 0.
3. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck` — exit 0. Evidence: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/typecheck-evidence/test-anti-pattern-typecheck.json`.
4. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 1 initially because newly generated fixture files were malformed by shell quoting; fixed fixtures within owned paths.
5. `node --check packages/mechanical-gates/src/p1/test-anti-pattern/index.js && node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck && node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 0 after fixture rewrite; rerun again after final metadata fallback tweak — exit 0. Evidence: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/typecheck-evidence/test-anti-pattern-typecheck.json` and `witness-evidence/test-anti-pattern-witness.json`.
6. Required standalone real-boundary rerun: `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 0 before final metadata fallback tweak; combined final rerun above re-covered the real-boundary witness after the source tweak.
7. `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern` — exit 1 expected no-match; final wrapper also reported `rg_exit=1`; no dependency/reference leak.
8. Final scoped dirty-tree command with same paths as preflight — exit 0 after final source tweak. Evidence: same no-HEAD/untracked baseline; scoped diff emitted no paths.

## Positive / negative / regression / real-boundary evidence
- Positive `positive` fixture still passes; valid subject-derived alias vs literal expected alias remains accepted.
- Added `nested-suite-positive` passes with non-skipped `describe(...) -> test/it(...)` and `describe(...) -> describe(...) -> test/it(...)` coverage; witness reports `ok: true`, real file `tests/case.test.ts`, `testCaseCount: 4`.
- Direct `test.skip` and added `it.skip` public-claim-only/risky-negative-only fixtures fail with `public-claim.coverage-gap` / `risky-behavior.happy-path-only` without missing skip metadata.
- New `describe.skip` direct, nested, inherited, and deeper inherited fixtures fail through the actual scanner with expected coverage-gap/happy-path-only findings; witness output shows each new skipped-suite negative has `findingCount: 1`.
- Product literal-alias and TypeScript wrapper/as-const tautology fixtures still fail with `test.no-meaningful-assertions`.
- F2/F3 regressions preserved: missing/mismatched public claim source and malformed/unknown options fail closed with required rule IDs.
- Real-boundary witness imports actual lane source and calls `validateTestAntiPatterns(projectRoot, options)` over real on-disk fixture workspaces/source files; no hardcoded scanner result is used.

## Dirty-tree / ownership notes
- Dirty tree is baseline. No clean tree requested.
- Edits stayed within I-12B-owned source, fixtures, and workdir report/evidence paths only.
- No root manifests, lock/workspace files, package manifests, aggregate, P0, I-11/schema-contract strictness, I-12A/quality-ratchet, I-12C, I-13, I-18, I-20, contracts, testing, CI/scripts/infra/docs surfaces were edited.
- No `git stash/reset/clean/checkout/restore`, commit, push, package install/add/update/remove, or package-manager mutation used.

## Blockers
- None.

## Next step
- Stop for independent fourth post-fix revalidation; do not claim truth-green or downstream readiness.
