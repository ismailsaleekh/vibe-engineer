# I-17A Revalidation Artifact (Triad-B REVALIDATOR — adversarial)

- **Revalidator**: glm-5.2 via zai (thinking: xhigh), independent adversarial
- **Target**: the WHOLE I-17A lane (implementer + EXTEND-resume + probe-fix + spec-fix)
- **Status**: COMPLETE
- **Verdict**: **PASS** (deterministic truth-green scope; live scope honestly pending-live on operator-gated `playwright install`)

## Target paths (under revalidation)
- Impl: `.vibe/work/I-17A-web-e2e-ui-verification/I-17A-implementation-report.md`
- Extend-resume: `.vibe/work/I-17A-web-e2e-ui-verification/I-17A-extend-resume-report.md`
- Probe-fix: `.vibe/work/I-17A-web-e2e-ui-verification/I-17A-probe-fix-report.md`
- Spec-fix: `.vibe/work/I-17A-web-e2e-ui-verification/I-17A-spec-fix-report.md`
- Owned WRITE (this agent): `I-17A-revalidation-artifact.md` + `revalidation-evidence/**`

## Ground truth read (independent)
Brief `I-17A-brief-generated.md` + validation artifact `I-17A-brief-validation-artifact.md` (PASS); all 4 lane reports. Brief §3 owned paths = `golden-web/**` + `e2e-ui/web/**` + work root (EXTEND adds root `package.json`/`pnpm-lock.yaml`). Brief §5 witnesses; §7 severity; §STOP (real-boundary BLOCKED posture).

## Environment (independently confirmed)
node v24.16.0, pnpm 10.33.0. **`~/Library/Caches/ms-playwright` ABSENT** → Playwright browser binaries genuinely unavailable (operator-gated `playwright install` not run). Dirty tree: 280 porcelain entries (multi-orchestrator; I-07D/I-12/I-13/I-18/I-02A/I-20S/I-20B/I-17B baseline concurrent).

## Findings (numbered; severity + exact evidence)

### F1 — clean — (a) deterministic witnesses reproduce. INDEPENDENTLY re-run myself (evidence `revalidation-evidence/w*.log`):
- **W-STRUCTURAL**: `node run-structural-validate.mjs` → **exit 0**, 7/7 PASS (W-WEB-APP-CONSUMES-SHARED-CLIENT shape; W-SERVED-APP-HARNESS shape/fail-closed; W-VIEWPORT-MATRIX shape; selectors-resolve 11 refs; specialists-well-formed 7/7; baseline-manifest 5 identities mode=first-baseline-proposal; golden-web source provenance sha256).
- **W-DOMAIN-NEUTRAL**: `node run-domain-neutral-check.mjs` → **exit 0**, 26 files scanned, forbidden=0, labels present.
- **W-NO-CI-LEAK**: same runner → PASS. Independent cross-check: the only `.github/` match is `quality.yml:11` comment *“excludes full E2E / full mobile E2E / full visual UI”* (correct posture); `.github/` mtime 01:12 **predates** I-17A session (08:52) → baseline lane, NOT I-17A; no I-17A suite wired into CI.
- **test-collection**: `npx playwright test --list` → **exit 0**, **65 tests in 10 files**, **0** `test.info() can only be called` errors (`revalidation-evidence/w4-collection-list.txt`). 5 viewport projects × 13 = 65.
- **dep-gate (post probe-fix)**: `run-web-e2e-ui-witness.mjs` → `[stage] all required deps resolved` (evidence JSON `depStatus` = **7/7 resolved:true**, incl. `@axe-core/playwright@4.10.2 matches:true`).
- **sibling regression**: `node …/golden-flow/run-golden-records-client-flow-witness.mjs` → **exit 0, PASS 10/10**; I-17B `golden-mobile/run-mobile-witness.mjs` `node --check` OK (no I-17A regression on sibling files).

### F2 — clean — (b) EXTEND scoped + correct. INDEPENDENTLY three-way-decomposed BEFORE/AFTER snapshots (`extend-evidence/pnpm-lock.{BEFORE,AFTER}.yaml`): **677 added / 0 removed / 0 modified** (matches report exactly). New edges: exactly 7 specifier lines in the root `.` importer (`@axe-core/playwright@4.10.2`, `@playwright/test@1.54.0`, pixelmatch/pngjs 7.1.0/7.0.0, react/react-dom 19.1.0, vite 7.1.0); **no other importer** (packages/*, infra/pulumi) touched; transitive closure scoped (esbuild/rollup platform variants = vite; playwright-core; scheduler; lightningcss). Baseline proof: `mechanical-gates` (3) + `js-yaml` (5) **already in BEFORE** → the non-I-17A lines in `git diff package.json` (`quality` script, `@vibe-engineer/mechanical-gates`, `js-yaml`) are I-20S/I-20B baseline, NOT I-17A. 7/7 resolve via real ESM entry points (independently `import`-tested: react→Component, react-dom→createPortal, vite→build, @playwright/test→chromium, pixelmatch/pngjs, @axe-core/playwright→AxeBuilder).

### F3 — clean — (c) probe + spec defects genuinely fixed.
- **Probe fix (LIVE)**: `run-web-e2e-ui-witness.mjs` `resolvePackage(spec)` resolves the always-exposed `.` entry then walks up by `name`-match via fs (robust, exports-safe, no per-package special-case); `depStatus()` + `resolvePlaywrightBin()` both routed through it. Dep gate passes 7/7 (F1). No `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- **Spec fix (LIVE)**: `overlap-clipping.spec.ts:13` title = `` `@ui overlap-clipping — ${state.id} @viewport` `` (static `@viewport`; `${state.id}` is a loop constant). Grep across **all 7** specialists for title-level `test.info()` = **0** (defect class fully absent, not just overlap-clipping). Body `test.info()` calls are inside `async ({ page }) => {}` (valid runtime). Collection 0 errors (F1).

### F4 — clean — (d) browser-binary pending-live is HONEST (not faked). INDEPENDENTLY reproduced the exact failure mode two ways:
- witness runner `run-web-e2e-ui-witness.mjs` → dep gate passed → ran REAL Playwright via `spawnSync(@playwright/test cli.js, …)` against real `webServer` (spawn Vite) → **honestly recorded FAIL (playwright exit 1)**, `blocked:true`, `invariants.failures:[]`, `fakeGreenPolicy` documented. **No jsdom/happy-dom/page.evaluate-only/mock-HTTP/synthetic-screenshot recorded as truth-green.**
- direct `npx playwright test --grep=spacing-alignment --project=viewport-desktop` (`w7-direct-playwright.log`) → **`Error: browserType.launch: Executable doesn't exist at …/ms-playwright/chromium_headless_shell-1181/… → npx playwright install`, 1 failed, exit 1.** WebServer came up (test reached browser launch, not webServer/test-logic failure). `playwright install` was NOT run by any I-17A op (operator-gated; correctly surfaced as the prerequisite).

### F5 — clean — (e) file-disjoint from I-17B. I-17A's delta = ONLY `golden-web/**` + `e2e-ui/web/**` + root `package.json`/`pnpm-lock.yaml` (EXTEND) + `.vibe/work/I-17A-…/`. The mobile paths (`golden-mobile/**`, `e2e-ui/mobile/**`) are **I-17B-owned**: `.vibe/work/I-17B-mobile-e2e-ui-verification/I-17B-implementation-report.md` lines 11–12,86–87 explicitly claim them (Maestro/Detox, `run-mobile-witness.mjs`). **No I-17A report mentions authoring mobile** (grep = none). Recent mobile mtimes are I-17B's concurrent session (08:52–09:17), exactly the multi-orchestrator dirty-tree posture the quality bar describes. Witness `W-INVARIANTS` `mobileUntouched=true`, serialized-surface-edited=[].

### F6 — clean — (f) DL-13 specialists real (not stubs). 7 specialist specs, 32–88 lines each (335 total): overlap-clipping, spacing-alignment, responsive-layout, truncation, color-contrast, accessibility (real `collectAxe`→axe-core, blocking rule `axe-no-blocking-violations`), visual-regression (real `import("pixelmatch")`+`import("pngjs")`, baseline governance first-baseline-proposal). Each has ≥1 `expect()` + `writeEvidence()` + blocking rules. UI suite: `ui-verification.config.ts` (159L, single source of truth), `lib/{collectors,evidence}.ts` (217L), `evidence-packet.schema.json` (101L), `baselines/{contract.json,README.md}`. e2e: positive + 2 negatives (broken-selector, provider-invalid). golden-web: real consumer of I-16B shared client (`golden-records.tsx` 157L; imports `createGoldenRecordsSharedClient`/`createWebTransport`/`useGoldenRecords` from `golden-client/src/index.js`; `?gr-force-invalid=1` failure fixture; stable `data-testid`/`aria-label` selectors). vite.config `resolve.alias` anchors `@ts-rest/core`+`zod` at `packages/contracts` (mirrors I-16B; STOP-BLOCKED if absent). Both fixture `package.json` graph-neutral (NOT pnpm workspace members). No contract/client/DTO re-declaration (DL-14 §5).

### F7 — clean — (g) no sibling regression. I-16B golden-flow PASS 10/10 (F1); I-17B witness files syntax-intact; deterministic I-17A witnesses still PASS post-EXTEND/post-fixes.

### F8 — minor-local — spec-fix report viewport mis-count. spec-fix report §S3 wrote *“65 tests in 10 files … across all 3 viewport projects (tablet/desktop/wide)”*; actual is **5** (compact/small/tablet/desktop/wide). The **65/65 figure is correct**; only the viewport characterization under-counted. Non-load-bearing documentation nit; does not weaken any gate.

### F9 — minor-local (observation, non-blocking) — `serve-golden-web.mjs::resolveViteBin()` retains the old `require.resolve("vite/package.json")` pattern rather than the probe-fix's exports-safe `resolvePackage()` helper. **NOT a live defect**: vite@7.1.0 `exports` includes `./package.json` (independently verified: keys `.`, `./client`, `./module-runner`, `./dist/client/*`, `./types/*`, `./types/internal/*`, `./package.json`); the webServer comes up (browserType.launch errors prove it). It only ever resolves `vite` (hardcoded). Cosmetic inconsistency; outside the probe-fix task's licensed write path. Recorded for completeness; does not block.

## Attack-vector sweep (all clean)
- **Fake/synthetic green**: NONE. W-RB-PLAYWRIGHT runs real Playwright CLI against real served Vite app; browser-binary failure reproduced independently and honestly classified pending-live/BLOCKED. fakeGreenPolicy documented; no jsdom/happy-dom/mock-page.
- **EXTEND over-reach**: NONE. Three-way-proven scoped (677/0/0, only root importer; baseline deps pre-existed in BEFORE).
- **Out-of-license edits**: NONE. I-17A ops touched only owned paths + EXTEND (package.json/pnpm-lock.yaml). No mobile, no sibling fixtures, no packages/** source, no turbo/workspace/.github by I-17A.
- **Weak/missing witnesses**: NONE within deterministic scope. Real-boundary witnesses present and correctly gated pending-live.
- **Contract fork (DL-14 §5)**: NONE. golden-web consumes the I-16B shared client; no Zod/router/DTO re-declaration.
- **CI leak (DL-18/§9)**: NONE. CI comment explicitly excludes full E2E/visual; `.github` is baseline, not I-17A.

## Severity gate assessment
- **I-17A deterministic scope: TRUTH-GREEN (PASS).** Every deterministic load-bearing seam (W-STRUCTURAL 7/7, W-DOMAIN-NEUTRAL, W-NO-CI-LEAK, dep-gate 7/7, test-collection 65/65, W-WEB-APP-CONSUMES-SHARED-CLIENT, W-SERVED-APP-HARNESS, W-VIEWPORT-MATRIX shape, selectors/specialists/baseline well-formedness, sibling regression) is reproduced, real, and NOT false-green.
- **I-17A live scope: honestly `pending-live/BLOCKED`** on operator-gated `playwright install` (browser binaries). This is the correct, brief-predicted, quality-bar posture — NOT a defect, NOT fake green.
- **critical/major-local findings: ZERO.** Two `minor-local` notes (F8 doc nit; F9 cosmetic consistency) — neither weakens any gate.
- **Unblocks I-23?** Partial/conditional: I-17A *deterministic* closure is green and ready; I-23's *live* web end-to-end claim additionally needs I-17A's live truth-green (real browser run) + I-17B live + I-19 — i.e., it waits on the operator `playwright install` step. Nothing in-license blocks that path; the lane has done everything reachable in-license.

## Exact next action
Operator runs `npx playwright install` (browser-binary availability), then re-runs `node examples/starter-reference/generated-fixtures/e2e-ui/web/run-web-e2e-ui-witness.mjs` for live truth-green (W-E2E-POSITIVE, W-UI-SPECIALISTS, W-NEG-BROKEN-SELECTOR, W-NEG-LAYOUT-CONTRAST, W-NEG-PROVIDER-INVALID, W-VIEWPORT-MATRIX live, visual baselines proposed). That unlocks I-23's live web claim. No I-17A in-license fix required.

## Evidence inventory (this agent) — `revalidation-evidence/`
- `w1-syntax-check.log` (4 runners node --check, exit 0)
- `w2-structural.log` (W-STRUCTURAL 7/7 PASS)
- `w3-domain-neutral.log` (W-DOMAIN-NEUTRAL + W-NO-CI-LEAK PASS)
- `w4-collection-list.txt` (65 tests / 10 files, 0 collection errors)
- `w5-sibling-golden-flow.log` (I-16B 10/10 PASS)
- `w6-rb-playwright.log` (dep gate 7/7 → REAL suite → FAIL exit 1, honest)
- `w7-direct-playwright.log` (direct repro: browserType.launch Executable doesn't exist)

## Stage log
- [scaffold] Artifact + evidence dir created; browser binaries confirmed absent; node/pnpm confirmed.
- [stage-1] Read brief + validation artifact + 4 lane reports.
- [stage-2] git status / porcelain attribution; EXTEND diffs (package.json 7 devDeps; lockfile cumulative vs HEAD).
- [stage-3] Three-way BEFORE/AFTER decomposition (677/0/0; baseline deps pre-existed); resolution matrix + independent 7/7 ESM import test.
- [stage-4] Re-ran deterministic witnesses (W-STRUCTURAL 7/7, W-DOMAIN-NEUTRAL, W-NO-CI-LEAK, collection 65/65, dep-gate 7/7, sibling I-16B 10/10).
- [stage-5] Probe-fix + spec-fix verified in LIVE files (resolvePackage; static @viewport title; 0 title-level test.info() across all 7 specialists).
- [stage-6] Browser-binary honesty reproduced two ways (witness runner + direct playwright); webServer confirmed real Vite.
- [stage-7] File-disjoint: I-17B owns mobile (its report claims them); no I-17A report mentions mobile; `.github` baseline.
- [stage-8] DL-13 specialists real (axe-core/pixelmatch live imports; expect+evidence+blocking each). vite exports ./package.json (F9 non-defect).
- [stage-9] Finalized findings + verdict PASS.
