# I-12A Second Post-Fix Revalidation Artifact

Status: COMPLETE
Verdict: NEEDS-FIX
Severity: major-local

## Checkpoint 0 — Artifact initialized
- Time: 2026-06-26
- Scope: independent adversarial revalidation of I-12A second post-fix.
- Allowed writes: this artifact and optional evidence files under `second-post-fix-revalidation-evidence/`.
- Product edits: none.

## Checkpoint 1 — Source-of-truth documents and prior artifacts read
- Files read: `/Users/lizavasilyeva/work/harness-starter/README.md`, `docs/locked-decisions.md`, `docs/verification-layer.md`, `docs/mechanical-verification-gates.md`, `docs/planning-research-backlog.md`, `guides/high-level-orchestrator-playbook.md`, I-12 generated implementation brief, I-12A implementation prompt, I-12A implementation/validation/fix/post-fix-revalidation/second-fix artifacts, and current ledger/status/handoff.
- Prior revalidation findings to close: PF-F1 accepted in-root absolute paths; PF-F2 lax exported finding-carrier evidence type.
- Second fix claims: reject original absolute candidate paths before normalization; emit `input.absolute-path`; strict exported carrier declarations and negative type witness.
- Runtime conflict check: `bg_status` returned no background tasks in this Pi extension runtime.
- Product edits by this validator: none.

## Checkpoint 2 — Dirty-tree scope and owned inventory collected
- Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:
  - `git status --short -- <I-12A owned paths + sibling/forbidden sentinels>` — exit 0.
  - `git diff --name-only -- <same scoped paths>` — exit 0; no tracked diff names (repo has no committed HEAD / greenfield untracked baseline).
  - `find packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet -type f | sort | wc -l` — exit 0; 327 files.
- Status evidence: scoped status shows untracked I-12A owned paths and existing untracked sibling/forbidden sentinels (`docs`, root configs/manifests, contracts/testing, P0, I-11, I-12B, aggregate); dirty tree treated as baseline.
- Concrete ownership conflict: none observed.
- Product edits by this validator: none.

## Checkpoint 3 — Source/declarations/witness inspected; validation probes prepared
- Files inspected:
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.js`
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/type-consumer-negative-extra-evidence.ts`
  - `packages/mechanical-gates/src/p0/boundaries/contracts.js`
  - `packages/mechanical-gates/src/aggregate/index.js`, `index.d.ts`, `run-p0-aggregate.js`
  - `packages/mechanical-gates/package.json` (read-only manifest/export sentinel)
- Static source evidence: `normalizeProjectPath` now checks `path.isAbsolute(candidatePath)` and maps `QUALITY_RATCHET_PATH_ABSOLUTE` to `input.absolute-path`; baseline/finding/approval/runner carrier parsers normalize carrier paths and reject unknown evidence fields; runner/baseline source evidence validation still reads real source paths.
- Static type evidence: `QualityRatchetFindingCarrierEntry.evidence` is now `QualityRatchetFindingCarrierEvidence` with only `sourcePath` and `sourceExcerpt`; no `[key: string]` index signature was observed in `index.d.ts`.
- Product witness note: `fixtures/p1/quality-ratchet/witness.mjs` deletes/regenerates product fixture cases, so this validator did not execute it under read-only product constraints; direct entrypoint probes over validation-owned and product fixture carriers were used instead.
- Validator evidence files created:
  - `second-post-fix-revalidation-evidence/second-revalidation-probes.mjs`
  - `second-post-fix-revalidation-evidence/type-carrier-strictness.ts`
  - `second-post-fix-revalidation-evidence/product-fixture-entrypoint-probe.mjs`
  - `second-post-fix-revalidation-evidence/approval-evidence-content-probe.mjs`
- Product edits by this validator: none.

## Checkpoint 4 — Witnesses and sweeps run
- Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:
  - `node .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/second-revalidation-probes.mjs` — exit 0.
  - `node .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/product-fixture-entrypoint-probe.mjs` — exit 0.
  - `node .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/second-post-fix-revalidation-evidence/approval-evidence-content-probe.mjs` — exit 0, but produced blocking false-green evidence.
  - `node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false .vibe/work/.../second-post-fix-revalidation-evidence/type-carrier-strictness.ts` — exit 0.
  - `node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false packages/mechanical-gates/fixtures/p1/quality-ratchet/type-consumer-negative-extra-evidence.ts` — exit 0.
  - `node --check packages/mechanical-gates/src/p1/quality-ratchet/index.js && node --check packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs && node --check <second-revalidation-probes.mjs> && node --check packages/mechanical-gates/src/aggregate/index.js && node --check packages/mechanical-gates/src/aggregate/run-p0-aggregate.js` — exit 0.
  - `rg -n "\[key: string\]" packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts || true` — exit 0; no output.
  - `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet || true` — exit 0; no output.
  - `rg -n "quality-ratchet|p1\.quality-ratchet|validateQualityRatchet|runP1Aggregate" <root/package/aggregate/I-12B/I-11/contracts/testing/CI/scripts/infra/docs sentinels> || true` — exit 0; only expected DL-15 planning note plus missing-path diagnostics for absent sentinel dirs/files.
  - `find packages/mechanical-gates/src/p1 -maxdepth 3 -type f | sort` and `find packages/mechanical-gates/fixtures/p1 -maxdepth 3 -type f | sort | head -120` — exit 0.
  - `node --check packages/mechanical-gates/src/p1/test-anti-pattern/index.js && node --check packages/mechanical-gates/fixtures/p1/test-anti-pattern/witness.mjs && node --check packages/mechanical-gates/src/aggregate/index.js && node --check packages/mechanical-gates/src/aggregate/run-p0-aggregate.js` — exit 0.
  - Final `git status --short -- <I-12A owned paths + sibling/forbidden sentinels>` and `git diff --name-only -- <same>` — exit 0; status remains greenfield untracked baseline plus validator-owned evidence, diff name-only empty.
- Evidence artifacts:
  - `second-post-fix-revalidation-evidence/second-revalidation-probes-summary.json`
  - `second-post-fix-revalidation-evidence/product-fixture-entrypoint-summary.json`
  - `second-post-fix-revalidation-evidence/approval-evidence-content-summary.json`

## Closure / regression checklist
- PF-F1 absolute in-root carriers: closed for validated scope. Validation-owned and product fixture probes show `input.absolute-path` for absolute baseline option, runner `sourceFiles`, baseline row source, finding path/source, and approval evidence path.
- PF-F2 lax exported finding-carrier evidence type: closed for validated scope. `rg "[key: string]"` has no output for I-12A declarations; both validation-owned and product negative TypeScript probes exit 0 with consumed `@ts-expect-error` markers for malformed carrier/result evidence extras.
- Original malformed runner/baseline evidence-source false-greens: remain closed. `runner-sourcefile-missing` and `baseline-row-source-missing` both return `ok=false` with `evidence.missing-runner` / `evidence.missing-source` through actual `validateQualityRatchet`.
- Positives: zero-debt/new-repo, unchanged baseline, approved shrink with `removedDebt`, stable line movement, and approved baseline growth with `baselineGrowth[0].approved=true` pass.
- Expected blockers: new finding, stale baseline row, unapproved growth, invalid baseline schema, baseline/surface fingerprint mismatch, stale source hash, duplicate/unstable identity, missing runner, malformed runner carriers, malformed baseline/finding carriers, missing/stale source evidence, relative traversal, absolute path attempts, unknown options, invalid `maxFileBytes`, and previous-baseline schema violations fail closed.
- Real-boundary witness: actual product entrypoint `packages/mechanical-gates/src/p1/quality-ratchet/index.js` consumed real on-disk baseline, approval, finding-carrier, surface-fingerprint, runner-evidence, and source carriers under both validation-owned probe cases and product fixture cases. This is not a hardcoded witness array.
- Sibling/blast-radius: no evidence that this second post-fix touched root/package-manager/lockfile/workspace files, package manifests, I-12B/I-12C aggregate, I-13/I-20/I-18, CI/Pulumi/scripts/infra, contracts/testing, or docs beyond read-only sweep and validator-owned evidence. No `@vibe-engineer/testing` dependency/reference under I-12A source/fixtures.
- Scoped package/typecheck/build consistency: `node --check` on I-12A source/witness and adjacent aggregate/I-12B sentinels passed; strict TypeScript declaration probes passed. No package build was run because I-12A has no package-owned build/export lane and the product witness script mutates product fixtures.

## Finding table

| ID | Severity | Finding | Evidence | Required root-cause fix |
| --- | --- | --- | --- | --- |
| SPF-F1 | major-local | Approval evidence path content is not typed or schema-validated. A baseline growth approval can point at a non-JSON/non-typed file and still approve baseline growth with `ok=true`, leaving a false-green approval-evidence carrier despite the lane requirement for malformed approval evidence to fail closed. | Static: `validateApprovalEvidence` only calls `readTextFileBounded(projectRoot, approval.evidencePath, maxFileBytes)` and never parses or validates the evidence artifact. Dynamic: `second-post-fix-revalidation-evidence/approval-evidence-content-probe.mjs` wrote `approvals/growth.json` as `not-json-not-typed-evidence`; `validateQualityRatchet(... previousBaselinePath ...)` returned `ok=true`, `ruleIds=[]`, and `baselineGrowth[0].approved=true`. | Define a strict approval-evidence artifact contract, bounded-parse it as JSON, require exact typed fields consistent with the approval record (at minimum schema/version/family/kind/identity or identityId/approved metadata/reason), reject malformed/false/mismatched evidence, expose matching declarations if exported, and add negative witnesses for non-JSON, missing required fields, mismatched identity/kind, and explicit non-approval evidence. |

## Final verdict
- Verdict: NEEDS-FIX
- Severity: major-local
- Summary: PF-F1/PF-F2 are closed, but malformed approval evidence content still false-greens approved baseline growth.
