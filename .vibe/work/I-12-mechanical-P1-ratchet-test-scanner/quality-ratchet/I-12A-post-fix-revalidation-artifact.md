# I-12A Post-Fix Revalidation Artifact

## Checkpoint 0 — initialized

- Status: in-progress
- Role: independent adversarial revalidator; no product edits allowed.
- Owned write paths: this artifact and optional evidence files under `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/post-fix-revalidation-evidence/`.
- Files changed by validator so far: this artifact only.
- Next step: read source-of-truth materials and collect dirty-tree/owned-file evidence.


## Checkpoint 1 — source materials read

- Status: in-progress
- Files inspected/read:
  - `/Users/lizavasilyeva/work/harness-starter/README.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
  - `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-12-mechanical-P1-ratchet-test-scanner-brief-generated.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-12A-implementation.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-implementation-report.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-validation-artifact.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/I-12A-fix-report.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
- Evidence summary: I-12A must validate `p1.quality-ratchet` with real on-disk baseline/approval/finding-carrier/surface/runner/source carriers, stable non-line-only identities, fail-closed malformed evidence carriers, dirty-tree scoped proof, sibling blast-radius sweep, and no edits outside I-12A owned source/fixture/workdir. Original validation finding was major-local false-green for malformed runner `sourceFiles` and baseline row `evidence.sourcePath`; fix claims root-cause hardening.
- Validator files changed so far: this artifact only.
- Blockers: none.
- Next step: collect dirty-tree/status evidence and inspect changed/owned files.


## Checkpoint 2 — dirty-tree scope and owned inventory

- Status: in-progress
- Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:
  - `git status --short -- <I-12A owned paths + sibling/forbidden sentinels>` — exit 0.
  - `git diff --name-only -- <same scoped paths>` — exit 0.
  - `find packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet -type f | sort | wc -l` — exit 0; 185 files.
- Evidence summary: repo is greenfield/no committed HEAD; path-scoped status shows I-12A owned paths plus existing untracked sibling/root sentinels (`package.json`, lock/workspace/turbo/config, docs, P0, I-11, I-12B, aggregate, contracts/testing) as untracked baseline; `git diff --name-only` is empty. No concrete ownership conflict observed.
- Validator files changed so far: this artifact only.
- Blockers: none.
- Next step: inspect product source/declarations/witness and representative carriers before executing validation-owned probes.


## Checkpoint 3 — implementation source/witness inspected and revalidation probe prepared

- Status: in-progress
- Files inspected:
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.js`
  - `packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts`
  - `packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs`
  - `packages/mechanical-gates/src/p0/boundaries/contracts.js`
  - `packages/mechanical-gates/src/aggregate/index.js` / `index.d.ts` / `run-p0-aggregate.js` (read-only sibling sentinels)
- Static evidence summary: runtime fix added `validateBaselineSourceEvidence` and `validateRunnerEvidenceSourceFiles`; baseline/finding evidence unknown fields are rejected at runtime. The product witness rewrites product fixture cases, so I prepared a read-only direct revalidation script that imports the actual product validator and consumes existing product fixture carriers plus validation-owned adversarial copies.
- Validator evidence file created: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/post-fix-revalidation-evidence/revalidation-probes.mjs`.
- Blockers: none.
- Next step: run revalidation probes and syntax/package/sibling checks.


## Checkpoint 4 — witnesses, closure probes, and regression checks run

- Status: in-progress; blocking candidate found.
- Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:
  - `node .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/post-fix-revalidation-evidence/revalidation-probes.mjs` — exit 0.
  - `node .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/post-fix-revalidation-evidence/absolute-path-probes.mjs` — exit 0; probe reports accepted absolute path cases.
  - `node --check packages/mechanical-gates/src/p1/quality-ratchet/index.js && node --check packages/mechanical-gates/fixtures/p1/quality-ratchet/witness.mjs && node --check <revalidation probe> && node --check packages/mechanical-gates/src/aggregate/index.js && node --check packages/mechanical-gates/src/aggregate/run-p0-aggregate.js` — exit 0.
  - `cd packages/mechanical-gates && node fixtures/p0/allowlist-domain-aggregate/witness.mjs && node fixtures/p0/surface-config-boundaries/witness.mjs && node fixtures/p0/testing-boundary/witness.mjs` — exit 0.
  - `node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false <type-consumer-positive.ts>` — exit 0.
  - `rg -n "@vibe-engineer/testing" packages/mechanical-gates/src/p1/quality-ratchet packages/mechanical-gates/fixtures/p1/quality-ratchet || true` — exit 0; no output.
  - `rg -n "quality-ratchet|p1\.quality-ratchet|validateQualityRatchet|runP1Aggregate" <root/package/aggregate/I-12B/I-11/contracts/testing/CI/scripts/infra/docs sentinels> || true` — exit 0; only expected DL-15 planning note under docs.
  - final `git status --short -- <I-12A owned paths + sibling/forbidden sentinels>` and `git diff --name-only -- <same>` — exit 0; status remains greenfield untracked baseline plus this revalidation workdir, diff name-only empty.
- Positive witness evidence: zero-debt/new-repo, unchanged baseline, approved shrink (`removedDebt.length=1`), stable line movement, and approved baseline growth (`baselineGrowth[0].approved=true`) all passed through the actual `validateQualityRatchet` product entrypoint over existing on-disk product fixture carriers.
- Negative/fail-closed evidence: new finding, stale baseline row, unapproved baseline growth, invalid baseline schema, surface fingerprint mismatch, duplicate identity, unstable line-only identity, missing runner, malformed runner sourceFiles (missing/omitted/duplicate), malformed baseline/finding evidence extra fields, missing source evidence, relative traversal, absolute out-of-root path, malformed runner carrier fields, wrong runner carrier/surface refs, non-completed runner status, baseline evidence path mismatch, malformed/missing/traversing approval evidence, stale source hash, unknown option, and invalid maxFileBytes all failed closed.
- Original finding closure: F1 runner `sourceFiles:["src/missing.ts"]` now `ok=false` with `evidence.missing-runner`; F2 baseline row `evidence.sourcePath:"src/missing-baseline-source.ts"` now `ok=false` with `evidence.missing-source`.
- Blocking candidate: in-root absolute paths in validator options and carrier fields (`baselinePath`, runner `sourceFiles`, baseline row source, finding path/source, approval evidence) were accepted with `ok=true` and no findings by `absolute-path-probes.mjs`, despite the post-fix revalidation requirement for fail-closed traversal/absolute path attempts and the I-12A contract for normalized project-relative carriers.
- Evidence artifacts: `post-fix-revalidation-evidence/revalidation-probes-summary.json`, `absolute-path-probes-summary.json`, probe scripts/cases, and `type-consumer-positive.ts`.
- Next step: classify severity and write final finding/verdict.


## Checkpoint 5 — runtime conflict sweep

- Status: in-progress
- Command/tool: `bg_status` — no background tasks in this Pi extension runtime.
- Evidence summary: no visible concurrent background agent owns or mutates I-12A paths from this runtime; dirty-tree status remains the greenfield/untracked baseline plus validator-owned evidence.
- Next step: final verdict.


## Checkpoint 6 — typed contract negative probe

- Status: in-progress; second blocking candidate confirmed.
- Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:
  - `rg -n "\[key: string\]" packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts` — exit 0; lines 30 and 75 contain index signatures.
  - `node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/quality-ratchet/post-fix-revalidation-evidence/type-consumer-negative-extra-evidence.ts` — exit 2 with `TS2578: Unused '@ts-expect-error' directive`.
- Evidence summary: runtime rejects extra finding evidence fields, but the exported `QualityRatchetFindingCarrierEntry.evidence` declaration still permits arbitrary `[key: string]: unknown`; malformed parser-self-agreement-style evidence compiles instead of being rejected by the typed contract.
- Evidence file: `post-fix-revalidation-evidence/type-consumer-negative-extra-evidence.ts`.
- Next step: final verdict.


## Final finding table

| ID | Severity | Finding | Evidence | Required root-cause fix |
| --- | --- | --- | --- | --- |
| PF-F1 | major-local | I-12A still accepts in-root absolute paths in validator options and on-disk carriers, normalizing them to project-relative output and returning `ok=true`. This does not satisfy the post-fix requirement for fail-closed traversal/absolute path attempts and allows machine-local absolute carriers to pass as valid quality-ratchet evidence. | Static: `normalizeProjectPath(projectRoot, candidatePath)` checks only the resolved relative path and never rejects `path.isAbsolute(candidatePath)`. Dynamic: `post-fix-revalidation-evidence/absolute-path-probes.mjs` produced `acceptedAbsolutePathCases` for `absolute-option-baseline`, `absolute-runner-source-file`, `absolute-baseline-row-source`, `absolute-finding-source-and-path`, and `absolute-approval-evidence`; all had `ok=true` and `rules=[]`. | Reject original absolute candidate paths for every validator option and every carrier/evidence path before resolving/normalizing; emit a typed fail-closed finding such as `input.absolute-path`/`input.path-traversal`; add regression witnesses for in-root absolute baseline path, runner `sourceFiles`, baseline/finding source paths, and approval evidence paths. |
| PF-F2 | major-local | Runtime schema hardening rejects extra finding evidence fields, but the exported typed finding-carrier declaration still permits malformed evidence extras via `[key: string]: unknown`. A typed producer can compile parser-self-agreement-only evidence even though the runtime carrier rejects it, weakening the load-bearing typed producer→consumer contract. | Static: `rg -n "\[key: string\]" packages/mechanical-gates/src/p1/quality-ratchet/index.d.ts` shows `QualityRatchetFindingCarrierEntry.evidence` has an index signature at line 30. Dynamic type probe: `tsc ... type-consumer-negative-extra-evidence.ts` exited 2 with `TS2578: Unused '@ts-expect-error' directive`, proving the malformed extra field compiled. | Align declarations with runtime schemas: remove the input evidence index signature from `QualityRatchetFindingCarrierEntry.evidence` and add strict exported types for baseline/approval/runner carriers where exposed/needed; add a negative TypeScript declaration witness that malformed carrier evidence fails to compile. |

## Checklist conclusion

- Owned-file/status evidence inspected: yes; path-scoped status/diff captured before and after, with dirty greenfield/untracked baseline acknowledged and no git-mutating commands used.
- Original validation findings closed: yes for F1/F2 malformed runner and baseline evidence-source carriers; both now fail closed dynamically.
- Positive witnesses: zero-debt/new-repo, unchanged baseline, approved shrink, stable line movement, and approved baseline growth all passed through actual `validateQualityRatchet` over on-disk product fixture carriers.
- Required negative witnesses: new debt, stale rows, unapproved growth, invalid schema, surface/fingerprint mismatch, malformed runner/baseline/finding/approval carriers, stale/missing source evidence, relative traversal, absolute out-of-root traversal, unknown options, invalid max bytes, and schema violations were exercised; in-root absolute path attempts false-greened (PF-F1).
- Real-boundary witness: actual product `packages/mechanical-gates/src/p1/quality-ratchet/index.js` entrypoint consumed product fixture carriers and validation-owned adversarial on-disk carriers. Product `witness.mjs` itself was not executed because it rewrites product fixture cases; `node --check` covered its syntax.
- Sibling/blast-radius: P0 aggregate/regression witnesses passed; aggregate entrypoint syntax passed; `rg` found no quality-ratchet wiring in root/package/aggregate/I-12B/I-11/contracts/testing/CI/scripts/infra sentinels except expected docs planning note; no `@vibe-engineer/testing` references under I-12A source/fixtures.
- Package/typecheck/build scoped checks: `node --check` on I-12A source/witness/probes and aggregate sentinels passed; positive TypeScript consumer passed; negative TypeScript strict-carrier probe exposed PF-F2.
- Dirty-tree safety: no background tasks visible in this Pi runtime; only validator-owned artifact/evidence was written by this revalidator; product source/config/manifests were not edited by this revalidator.

## Final verdict

Verdict: NEEDS-FIX
Severity: major-local
Summary: post-fix I-12A closes the original runner/baseline evidence false-greens, but absolute in-root carrier paths still pass and the exported finding-carrier evidence type remains too permissive.
