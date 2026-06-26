# I-07A Independent Validation Report

## Checkpoint 0 — report created
- Status: IN_PROGRESS
- Created: 2026-06-25
- Validator write scope: this report plus `validation-evidence/**` only.
- Files inspected: none yet beyond user-supplied prompt text.
- Commands run: none yet.
- Dirty-tree notes: pending.
- Severity: pending.
- Next step: terminal / verify-first gate for implementation bg `b5f60b0f9`.

## Checkpoint 1 — terminal / verify-first bg gate started
- Status: IN_PROGRESS with process-defect risk.
- Commands run:
  - `bg_status b5f60b0f9` -> unknown background task ID.
  - `bg_status` -> no background tasks in this Pi extension runtime.
- Evidence: bg terminal state cannot be established from this runtime; no running task is visible here.
- Files inspected: none yet.
- Dirty-tree notes: pending.
- Severity: pending; will inspect implementation report/on-disk reality before deciding whether missing bg telemetry blocks validation.
- Next step: inspect implementation report and lane evidence for substantive completeness.

## Checkpoint 2 — authority and implementation report inspected
- Status: IN_PROGRESS; continued under verify-first because on-disk implementation report is substantively complete despite missing bg telemetry in this runtime.
- Files inspected:
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/i-07a-implement.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/i-07a-wrapper-validation.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-07A-schematics-manifest-engine/I-07A-implementation-report.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/ta-i-07a-brief-generated.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/ta-i-07a-brief-residual-revalidation.md`
- Evidence:
  - Wrapper validation final verdict is `PASS` / severity `clean`.
  - Fixed brief and residual revalidation are present; residual revalidation says `Verdict: PASS` / highest severity clean.
  - Implementation report has Stage 6 `Status/Verdict: DONE` and records RB4 shipped/default binary as `pending-live/BLOCKED` only.
  - Mandatory pre-source-edit sizing gate is present in Stage 3 before Stage 4 source creation and states full in-license scope feasible within ≤6h, with split/handoff constraints preserved.
  - Process defect: implementation bg `b5f60b0f9` cannot be verified from available bg runtime; no task/log object is visible here.
- Dirty-tree notes: pending target inventory.
- Severity: pending; bg telemetry defect recorded as process defect, not blocking, because actual files/evidence were independently inspectable and witnesses were rerun.
- Next step: path-scoped inventory/diff of owned and blast-radius paths.

## Checkpoint 3 — owned inventory, dirty-tree, and code/fixture inspection
- Status: IN_PROGRESS.
- Commands run:
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`: path-scoped `git status --short --untracked-files=all`, `git diff --name-status`, owned `find`, and blast-radius sentinel `git status`; exit 0.
- Inventory/diff evidence:
  - `git diff --name-status` for owned paths is empty because implementation files are untracked; no diff base exists for content. Limitation recorded; validator read owned files directly.
  - Owned product files found/read: `packages/schematics/src/engine/{index.js,markers.js}`, `packages/schematics/src/manifest/loader.js`, `packages/schematics/src/template/{input.js,path-safety.js,renderer.js}`, fixture manifest/templates/inputs/expected bodies, `packages/schematics/fixtures/engine/run-engine-witnesses.mjs`, and CLI command files `packages/cli/src/commands/schematic/{artifacts-adapter.js,index.js,run-cli-witnesses.mjs}`.
  - Read-only contracts inspected: DL-08, CLI loader/entry/envelope/errors/testing, artifacts validator/index, config package/index, `packages/cli/package.json`, `packages/schematics/package.json`.
  - Blast-radius sentinel status shows many unrelated untracked baseline root/package/artifacts/config/docs/standards files in the dirty multi-orchestrator tree; I-07A-owned `packages/cli/src/commands/schematic/**` is present under commands while sibling `doctor`/`config` dirs are also untracked baseline. No git surgery used.
- Seam observations:
  - No bare `@vibe-engineer/artifacts` import appears in `packages/schematics/src/**` from inspected source and sweep.
  - CLI command imports artifacts through CLI-owned `artifacts-adapter.js`, imports engine by relative path `../../../../schematics/src/engine/index.js`, and uses real envelope/result-file functions.
  - CLI witness uses real `createCommandLoader([schematicCommand])` and real `validateCliResultEnvelope`; shipped entry still uses default `createCommandLoader()`.
  - RB4 is recorded by CLI witness as `pending-live/BLOCKED`; no loader/package registration edit found in owned code.
- Potential findings opened:
  - `replace_marked_section` appeared to use whole-file generated-block replacement, not embedded bounded-section replacement.
  - Apply lacked a prior dry-run plan fingerprint/precondition API and marker matching ignored body/content preconditions.
- Dirty-tree notes: dirty tree preserved; validator wrote only report/evidence.
- Next step: rerun canonical syntax/witnesses and targeted probes.

## Checkpoint 4 — independent canonical witnesses rerun
- Status: IN_PROGRESS; canonical witness matrix is green, but later targeted probes found uncovered contract failures.
- Commands run:
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`: `node --check` on all new JS/MJS source and witness files; exit 0; evidence `validation-evidence/node-check/{stdout.txt,stderr.txt,exit.txt}`.
  - bg `b97504484`, cwd `/Users/lizavasilyeva/work/vibe-engineer`: `node packages/schematics/fixtures/engine/run-engine-witnesses.mjs --evidence-root .vibe/work/I-07A-schematics-manifest-engine/validation-evidence/engine`; exit 0; output `.pi/tasks/session-8272-8272/b97504484.output`; evidence `validation-evidence/engine/summary.json`.
  - bg `be456dde8`, cwd `/Users/lizavasilyeva/work/vibe-engineer`: `node packages/cli/src/commands/schematic/run-cli-witnesses.mjs --evidence-root .vibe/work/I-07A-schematics-manifest-engine/validation-evidence/cli`; exit 0; output `.pi/tasks/session-8272-8272/be456dde8.output`; evidence `validation-evidence/cli/summary.json`.
- Witness evidence:
  - `node --check` passed for engine, manifest, template, CLI command, artifacts adapter, and both witness runners.
  - Engine `summary.json` has `ok: true` and passed RB1/RB3, P1-P4, N1-N9, R1-R5.
  - CLI `summary.json` has `ok: true` and passed RB2/P5 and recorded RB4 as `pending-live/BLOCKED`.
- Dirty-tree notes: witness reruns wrote only under validator-licensed `validation-evidence/**`; product files were not edited by validator.
- Next step: targeted independent probes for uncovered load-bearing seams and import/blast-radius sweeps.

## Checkpoint 5 — targeted probes and sweeps
- Status: COMPLETE; targeted probes found blocking implementation defects.
- Commands/evidence:
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`: inline `node --input-type=module` probe for embedded `replace_marked_section`; logical exit 1 recorded at `validation-evidence/probes/replace-marked-section.exit.txt`; stdout `validation-evidence/probes/replace-marked-section.stdout.json`.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`: inline `node --input-type=module` probe for edited generated content with unchanged marker; logical exit 1 recorded at `validation-evidence/probes/edited-generated-content.exit.txt`; stdout `validation-evidence/probes/edited-generated-content.stdout.json`.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`: inline `node --input-type=module` probes for partial path escape; logical exits 1 recorded at `validation-evidence/probes/partial-path-escape*.exit.txt`; stdout `validation-evidence/probes/partial-path-escape*.stdout.json`.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`: import/blast-radius/static plan sweep; exit 0; evidence `validation-evidence/sweeps/import-blast-radius-plan-sweep.txt`.
  - cwd `/Users/lizavasilyeva/work/vibe-engineer`: final validator/product/shared status sweep; exit 0; evidence `validation-evidence/sweeps/final-validator-status.txt`.
- Sweep evidence:
  - `rg --fixed-strings '@vibe-engineer/artifacts' packages/schematics/src` -> `NO_MATCH`.
  - CLI schematic imports show actual `@vibe-engineer/artifacts` in `artifacts-adapter.js`, relative schematics engine import, real envelope/result-file imports, and real command-loader use in witness.
  - Static plan sweep found no `planFingerprint`, `plan_fingerprint`, plan-file, or dry-run-plan apply carrier; only empty `preconditions: []` in engine operations and result-file flags in CLI.
  - Shared sentinel status remains dirty/untracked baseline; validator writes are confined to this report and `validation-evidence/**`.

## Findings

### F-CRITICAL-01 — Edited generated content is silently overwritten
- Severity: critical.
- Contract violated: DL-08 idempotency/conflict rules require exact structured markers plus expected previous content/hash/version preconditions; edited generated content must conflict unless a migration owns it. The brief requires fail-closed conflict policy and apply precondition checks.
- Evidence:
  - Source: `packages/schematics/src/engine/index.js` `replace_generated_file` / `replace_marked_section` branches call `markerMatches(parsed.marker, content.marker)` but do not compare parsed body/current content hash to an expected previous content precondition; operations expose `preconditions: []`.
  - Probe: `validation-evidence/probes/edited-generated-content.stdout.json` shows first apply `ok`, manual edit inside `src/example-module.js`, second apply `ok`, `conflicts: []`, `manualEditPreserved: false`, `afterEqualsCanonicalGenerated: true`; exit `1`.
- Impact: data-loss class fail-closed violation; canonical N4 marker-mismatch witness missed same-marker edited-content overwrite.

### F-CRITICAL-02 — Manifest-declared partial paths can escape template root and are emitted
- Severity: critical.
- Contract violated: strict deterministic template safety must not allow template/assets filesystem reads outside the schematic template root. Operation template paths are root-checked, but partial paths are not.
- Evidence:
  - Source: `packages/schematics/src/engine/index.js` `loadTemplates()` resolves `definition.dl08.partials` with `path.resolve(templateRoot, relativePath)` and reads it without checking `path.relative(templateRoot, resolved)`.
  - Probe: `validation-evidence/probes/partial-path-escape-apply.stdout.json` shows a manifest partial `../../leaked-partial.txt` was accepted; apply status `ok`; generated output contained `LEAKED OUTSIDE TEMPLATE ROOT`; exit `1`.
- Impact: unsafe template/manifest path handling; real artifacts validator does not close this semantic gap.

### F-MAJOR-01 — `replace_marked_section` does not implement embedded section replacement
- Severity: major-local.
- Contract violated: DL-08 defines `replace_marked_section` as replacing only a generated section bounded by exact structured markers, preserving surrounding handwritten content.
- Evidence:
  - Source: `packages/schematics/src/engine/index.js` handles `replace_marked_section` through `parseGeneratedBlock(before)` over the entire file and then writes `content.finalContent` as the whole file via `atomicWrite`.
  - Probe: `validation-evidence/probes/replace-marked-section.stdout.json` created a file with handwritten heading/tail and a matching embedded generated marker. Actual apply returned `status: conflicts`, reason `generated_marker_mismatch`, left content unchanged, exit `1`; expected status `ok` with only bounded section replaced.
- Impact: required operation kind is present by shape but not semantically implemented.

### F-MAJOR-02 — Prior dry-run plan fingerprint/apply-precondition seam is absent
- Severity: major-local (also root cause for F-CRITICAL-01).
- Contract violated: DL-08 says apply executes the already computed plan and aborts if manifest/templates/inputs/filesystem preconditions changed; brief §12 requires abort on stale plan fingerprint.
- Evidence:
  - Static sweep `validation-evidence/sweeps/import-blast-radius-plan-sweep.txt` found no plan fingerprint/plan-file/dry-run-plan apply carrier in engine or CLI.
  - Engine public operations always include `preconditions: []`.
  - CLI parse accepts only `--manifest`, `--input-file`, `--target-root`, `--result-file`, `--json`, and `--non-interactive`.
- Impact: no real carrier/consumer seam exists for stale dry-run plan preconditions.

### Process / non-blocking notes
- Implementation bg `b5f60b0f9` was not visible in this runtime; on-disk implementation report was final `DONE`, so validation continued by verify-first inspection. This is a process defect but not the product verdict driver.
- Canonical R4/R5 witnesses record git status rows but do not assert emptiness; because the repo is intentionally dirty with many untracked baseline shared surfaces, independent attribution remains limited to path-scoped inspection and report evidence.
- RB4 shipped/default binary remains `pending-live/BLOCKED` and is correctly not faked; local I-07A could accept that per wrapper only after in-license defects above are fixed.

## Severity classification
- critical: 2 (`F-CRITICAL-01`, `F-CRITICAL-02`)
- major-local: 2 (`F-MAJOR-01`, `F-MAJOR-02`)
- minor-local: process/bg telemetry and weak R4/R5 proof notes only
- clean: no

## Dirty-tree and write-safety record
- Validator product writes: none.
- Validator writes: this report plus `validation-evidence/**` only.
- Product implementation files remain untracked under owned paths; no validator fixes attempted.
- No `git stash/reset/clean/checkout/restore`; no package-manager command; no commits/pushes; no broad builds/tests.
- No evidence of I-07A loader/package/root/artifacts/config/schema edits from inspected owned files; shared surfaces are dirty baseline/untracked and were treated read-only.

## Final verdict — NEEDS-FIX
I-07A is implemented-but-defective. Canonical witnesses pass, but targeted real-boundary/contract probes show fail-closed overwrite/precondition, template partial path-safety, and `replace_marked_section` semantics defects in owned engine code. Fixes appear in-license under `packages/schematics/src/engine/**` and supporting owned witnesses/fixtures; no out-of-license handoff is needed except the already-recorded RB4 pending-live default-binary seam.
