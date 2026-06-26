# I-13 Mechanical P2 Code-Smell Framework Implementation Report

## Final status
- Status: DONE — implementation evidence only; not truth-green. Independent validation must follow.
- Report-first compliance: initial report was created before product/source inspection or source edits.
- Ownership: edits were limited to owned paths under `packages/mechanical-gates/src/p2/code-smell/**`, `packages/mechanical-gates/fixtures/p2/code-smell/**`, and `.vibe/work/I-13-mechanical-P2-smell-framework/**`.

## Files inspected
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
- `/Users/lizavasilyeva/work/vibe-engineer/package.json`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/package.json`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/I-12C-validation-artifact.md`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/p1/quality-ratchet/index.js`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates/src/p0/boundaries/contracts.js`
- Existing P0/P1 source and fixture inventory via `find packages/mechanical-gates/{src,fixtures}`.

## Files changed / created
Full exact inventory is recorded at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/changed-files-final.txt`.

Primary product/fixture files:
- `packages/mechanical-gates/src/p2/code-smell/index.ts`
- `packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts`
- `packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts`
- `packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`
- `packages/mechanical-gates/fixtures/p2/code-smell/projects/smelly/src/smells.ts`
- `packages/mechanical-gates/fixtures/p2/code-smell/projects/clean/src/clean.ts`
- `packages/mechanical-gates/fixtures/p2/code-smell/projects/stable-before/src/stable.ts`
- `packages/mechanical-gates/fixtures/p2/code-smell/projects/stable-after/src/stable.ts`
- `packages/mechanical-gates/fixtures/p2/code-smell/projects/parse-failure/src/broken.ts`
- `packages/mechanical-gates/fixtures/p2/code-smell/ratchet-fixture/{unchanged,new-debt,malformed}/**`
- `.vibe/work/I-13-mechanical-P2-smell-framework/**` evidence/report artifacts.

## Implementation summary
- Added strict TypeScript P2 lane API `validateCodeSmells(projectRoot, options)` with constants `CODE_SMELL_FAMILY = "p2.code-smell"` and `CODE_SMELL_TOOL = "p2.code-smell"`.
- Result/finding schema includes `family`, `ruleId`, `detectorId`, `severity`, `blocking`, `path`, `message`, `evidence`, stable `identity`, `confidence`, `mode`, and named `threshold` evidence.
- Stable identity includes `tool`, `ruleId`, repo-relative `path`, `symbol`, `structuralSignature`, and `contentHash`; line is evidence-only and excluded from identity.
- Implemented bounded reads, include-path traversal/absolute rejection, max file cap, strict unknown-option failure, source root/read failures, TypeScript parse failure blocking findings, and repo-relative normalization.
- Production detector decisions are TypeScript AST/structured-first. Production source has no `.js` files, no `any`, no `@ts-ignore`, no `@ts-expect-error`, no `as unknown`, and no RegExp/text-search load-bearing detector logic.
- Detectors implemented: `deep-control-flow-nesting`, `combinatorial-path-explosion`, `catch-log-continue`, `silent-no-op-dispatcher`, `serialized-json-assembled-as-strings`.
- Allowlist support is not implemented; no allowlist row can suppress or silently alter findings in this initial framework.

## Calibration evidence
- `deep-control-flow-nesting`: advisory at depth 4, hard at depth 5.
- `combinatorial-path-explosion`: advisory at 7 decision points, ratcheted at 8, hard at 12.
- `catch-log-continue`: hard when AST catch block contains logging/recording call and lacks throw/failure-like return on terminal path.
- `silent-no-op-dispatcher`: hard when AST switch/default or if/else dispatcher fallback succeeds/no-ops instead of typed failure.
- `serialized-json-assembled-as-strings`: advisory only; AST template/concat expression with JSON-shaped literal structure and dynamic part.
- Positive/calibration evidence: `witness-evidence/p2-smelly-result.json` and `witness-evidence/p2-witness-summary.json` show 8 findings including hard/advisory/ratcheted cases.
- Negative clean evidence: `witness-evidence/p2-clean-result.json` shows clean fixture with 0 findings and `ok:true`.
- Stable identity evidence: `witness-evidence/p2-stable-identity.json` shows identical identity before/after unrelated line movement; evidence lines changed 3→4.

## Malformed/fail-closed evidence
`witness-evidence/p2-malformed-results.json` records blocking typed results for:
- invalid/unknown options;
- invalid non-object policy/options;
- path traversal include path;
- absolute include path;
- missing source root;
- oversized file cap via low `maxFileBytes`;
- TypeScript parse failure.

## P2 → I-12 ratchet real-boundary evidence
- Evidence file: `witness-evidence/p2-to-i12-ratchet.json`.
- Actual compiled P2 detector output was converted to quality-ratchet finding carrier entries with `tool: "p2.code-smell"` and P2 stable identities.
- Actual read-only `validateQualityRatchet` from `packages/mechanical-gates/src/p1/quality-ratchet/index.js` consumed lane-owned ratchet fixture files under `packages/mechanical-gates/fixtures/p2/code-smell/ratchet-fixture/**`.
- Witness results: unchanged baseline/carrier `ok:true`; new P2 finding against empty baseline `ok:false` with `debt.new-finding`; malformed carrier/evidence `ok:false` fail-closed.

## Commands run from `/Users/lizavasilyeva/work/vibe-engineer`
- Preflight dirty-tree: `git status --short -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell .vibe/work/I-13-mechanical-P2-smell-framework packages/mechanical-gates/src/aggregate packages/mechanical-gates/src/p0 packages/mechanical-gates/src/p1 packages/mechanical-gates/package.json package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .github scripts infra`; exit 0; evidence `preflight-status.txt`.
- Strict P2 API/source/type consumer: `pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false --lib ES2022 packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts packages/mechanical-gates/src/p2/code-smell/index.ts packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts`; exit 0; evidence `command-evidence/tsc-noemit.*`.
- Witness syntax: `node --check packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`; exit 0; evidence `command-evidence/node-check-witness.*`.
- Real API/typecheck boundary: `node packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs --typecheck`; exit 0; evidence `command-evidence/witness-typecheck.*` and `typecheck-evidence/**`.
- Full runtime witness: `node packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`; exit 0; evidence `command-evidence/witness-full.*` and `witness-evidence/**`.
- Production banned escape sweep: `rg "\\bany\\b|@ts-ignore|@ts-expect-error|as unknown" packages/mechanical-gates/src/p2/code-smell`; exit 1/no matches; evidence `command-evidence/p2-banned-escapes.*`.
- Production regex/load-bearing text sweep: `rg "RegExp|\\.match\\(|\\.test\\(|new RegExp" packages/mechanical-gates/src/p2/code-smell`; exit 1/no matches; evidence `command-evidence/p2-regex-search.*`.
- Final dirty-tree status over owned/sentinel paths: same scoped `git status --short -- ...`; exit 0; evidence `command-evidence/final-status.*`.
- Final scoped diff names: `git diff --name-only -- ...`; exit 0/no tracked diff names in no-HEAD greenfield tree; evidence `command-evidence/final-diff-name-only.*`.

## Sibling/blast-radius evidence
Full witness ran and captured existing sibling commands, all exit 0:
- `node fixtures/p0/allowlist-domain-aggregate/witness.mjs` from `packages/mechanical-gates` → `witness-evidence/p0-allowlist-domain-aggregate.json`.
- `node fixtures/p0/surface-config-boundaries/witness.mjs` from `packages/mechanical-gates` → `witness-evidence/p0-surface-config-boundaries.json`.
- `node fixtures/p0/testing-boundary/witness.mjs` from `packages/mechanical-gates` → `witness-evidence/p0-testing-boundary.json`.
- `node packages/mechanical-gates/fixtures/p1/aggregate/witness.mjs` from repo root → `witness-evidence/p1-aggregate-witness.json`.

## Dirty-tree / shared-surface notes
- Worktree is greenfield/no-HEAD and sentinel shared paths are untracked at baseline; no `git stash/reset/clean/checkout/restore` was used.
- Final scoped status shows only owned P2 paths/workdir newly introduced by this agent plus pre-existing untracked sentinel roots/manifests/P0/P1/aggregate paths.
- No edits were made to package manifests, root configs/lockfiles/workspace files, package exports, shared aggregate runners, P0/P1 internals, CI/scripts/infra, or shared barrels.

## Pending serialized handoffs
- Package export/public package subpath for P2 is pending shared-surface handoff if desired; not edited here.
- Aggregate-level P2 registration is pending shared-surface handoff; not edited here.
- I-13 does not mark I-20 ready by itself.

## Final implementer note
- Implementation is complete within lane-owned paths with recorded witnesses, but implementer DONE is not validation green. Independent validator must inspect diffs/files and rerun/adversarially extend evidence.
