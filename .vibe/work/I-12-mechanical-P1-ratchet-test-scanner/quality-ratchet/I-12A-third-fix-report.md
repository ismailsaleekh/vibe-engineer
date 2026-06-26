# I-12A Third Post-Fix Fix Report

## Status
- DONE: root-cause fix for SPF-F1 implemented within I-12A-owned paths.
- This fixer does not claim validator PASS/truth-green; independent revalidation remains required.

## Stage 0 — Report initialized
- Status: complete.
- Files inspected: none before report creation (report-first requirement satisfied before product inspection).
- Files changed: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-third-fix-report.md`.
- Commands/evidence: none.
- Dirty-tree/ownership notes: no product paths inspected at this stage.
- Blockers: none.
- Next step: read required source-of-truth list.

## Stage 1 — Required source-of-truth reading complete
- Status: complete.
- Files inspected/read:
  - `/Users/lizavasilyeva/work/harness-starter/README.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
  - `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-12-mechanical-P1-ratchet-test-scanner-brief-generated.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12A-implementation.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12A-post-validation-fix.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12A-second-post-fix-fix.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md` (complete via continuation)
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-implementation-report.md`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-validation-artifact.md`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-fix-report.md`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-post-fix-revalidation-artifact.md`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-second-fix-report.md`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-second-post-fix-revalidation-artifact.md`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/approval-evidence-content-probe.mjs`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/approval-evidence-content-summary.json`
- Files changed: this report only.
- Commands/evidence: read operations via Pi tool.
- Key finding to fix: `SPF-F1` major-local: `validateApprovalEvidence` only bounded-reads `approval.evidencePath`; malformed non-JSON approval evidence content can approve baseline growth.
- Preserved requirements noted: keep previous runner/baseline/finding evidence hardening, absolute-path rejection, strict exported evidence typing, and downstream typed `p1.quality-ratchet` carrier.
- Dirty-tree/ownership notes: no product edits yet; owned write paths are I-12A source/fixtures/workdir only.
- Blockers: none.
- Next step: inspect product I-12A source/declarations/witness fixtures and path-scoped dirty state before edits.

## Stage 2 — Product inspection and dirty-tree preflight
- Status: complete.
- Files inspected:
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.js`
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs`
- Commands/evidence:
  - `cd /Users/lizavasilyeva/work/vibe-engineer && git status --short -- <I-12A owned paths + sibling/forbidden sentinels>` — exit 0; output shows greenfield/untracked baseline for I-12A owned paths plus sibling/root sentinel paths.
  - `cd /Users/lizavasilyeva/work/vibe-engineer && git diff --name-only -- <same scoped paths>` — exit 0; no output.
  - `bg_status` — no background tasks in this Pi extension runtime.
- Root cause confirmed: `validateApprovalEvidence` performed only `readTextFileBounded(projectRoot, approval.evidencePath, maxFileBytes)` and returned no content/schema findings; product witness wrote approval evidence artifacts as `{ approved: true, kind, reason }`, too weak and not matched against entry/identity.
- Files changed: this report only.
- Dirty-tree/ownership notes: no concrete concurrent ownership conflict observed; dirty tree is baseline; no git-mutating commands used.
- Blockers: none.
- Next step: add strict approval-evidence artifact contract/runtime validation, declarations, and witness cases under I-12A-owned paths.

## Stage 3 — Root-cause implementation
- Status: complete.
- Product files changed:
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.js`
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/type-consumer-negative-extra-evidence.ts`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/cases/**` (regenerated by product witness)
- Workdir/evidence files changed:
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-third-fix-report.md`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/approval-evidence-content-summary.json` (updated by former false-green probe rerun)
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/second-revalidation-probes.mjs` and generated probe summaries/cases (updated to use the strict approval-evidence contract for positive approval cases)
- Root-cause changes:
  - Added exported `QUALITY_RATCHET_APPROVAL_EVIDENCE_VERSION = "quality-ratchet.approval-evidence/1"`.
  - Replaced readability-only approval evidence with bounded JSON parsing through `readJsonFileBounded`.
  - Added exact approval evidence artifact schema: object only, exact keys `schemaVersion`, `family`, `kind`, `identity`, `identityId`, `approved`, `approvedBy`, `reason`; unknown fields fail closed.
  - Required schema/version, family `p1.quality-ratchet`, kind `growth|shrink`, `approved: true`, approvedBy, reason, and at least one of identity or identityId.
  - Matched evidence kind, identity/identityId, approvedBy, and reason against the approval entry; mismatch fails closed.
  - Invalid approval evidence is excluded from effective approval maps, so malformed evidence no longer marks `baselineGrowth[].approved=true` or approves shrink.
  - Added strict `QualityRatchetApprovalEvidenceCarrier` declarations in `index.d.ts` with no index signature.
- Dirty-tree/ownership notes: edits stayed within I-12A-owned product/fixture/workdir paths.
- Blockers: none.
- Next step: run required targeted witnesses and regression/safety sweeps.

## Stage 4 — Targeted witnesses and regression evidence
- Status: complete.
- Commands/evidence:
  - `cd /Users/lizavasilyeva/work/vibe-engineer && node --check packages/mechanical-gates/src/p1/quality-ratchet/index.js && node --check packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs` — exit 0.
  - `cd /Users/lizavasilyeva/work/vibe-engineer && node packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs --typecheck` — exit 0.
  - `cd /Users/lizavasilyeva/work/vibe-engineer && node packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs` — exit 0.
  - `cd /Users/lizavasilyeva/work/vibe-engineer && node .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/approval-evidence-content-probe.mjs` — exit 0; former false-green now returns `ok=false`, ruleIds `approval.evidence-invalid` and `debt.baseline-growth-unapproved`, and `baselineGrowth[0].approved=false`.
  - `cd /Users/lizavasilyeva/work/vibe-engineer && node .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/second-revalidation-probes.mjs && node .../product-fixture-entrypoint-probe.mjs` — initially exit 1 because the stale validation-owned probe still authored weak approval evidence for approved shrink/growth; after updating that workdir probe to the strict contract, `second-revalidation-probes.mjs` exit 0 and `product-fixture-entrypoint-probe.mjs` exit 0.
  - Final combined product witness: `cd /Users/lizavasilyeva/work/vibe-engineer && node packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs --typecheck && node packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs` — exit 0.
  - Final former false-green probe: `node .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/approval-evidence-content-probe.mjs` — exit 0, fail-closed as above.
  - Required syntax/strictness sweeps:
    - `node --check packages/mechanical-gates/src/p1/quality-ratchet/index.js` — exit 0.
    - `node --check packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs` — exit 0.
    - `rg -n "\[key: string\]" packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts || true` — exit 0; no output.
    - `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet || true` — exit 0; no output.
  - Final dirty-tree sweeps:
    - `git status --short -- <I-12A owned paths + sibling/forbidden sentinels>` — exit 0; greenfield/untracked baseline still shows I-12A plus sibling/root sentinels.
    - `git diff --name-only -- <same scoped paths>` — exit 0; no output.
    - `find packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet -type f | sort | wc -l` — exit 0; 689 files after regenerated product and evidence fixtures.
- Positive evidence preserved/proved:
  - zero-debt/new-repo baseline passes.
  - unchanged baseline passes.
  - approved shrink passes and emits `removedDebt` evidence.
  - stable finding identity survives non-semantic line movement.
  - approved baseline growth with strict matching approval evidence artifact passes and emits `baselineGrowth[0].approved=true`.
- Negative evidence preserved/proved:
  - new finding, stale baseline row, unapproved baseline growth, invalid baseline schema, surface fingerprint mismatch, duplicate identity, line-only unstable identity, traversal/absolute paths, missing runner evidence, malformed/missing runner source evidence, malformed/missing baseline/finding evidence, malformed approval entry paths, and strict exported evidence typing all fail closed.
  - Approval evidence non-JSON, JSON non-object, missing/unreadable file, missing required fields, unknown fields, wrong schema/version, wrong family, `approved` false, kind mismatch, identity mismatch, identityId mismatch, approvedBy mismatch, reason mismatch, traversing path, absolute path, and readable unrelated JSON all fail closed.
- Real-boundary evidence:
  - Actual `packages/mechanical-gates/src/p1/quality-ratchet/index.js` / `validateQualityRatchet(projectRoot, options)` consumed real on-disk baseline, previous-baseline, approvals, approval-evidence artifact, findings, runner-evidence, surface-fingerprint, and source files.
  - Former false-green probe using real on-disk malformed `approvals/growth.json` now fails closed through the actual product entrypoint.
- Dirty-tree/ownership notes:
  - Dirty tree remains expected greenfield/untracked baseline.
  - No root/package-manager/manifest/lockfile/aggregate/I-12B/I-12C/P0/I-11/contracts/testing/CI/scripts/infra/docs edits were intentionally made.
  - No git-mutating commands, package-manager mutations, commits, pushes, stash/reset/clean/checkout/restore were used.
- Blockers: none.
- Next step: independent I-12A third post-fix revalidation.
