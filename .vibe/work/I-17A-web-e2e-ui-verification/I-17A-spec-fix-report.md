# I-17A Spec-Fix Report — Triad-B FIX (test.info() at definition time)

- **Agent**: Triad-B FIX (model glm-5.2 via zai, thinking high)
- **Class**: I-17A-owned spec-defect fix — `test.info()` called in test title at definition time
- **Target repo**: `/Users/lizavasilyeva/work/vibe-engineer`
- **Binding**: quality-bar (prepended verbatim), I-17A-spec-fix brief, I-17A-probe-fix-report §S6/S8 (handoff)
- **Status**: DONE — spec defect fixed + validated; honest pending-live on operator-gated browser binaries.

## Defect (root-caused independently)
`examples/starter-reference/generated-fixtures/e2e-ui/web/ui-verification/specialists/overlap-clipping.spec.ts:13`
calls `test.info()` inside the `test(...)` **title** (a template literal evaluated at module-load /
definition time). `test.info()` is only valid inside a running test body. This throws
`Error: test.info() can only be called while test is running` at **test-collection time**, before
any browser is needed (browser-independent). Confirmed in the existing
`web/evidence/playwright-report.json` snippet (collection error @ line 13).

### Blast-radius / sibling sweep (typed-contract discipline, no assumptions)
Scanned ALL 7 specialist specs under `ui-verification/specialists/*.spec.ts` for the SAME defect
class (`test.info()` evaluated in a title / at definition time, NOT inside a test body):
- `overlap-clipping.spec.ts:13` — **DEFECT** (`test.info()` in title template literal).
- `accessibility.spec.ts`, `color-contrast.spec.ts`, `responsive-layout.spec.ts`,
  `spacing-alignment.spec.ts`, `truncation.spec.ts`, `visual-regression.spec.ts` — all their
  `test.info()` calls are INSIDE the test body (after the `async ({ page }) => {` boundary) → VALID.
- Conclusion: defect is **isolated to `overlap-clipping.spec.ts:13`**. No sibling needs touching
  (and siblings are outside this task's WRITE scope regardless).

## Pre-fix independent verification (gathered BEFORE edit)
- Existing `web/evidence/playwright-report.json` records the collection error precisely at
  `overlap-clipping.spec.ts:13` with the `test.info()` title snippet — independent confirmation.
- The title's `@${test.info().project.metadata?.viewportId ?? "?"}` is a non-load-bearing display
  tag; the real viewport identity is captured INSIDE the body (line 17 slug, lines 27–30 evidence).
  → Fix approach **(a)**: replace the definition-time `test.info()` in the title with a static
  string. No dynamic info is lost; no body logic changes; no contract altered.

## Fix
Line 13 title: `@${test.info().project.metadata?.viewportId ?? "?"}` → static `@viewport`
(viewport matrix is set via playwright projects; per-viewport identity remains in the body/slug).

## Stage log
- [x] S0 — report artifact created.
- [x] S1 — defect root-caused independently; sibling blast-radius swept (isolated to 1 file/1 line).
- [x] S2 — fix applied (approach (a): static title, body untouched).
- [x] S3 — test-collection error RESOLVED. `playwright test --list` exit 0, **65 tests in 10 files** collected
  across all 3 viewport projects (tablet/desktop/wide), incl. `overlap-clipping.spec.ts:13 › @ui
  overlap-clipping — golden-records-default @viewport`. ZERO `test.info() can only be called` errors
  (grep count 0 in collection-list.txt). Evidence: `spec-fix-evidence/collection-list.txt`.
- [x] S4 — deterministic shape-green witnesses still PASS (no regression): W-STRUCTURAL exit 0 (7/7),
  W-DOMAIN-NEUTRAL + W-NO-CI-LEAK exit 0 (2/2). Evidence: `spec-fix-evidence/w-structural.log`,
  `w-domain-neutral.log`.
- [x] S5 — downstream truth-green characterized HONESTLY (no fake green). The witness runner now
  proceeds PAST the dep gate into the REAL Playwright suite (`[stage] all required deps resolved —
  running REAL Playwright suite`). Direct `playwright test --grep=@ui` run: collection SUCCEEDS, the
  overlap-clipping test is collected+attempted, and fails ONLY at `browserType.launch: Executable
  doesn't exist at .../ms-playwright/chromium_headless_shell-1181/... → Please run npx playwright install`.
  `~/Library/Caches/ms-playwright` absent. → browser-binary-dependent tests remain
  **pending-live/BLOCKED on operator-gated `playwright install`** (NOT faked; NOT mislabelled).
  Evidence: `spec-fix-evidence/witness-runner.log`, `direct-playwright-ui.log`.
- [x] S6 — dirty-tree scope confirmed. This op's only WRITEs: the spec-file fix (1 line, untracked
  generated fixture) + `spec-fix-evidence/**` + this report (all under I-17A-owned prefixes). All other
  dirty-tree entries are pre-existing baseline from sibling orchestrators (I-07D/I-12/I-13/I-18/etc.),
  untouched. Zero out-of-license edits; no git stash/reset/clean/checkout/restore. (Corrected an
  initial evidence-path misplacement from `examples/.vibe/...` → repo-root `.vibe/...`; stray dir removed.)
- [x] S7 — final verdict below.

## Final VERDICT
**DONE** — the `test.info()`-at-definition-time spec defect in
`overlap-clipping.spec.ts:13` is fixed (title's definition-time `test.info()` → static `@viewport`;
body logic, slug, and evidence capture unchanged — no contract altered, no dynamic info lost).
Test-collection now succeeds (65/65 tests, 0 collection errors). Deterministic shape-green
witnesses still PASS (no regression). Honest handoff: W-RB-PLAYWRIGHT truth-green is still NOT
reached — it now fails ONLY at operator-gated browser-binary availability
(`Executable doesn't exist … npx playwright install`), correctly classified pending-live/BLOCKED.
No fake green; the prior collection blocker is eliminated.

## Owned WRITE paths (this fixer)
- `examples/starter-reference/generated-fixtures/e2e-ui/web/ui-verification/specialists/overlap-clipping.spec.ts` (I-17A-owned)
- `.vibe/work/I-17A-web-e2e-ui-verification/spec-fix-evidence/**`
- `.vibe/work/I-17A-web-e2e-ui-verification/I-17A-spec-fix-report.md` (this report)

## Untouchable
Everything else — sibling specialist specs, witness runner, package.json/pnpm-lock.yaml,
`.git**`, mobile paths, prior reports/evidence. No git stash/reset/clean/checkout/restore.
No `playwright install` (operator-gated).
