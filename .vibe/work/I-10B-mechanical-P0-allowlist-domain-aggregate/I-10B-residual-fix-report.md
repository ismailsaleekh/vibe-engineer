# I-10B Residual Fix Report

## Stage 0 — report-first checkpoint
Status/verdict: IN-PROGRESS.

Files inspected: none yet (report created before product/source inspection).
Files changed: this report only.
Commands run: none yet.
Evidence paths: pending.
Dirty-tree/ownership notes: dirty tree accepted; no product/source inspection or edits performed yet; owned report path only.
Quality-bar preamble: PROVEN before product/source inspection. Command `python3 - <<'PY' ...` compared `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/i-10b-residual-fix-execute.md` bytes against `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`; exit code 0; output `quality_bar_bytes=2038`, `prompt_bytes=21107`, `prefix_match=True`.
Blockers/residual risks: none yet.
Next step: read required ground-truth artifacts and owned/read-only source/fixtures.

## Stage 1 — ground-truth artifacts read
Status/verdict: IN-PROGRESS; residual objective confirmed as declaration/consumer mismatch only.

Files inspected:
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/i-10b-residual-fix-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/i-10b-residual-fix-brief-validation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/I-10B-fix-revalidation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/I-10B-fix-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/I-10B-validation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/revalidation/domain-policy-contract-probe.txt`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/adversarial-probes.mjs`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/post-q05-root-provider-unit/validation-report.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
Files changed: this report only.
Commands run:
- Read operations via tool; no shell exit codes.
Evidence/results:
- Residual brief validation PASS; required fix is `DomainPurityPolicy.forbiddenTerms?: string[]` plus declaration consumers/evidence.
- Closing revalidation finding F-MAJOR-REVAL-01: runtime omission of `forbiddenTerms` accepted/enforces locked defaults, but current declaration requires the property and causes TS2741.
- Prior root/provider/package-manager validation PASS; no further root/lockfile/package-manager mutation needed.
- Orchestration status shows wrapper validation/generation lanes only, future root/package-manager mutation serialized and none currently authorized.
Dirty-tree/ownership notes: no product edits yet; all inspected artifacts are required read-only ground truth.
Blockers/residual risks: none; product source inspection next.
Next step: inspect owned declaration/type-consumer and relevant read-only runtime/witness/package files before product edits.

## Stage 2 — source/fixture inspection before product edits
Status/verdict: IN-PROGRESS; source inspection confirms residual is in-scope declaration/consumer-only.

Files inspected:
- Owned: `packages/mechanical-gates/src/p0/domain-purity/index.d.ts`
- Owned: `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/type-consumer.ts`
- Owned-if-needed/read-only for now: `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/witness.mjs`
- Read-only: `packages/mechanical-gates/src/p0/domain-purity/validate-domain-purity.js`
- Read-only: `packages/mechanical-gates/src/p0/domain-purity/index.js`
- Read-only: `packages/mechanical-gates/src/p0/allowlist/index.d.ts`
- Read-only: `packages/mechanical-gates/src/aggregate/index.{js,d.ts}`
- Read-only: `packages/mechanical-gates/src/aggregate/run-p0-aggregate.js`
- Read-only: `packages/mechanical-gates/package.json`
- Read-only fixture inventory via `find packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate -maxdepth 2 -type f | sort | sed 's#^#/#' | head -200`
Files changed: this report only.
Commands run:
- `cd /Users/lizavasilyeva/work/vibe-engineer && find packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate -maxdepth 2 -type f | sort | sed 's#^#/#' | head -200` — exit code 0; output lists existing I-10B fixture workspaces including malformed forbiddenTerms, hard-ban weakening, as-unknown regression rows.
Evidence/results:
- Current `DomainPurityPolicy` has required `forbiddenTerms: string[]`; this is the residual mismatch.
- Runtime `validatePolicyShape` initializes locked `DEFAULT_FORBIDDEN`, validates `forbiddenTerms` only under `if ("forbiddenTerms" in policy)`, and returns locked defaults for omitted property; no runtime edit needed.
- `type-consumer.ts` only defines one explicit-`forbiddenTerms` `DomainPurityPolicy`; omitted-default shape is not checked.
- `witness.mjs --typecheck` already compiles `type-consumer.ts`; no witness-runner edit appears necessary.
- `packages/mechanical-gates/package.json` exports/scripts were inspected read-only; no manifest/package-manager change needed or licensed.
Dirty-tree/ownership notes: no product edits yet; runtime/source read-only boundaries respected.
Blockers/residual risks: none; correct fix does not require root/package-manager/package manifest/runtime mutation.
Next step: edit only owned declaration and type-consumer, then create residual evidence consumers/probe under owned evidence path.

## Stage 3 — residual product edits
Status/verdict: IN-PROGRESS; scoped residual fix implemented, not self-validated GREEN.

Files inspected: same as Stage 2 for edited files.
Files changed:
- `packages/mechanical-gates/src/p0/domain-purity/index.d.ts`
- `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/type-consumer.ts`
Commands run: none in this stage; exact edits applied via edit tool.
Evidence/results:
- `DomainPurityPolicy.forbiddenTerms` changed from required `string[]` to optional `forbiddenTerms?: string[]`; exact `proofMode` literal, typed `scan.include`, optional `scan.maxFileBytes`, and typed `surfaces` rows preserved.
- `type-consumer.ts` now declares both `explicitForbiddenTermsDomainPolicy: DomainPurityPolicy` and `omittedForbiddenTermsDomainPolicy: DomainPurityPolicy`; omitted policy includes no `forbiddenTerms` and keeps typed scan/surface/proofMode shape.
- No runtime source, witness runner, manifest, root, lockfile, or package-manager state changed.
Dirty-tree/ownership notes: edits are confined to owned product paths; no out-of-license edits.
Blockers/residual risks: none so far; witnesses still pending.
Next step: create owned residual evidence TS consumers and runtime probe, then run required commands after concurrency check.

## Stage 4 — residual evidence artifacts created
Status/verdict: IN-PROGRESS; evidence producers created under owned residual evidence path.

Files inspected: prior revalidation consumers/probe used as read-only pattern.
Files changed:
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/domain-policy-omitted-forbidden-terms-consumer.ts`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/domain-policy-malformed-forbidden-terms-consumer.ts`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/domain-policy-default-runtime-probe.mjs`
Commands run: none in this stage; files written via write tool.
Evidence/results:
- Positive TS consumer assigns a policy omitting `forbiddenTerms` to actual `DomainPurityPolicy` import.
- Negative TS consumer assigns malformed present `forbiddenTerms: [42]` to actual `DomainPurityPolicy` import and is expected to fail TypeScript.
- Runtime probe imports actual `validateDomainPurity`, creates a temporary residual evidence workspace with omitted `forbiddenTerms`, and asserts locked defaults plus `domain-purity.core-domain-leak` for core `ecommerce` with no `domain-purity.policy-schema`.
Dirty-tree/ownership notes: new files are under owned residual evidence path; no product runtime/witness/manifest/root/package-manager mutation.
Blockers/residual risks: witnesses pending.
Next step: before package-state witnesses, check `bg_status` and orchestration status for concurrent root/package-manager mutation.

## Stage 5 — pre-witness concurrency/package-manager safety check
Status/verdict: IN-PROGRESS; package-state witnesses are clear to run.

Files inspected:
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
Files changed: this report only.
Commands run:
- `bg_status` — result: `No background tasks in this Pi extension runtime.`
Evidence/results:
- Orchestration status shows this I-10B residual fix running with no root/lockfile/package-manager edits authorized.
- I-02A/I-08 wrapper lanes are read-only against target repo; future root/package-manager mutation remains serialized and none is currently authorized.
Dirty-tree/ownership notes: no concurrent root/package-manager writer observed; no install/add/update command has been run.
Blockers/residual risks: none.
Next step: run residual TS/runtime seam witnesses and required direct/adversarial/package witnesses, recording stdout/stderr and exit codes to residual evidence.

## Stage 6 — residual declaration/runtime seam witnesses
Status/verdict: IN-PROGRESS; residual seam witnesses behaved as expected.

Files inspected:
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/residual-seam-witnesses.txt`
Files changed:
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/residual-seam-witnesses.txt`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/domain-policy-default-runtime-workspace/**`
Commands run:
- `cd /Users/lizavasilyeva/work/vibe-engineer && node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/domain-policy-omitted-forbidden-terms-consumer.ts` — exit code 0; stdout/stderr empty.
- `cd /Users/lizavasilyeva/work/vibe-engineer && node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/domain-policy-malformed-forbidden-terms-consumer.ts` — exit code 2 as expected; stdout contains `error TS2322: Type 'number' is not assignable to type 'string'.`; stderr empty.
- `cd /Users/lizavasilyeva/work/vibe-engineer && node .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/domain-policy-default-runtime-probe.mjs` — exit code 0; stdout JSON has `ok:false`, ruleIds `["domain-purity.core-domain-leak"]`, locked evidence `forbiddenTerms:["ecommerce","inventory","Billz","Telegram"]`, no `domain-purity.policy-schema`.
Evidence/results:
- Actual TypeScript declaration now accepts omitted `forbiddenTerms` while rejecting malformed present `forbiddenTerms: [42]`.
- Actual runtime boundary still accepts omission and enforces locked defaults against core `ecommerce` leakage.
Dirty-tree/ownership notes: evidence/workspace writes confined to owned residual evidence; no runtime/product manifest/package-manager mutation.
Blockers/residual risks: none from residual seam.
Next step: run direct I-10B/I-10A witnesses, adversarial probes, and optional package-filter commands from existing package state.

## Stage 7 — required real-boundary/regression witnesses
Status/verdict: IN-PROGRESS; all required witness commands run with expected exits.

Files inspected:
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/required-witnesses.txt`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/package-real-boundary-witnesses-exact.txt`
Files changed:
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/required-witnesses.txt`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/package-real-boundary-witnesses-exact.txt`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/adversarial-workspaces/**` (rewritten by existing adversarial probe script)
Commands run:
- `cd /Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates && node fixtures/p0/allowlist-domain-aggregate/witness.mjs` — exit code 0; stdout `ok:true`, aggregate summary has all five families, `negativeWitnesses:34`.
- `cd /Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates && node fixtures/p0/allowlist-domain-aggregate/witness.mjs --typecheck` — exit code 0; stdout `ok:true`, `declarationConsumer:"typescript"`, `checkedFiles:7`.
- `cd /Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates && node fixtures/p0/surface-config-boundaries/witness.mjs` — exit code 0; stdout `ok:true`, I-10A `negativeWitnesses:54`.
- `cd /Users/lizavasilyeva/work/vibe-engineer/packages/mechanical-gates && node fixtures/p0/surface-config-boundaries/witness.mjs --typecheck` — exit code 0; stdout `ok:true`, `publicApiConsumer:"typescript"`, `checkedFiles:8`.
- `cd /Users/lizavasilyeva/work/vibe-engineer && node .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/adversarial-probes.mjs` — exit code 0; stdout JSON `ok:true`, `probeCount:10`, `failedCount:0`.
- `cd /Users/lizavasilyeva/work/vibe-engineer && pnpm --filter @vibe-engineer/mechanical-gates typecheck` — exit code 0; package script ran I-10A `surface-config-boundaries --typecheck` only, not claimed as I-10B coverage.
- `cd /Users/lizavasilyeva/work/vibe-engineer && pnpm --filter @vibe-engineer/mechanical-gates test:p0` — exit code 0; package script ran I-10A witness only, not claimed as I-10B coverage.
Evidence/results:
- Positive explicit and omitted declaration shapes are covered by updated package `type-consumer.ts` through direct `--typecheck` plus residual seam tsc witness.
- Malformed runtime rows for `forbiddenTerms: [42]`, empty array, and partial malformed arrays remain in package witness and fail with `domain-purity.policy-schema`.
- Allowlist regressions remain closed: unrelated `as unknown` fails `allowlist.unallowlisted-escape`; `as-any` hard ban cannot be weakened.
- Domain regression remains closed: malformed forbiddenTerms cannot green core leakage; adversarial probe sees both `domain-purity.policy-schema` and `domain-purity.core-domain-leak`.
- Valid aggregate still returns all five P0 families with typed subresults.
- I-10A public-subpath witnesses pass.
Dirty-tree/ownership notes: commands used existing package state only; no install/add/update; package-filter scripts did not mutate manifests/lockfile/package state.
Blockers/residual risks: none from witnesses.
Next step: final source/diff/blast-radius sweep, including changed-path confinement, root/package manifest sentinels, forbidden reference scan, and final concurrency status.

## Stage 8 — final blast-radius/concurrency sweep
Status/verdict: DONE for fixer evidence; independent residual revalidation still required and not self-declared GREEN.

Files inspected:
- `packages/mechanical-gates/src/p0/domain-purity/index.d.ts`
- `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/type-consumer.ts`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/residual-seam-witnesses.txt`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/final-sweep.txt`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
Files changed by this fixer:
- `packages/mechanical-gates/src/p0/domain-purity/index.d.ts`
- `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/type-consumer.ts`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/I-10B-residual-fix-report.md`
- `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/**`
- Required adversarial probe command rewrote its existing generated workspace under `.vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/adversarial-workspaces/**` as a command side effect; no product/root/package-manager file was changed by that side effect.
Commands run:
- `cd /Users/lizavasilyeva/work/vibe-engineer && git status --short -- packages/mechanical-gates/src/p0/domain-purity/index.d.ts packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/type-consumer.ts packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/witness.mjs .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/I-10B-residual-fix-report.md` — exit code 0; output shows untracked report, residual evidence, type-consumer, witness, and declaration paths in greenfield/untracked baseline. `witness.mjs` was inspected/run but not edited by this fixer.
- `cd /Users/lizavasilyeva/work/vibe-engineer && git diff --name-only -- packages/mechanical-gates/src/p0/domain-purity/index.d.ts packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/type-consumer.ts packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/witness.mjs package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json packages/mechanical-gates/package.json packages/testing packages/mechanical-gates/src/p0/testing-boundary packages/mechanical-gates/fixtures/p0/testing-boundary` — exit code 0; no tracked diff names.
- `cd /Users/lizavasilyeva/work/vibe-engineer && git status --short -- package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json packages/mechanical-gates/package.json packages/testing packages/mechanical-gates/src/p0/testing-boundary packages/mechanical-gates/fixtures/p0/testing-boundary` — exit code 0; output remains expected untracked dirty baseline for root/package/testing sentinels.
- `cd /Users/lizavasilyeva/work/vibe-engineer && shasum -a 256 package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json packages/mechanical-gates/package.json` — exit code 0; hashes `package.json b3d1455a...`, `pnpm-lock.yaml 0259217...`, `pnpm-workspace.yaml aee47e...`, `turbo.json 918ad4...`, `packages/mechanical-gates/package.json b87923...`.
- `cd /Users/lizavasilyeva/work/vibe-engineer && rg -n '@vibe-engineer/testing|packages/testing|packages/core|testing-boundary|\bP1\b|\bP2\b|p1/|p2/' packages/mechanical-gates/src/p0/allowlist packages/mechanical-gates/src/p0/domain-purity packages/mechanical-gates/src/aggregate packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/type-consumer.ts || true` — exit code 0 after `|| true`; no matches.
- `cd /Users/lizavasilyeva/work/vibe-engineer && find .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual -maxdepth 3 -type f | sort` — exit code 0; lists residual consumers/probe/workspace/transcripts/final sweep.
- `cd /Users/lizavasilyeva/work/vibe-engineer && grep -n 'forbiddenTerms' packages/mechanical-gates/src/p0/domain-purity/index.d.ts packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/type-consumer.ts .vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual/domain-policy-*.ts` — exit code 0; declaration line shows `forbiddenTerms?: string[]`, package consumer explicit row, negative evidence malformed `[42]`.
- `bg_status` — result `No background tasks in this Pi extension runtime.`
Evidence/results:
- Actual final declaration preserves exact proofMode literal and typed scan/surfaces while making only `forbiddenTerms` optional.
- Actual final type consumer checks explicit-present and omitted-default `DomainPurityPolicy` shapes.
- No runtime source was changed; runtime inspection showed omission behavior already correct and locked defaults enforced.
- No root `package.json`, lockfile, workspace config, `turbo.json`, or `packages/mechanical-gates/package.json` edit was made; package manifest hashes match the post-Q05 PASS evidence for root/workspace/lock/mechanical manifest state.
- No CI/scripts/docs-decision/sibling package edit was made by this fixer; no forbidden production reference to `@vibe-engineer/testing`, `packages/testing`, `packages/core`, P1/P2, or testing-boundary was introduced in I-10B source.
- Orchestration status shows concurrent product lanes own disjoint paths and no root/lockfile/package-manager edits authorized; no concurrent root/package-manager writer observed.
Dirty-tree/ownership notes: dirty greenfield/untracked tree accepted; no clean-tree request; no `git stash/reset/clean/checkout/restore`; no install/add/update command; unrelated dirty/untracked baseline preserved.
Blockers/residual risks: no BLOCKED condition. Independent closing residual revalidation remains pending and must write `I-10B-residual-revalidation-report.md`; this fixer does not declare I-10B GREEN.
Next step: hand off to independent residual revalidator.

## Final fixer verdict
DONE — residual declaration/consumer fix and required evidence are complete; independent residual revalidation remains the next gate.
