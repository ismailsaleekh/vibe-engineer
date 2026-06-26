# I-12B Implementation Report — test anti-pattern scanner

## Status
- DONE for implementation lane: scanner, fixtures, and required targeted witnesses completed.
- This is implementer evidence only; independent validation remains required by Triad discipline.

## Files inspected
- `/Users/lizavasilyeva/work/harness-starter/README.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-12-mechanical-P1-ratchet-test-scanner-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-12-fork-b-brief-revalidation-artifact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-12-fork-b-ruling-decision.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-11-test-runner-tooling.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-15-mechanical-engine.md`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/p0/boundaries/contracts.js`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/aggregate/index.js` (read-only)
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/aggregate/index.d.ts` (read-only)
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/aggregate/run-p0-aggregate.js` (read-only)
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/p1/schema-contract-strictness/index.ts` (read-only)
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/p1/schema-contract-strictness/validate-schema-contract-strictness.ts` (read-only)
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/fixtures/p1/schema-contract-strictness/witness.mjs` (read-only)
- Owned path inventories before/after implementation.

## Files changed
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`
- `packages/mechanical-gates/src/p1/test-anti-pattern/index.d.ts`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/typecheck-consumer.ts`
- `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/**`
- `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/I-12B-implementation-report.md`
- `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/typecheck-evidence/**`
- `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/witness-evidence/**`

## Implementation summary
- Family identity: `p1.test-anti-pattern`.
- Public lane API: `validateTestAntiPatterns(projectRoot, options)` from `packages/mechanical-gates/src/p1/test-anti-pattern/index.js` with declarations in `index.d.ts`.
- Real scanner behavior: discovers configured real test roots, bounded-reads policy/resources/test files, parses test files with TypeScript AST, extracts structured test declarations/assertions/skips/snapshots/setup calls/parser-self-agreement markers, and emits typed findings/results.
- Fail-closed behavior: missing/malformed/unknown policy, unknown options, path traversal, missing test roots/files/resources/sentinels, parser syntax failure, missing setup assertion, and untyped findings all fail closed.
- Domain-neutrality: fixtures and messages use generic test/resource/claim/risky-behavior vocabulary only.

## Commands run and exit status
1. `git status --short -- packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern ...forbidden sentinel paths...` — exit 0; preflight.
2. `find packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern -maxdepth 4 -type f` — exit 0; pre-implementation only report existed.
3. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck` — exit 1 initially; unavailable ambient `@types/node` assumption in witness typecheck command. Fixed by removing unnecessary `--types node`.
4. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck` — exit 0; evidence: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/typecheck-evidence`.
5. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 1 initially; normalized snapshot positive was incorrectly considered non-meaningful. Fixed scanner so only normalized snapshots count as meaningful; unnormalized snapshots still fail.
6. `node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs --typecheck && node packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs` — exit 0; evidence: typecheck JSON/logs and `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/witness-evidence/test-anti-pattern-witness.json`.
7. `git status --short -- packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern ...forbidden sentinel paths...` — exit 0; only I-12B owned paths newly appear for this lane; forbidden sentinel paths remain existing dirty/untracked baseline.
8. `git diff --name-only -- packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern ...forbidden sentinel paths...` — exit 0; no tracked diff names because repo has no HEAD/tracked baseline for these untracked files.
9. `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern` — exit 1 treated as expected no-match; no production dependency/reference introduced.
10. `find packages/mechanical-gates/src/p1/test-anti-pattern packages/mechanical-gates/fixtures/p1/test-anti-pattern .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern -type f | sort` — exit 0; final owned file inventory captured.

## Positive evidence
- Meaningful behavior test with explicit assertions passes in `workspaces/positive`.
- Skipped test with owner/date/reason metadata passes under policy in `workspaces/positive`.
- Normalized volatile snapshot passes only when `normalizeVolatileOutput(...)` wraps the snapshot subject in `workspaces/positive`.
- Regression test with explicit `@failure-shape`/failure-shape call passes in `workspaces/positive`.

## Negative evidence
Full witness exercised real fixture workspaces and observed expected typed rule IDs for:
- exit-code-only test — `test.exit-code-only`;
- no meaningful assertions — `test.no-meaningful-assertions`;
- smoke-only QA standing in for behavior — `test.smoke-only`;
- happy-path-only risky behavior — `risky-behavior.happy-path-only`;
- weak count assertion `length >= 1` / equivalent — `test.weak-count-assertion`;
- silent fallback — `test.silent-fallback`;
- skipped test without metadata — `skipped-test.missing-metadata`;
- volatile snapshot without normalization — `snapshot.volatile-without-normalization`;
- setup/resource silent-pass shape — `setup-resource.missing-assertion`;
- missing required fixture resource — `setup-resource.missing`;
- parser-self-agreement fixture — `parser-self-agreement-fixture`;
- README/public claim coverage gap — `public-claim.coverage-gap`;
- regression missing failure shape — `regression.missing-failure-shape`.

## Fail-closed / safety evidence
- Missing policy and malformed policy both produce `policy.unreadable`.
- Path traversal policy produces `discovery.test-root-invalid` and fails closed.
- Parser syntax failure produces `parser.failure`.
- Unknown validator option produces `policy.unknown-validator-option`.
- Untyped finding assertion is rejected by `assertTestAntiPatternFinding`.
- Required setup/resource sentinel failures are represented as blocking findings.

## Real-boundary evidence
- Witness imports the actual scanner module at `packages/mechanical-gates/src/p1/test-anti-pattern/index.js`.
- Scanner reads actual policy/resource/README/test files under `packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/**`.
- Positive evidence reports discovered real file `tests/meaningful.test.ts`, parser `typescript`, proof mode `typescript-ast`, and `testCaseCount: 5`.
- Negative evidence is not hardcoded pass/fail arrays detached from scanner output; witness asserts actual scanner result carriers and expected rule IDs.

## Regression / sibling / blast-radius evidence
- Path-scoped status included owned I-12B paths plus forbidden sentinels: root manifests/lock/workspace/Turbo/root config, `packages/mechanical-gates/package.json`, aggregate paths, P0 source/fixtures, I-11 source/fixtures, contracts, testing, CI/scripts/infra/docs.
- No edits were made to root manifests, lockfiles, package manifests, aggregate paths, P0, I-11, contracts, testing, CI/scripts/infra/docs, or I-13/I-18/I-20 surfaces by this lane.
- No `@vibe-engineer/testing` reference/dependency was introduced in I-12B owned paths.

## Blockers
- None.

## Dirty-tree / path ownership notes
- Dirty tree is baseline; no `git stash/reset/clean/checkout/restore`, commit, push, package install/add/update/remove, or package-manager mutation used.
- Edits stayed within I-12B owned write paths only.
- Existing dirty/untracked forbidden sentinel surfaces were treated as read-only baseline.

## Next step
- Stop for independent validation; do not self-validate or launch validators.
