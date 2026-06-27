# e2e-ui/web fixture (I-17A / DL-13)

`@sample @demo @reference` — domain-neutral **web E2E + UI-verification** suite.

The verification suite built on top of the I-16B-proven shared-client/golden-flow
seam. It drives the REAL served `golden-web` app (Vite + React) through the golden
flow and runs the deterministic UI-verification specialist matrix (DL-13).

## Layout

- `e2e/golden-flow.positive.e2e.spec.ts` — **W-E2E-POSITIVE** (real Playwright;
  home → golden-records → classified record rendered via the shared client).
- `e2e/negative/broken-selector.negative.e2e.spec.ts` — **W-NEG-BROKEN-SELECTOR**
  (a broken selector matches nothing → the positive path is fail-closed).
- `e2e/negative/provider-invalid.negative.e2e.spec.ts` — **W-NEG-PROVIDER-INVALID**
  (provider-invalid → rendered failure state, never false success).
- `ui-verification/ui-verification.config.ts` — viewport/device matrix + state
  profiles + deterministic specialist config (single source of truth).
- `ui-verification/specialists/*.spec.ts` — the 7 deterministic specialists
  (`@ui`): overlap-clipping, spacing-alignment, responsive-layout, truncation,
  color-contrast, accessibility (axe-core), visual-regression (pixelmatch). Each
  emits a structured evidence packet; subjective/LLM review is advisory only.
- `ui-verification/lib/{evidence,collectors}.ts` — evidence-packet writer +
  deterministic DOM/geometry/a11y/screenshot collectors.
- `ui-verification/baselines/baseline-manifest.contract.json` — visual-regression
  baseline-management contract (first-baseline-proposal; governed approval).
- `ui-verification/evidence-packet.schema.json` — UI evidence packet JSON schema.
- `playwright.config.ts` — Playwright config; one project per DL-13 v1 viewport
  (`compact/small/tablet/desktop/wide`) → **W-VIEWPORT-MATRIX**.
- `start-dev-server.mjs` — Playwright `webServer` bootstrap (real Vite).
- `run-structural-validate.mjs` — **W-STRUCTURAL** (shape-green, in-license).
- `run-domain-neutral-check.mjs` — **W-DOMAIN-NEUTRAL** + **W-NO-CI-LEAK**.
- `run-web-e2e-ui-witness.mjs` — **W-RB-PLAYWRIGHT** + **W-INVARIANTS** (truth-green).

## Commands (from this fixture dir)

```sh
node run-structural-validate.mjs   # shape-green (no browser)
node run-domain-neutral-check.mjs  # domain-neutrality + no-CI-leak (no browser)
node run-web-e2e-ui-witness.mjs    # real-boundary truth-green (needs deps + browsers)
```

## Real-boundary posture (shape-green is NOT truth-green)

`@playwright/test`/`@axe-core/playwright`/`pixelmatch`/`pngjs` (and the served-app
`react`/`react-dom`/`vite`) are **absent** from the entire repo (verified: 0 in
`pnpm-lock.yaml`, none in `node_modules`, no resolve-hook anchor context). The
real suite therefore runs truth-green ONLY after a serialized **EXTEND** dep
handoff (root manifest + `pnpm-lock.yaml` reconcile, I-20S-class) + Playwright
browser-binary availability (`playwright install`). Until then `run-web-e2e-ui-
witness.mjs` **STOP-BLOCKs** with zero out-of-license edits and the exact missing
pinned deps — it never records a jsdom/happy-dom/mock-page/synthetic screenshot
variant as truth-green.

The deterministic in-license scope (the suite + structural validators) is
shape-green now; the real-boundary Playwright witnesses
(`W-E2E-POSITIVE`/`W-UI-SPECIALISTS`/`W-NEG-*`/`W-VIEWPORT-MATRIX`/visual baselines)
are honestly pending that EXTEND + browser availability.
