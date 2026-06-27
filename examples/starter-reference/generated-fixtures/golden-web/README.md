# golden-web fixture (I-17A / DL-13 / DL-14 / DL-16 / DL-20A)

`@sample @demo @reference` — domain-neutral **renderable golden web app** fixture.

The renderable web half of the starter golden-records boundary (I-17A). It is a
Vite + React app DERIVED from the I-15B `.source-template/apps/web/**` pattern
and wired to consume the I-16B **shared client** (`golden-client`) so the
golden-records route renders REAL classified records (DL-16 §245
"render/read it in web and mobile"; §247 shared client consumed by both web and
mobile). It does **not** re-declare the contract/client/DTO (DL-14 §5).

## Surface

- `index.html` — Vite entry (mirrors source-template).
- `src/main.tsx` — React root on `#root`.
- `src/app/app.tsx` — app shell owning the I-17A web binding: a minimal
  hash-based router (no router dep) exposing `#/`, `#/golden-records`,
  `#/system-status`.
- `src/routes/golden-records/golden-records.tsx` — **the load-bearing surface**.
  Consumes the I-16B shared client: `useGoldenRecords()` accessor →
  `createGoldenRecordsSharedClient(createWebTransport())` → real I-16A provider
  (`handleGoldenRecordsApiRequest`). Renders the classified record with stable
  labeled selectors (`data-testid`, `aria-label="Golden records
  (sample/demo/reference)"`) for E2E + UI specialists.
- `src/routes/{home,system-status}/**` — mirror the source-template routes.
- `src/golden-web.css` — minimal deterministic layout tokens (stable geometry for
  UI-verification specialists).
- `vite.config.ts` — graph-neutral; binds the I-16B transitive deps
  (`@ts-rest/core` + `zod`) into the served bundle via `resolve.alias` anchored
  at the real `packages/contracts` context (mirrors the I-16B dep-resolver
  discipline). React JSX automatic runtime (no `@vitejs/plugin-react` dep).
- `harness/serve-golden-web.mjs` — deterministic served-app wiring harness
  (spawn Vite dev server → readiness probe → teardown), FAIL-CLOSED.

## Real-boundary posture (shape-green is NOT truth-green)

`react`/`react-dom`/`vite`/`@playwright/test` are **absent** from the entire repo
(verified: 0 in `pnpm-lock.yaml`, none in `node_modules`, no resolve-hook anchor
context — contrast I-16B which anchored `@ts-rest/core`+`zod` at
`packages/contracts`). The renderable app therefore runs truth-green ONLY after
a serialized **EXTEND** dep handoff (root manifest + `pnpm-lock.yaml` reconcile,
I-20S-class) + Playwright browser-binary availability. Until then the app source
is **shape-green** only (structurally validated; not rendered live).

The web E2E + UI-verification suite that drives this served app lives in the
sibling `../e2e-ui/web/**` fixture. See `../e2e-ui/web/README.md` for the witness
run commands.
