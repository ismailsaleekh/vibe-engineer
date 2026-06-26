# I-13 Post-Validation Fix Report

## Status
- Current status: STARTED
- Created report-first checkpoint before product/source inspection or edits.
- Scope: fix validation-listed F1/F2 empty `includePaths: []` and `fileSuffixes: []` fail-open defects only, within owned paths.

## Files inspected
- None yet.

## Files changed
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-13-mechanical-P2-smell-framework/I-13-post-validation-fix-report.md` (this report)

## Commands and evidence
- None yet.

## Dirty-tree evidence
- Pending.

## Blockers
- None currently.

## Pending serialized handoffs / invariants
- Package export/public package subpath for P2 remains pending serialized shared-surface handoff.
- Aggregate-level P2 registration remains pending serialized shared-surface handoff.
- I-20 remains blocked until I-13 and I-18 are independently green and later scheduler/deployment-scope gate authorizes downstream work.

## Next step
- Collect path-scoped preflight dirty-tree/inventory evidence for owned and sentinel paths without touching git state.

## Stage: preflight dirty-tree/inventory evidence
- Status: COMPLETE.
- Command (cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0): path-scoped `git status --short`, `git diff --stat`, and `find` inventory for owned P2 code-smell paths plus sentinel aggregate/P0/P1 paths; output redirected to `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/preflight-dirty-tree.txt`.
- Evidence: `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/preflight-dirty-tree.txt`.
- Findings: dirty no-HEAD-like tree shows owned and sentinel paths as untracked; no path-scoped git diff stat. No concrete ownership conflict found in owned paths.
- Next step: inspect validation artifact and owned I-13 source/fixture code to locate actual F1/F2 root cause.

## Stage: validation/source inspection
- Status: COMPLETE.
- Files inspected:
  - `.vibe/work/I-13-mechanical-P2-smell-framework/I-13-validation-artifact.md`
  - `packages/mechanical-gates/src/p2/code-smell/index.ts`
  - `packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`
  - `packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts`
- Command (cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0): `rg "excludeDirectoryNames|includePaths: \\[\\]|fileSuffixes: \\[\\]" packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell .vibe/work/I-13-mechanical-P2-smell-framework/I-13-validation-artifact.md`.
- Evidence: source inspection confirmed `readStringArray` currently rejects non-arrays/non-string/empty-string entries but not array length; `normalizeOptions` uses it for `includePaths`, `excludeDirectoryNames`, and `fileSuffixes`; `walkFiles` then silently inspects no files for empty include/suffix arrays.
- Blockers: none; F1/F2 closure is within owned P2 source path.
- Next step: edit owned P2 option parsing to reject explicitly empty string-array policy carriers without changing default omitted-option behavior.

## Stage: product fix edit
- Status: COMPLETE.
- File changed: `packages/mechanical-gates/src/p2/code-smell/index.ts`.
- Exact fix: `readStringArray` now rejects zero-length arrays before `.every(...)`, so explicitly empty string-array policy carriers produce typed `input.invalid-option` blocking findings instead of silently selecting no files.
- Scope note: this preserves omitted-option defaults; non-empty explicit arrays continue through existing validation. The helper message already specified non-empty string arrays when provided.
- Blockers: none.
- Next step: run strict TypeScript/API witness and syntax witness, then targeted product/API regression witnesses.

## Stage: strict TS and witness syntax checks
- Status: COMPLETE.
- Command (cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0): `pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false --lib ES2022 packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts packages/mechanical-gates/src/p2/code-smell/index.ts packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts`; evidence `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/tsc-noemit-postfix.*`.
- Command (cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0): `node --check packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`; evidence `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/node-check-witness-postfix.*`.
- Blockers: none.
- Next step: create/run post-fix actual API regression witness covering F1/F2 plus default/explicit/malformed/detector/identity/ratchet/sibling requirements without editing shared surfaces.

## Stage: post-fix regression witness script creation
- Status: COMPLETE.
- File created: `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/postfix-p2-regression-witness.mjs`.
- Witness design: compiles actual lane-owned P2 TypeScript source under post-fix evidence, imports the compiled API, exercises F1/F2 empty-array fail-closed regressions, default/non-empty policies, malformed carriers, detector positive/negative fixtures, stable identity/calibration, actual P2 carrier into actual P1 `validateQualityRatchet`, and safe P0 sibling witnesses. It does not mock/reimplement the detector or ratchet seam.
- License note: existing P1 aggregate witness writes under `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/**` outside I-13 write license, so the script records that as skipped/pending-live while covering the P2→P1 ratchet seam directly under I-13 evidence.
- Next step: syntax-check and execute the post-fix regression witness.

## Stage: post-fix regression witness syntax and first execution attempt
- Status: RERUN NEEDED due shell-wrapper error, not product witness failure.
- Command (cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0): `node --check .vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/postfix-p2-regression-witness.mjs`; evidence `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/node-check-postfix-regression.*`.
- Background command (cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 1): wrapper attempted to save `$status` in zsh; zsh treats `status` as read-only. Pi task `b317a8984`; wrapper log `.pi/tasks/session-88615-88615/b317a8984.output`.
- Evidence note: despite wrapper exit 1, `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/postfix-regression-witness.stdout` printed `ok: true`; must rerun with a non-reserved variable to record a valid command exit/status artifact.
- Next step: rerun post-fix regression witness with corrected shell wrapper (`exit_code`).

## Stage: post-fix regression witness rerun
- Status: COMPLETE.
- Background command (cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0): `node .vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/postfix-p2-regression-witness.mjs`; Pi task `ba80567cf`; status artifact `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/postfix-regression-witness.rerun.status`; stdout/stderr `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/postfix-regression-witness.rerun.*`.
- Summary evidence: `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/postfix-output/summary.json` reports `ok:true`.
- F1/F2 evidence: `emptyInclude.ok:false`, `emptyInclude.failClosed:true`, `blockingFindings:1`; `emptySuffixes.ok:false`, `emptySuffixes.failClosed:true`, `blockingFindings:1`.
- Default/explicit policy evidence: omitted default smelly parsed 1 file and failed on real smells; omitted default clean parsed 1 file and passed; non-empty include and suffix policies parsed 1 file and still detected smelly fixture.
- Malformed carrier evidence: non-object options, unknown option, unsupported detector, traversal include, absolute include, bad suffix, missing root, oversized file cap, parse failure, and unknown allowlist option all failed closed.
- Detector/identity/calibration evidence: smelly fixture produced 8 findings including required hard/advisory/ratcheted modes; clean fixture produced 0 findings; stable identity unchanged while line evidence moved 3→4.
- Real-boundary seam evidence: compiled actual P2 API output was consumed by actual P1 `validateQualityRatchet`; unchanged pass, new-debt fail, malformed carrier/evidence fail-closed.
- Sibling/blast-radius evidence: P0 allowlist/domain aggregate, P0 surface/config/boundaries, and P0 testing-boundary witnesses exited 0. Existing P1 aggregate witness remains pending-live because it writes outside I-13 license; direct P2→P1 ratchet seam passed under authorized evidence.
- Next step: run final source hygiene and path-scoped status/diff/inventory evidence.

## Stage: final source hygiene and dirty-tree evidence
- Status: COMPLETE.
- Command (cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0): final source inventory, production-JS drift check, banned TS escape sweep, and exact fixed-line grep; evidence `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/final-source-hygiene.txt`.
- Evidence: production P2 source inventory remains `index.ts` and `node-shims.d.ts`; no production JS under `src/p2/code-smell`; no `any`, `@ts-ignore`, `@ts-expect-error`, or `as unknown`; fixed line is `value.length === 0` in `readStringArray`.
- Command (cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0): final path-scoped `git status --short`, `git diff --stat`, `git diff --name-only`, and bounded inventories over owned P2 paths/workdir plus sentinel aggregate/P0/P1 paths; evidence `.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-evidence/final-dirty-tree.txt`.
- Dirty-tree evidence: scoped paths remain untracked in this dirty/no-HEAD-like tree; path-scoped git diff stat/name-only are empty due untracked baseline limitation. No concrete ownership conflict found. Sentinel paths were inspected/read or used only as permitted; no shared-surface edits were made.

## Final files inspected
- `.vibe/work/I-13-mechanical-P2-smell-framework/I-13-validation-artifact.md`
- `packages/mechanical-gates/src/p2/code-smell/index.ts`
- `packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs`
- `packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts`
- Sentinel sibling witness/source files read for safety: P0 witness files and P1 aggregate witness write behavior.

## Final files changed/created by this fixer
- Changed product source: `packages/mechanical-gates/src/p2/code-smell/index.ts`.
- Created/updated report/evidence under `.vibe/work/I-13-mechanical-P2-smell-framework/**`, including `I-13-post-validation-fix-report.md` and `post-fix-evidence/**`.
- No package manifests, shared exports/barrels, aggregate runners, P0/P1 internals, CI, root config, git state, I-18, or I-20 paths were edited.

## Final command summary
- Preflight dirty-tree/inventory: exit 0; evidence `post-fix-evidence/preflight-dirty-tree.txt`.
- Source search/inspection `rg "excludeDirectoryNames|includePaths: \\[\\]|fileSuffixes: \\[\\]" ...`: exit 0.
- Strict TypeScript/API witness: exit 0; evidence `post-fix-evidence/tsc-noemit-postfix.*`.
- Original fixture witness syntax: exit 0; evidence `post-fix-evidence/node-check-witness-postfix.*`.
- Post-fix regression witness syntax: exit 0; evidence `post-fix-evidence/node-check-postfix-regression.*`.
- First post-fix regression execution wrapper: exit 1 due zsh read-only `status` variable after witness printed `ok:true`; not counted as product failure; preserved in `post-fix-evidence/postfix-regression-witness.*` and Pi task `b317a8984`.
- Corrected post-fix regression rerun: exit 0; evidence `post-fix-evidence/postfix-regression-witness.rerun.*` and `post-fix-evidence/postfix-output/summary.json`.
- Final source hygiene/status/inventory: exit 0; evidence `post-fix-evidence/final-source-hygiene.txt` and `post-fix-evidence/final-dirty-tree.txt`.

## Final blockers / pending-live
- Blockers: none for F1/F2 product fix within I-13-owned paths.
- Pending-live/scheduling invariant: existing P1 aggregate witness writes under `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/**`, outside this fixer write license; it was not run. Direct P2→P1 ratchet seam passed under authorized I-13 evidence.
- Pending serialized handoffs remain open: package export/public package subpath for P2 and aggregate-level P2 registration.
- I-20 remains blocked until I-13 and I-18 are independently green and later scheduler/deployment-scope gate authorizes downstream work.

## Final status
- DONE for fixer scope: F1/F2 empty `includePaths: []` and `fileSuffixes: []` now fail closed with typed blocking `input.invalid-option` findings through the actual P2 API.
- Fixer self-witnesses are recorded, but independent post-fix revalidation remains required by triad discipline before truth-green.
