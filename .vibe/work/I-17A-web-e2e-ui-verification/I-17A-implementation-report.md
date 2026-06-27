# I-17A Implementation Report — web E2E + UI verification (Triad-B IMPLEMENTER)

- **Lane**: `I-17A-web-e2e-ui-verification` (golden-web renderable app + web E2E + UI-verification suite)
- **Implementer**: Triad-B IMPLEMENTER (`glm-5.2` via zai, thinking: high)
- **Working dir**: `/Users/lizavasilyeva/work/vibe-engineer`
- **Binding brief**: `.pi/hlo/vibe-engineer/implementation-briefs/I-17A-brief-generated.md` (independent VALIDATE → **PASS**)
- **Quality bar**: prepended verbatim and binding. PERFECT solution only; shape-green ≠ truth-green; Blocked means analyze, never improvise.

## VERDICT: BLOCKED (deterministic in-license scope DONE shape-green; W-RB-PLAYWRIGHT STOP-BLOCKs on missing react/react-dom/vite/@playwright/test + browser availability)

The in-license deterministic scope (brief steps 1–6) is fully authored and
shape-green. The load-bearing real-boundary witness `W-RB-PLAYWRIGHT` (step 7)
**STOP-BLOCKs** exactly as the brief predicted (§STOP condition 1): the 7 pinned
deps are absent from the entire repo and no resolve-hook anchor context exists
for them. Zero out-of-license edits; no fake/synthetic green recorded.

## Owned WRITE paths (brief §3, verbatim) — all touched, nothing outside

- `examples/starter-reference/generated-fixtures/golden-web/**`
- `examples/starter-reference/generated-fixtures/e2e-ui/web/**`
- `.vibe/work/I-17A-web-e2e-ui-verification/**`

## Files changed (exact — authored by this implementer)

**golden-web/** (renderable Vite + React app consuming the I-16B shared client):
- `index.html`, `src/main.tsx`, `src/golden-web.css`
- `src/app/app.tsx` (hash router: `#/`, `#/golden-records`, `#/system-status`)
- `src/routes/home/home.tsx`, `src/routes/system-status/system-status.tsx`
- `src/routes/golden-records/golden-records.tsx` — load-bearing; consumes
  `useGoldenRecords` + `createGoldenRecordsSharedClient(createWebTransport())`
  against the real I-16A provider; stable labeled selectors; `?gr-force-invalid=1`
  failure-state fixture (W-NEG-PROVIDER-INVALID).
- `vite.config.ts` — graph-neutral; binds `@ts-rest/core`+`zod` into the served
  bundle via `resolve.alias` anchored at `packages/contracts` (mirrors the I-16B
  dep-resolver discipline). Automatic JSX runtime (no `@vitejs/plugin-react`).
- `tsconfig.json`, `package.json` (graph-neutral dependency-model), `README.md`
- `harness/serve-golden-web.mjs` — served-app wiring harness (spawn Vite →
  readiness probe → teardown), FAIL-CLOSED.

**e2e-ui/web/** (web E2E + UI-verification suite, DL-13):
- `e2e/golden-flow.positive.e2e.spec.ts` — W-E2E-POSITIVE (real selectors).
- `e2e/negative/broken-selector.negative.e2e.spec.ts` — W-NEG-BROKEN-SELECTOR.
- `e2e/negative/provider-invalid.negative.e2e.spec.ts` — W-NEG-PROVIDER-INVALID.
- `ui-verification/ui-verification.config.ts` — viewport/device matrix (5) +
  state profiles + 7 deterministic specialists (single source of truth).
- `ui-verification/specialists/*.spec.ts` (7) — overlap-clipping, spacing-
  alignment, responsive-layout, truncation, color-contrast, accessibility
  (axe-core), visual-regression (pixelmatch). Each `@ui`, emits structured
  evidence; subjective/LLM review advisory only.
- `ui-verification/lib/evidence.ts`, `lib/collectors.ts` — evidence-packet writer
  + deterministic DOM/geometry/a11y/screenshot collectors.
- `ui-verification/evidence-packet.schema.json` — UI evidence packet JSON schema.
- `ui-verification/baselines/baseline-manifest.contract.json` + `baselines/README.md`
  — visual-regression baseline-management contract (first-baseline-proposal;
  governed approval; no auto-accept).
- `playwright.config.ts` — one project per DL-13 v1 viewport → W-VIEWPORT-MATRIX;
  `webServer` spawns the real Vite dev server.
- `start-dev-server.mjs` — Playwright `webServer` bootstrap.
- `run-structural-validate.mjs` (W-STRUCTURAL), `run-domain-neutral-check.mjs`
  (W-DOMAIN-NEUTRAL + W-NO-CI-LEAK), `run-web-e2e-ui-witness.mjs`
  (W-RB-PLAYWRIGHT + W-INVARIANTS).
- `package.json` (graph-neutral dependency-model), `README.md`, `.gitignore`,
  `ui-verification/{evidence,artifacts}/.gitkeep`.

**.vibe/work/I-17A-web-e2e-ui-verification/**:
- `I-17A-implementation-report.md` (this report, created first).
- `evidence/web-e2e-ui-witness-result.json` (STOP-BLOCKED evidence packet).

## No contract/client/DTO re-declaration (DL-14 §5)

golden-web defines NO Zod schema, NO `initContract`/`.router`, NO hand-authored
fetch DTO. It imports the I-16B shared client (`golden-client/src`) and the
contract-derived types only — verified by `run-structural-validate.mjs`
(W-WEB-APP-CONSUMES-SHARED-CLIENT shape) and by `grep` of the golden-flow
sibling witness (W-SHARED-CLIENT-DERIVED / W-NO-FORK still PASS).

## Witnesses run + evidence (commands / exit / outcome)

Run from `examples/starter-reference/generated-fixtures/e2e-ui/web`:

| # | Command | Exit | Outcome |
|---|---------|------|---------|
| 1 | `node --check <each authored .mjs>` (5 runners) | 0 | syntax green |
| 2 | `node run-structural-validate.mjs` | **0** | W-STRUCTURAL shape-green PASS (7 checks: shared-client consumption, served-app harness fail-closed, viewport matrix, selector resolution, specialists well-formed, baseline manifest, source provenance) |
| 3 | `node run-domain-neutral-check.mjs` | **0** | W-DOMAIN-NEUTRAL PASS (26 files, 0 forbidden, labels present) + W-NO-CI-LEAK PASS (owned fixtures declare no default-CI full-E2E/visual wiring) |
| 4 | `git status --porcelain` (path-scoped) | 0 | only `golden-web/`, `e2e-ui/`, `.vibe/work/I-17A-…/` — dirty-tree clean |
| 5 | `node run-web-e2e-ui-witness.mjs` | **1 (STOP-BLOCKED)** | W-RB-PLAYWRIGHT BLOCKED on missing react@19.1.0, react-dom@19.1.0, vite@7.1.0, @playwright/test@1.54.0, @axe-core/playwright@4.10.2, pixelmatch@7.1.0, pngjs@7.0.0. Evidence: `.vibe/work/I-17A-…/evidence/web-e2e-ui-witness-result.json` |
| 6 | sibling: `node …/golden-flow/run-golden-records-client-flow-witness.mjs` | **0** | I-16B witness still PASS (10 checks) — no sibling breakage |

W-INVARIANTS (emitted by witness #5): ownedCount=3 (my trees), baseline=278
(pre-existing dirt from other lanes), failures=[] — no serialized surface
edited; sibling fixtures + mobile paths intact.

## Real-boundary posture (shape-green ≠ truth-green)

Shape-green (in-license, this run): W-STRUCTURAL, W-DOMAIN-NEUTRAL, W-NO-CI-LEAK,
W-WEB-APP-CONSUMES-SHARED-CLIENT (shape), W-SERVED-APP-HARNESS (shape),
W-VIEWPORT-MATRIX (shape), selector/specialist/baseline well-formedness.

Truth-green (gated, NOT achieved): W-E2E-POSITIVE, W-UI-SPECIALISTS,
W-NEG-BROKEN-SELECTOR, W-NEG-LAYOUT-CONTRAST, W-NEG-PROVIDER-INVALID,
W-VIEWPORT-MATRIX (live), visual baselines — these are honestly
**pending the EXTEND dep handoff + browser availability**. No
jsdom/happy-dom/`page.evaluate`-only/mocked-HTTP/synthetic-screenshot variant is
recorded as truth-green (fakeGreenPolicy recorded in the evidence packet).

## Blockers + exact ruling needed (brief §STOP condition 1)

**BLOCKED — `W-RB-PLAYWRIGHT`**. Two prerequisites for HLO/operator routing:

1. **Serialized EXTEND dep handoff (I-20S-class).** Add
   `react@19.1.0`, `react-dom@19.1.0`, `vite@7.1.0`, `@playwright/test@1.54.0`,
   `@axe-core/playwright@4.10.2`, `pixelmatch@7.1.0`, `pngjs@7.0.0` to a workspace
   manifest and reconcile the root `pnpm-lock.yaml`. (Operator-authorizable
   recurring dep class.) Note: `@ts-rest/core`+`zod` ARE already resolvable from
   `packages/contracts` and are bound into the served bundle via
   `golden-web/vite.config.ts` `resolve.alias`; the gap is purely the web/E2E/UI
   deps above, which have no in-repo resolve-hook anchor.
2. **Playwright browser-binary availability.** `playwright install`
   (environment/network-gated). If unavailable, the witness is
   `pending-live/BLOCKED` (analogous to DL-12 device/simulator).

After (1) + (2), re-run `node run-web-e2e-ui-witness.mjs` for truth-green
(`W-RB-PLAYWRIGHT` exit 0 with the full evidence packet + visual baselines
proposed).

## What blocks dependents (I-19, I-23)

I-17A truth-green is blocked on the EXTEND handoff + browser availability above
(§STOP condition 1). The deterministic suite is shape-green and ready; the
real-boundary Playwright witnesses + baselines are honestly pending. I-19/I-23
live UI-verification claims wait on that real run.

## Status

- In-license deterministic scope (steps 1–6): **DONE, shape-green**.
- Real-boundary `W-RB-PLAYWRIGHT` (step 7): **STOP-BLOCKED** (brief §STOP #1),
  zero out-of-license edits, exact missing deps + ruling recorded.

## Terse return

BLOCKED — `.vibe/work/I-17A-web-e2e-ui-verification/I-17A-implementation-report.md`
— in-license deterministic web E2E + UI-verification suite authored (golden-web +
e2e-ui/web) and shape-green (structural/domain-neutral/no-CI-leak/sibling all
PASS); W-RB-PLAYWRIGHT STOP-BLOCKs on missing react/react-dom/vite/@playwright/test
(+ axe/pixelmatch/pngjs) — EXTEND root-dep handoff + Playwright browser
availability required for truth-green.
