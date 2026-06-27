# I-17A Probe-Fix Report — Triad-B FIX (witness-runner dep probe defect)

- **Agent**: Triad-B FIX (model glm-5.2 via zai, thinking high)
- **Class**: I-17A-owned witness-runner probe-mechanism defect fix
- **Target repo**: `/Users/lizavasilyeva/work/vibe-engineer`
- **Binding**: quality-bar (prepended verbatim), I-17A-extend-resume-report §S8/S9 + Handoff#2, I-17A brief
- **Status (initial)**: IN-PROGRESS — report artifact created (checkpointing).

## Defect (from extend-resume-report §S8, root-caused)
`examples/starter-reference/generated-fixtures/e2e-ui/web/run-web-e2e-ui-witness.mjs::depStatus()`
probes each dep via `requireFromRepo.resolve(`${spec}/package.json`)`. For
`@axe-core/playwright@4.10.2` this throws `ERR_PACKAGE_PATH_NOT_EXPORTED` because
that package's `exports` map = `{ '.' }` (OMITS the `./package.json` subpath). Node
enforces the exports map → probe records the (installed+locked) dep as "missing" →
false STOP-BLOCKED on W-RB-PLAYWRIGHT. The dep IS installed, locked, and resolves via
its real `.` entry.

## Pre-fix independent verification (gathered BEFORE edit)
- Node v24.16.0. Repo root resolution tested via `createRequire(repoRoot/__i17a-witness-anchor.js)`.
- `${spec}/package.json` subpath resolution matrix (7 deps):
  - OK: react, react-dom, vite, @playwright/test, pixelmatch, pngjs (6/7)
  - **FAIL: `@axe-core/playwright` → `ERR_PACKAGE_PATH_NOT_EXPORTED`** (1/7) — confirms single culprit.
- exports-map keys (read directly via fs):
  - `@axe-core/playwright` → `['.']` (NO `./package.json`) — the defect.
  - `@playwright/test` → `['.','./cli','./package.json','./reporter']`
  - `react-dom` → includes `./package.json`
  - `pixelmatch`, `pngjs` → no `exports` map (open).
- **Fix approach chosen: (a)+(c)** — resolve the always-exposed `.` entry, then walk up
  to the package's own root `package.json` matched by `name`, read directly via `fs`.
  Uniform for all specs; robust against any exports-map restriction (GREENFIELD typed
  contract; no regex/heuristic; no per-package special-case).
- Pre-edit helper dry-run on all 7 deps → **7/7 OK**, all versions match pinned
  (@axe-core/playwright → 4.10.2 at `.pnpm/@axe-core+playwright@4.10.2_…/…/package.json`).

## Stage log
- [x] S0 — report artifact created.
- [x] S1 — defect root-caused independently; exports maps inspected; culprit confirmed single (@axe-core/playwright).
- [x] S2 — fix approach validated against ALL 7 deps BEFORE editing (7/7 resolve).
- [x] S3 — exports-safe `resolvePackage(spec)` helper added; BOTH same-pattern call sites routed through it:
  `depStatus()` probe (the reported defect) AND `resolvePlaywrightBin()` (identical latent landmine
  class — fixed uniformly, no per-package special-case). BEFORE/AFTER snapshots in evidence.
- [x] S4 — re-ran W-RB-PLAYWRIGHT runner: probe defect RESOLVED. Dep gate passed; evidence JSON
  `depStatus` = 7/7 `resolved:true` incl. **`@axe-core/playwright` resolved:true, version 4.10.2,
  matches:true`** (was `resolved:false`/missing before). Runner now proceeds into the REAL suite.
- [x] S5 — deterministic shape-green witnesses still PASS (no regression from the edit):
  W-STRUCTURAL exit 0 (7/7), W-DOMAIN-NEUTRAL + W-NO-CI-LEAK exit 0 (2/2),
  sibling I-16B golden-flow exit 0 (10/10). Logs in evidence.
- [x] S6 — downstream truth-green characterization (HONEST, no fake green):
  W-RB-PLAYWRIGHT does NOT reach the browser-binary stage. The REAL Playwright suite fails EARLIER,
  at **test-collection / module-load time**, on a **separate, pre-existing spec-level defect**
  UNRELATED to the probe or to browser binaries:
  `ui-verification/specialists/overlap-clipping.spec.ts:13` calls `test.info()` inside a test
  **title** at definition time → `Error: test.info() can only be called while test is running`.
  Reproduced by running `playwright test` directly (fails identically, before any browser launch —
  browser-independent). Additionally, browser binaries ARE absent (`~/Library/Caches/ms-playwright` missing).
  So TWO independent downstream blockers remain, BOTH outside THIS task's licensed WRITE scope
  (witness #4: delta ONLY the witness-runner fix):
    (1) NEW/surfaced — `test.info()`-at-definition spec defect in `e2e-ui/web/ui-verification/specialists/*.spec.ts`
        (I-17A-owned but NOT in this task's owned WRITE paths; would block even with browsers installed).
    (2) Known — operator-gated `playwright install` (browser-binary availability; `pending-live/BLOCKED`).
  NOT faked: the `test.info()` failure is NOT mislabelled as browser-binary pending-live.
- [x] S7 — dirty-tree scope confirmed. This op's only WRITEs: the witness-runner fix +
  `probe-fix-evidence/**` + this report (all under I-17A-owned prefixes). The `I-17B-mobile-*`
  dirty path is pre-existing baseline, untouched. Zero out-of-license edits; no git stash/reset/clean.
- [x] S8 — final verdict below.

## Final VERDICT
**DONE** (probe defect fixed + validated) — the `ERR_PACKAGE_PATH_NOT_EXPORTED` probe defect in
`depStatus()` is resolved via an exports-safe `resolvePackage()` helper (resolve `.` entry → walk up to
`name`-matched root package.json via fs), applied uniformly to both same-pattern call sites. All 7 deps
now resolve (incl. `@axe-core/playwright@4.10.2`); dep gate passes; runner proceeds into the REAL suite;
deterministic shape-green witnesses still PASS (no regression). 

Honest handoff (NOT faked, NOT fake-green): W-RB-PLAYWRIGHT truth-green is still NOT reached — it now
fails EARLIER, at test-collection, on a **separate pre-existing spec defect** (`test.info()` called in a
test title at definition time, `overlap-clipping.spec.ts:13`, browser-independent) and THEN on
operator-gated browser-binary availability. Both are outside this probe-fix task's licensed WRITE scope
(witness #4). Ruling requested: authorize a follow-up Triad-B FIX for the `test.info()`-at-definition spec
defect across `e2e-ui/web/ui-verification/specialists/*.spec.ts`, plus operator `playwright install`.

## Owned WRITE paths (this fixer)
- `examples/starter-reference/generated-fixtures/e2e-ui/web/run-web-e2e-ui-witness.mjs` (I-17A-owned)
- `.vibe/work/I-17A-web-e2e-ui-verification/probe-fix-evidence/**`
- `.vibe/work/I-17A-web-e2e-ui-verification/I-17A-probe-fix-report.md` (this report)

## Untouchable
Everything else — package.json/pnpm-lock.yaml, turbo.json, pnpm-workspace.yaml,
packages/**, .github/**, infra/**, .git**, sibling fixtures, mobile paths, prior
reports/evidence. No git stash/reset/clean/checkout/restore. No `playwright install`
(operator-gated).
