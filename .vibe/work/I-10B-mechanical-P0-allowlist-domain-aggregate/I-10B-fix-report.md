# I-10B Fix Report

## Status
- Verdict: DONE (fixer evidence complete; independent revalidation still required before I-10B can be GREEN).
- Stage: post-fix witnesses and blast-radius sweep complete.
- Report-first checkpoint: this report was created before product/source inspection.
- Quality-bar preamble proof: PASS. Read `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`; it exactly matches the quality-bar preamble at the start of the executable task wrapper.

## Files inspected
- Required fix brief/validation/report artifacts under `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/**`.
- Prior I-10B validation/implementation reports and evidence under `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/**`.
- Source docs: `docs/mechanical-verification-gates.md`, `docs/verification-layer.md`.
- Owned source/fixture files under `packages/mechanical-gates/src/p0/{allowlist,domain-purity}/**`, `packages/mechanical-gates/src/aggregate/**`, `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/**`.
- I-10A witnesses/read-only package manifest as required for regression/blast-radius evidence.

## Files changed
- `packages/mechanical-gates/src/p0/allowlist/validate-escape-allowlist.js`
- `packages/mechanical-gates/src/p0/domain-purity/validate-domain-purity.js`
- `packages/mechanical-gates/src/p0/allowlist/index.d.ts`
- `packages/mechanical-gates/src/p0/domain-purity/index.d.ts`
- `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/witness.mjs`
- `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/type-consumer.ts`
- Added fixture workspaces under `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/{as-unknown-unrelated-validate,as-unknown-schema-narrowed,hard-ban-weakening-as-any,unallowlisted-non-null,broad-model-types,ts-comment-escapes,malformed-hard-banned-policy,domain-malformed-forbidden-number,domain-empty-forbidden-terms,domain-partial-malformed-forbidden-terms,domain-locked-terms-core-extension,domain-valid-policy-cannot-remove-locked-terms}/**`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/post-fix-required-witnesses.txt`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/post-fix-adversarial-probes-output.json`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/fix-final-sweep.txt`
- This report.

## Root-cause fixes
- Replaced `as unknown` next-statement name-only proof with AST same-value proof: direct call argument or single variable initialized from the cast and immediately consumed by a named runtime schema/narrower in the next statement.
- Made default hard bans mandatory/non-removable; effective hard bans are defaults plus valid policy additions; malformed `hardBannedEscapes` emits `allowlist.policy-schema`.
- Domain policy now validates exact `proofMode`, scan paths, surfaces, and `forbiddenTerms`; malformed/empty/partial `forbiddenTerms` emits `domain-purity.policy-schema`, and locked defaults are always enforced (valid additions cannot remove them).
- Declaration policy interfaces now include exact `proofMode` literals; `type-consumer.ts` checks policy shapes.

## Commands run / evidence
Exact post-fix stdout and exit-code transcript:
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/post-fix-required-witnesses.txt`

Required commands in that transcript:
- `cd packages/mechanical-gates && node fixtures/p0/allowlist-domain-aggregate/witness.mjs` — EXIT:0; `ok:true`; all five P0 families present; `negativeWitnesses:34`.
- `cd packages/mechanical-gates && node fixtures/p0/allowlist-domain-aggregate/witness.mjs --typecheck` — EXIT:0; declaration consumer passed.
- `cd packages/mechanical-gates && node fixtures/p0/surface-config-boundaries/witness.mjs` — EXIT:0; I-10A regression passed.
- `cd packages/mechanical-gates && node fixtures/p0/surface-config-boundaries/witness.mjs --typecheck` — EXIT:0; I-10A typecheck regression passed.
- `pnpm --filter @vibe-engineer/mechanical-gates typecheck` — EXIT:0; existing package script passed (I-10A-only coverage, not claimed as I-10B).
- `pnpm --filter @vibe-engineer/mechanical-gates test:p0` — EXIT:0; existing package script passed (I-10A-only coverage, not claimed as I-10B).
- `node .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/adversarial-probes.mjs` — EXIT:0; full JSON saved at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/post-fix-adversarial-probes-output.json`; `ok:true`, `probeCount:10`, `failedCount:0`.

Key adversarial evidence:
- Broad unrelated `as unknown` now fails `allowlist.unallowlisted-escape` with `kind:"as-unknown"`, `carrier:"typescript-ast"`.
- `hardBannedEscapes: []` plus allowlist row now fails with two `allowlist.hard-banned` findings (row and source).
- Malformed `forbiddenTerms: [42]` now fails with `domain-purity.policy-schema` and `domain-purity.core-domain-leak`.

## Dirty-tree / ownership / blast-radius sweep
- Final sweep evidence: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/fix-final-sweep.txt`.
- Changed/untracked paths are confined to owned I-10B source/fixture/work/evidence paths; unrelated dirty root/package/docs/testing baseline remains untouched.
- No tracked diff names for root manifest/config/lockfile/package-manager sentinels or `packages/mechanical-gates/package.json`.
- `packages/mechanical-gates/package.json` read-only summary remains I-10A-only exports/scripts.
- No forbidden production references in I-10B source to `@vibe-engineer/testing`, `packages/testing`, `testing-boundary`, `packages/core`, P1, or P2.
- No CI/scripts/docs-decision/sibling package edits by this lane.
- `bg_status` result: no background tasks in this Pi extension runtime; no concrete ownership conflict observed.
- No install/add/update commands; no `git stash/reset/clean/checkout/restore`.

## Blockers / residual risks
- Blockers: none.
- Residual risk: independent Triad revalidation still must inspect diffs/files and classify I-10B; fixer does not self-validate GREEN.

## Next step
- Launch independent I-10B revalidation gate.
