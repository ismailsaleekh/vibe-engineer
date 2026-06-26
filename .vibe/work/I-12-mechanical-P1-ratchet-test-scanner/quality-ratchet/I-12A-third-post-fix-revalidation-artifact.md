# I-12A Third Post-Fix Revalidation Artifact

## Verdict
- Status: COMPLETE
- Verdict: PASS
- Severity: clean

## Checkpoint 0 - initialized
- Status: complete.
- Role: independent adversarial validator.
- Write scope: this artifact only; product paths remained read-only.
- Product edits by this validator: none.

## Checkpoint 1 - source truth read
- Status: complete.
- Files inspected:
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12A-third-post-fix-fix.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-12A-third-fix-prompt-validation-artifact.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-third-fix-report.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-second-post-fix-revalidation-artifact.md`
- Source-truth summary: previous major-local SPF-F1 was malformed/non-JSON approval evidence content false-greening baseline growth; fix report claims strict JSON approval-evidence carrier contract, exact fields, entry/identity matching, declaration export, product witness updates, and former probe closure.
- Blockers: none.

## Checkpoint 2 - scoped status/diff and static product inspection
- Status: complete.
- Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:
  - `git status --short -- <I-12A owned paths + sibling/forbidden sentinels>`: exit 0; showed untracked greenfield I-12A paths plus untracked sibling/root sentinel paths.
  - `git diff --name-only -- <same scoped paths>`: exit 0; no tracked diff names.
  - `find packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet -maxdepth 3 -type f | sort`: exit 0; inspected inventory includes source, declarations, witness, and approval-evidence fixture cases.
- Files inspected:
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.js`
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/cases/approved-baseline-growth/approvals.json`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/cases/approved-baseline-growth/approvals/growth.json`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/approval-evidence-content-probe.mjs`
  - `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/approval-evidence-content-summary.json`
- Static evidence:
  - `validateApprovalEvidence` now calls `readJsonFileBounded` for each `approval.evidencePath`; malformed JSON is mapped to `approval.evidence-invalid` and missing/unreadable evidence to `approval.missing-evidence`.
  - `parseApprovalEvidenceArtifact` rejects non-objects, unknown keys, wrong schema/version/family/kind, non-true `approved`, missing identity/identityId, and mismatched kind/identity/identityId/approvedBy/reason.
  - Only approvals with zero new findings enter `validApprovals`; `compareDebt` receives only `approvalEvidenceValidation.validApprovals`, so malformed evidence cannot set `baselineGrowth[].approved=true` or approve shrink.
  - `index.d.ts` exports `QUALITY_RATCHET_APPROVAL_EVIDENCE_VERSION` and `QualityRatchetApprovalEvidenceCarrier` without an index signature.
  - No approval-evidence regex/text-only matching was observed; approval evidence is bounded-parsed with `JSON.parse` through the real file reader.
  - The former probe summary now records `ok=false`, ruleIds `approval.evidence-invalid` and `debt.baseline-growth-unapproved`, and `baselineGrowth[0].approved=false`.
- Blockers: none.

## Checkpoint 3 - syntax, type, and static strictness sweeps
- Status: complete.
- Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:
  - `node --check packages/mechanical-gates/src/p1/quality-ratchet/index.js && node --check packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs`: exit 0.
  - `rg -n "[key: string]" packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts || true`: exit 0; no output.
  - `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet || true`: exit 0; no output.
  - `node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false packages/mechanical-gates/fixtures/p1/quality-ratchet/type-consumer-negative-extra-evidence.ts`: exit 0; `@ts-expect-error` markers for unknown finding/approval evidence fields were consumed.
  - `bg_status`: no background tasks in this Pi extension runtime.
- Note: I did not run `packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs` itself because the script deletes/regenerates product fixture cases; validator license permits writing only this artifact. I instead ran read-only existing-fixture probes and fresh temp-directory real-boundary probes through the actual product entrypoint.
- Blockers: none.

## Checkpoint 4 - independent dynamic witnesses through actual product entrypoint
- Status: complete.
- Actual entrypoint used: `packages/mechanical-gates/src/p1/quality-ratchet/index.js` / `validateQualityRatchet(projectRoot, options)`.
- Real-boundary carrier: temp on-disk project outside repo with real baseline, previous-baseline, approvals, approval-evidence artifacts, findings carrier, runner evidence, surface fingerprint, and source files. Temp tree was removed after the run.
- Command: `node --input-type=module - <<'NODE' <independent temp-boundary probe>` from repo root; exit 0.
- Temp-boundary summary:
  - 39 cases passed the asserted expectations.
  - Positives passed: zero-debt/new-repo, unchanged baseline, approved shrink with `removedDebt`, line movement with stable identity, strict approved baseline growth with identity evidence, and strict approved baseline growth with identityId-only evidence.
  - Core negatives failed closed: new finding, stale baseline row, unapproved baseline growth, invalid baseline schema, surface fingerprint mismatch, duplicate identity, unstable line-only identity, traversal and absolute option paths, absolute finding path, absolute runner source, missing runner evidence, malformed runner evidence, malformed baseline row evidence, and malformed finding evidence.
  - Approval-evidence negatives failed closed: missing file, traversal path, absolute path, non-JSON former false-green, non-object JSON, missing required field, unknown field, wrong schema, wrong family, `approved:false`, `approved:"true"`, kind mismatch, identity mismatch, identityId mismatch, approvedBy mismatch, reason mismatch, and readable unrelated JSON.
  - Former false-green dynamic result: `ok=false`, ruleIds `approval.evidence-invalid` + `debt.baseline-growth-unapproved`, `baselineGrowth[0].approved=false`.
  - Strict positive growth dynamic result: `ok=true`, no findings, `baselineGrowth[0].approved=true`, `evidencePath="approvals/growth.json"`.
- Read-only product fixture command: `node --input-type=module - <<'NODE' <existing-fixture probe>` from repo root; exit 0.
- Existing-fixture summary:
  - 21 product fixture cases passed asserted expectations without regenerating fixtures.
  - Positives covered zero-debt/new-repo, unchanged baseline, approved shrink, line movement, and approved baseline growth.
  - Negative fixture cases covered new finding, stale baseline row, unapproved baseline growth, invalid baseline schema, surface fingerprint mismatch, absolute runner/baseline/finding paths, and approval evidence non-JSON/unknown-field/kind-mismatch/identity-mismatch/identityId-mismatch/approvedBy-mismatch/reason-mismatch/unrelated JSON.
  - Existing `approval-evidence-non-json` fixture result: `ok=false`, ruleIds `approval.evidence-invalid` + `debt.baseline-growth-unapproved`, `baselineGrowth[0].approved=false`.
- Blockers: none.

## Checkpoint 5 - final dirty-tree and blast-radius sweep
- Status: complete.
- Command: final `git status --short -- <I-12A owned paths + sibling/forbidden sentinels>` from repo root; exit 0.
  - Output remained greenfield/untracked for I-12A plus existing sibling/root sentinel paths.
- Command: final `git diff --name-only -- <same scoped paths>` from repo root; exit 0; no tracked diff names.
- No git-mutating commands were used. No stash/reset/clean/checkout/restore.
- Validator writes: this artifact only. Dynamic witnesses wrote only temporary OS files and cleaned them.
- No evidence of I-12B/I-12C/aggregate/root/package-manager/shared-surface edits caused by this validation or required for the fix.
- Blockers: none.

## Finding classification
| Area | Severity | Classification | Evidence |
| --- | --- | --- | --- |
| SPF-F1 malformed approval evidence false-green | clean | Closed | Static strict JSON parser/matcher plus temp and existing-fixture real-boundary probes show non-JSON approval evidence returns `ok=false` and `baselineGrowth[0].approved=false`. |
| Approval evidence carrier contract | clean | Strict typed contract | Exact-key schema, JSON object requirement, schema/version/family/kind/approved/approvedBy/reason/identity-or-identityId validation, and entry identity/kind/approvedBy/reason matching. |
| Missing/wrong/unknown/non-JSON approval evidence cases | clean | Fail closed | Independent temp probes covered missing, traversal, absolute, non-object, missing required, unknown, wrong schema/family, false/non-true approved, kind/identity/identityId/approvedBy/reason mismatches, and unrelated readable JSON. |
| Positive approval path | clean | Preserved | Strict matching growth evidence passes and emits approved baseline-growth evidence; identityId-only strict evidence also passes. |
| PF-F1 absolute in-root/path safety regression | clean | Preserved | Absolute baseline option, runner source, finding path, and approval evidence path fail with `input.absolute-path`; traversal fails closed. |
| PF-F2 exported strict typing regression | clean | Preserved | No `[key: string]` in I-12A declarations; negative TypeScript consumer exits 0 with consumed excess-field `@ts-expect-error` markers. |
| Runner/baseline/finding evidence regressions | clean | Preserved | Missing/malformed runner evidence and malformed baseline/finding evidence fail closed in independent witnesses. |
| Heuristic/regex substitute risk | clean | Not present for approval contract | Approval evidence uses bounded JSON parse and typed field comparisons; no regex/text-only approval matching observed. |
| Dirty tree / ownership / blast radius | clean | Safe within evidence limits | Scoped status/diff run before and after; no tracked diff names; no product/root/shared edits by validator; no required out-of-scope fix surface. |

## Final verdict
PASS — the I-12A third fix closes malformed approval-evidence content false-greening and preserves prior strictness/path regressions with real-boundary evidence.
