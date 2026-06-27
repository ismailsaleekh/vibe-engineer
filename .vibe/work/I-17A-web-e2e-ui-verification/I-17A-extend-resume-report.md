# I-17A EXTEND + Resume — Finisher Report (Triad-B FINISHER)

- **Agent**: Triad-B FINISHER (combined EXTEND root-dep handoff + I-17A resume)
- **Class**: `EXTEND-I-20S` (recurring serialized root-dep handoff; operator-autonomous policy; mirrors I-20A `@vibe-engineer/mechanical-gates` + I-20B `js-yaml` + I-15B-1 lockfile-reconcile precedents — all validated+executed+green)
- **Target repo**: `/Users/lizavasilyeva/work/vibe-engineer`
- **Binding**: quality-bar (prepended verbatim), I-17A BLOCKED report, I-17A brief, I-20A/I-15B-1 finisher precedents
- **Status (initial)**: IN-PROGRESS — reading precedent + current state.

## Mission (verbatim scope)

1. Add 7 pinned devDeps to root `package.json` `devDependencies`:
   `react@19.1.0`, `react-dom@19.1.0`, `vite@7.1.0`, `@playwright/test@1.54.0`,
   `@axe-core/playwright@4.10.2`, `pixelmatch@7.1.0`, `pngjs@7.0.0`.
2. Reconcile `pnpm-lock.yaml` via `pnpm install`; BEFORE/AFTER snapshot;
   three-way-decompose the delta; confirm scoped to new importer edges (no unrelated churn).
3. Resume I-17A: run `W-RB-PLAYWRIGHT` (real Playwright E2E/UI suite). If
   browser binaries absent → record `pending-live/BLOCKED` honestly (no fake green).
4. Re-confirm deterministic witnesses (W-STRUCTURAL, W-DOMAIN-NEUTRAL, W-NO-CI-LEAK, sibling-regression) still PASS.

## Owned WRITE paths

- `package.json` (the 7 new devDep lines — THIS op only)
- `pnpm-lock.yaml` (scoped reconciliation)
- `.vibe/work/I-17A-web-e2e-ui-verification/extend-evidence/**`
- `.vibe/work/I-17A-web-e2e-ui-verification/I-17A-extend-resume-report.md` (this report)

## Untouchable

turbo.json, pnpm-workspace.yaml, packages/** source, .github/**, infra/**, .git**, prior evidence/reports, mobile paths, sibling fixtures. NO broad package-manager install/update beyond scoped reconciliation.

## Stage log
- [x] S0 — report artifact created (checkpointing).
- [x] S1 — binding docs read (BLOCKED report, brief, I-20A/I-15B-1 precedents); baseline confirmed.
- [x] S2 — BEFORE snapshot captured; 7 deps confirmed ABSENT (node_modules + lockfile grep = 0 hits).
- [x] S3 — package.json edit applied (7 alphabetical devDep lines, pinned, JSON-valid).
- [x] S4 — `pnpm install` exit 0; all 7 deps resolved; AFTER snapshot captured.
- [x] S5 — three-way delta decomposition (677 added / 0 removed / 0 modified; all appends; scoped).
- [x] S6 — marquee EXTEND seam verified: 7/7 resolve via real entry points.
- [x] S7 — I-17A witnesses re-run: W-STRUCTURAL 7/7, W-DOMAIN-NEUTRAL, W-NO-CI-LEAK PASS; sibling I-16B golden-flow PASS 10/10.
- [x] S8 — W-RB-PLAYWRIGHT residual STOP-BLOCKED root-caused (NOT an EXTEND defect): I-17A-owned probe-mechanism defect + browser-binary availability.
- [x] S9 — dirty-tree scope confirmed (owned WRITE paths only); final verdict below.

## S1 — baseline (matches BLOCKED report exactly)
- All 7 deps ABSENT from `node_modules/` AND lockfile (`grep` of the 7 specs in `pnpm-lock.yaml` = **0 hits**).
- BEFORE snapshot: `extend-evidence/pnpm-lock.BEFORE.yaml` (4565 lines).
- env: node v24.16.0, pnpm 10.33.0; `.npmrc` `shamefully-hoist=false`, `link-workspace-packages=true`, `save-exact=true` (matches precedent).

## S3 — package.json edit (mirror precedent)
Added 7 devDep lines to the ROOT `.` importer, alphabetical, pinned (not latest):
`@axe-core/playwright@4.10.2`, `@playwright/test@1.54.0`, `pixelmatch@7.1.0`, `pngjs@7.0.0`, `react@19.1.0`, `react-dom@19.1.0`, `vite@7.1.0`. JSON validated. `git diff package.json` shows these 7 lines (plus pre-existing I-20S/I-20B dirty: `quality` script, `@vibe-engineer/mechanical-gates`, `js-yaml` — baseline, NOT my op, per F1 dirty-tree discipline).

## S4 — lockfile reconciled
`pnpm install` (cwd=repo root) → **exit 0**, `Done in 17.2s using pnpm v10.33.0`. pnpm added +16 direct/transitive packages. Full log: `extend-evidence/pnpm-install.log`. AFTER snapshot: `extend-evidence/pnpm-lock.AFTER.yaml`.

## S5 — three-way delta (F1 BEFORE↔AFTER, NOT committed-HEAD)
`diff BEFORE.yaml AFTER.yaml` → `extend-evidence/lockfile-delta.diff`: **677 added lines, 0 removed, 0 modified; ALL hunks are pure appends (`a`)**.
- Root `.` importer `devDependencies` block: exactly the 7 new specifier/version edges (alphabetical, alongside the pre-existing devDeps).
- `packages:` snapshot section: new package snapshots for the transitive closure — `@axe-core/playwright`, `@esbuild/*` (vite's esbuild, all platform variants), `lightningcss`, `playwright-core`, `scheduler`, `react`, `react-dom`, `vite`, `pixelmatch`, `pngjs` + their deps.
- **No other importer block modified** (infra/pulumi, packages/* unchanged); **no version re-resolution** of any existing package. Scoped to the new importer edges — no unrelated churn.

## S6 — marquee EXTEND seam: 7/7 resolve via real entry points
- `react@19.1.0`, `react-dom@19.1.0`, `vite@7.1.0`, `@playwright/test@1.54.0`, `pixelmatch@7.1.0`, `pngjs@7.0.0` → resolve via `require(spec/package.json)`. ✅
- `@axe-core/playwright@4.10.2` → resolves via ESM `import` (`AxeBuilder` function). ✅
- All 7 declared+locked in the root `.` importer block (`specifier`+`version`). `shamefully-hoist=false` honored — links are at the root importer only (declared-dep symlinks into `.pnpm/`), NOT hoisted into `packages/*`.
- Full matrix: `extend-evidence/extend-resolution-matrix.json`.

## S7 — I-17A deterministic witnesses (still shape-green) + sibling regression
- `node run-structural-validate.mjs` → **exit 0** — W-STRUCTURAL PASS (7/7: shared-client consumption, served-app harness fail-closed, viewport matrix, selector resolution, specialists well-formed, baseline manifest, source provenance).
- `node run-domain-neutral-check.mjs` → **exit 0** — W-DOMAIN-NEUTRAL PASS (26 files, forbidden=0) + W-NO-CI-LEAK PASS.
- Sibling: `node …/golden-flow/run-golden-records-client-flow-witness.mjs` → **exit 0** PASS (10/10). No sibling breakage from the EXTEND op.

## S8 — W-RB-PLAYWRIGHT residual STOP-BLOCKED (NOT an EXTEND defect — root-caused)
`node run-web-e2e-ui-witness.mjs` → **exit 1**, reports `Missing (1): @axe-core/playwright@4.10.2`. **Root cause (definitive):**

`run-web-e2e-ui-witness.mjs::depStatus()` probes each dep via `requireFromRepo.resolve(`${spec}/package.json`)` (where `requireFromRepo = createRequire(path.join(repoRoot, "__i17a-witness-anchor.js"))`). For 6/7 deps this works. But `@axe-core/playwright@4.10.2`'s `package.json` defines an **`exports` map `{".":{import,require,types}}` that OMITS the `./package.json` subpath**. Node enforces the exports map → `require.resolve('@axe-core/playwright/package.json')` throws **`ERR_PACKAGE_PATH_NOT_EXPORTED`** → the probe records the dep as "missing" → STOP-BLOCKED. **The dep is fully installed, locked, and resolves correctly via its real `.` entry** (`import('@axe-core/playwright')` → `AxeBuilder`). The probe mechanism is the defect, not the EXTEND.

This is an **I-17A-owned witness-runner design issue** (`examples/starter-reference/generated-fixtures/e2e-ui/web/run-web-e2e-ui-witness.mjs` is under I-17A's owned WRITE path — **OUTSIDE this finisher's write paths**; untouchable per quality bar). Same class as the I-15B-1 Step-0→Step-2 B3 handoff (EXTEND/lockfile op green at its own seam; owned witness-runner needs a follow-up fix).

**Second residual blocker (operator-gated):** Playwright browser binaries are absent (no `ms-playwright` cache; `chromium.executablePath()` points to a non-existent path). `playwright install` (~100–300MB network fetch) is operator-resource/environment-gated and **NOT a license-free agent action** (brief §3). → **`pending-live/BLOCKED` on browser-binary availability.** Even after the probe fix, the live Playwright run remains pending-live until an operator runs `playwright install`.

**No fake green recorded** (fakeGreenPolicy in evidence matrix). I did NOT edit the I-17A-owned witness runner (out of license) and did NOT run `playwright install` (operator-gated). Analyze, never improvise.

## S9 — dirty-tree scope (owned WRITE paths only)
My op touched ONLY:
- `package.json` — 7 devDep lines (the rest of its diff is pre-existing I-20S/I-20B baseline, not mine).
- `pnpm-lock.yaml` — scoped reconciliation (7 root importer edges + transitive snapshots).
- `.vibe/work/I-17A-web-e2e-ui-verification/{I-17A-extend-resume-report.md, extend-evidence/**}` — this report + evidence.

**No out-of-license edits:** no `turbo.json`/`pnpm-workspace.yaml`/`.npmrc`/`tsconfig`/`eslint.config.mjs` edit by my op (their diffs are pre-existing I-20S baseline); no `packages/**` source; no `.github/**`; no `infra/**`; no mobile paths; no sibling fixtures; no `.git**`; no git stash/reset/clean/checkout/restore. The I-17A-owned witness runner was NOT edited.

## Severity classification
**clean (for the EXTEND-I-20S scope).** The assigned finisher op — add 7 pinned root devDeps + reconcile `pnpm-lock.yaml` — is DONE, scoped (677 added / 0 removed / 0 modified, three-way-proven via BEFORE/AFTER), declared+locked in the root `.` importer, 7/7 resolving via real entry points, hoist-neg preserved, sibling I-16B green, deterministic I-17A shape-green witnesses still PASS. The residual W-RB-PLAYWRIGHT STOP is **NOT an EXTEND defect**: it is (a) an I-17A-owned witness-runner probe-mechanism bug (`require.resolve(`${spec}/package.json`)` vs an exports-restricted package — `ERR_PACKAGE_PATH_NOT_EXPORTED`), handed off, and (b) operator-gated browser-binary availability (`pending-live/BLOCKED`). No BLOCKED trigger fired for the EXTEND op itself (no unrelated churn; no green lane broke; all 7 deps resolve). Revalidation-ready (independent Triad-A): confirm the 7 deps declared+locked in root importer + scoped lockfile delta + 7/7 resolution + sibling green + dirty-tree-safe.

## Handoff to I-17A (resume)
1. **EXTEND is complete** — react/react-dom/vite/@playwright/test/@axe-core/playwright/pixelmatch/pngjs are installed, declared+locked, and resolving at the root importer.
2. **Fix the owned witness-runner dep probe** (`run-web-e2e-ui-witness.mjs::depStatus()`) to use an exports-safe resolution: resolve the package `.` entry (`import.meta.resolve(spec)` / `require.resolve(spec)` for non-restricted), then read `package.json` via `fs` from the resolved entry's package dir; OR catch `ERR_PACKAGE_PATH_NOT_EXPORTED` and fall back to `fs.stat(node_modules/<spec>/package.json)`. Then the probe will report @axe-core/playwright as resolved (it is).
3. **Operator-gated step:** run `playwright install` (browser-binary availability) for the real live W-RB-PLAYWRIGHT truth-green run. Until then W-RB-PLAYWRIGHT is honestly `pending-live/BLOCKED` on browser-binary availability (NOT faked).

## Final VERDICT
**DONE** (EXTEND-I-20S dep handoff) + **I-17A resume: W-RB-PLAYWRIGHT still STOP-BLOCKED, root-caused to a non-EXTEND I-17A-owned probe defect (`ERR_PACKAGE_PATH_NOT_EXPORTED` on exports-restricted @axe-core/playwright) + operator-gated browser-binary availability (`pending-live/BLOCKED`).** Zero out-of-license edits; no fake green.
