# I-12A Validation Artifact

## Checkpoint 0 — initialized

Status: in-progress
Verdict: pending
Severity: pending

Owned write path initialized: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-validation-artifact.md`

Files inspected: none yet.
Commands run: none yet.
Evidence: artifact created before validation work, per checkpointing requirement.
Blockers: none yet.
Next step: read source-of-truth documents and inspect dirty-tree scope.

## Checkpoint 1 — source docs batch 1 read

Status: in-progress
Verdict: pending
Severity: pending

Files inspected:
- `/Users/lizavasilyeva/work/harness-starter/README.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`

Evidence summary: locked verification doctrine requires deterministic mechanical gates, governed surface, strict config guards, escape allowlists, schema/contract strictness, quality ratchet, wiring integrity, code-smell gate, and test anti-pattern scanner. I-12A validation focus is quality-ratchet truth, stable identity, baseline/approval schema, fail-closed behavior, and evidence carriers.
Blockers: none.
Next step: read HLO playbook, strategy, I-12/I-12A artifacts, and current ledger/status/handoff.

## Checkpoint 2 — source docs/prompts/reports read

Status: in-progress
Verdict: pending
Severity: pending

Files inspected:
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-12-mechanical-P1-ratchet-test-scanner-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-12-fork-b-ruling-decision.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-12-fork-b-brief-revalidation-artifact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-12AB-prompt-validation-artifact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12A-implementation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-implementation-report.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`
Commands run:
- `bg_status` via Pi tool: no background tasks in this Pi extension runtime.
Evidence summary: I-12A owns only `packages/mechanical-gates/src/p1/quality-ratchet/**`, `packages/mechanical-gates/fixtures/p1/quality-ratchet/**`, and this quality-ratchet workdir. I-12C/I-13/I-20 remain blocked until A/B validations and C aggregate bridge. Required I-12A witnesses are baseline unchanged/new/stale/growth/shrink/schema/fingerprint/path-traversal/evidence fail-closed plus real on-disk validator carrier.
Blockers: none.
Next step: inspect product dirty tree, owned files, changed file inventory, and implementation source/fixtures.

## Checkpoint 3 — dirty-tree and owned inventory inspected

Status: in-progress
Verdict: pending
Severity: pending

Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:
- `git status --short -- <I-12A owned paths + sibling/forbidden sentinels>` — exit 0.
- `git diff --name-only -- <same scoped paths>` — exit 0.
- `find packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet -type f | sort` — exit 0.
- sibling/surface sentinels for I-12B, aggregate, P0, I-11 — exit 0.
Evidence:
- Status shows I-12A owned paths untracked along with expected unrelated greenfield dirty baseline; `git diff --name-only` is empty because the repo has no committed HEAD and these paths are untracked.
- Owned inventory contains `packages/mechanical-gates/src/p1/quality-ratchet/index.js`, `index.d.ts`, witness, fixture cases, implementation report, and this validation artifact.
- Sibling I-12B paths exist but are separate (`src/p1/test-anti-pattern/**`, `fixtures/p1/test-anti-pattern/**`). Aggregate/P0/I-11 sentinel files exist and are outside I-12A ownership.
- No runtime-visible background task conflict (`bg_status` had none).
Blockers: none.
Next step: read implementation source, declarations, witness, and representative fixture carriers.

## Checkpoint 4 — implementation source and implementer witnesses inspected/rerun

Status: in-progress
Verdict: pending
Severity: pending

Files inspected:
- `packages/mechanical-gates/src/p1/quality-ratchet/index.js`
- `packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts`
- `packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs`
- representative baseline/finding/approval/surface/runner fixture JSON carriers under `packages/mechanical-gates/fixtures/p1/quality-ratchet/cases/**`
- `packages/mechanical-gates/src/p0/boundaries/contracts.js`
- aggregate entrypoint declarations read-only.
Commands run:
- `node packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs --typecheck` — exit 0.
- `node packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs` — exit 0.
Evidence:
- Actual exported `validateQualityRatchet(projectRoot, options)` consumes on-disk JSON/source carriers and returns P0-style `createValidatorResult` with `family`, `ok`, `projectRoot`, `findings`, `evidence`.
- Implementer witness covers zero debt, unchanged baseline, approved shrink, line movement, new finding, stale row, unapproved growth, invalid baseline, surface mismatch, duplicate identity, line-only identity, traversal, missing runner evidence, and missing source evidence.
- Static inspection found candidate gaps requiring independent probes: approved growth is not in implementer witness; runner `sourceFiles` are normalized but not visibly checked for existence/membership; baseline row evidence existence is not visibly checked.
Blockers: none.
Next step: create validation-owned adversarial fixture probes for approved growth and malformed approval/baseline/runner evidence fail-closed behavior.

## Checkpoint 5 — adversarial validation-owned probes and sibling sweeps

Status: complete
Verdict: NEEDS-FIX
Severity: major-local

Validation-owned files changed:
- `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/validation-evidence/adversarial-probes.mjs`
- `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/validation-evidence/probe-cases/**`

Commands run:
- `node .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/validation-evidence/adversarial-probes.mjs` — exit 1, expected because the implementation false-greened two malformed evidence cases.
- `node --check packages/mechanical-gates/src/p1/quality-ratchet/index.js` — exit 0.
- `node --check packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs` — exit 0.
- `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet || true` — exit 0; only report text references under workdir, no source/fixture dependency.
- `rg -n "quality-ratchet|p1\.quality-ratchet|validateQualityRatchet" <aggregate/I-12B/I-13/I-18/I-20/root/package sentinels> || true` — exit 0; no unexpected sibling/root occurrences.
- `cd packages/mechanical-gates && node fixtures/p0/allowlist-domain-aggregate/witness.mjs && node fixtures/p0/surface-config-boundaries/witness.mjs && node fixtures/p0/testing-boundary/witness.mjs` — exit 0; P0 regression witnesses passed.
- `node packages/mechanical-gates/fixtures/p1/schema-contract-strictness/witness.mjs --typecheck` and `node packages/mechanical-gates/fixtures/p1/schema-contract-strictness/witness.mjs` — exit 0, but validator safety caveat below.
- `git status --short -- .vibe/work/I-11-contract-strictness-minimal-real-fixture .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/validation-evidence` — exit 0.

Adversarial probe evidence:
- Approved baseline growth with real approval evidence passed: `approvedGrowth.ok=true`, `baselineGrowth[0].approved=true`.
- Missing approval evidence failed closed: `missingApprovalEvidence.ok=false`, rule `approval.missing-evidence`.
- Approval evidence path traversal failed closed: `approvalTraversal.ok=false`, rule `input.path-traversal`.
- Malformed runner evidence with `runnerEvidence.sourceFiles=["src/missing.ts"]` incorrectly passed: `runnerSourcefileMissing.ok=true`, `ruleIds=[]`.
- Baseline row with `baseline.debt[0].evidence.sourcePath="src/missing-baseline-source.ts"` incorrectly passed: `baselineRowSourceMissing.ok=true`, `ruleIds=[]`.

Validator safety caveat:
- I ran the I-11 schema-contract witness directly for sibling sweep. Its output names `.vibe/work/I-11-contract-strictness-minimal-real-fixture/typecheck-evidence`, `compiled-witness`, and `witness-evidence` paths; those are outside this validator's owned evidence path and may have been touched. I did not use git cleanup/revert. Product source/config/manifests were not intentionally edited. This witness is not needed for the NEEDS-FIX verdict, which is established by I-12A-owned source inspection and validation-owned probes.

## Finding table

| ID | Severity | Finding | Evidence | Required root-cause fix |
| --- | --- | --- | --- | --- |
| F1 | major-local | Runner evidence `sourceFiles` are accepted without proving the listed files exist, are bounded-readable, and match the consumed source/surface carrier. This lets malformed runner evidence pass false-green. | Static: `parseRunnerEvidence` normalizes `sourceFiles` but no later code reads or compares those paths. Dynamic: validation-owned `runner-sourcefile-missing` probe returned `ok=true` and `ruleIds=[]` for `sourceFiles:["src/missing.ts"]`. | Add runner-evidence validation that bounded-reads every `runnerEvidence.sourceFiles` path, rejects missing/out-of-root/non-file/oversize paths, and verifies the set matches or covers the surface entries/finding source evidence consumed by the validator. Add negative witness for missing and mismatched runner source files. |
| F2 | major-local | Baseline row `evidence.sourcePath` is accepted after path normalization only; missing/non-surfaced baseline source evidence can pass false-green. | Static: `parseBaseline` normalizes row `evidence.sourcePath` but no later validation reads it or checks surface membership. Dynamic: validation-owned `baseline-row-source-missing` probe returned `ok=true` and `ruleIds=[]` for `src/missing-baseline-source.ts`. | Add baseline debt evidence validation that bounded-reads each baseline row `evidence.sourcePath` and verifies it is inside the validation root and present in the surface/source carrier (or otherwise explicitly modeled). Emit `evidence.missing-source`/typed finding on missing or mismatched baseline evidence. Add negative witness. |

## Checklist conclusion

- Owned-file/status evidence inspected: yes, path-scoped status/diff and owned inventory recorded.
- Quality-ratchet implementation/fixtures inspected: yes.
- Positive witnesses: unchanged baseline, zero debt, approved shrink, line movement, and approved growth passed.
- Negative witnesses: new debt, stale row, unapproved growth, invalid baseline, surface mismatch, duplicate/unstable identity, option traversal, missing runner file, missing finding source, missing approval evidence, and approval traversal were exercised; two malformed evidence cases false-greened (F1/F2).
- Real-boundary witness: actual `validateQualityRatchet` entrypoint consumed on-disk baseline/approval/finding-carrier/surface/runner/source fixtures; result/evidence carrier is typed via P0 `createValidatorResult` style.
- Sibling/blast-radius: no evidence of I-12A-owned source changes to I-12B/I-12C/I-13/I-18/I-20/root/manifest/CI/Pulumi/package surfaces; P0 regression witnesses passed. I-12C/I-13/I-20 remain blocked by parent I-12 gates.
- Package/typecheck/build scoped checks: witness `--typecheck`, `node --check` for implementation and witness passed; package-level manifests do not expose I-12A yet by design/Fork-B split.
- Dirty-tree safety: dirty untracked greenfield baseline remains; no git mutating commands used. Validator safety caveat recorded above.

## Final verdict

Verdict: NEEDS-FIX
Severity: major-local
Summary: I-12A is not truth-green because malformed runner and baseline evidence carriers can pass closed-gate validation with no findings.
