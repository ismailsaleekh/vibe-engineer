# I-15B-1 REVALIDATION ARTIFACT (Triad-B adversarial revalidator)

- **Agent:** independent adversarial REVALIDATOR (glm-5.2 via zai, thinking xhigh).
- **Task:** independently verify the WHOLE I-15B-1 (`nest-react-rn` preset) lane's on-disk reality — Step-0 lockfile reconcile, Step-2 witness-runner fix, src-defect matcher fix, implementer source. Shape-green is not truth-green; implementer DONE is never validator PASS.
- **Quality bar:** prepended verbatim, binding. Blocked = analyze, never improvise.
- **VERDICT: `PASS`** — I-15B-1 is **truth-green**; unblocks serialized dependent I-15B-2.

## Target paths (under revalidation)
- Source: `packages/presets/nest-react-rn/src/index.ts` (matcher fix + public API), `package.json` (manifest), `tsconfig.json`, `templates/**`, `fixtures/witnesses/run-nest-react-rn-preset-witness.mjs`, `pnpm-lock.yaml` (one Step-0 edge).
- Reports (claims treated unverified until confirmed): step0-revalidation-artifact, step2-finisher-report, src-fix-report, implementer-report.
- Ground truth: `…/implementation-briefs/I-15B-brief-generated.md` (I-15B-1 scope + W-NEG matrix).

## Stage log
- [x] S0 artifact scaffold created FIRST.
- [x] S1 reports + brief read; on-disk source inspected.
- [x] S2 full I-15B-1 witness gauntlet re-run (exit 0) + result.json negatives decomposed.
- [x] S3 independent matcher probe (real-boundary load + integration + pure-regex unit replication).
- [x] S4 Step-0 lockfile edge isolated + seam confirmed real + hoist config preserved.
- [x] S5 sibling no-regression (I-07D) + independent tsc + scope-honesty on root files.
- [x] S6 dirty-tree scope confirmed clean; verdict PASS.

---

## Findings (numbered; severity + exact evidence)

### F1 — Matcher fix is CORRECT + NON-WEAKENING (decisive). **CLEAN.**
Independently probed the REAL preset API (real-boundary load of `src/index.ts` via Node-24 type-stripping; the transitive `@vibe-engineer/preset-typescript` import resolves via the real workspace link from the source's own context — load success itself proves the seam). Evidence: `revalidation-evidence/revalidator-matcher-probe.json` + `revalidator-matcher-probe.mjs`.

- **(a) defect closure:** `validate(renderNestReactRnPresetFiles())` → **`ok:true`, 0 findings, 29 files**. The "production"→"product" false-positive is GONE.
- **(b) W-NEG-OVER-INFERENCE still fail-closed:** injected all 7 real forbidden business terms (ecommerce, inventory, order, payment, customer, cart, checkout) — **every one** returned `ok:false` with `PRESET_DOMAIN_SPECIFIC_CORE_TEXT` + the correct term as evidence. (The witness carrier injects only "checkout"; I extended the probe to 7 terms — robustness beyond the witness's single carrier.)
- **(c) edge cases (word-boundary precision, no weakening):**
  - `products` (plural) → **NOT flagged** (no domain finding) ✓
  - `production` (legit technical) → **NOT flagged** ✓ (the original defect collision fixed)
  - `product` (whole word) → **flagged**, evidence `["product"]` ✓
  - `Product` (capital) → **flagged** (case-insensitive `i` flag preserved) ✓
  - `ordering` (verb) → **NOT flagged** (order does not fire on ordering — correct, not weakened) ✓
  - `delivered` → **NOT flagged** ✓
- **Pure-regex unit replication** (`\b${escapeRegExpLiteral(term)}\b`, `i` flag — the exact compilation in src) isolates the matcher from pipeline noise: `production_sentence`→[], `products`→[], `product_whole`→[product], `Product`→[product], `ordering`→[], `order_whole`→[order], `checkout_whole`→[checkout], `ecommerce_phrase`→[ecommerce]. Hyphenated `inventory-item`→[inventory] and `social-feed`→[social-feed] **still fire** (the hyphen IS a `\b` boundary → whole-token detection) — this **matches the old substring behavior** (not a weakening; `escapeRegExpLiteral` correctly handles the hyphen in "social-feed").

**Non-weakening proof:** the ONLY cases that stopped matching are true substring collisions that WERE the defect (`product`⊆`production`/`products`, `order`⊆`ordering`). Every whole-word forbidden term still fires. No negative assertion was weakened.

### F2 — Full gauntlet reproduces REAL-BOUNDARY (not synthetic). **CLEAN.**
`node packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` → **exit 0**, `ok:true, blocked:false`. Result: `evidence/nest-react-rn-preset-witness-result.json`.

| Component | Real-boundary evidence | Result |
|---|---|---|
| Phase A | node --check ×3; 8 template JSON; manifest invariants; source hygiene; **public bare specifier** consumed; **no relative import into TS preset** | GREEN ✅ |
| **W-RESOLVE-TS-PRESET** | `import('@vibe-engineer/preset-typescript')` from preset pkg context → resolves via real `node_modules/@vibe-engineer/preset-typescript -> ../../../typescript` link | GREEN ✅ `TS_PRESET_OK function true` |
| **W-PRESET-CONTRACT (compile)** | `tsc --noEmit -p …/tsconfig.json` — **independently re-run by revalidator: TSC_EXIT=0** | GREEN ✅ |
| **W-PRESET-CONTRACT (runtime)** | IN-CONTEXT self-reference load `@vibe-engineer/preset-nest-react-rn`; 26 exported keys; render/validate/layout/manifest/options-error present | GREEN ✅ |
| render | 29 files | GREEN ✅ |
| positive validation | `validate(rendered)` → ok:true, 0 findings | GREEN ✅ |
| layout (DL-16) | 3 apps (api/web/mobile), 6 packages (domain/contracts/api-client/config/testing/ui), scope `@vibe-engineer-starter`, golden-records, no-auth, PostgreSQL+Prisma, ts-rest+Zod, agenticHarness=pi | GREEN ✅ |
| manifest | length 29 == rendered; presetId `vibe-engineer.nest-react-rn.starter`; **consumedTypescriptPresetId `vibe-engineer.typescript.strict`** (proves I-07D consumption) | GREEN ✅ |
| **11-negative W-NEG-* gauntlet** | all 11 fail-closed, each emits its expected code | GREEN ✅ |
| renderer-options negatives | 3/3 `PRESET_MALFORMED_RENDER_OPTIONS` | GREEN ✅ |
| defensive-copy | blockedMutation:true, stableLength:true | GREEN ✅ |

**11 negatives (all `ok:true`, each emits expectedCode):** W-NEG-OVER-INFERENCE (`PRESET_DOMAIN_SPECIFIC_CORE_TEXT`), W-NEG-NON-PI-HARNESS (`PRESET_NON_PI_HARNESS`), **W-NEG-COPIED-HARNESS-LOGIC** (`PRESET_COPIED_HARNESS_LOGIC`), **W-NEG-PRIVATE-SCOPED-IMPORT** (`PRESET_PRIVATE_SCOPED_IMPORT`), strict-weakened (`PRESET_TS_DEFAULTS_DRIFT`), tsconfig-weakened (`PRESET_PACKAGE_TSCONFIG_WEAKENED`), missing-file (`PRESET_MISSING_REQUIRED_FILE`), malformed-json (`PRESET_MALFORMED_JSON`), unsafe-path (`PRESET_UNSAFE_GENERATED_PATH`), duplicate-path (`PRESET_DUPLICATE_GENERATED_PATH`), manifest-mismatch (`PRESET_MANIFEST_CONTENT_MISMATCH`).

All seams are REAL-BOUNDARY: real preset public API (self-reference), real link, real generated manifest, real tsc — no mock/synthetic/shape-only.

### F3 — Root-cause fix, NOT symptom reword. **CLEAN.**
- The matcher (`validateDomainNeutralText`, `src/index.ts:1084`) is now **word-boundary aware**: precompiled `FORBIDDEN_DOMAIN_TERM_PATTERNS` = `\b${escapeRegExpLiteral(term)}\b` with `i` flag, compiled ONCE at module load (deterministic — NOT a per-call heuristic). This is a **structural** fix.
- `STARTER_PACKAGES.testing.boundaryRule` (`src/index.ts:~179`) is **STILL** `"Test-only; no production package may depend on it."` — the legitimate technical text "production" is **PRESERVED**; the matcher now correctly ignores it. **No `boundaryRule` reword (symptom-fix) was applied.** (Also echoed in `packages/testing/package.json` manifestEntry.)

### F4 — Step-0 lockfile delta scoped + resolution seam REAL. **CLEAN.**
- I-15B-1's lockfile contribution = the `packages/presets/nest-react-rn:` importer block (line 129): exactly **one edge** `'@vibe-engineer/preset-typescript': specifier: workspace:* version: link:../typescript` — consistent with the manifest `dependencies."@vibe-engineer/preset-typescript": "workspace:*"`.
- **Single-version invariant:** `grep -oE 'preset-typescript@[0-9]' pnpm-lock.yaml` → **EMPTY** (workspace `link:`, NOT a versioned `packages:` snapshot).
- **Resolution seam real (not a hoist):** the importer-local symlink `packages/presets/nest-react-rn/node_modules/@vibe-engineer/preset-typescript -> ../../../typescript` exists; W-RESOLVE-TS-PRESET resolves through it; `.npmrc`: `shamefully-hoist=false`, `link-workspace-packages=true`, `shared-workspace-lockfile=true` — **all preserved**.
- The large `git diff HEAD pnpm-lock.yaml` (+1657/-6, 8 `link:` edges cumulative) is the **multi-orchestrator dirty-tree baseline** — conflates other lanes' reconciliations (I-15A EXTEND-I-02A cli `adapter-pi`/`context`, I-20 `infra/pulumi` `@pulumi/pulumi`, mechanical-gates, js-yaml, vitest peer). The Step-0 three-way BEFORE↔AFTER decomposition (importer-set identity + single-version invariant, documented in step0-revalidation-artifact F1) isolates I-15B-1's contribution to the single edge. Independently confirmed: I-15B-1's scoped importer block is the one edge; the other importer blocks are not I-15B-1 surfaces. **Step-0 revalidation PASS still holds.**

### F5 — No green lane broke (sibling/blast-radius). **CLEAN.**
- **Sibling I-07D (consumed preset) no-regression:** `node packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs` → **exit 0**, `{ok:true, generatedFileCount:12, negativeCount:33}`. Unaffected.
- `tsc --noEmit` for the I-15B-1 preset → exit 0 (independent revalidator run).
- The cli/other lanes are disjoint from I-15B-1's write set (no shared surfaces touched). (Step-0's read-only `pnpm install --frozen-lockfile` exit 0 across all projects was recorded in step0-revalidation; revalidator did not re-run pnpm per read-only constraint, but manifest↔lockfile↔link consistency + tsc + resolve + both witnesses all pass.)

### F6 — Dirty-tree / scope clean. **CLEAN.**
`git status --porcelain -- packages/presets/nest-react-rn/ .vibe/work/I-15B-1-preset-package/` shows the I-15B-1 delta is ONLY:
- `M packages/presets/nest-react-rn/package.json` (in-license skeleton→implemented manifest),
- `?? packages/presets/nest-react-rn/{src,templates,tsconfig.json,fixtures}` (in-license preset implementation incl. the matcher fix + witness runner),
- `?? .vibe/work/I-15B-1-preset-package/` (work root),
- + the shared `M pnpm-lock.yaml` (one-edge contribution, F4).

**NO** other lanes' surfaces. The repo-wide dirty entries (`M package.json` [+quality script, mechanical-gates, js-yaml], `M pnpm-workspace.yaml` [+infra/pulumi], `M turbo.json`, cli create/import/security, I-02A/I-07A/I-12/I-13/I-15A/I-18/I-20 evidence, infra/, etc.) are the pre-existing multi-orchestrator baseline — **independently verified NONE reference `nest-react-rn`/`preset-nest`** (the preset is covered by the existing `packages/presets/*` workspace glob, so no pnpm-workspace.yaml edit was needed or made by I-15B-1). No `.git**` ops; no stash/reset/clean/checkout/restore; no lockfile-mutating command by revalidator.

### F7 — Public-API consumption (no forbidden scoped import). **CLEAN.**
- `src/index.ts:29` imports the I-07D public contract via the **public bare specifier** `from "@vibe-engineer/preset-typescript"` (the declared `workspace:*` link — the W-RESOLVE seam).
- **No relative/`:../` import into the TS preset** (grep confirmed NONE in `src/**`). This is the preset legitimately *consuming* the TS preset (the whole point of I-15B-1) — not a private scoped import.
- `validateNoPrivateScopedImport` (`src/index.ts:1129`) scans ALL rendered `.ts/.mjs/.js` files (no sample-demo skip) and rejects BOTH relative `../packages/...`/`../adapters/...`/`../presets/typescript/` imports AND `@vibe-engineer/{preset-typescript|adapter-pi|context|...}` scoped imports. The W-NEG-PRIVATE-SCOPED-IMPORT negative (injects `import { x } from "@vibe-engineer/adapter-pi"` into rendered starter code) → **fires `PRESET_PRIVATE_SCOPED_IMPORT` fail-closed**. So the preset source legitimately consumes the TS preset, while rendered STARTER code is forbidden from private harness imports — correct semantics.

---

## Required explicit confirmations
- **(a) matcher fix correct + non-weakening (3 probe cases):** YES (F1). Defect closed; 7 real terms fail-closed; products/production/ordering do NOT false-positive; product/Product/order/checkout DO flag; hyphenated preserved (not weakened).
- **(b) full gauntlet reproduces real-boundary:** YES (F2). exit 0; all seams real (self-reference load, real link, real manifest, real tsc); 11 negatives fail-closed.
- **(c) root-cause not symptom:** YES (F3). `\b`-anchored precompiled regex (structural); `testing.boundaryRule` still contains "production" (no reword).
- **(d) Step-0 lockfile scoped + seam real:** YES (F4). One `link:../typescript` edge; single-version invariant empty; resolves via real symlink (not hoist); `shamefully-hoist=false` preserved; large diff = other lanes (three-way isolated).
- **(e) no sibling break:** YES (F5). I-07D exit 0 (ok:true, 12 files, 33 negatives); disjoint surfaces.
- **(f) dirty-tree scope clean:** YES (F6). Only preset + work root + one lockfile edge; no other-lane surfaces; no `.git**` ops.
- **(g) public-API consumption:** YES (F7). Public bare specifier consumed; no relative import into TS preset; rendered starter private-import negative fail-closed.

## Recorded observations (NON-BLOCKING — clean/minor)
- **Obs-1 (cosmetic, non-blocking):** the W-NEG-OVER-INFERENCE carrier injects `// checkout` into `tsconfig.base.json`, which ALSO emits `PRESET_MALFORMED_JSON` (a `//` comment appended to JSON). This is a carrier artifact, NOT a defect — `expectRejected` uses `.some()` and correctly isolates the `PRESET_DOMAIN_SPECIFIC_CORE_TEXT` finding (and my independent probe (b) extended to 7 terms on the same carrier, all correctly isolated). A marginally cleaner carrier would inject into a `.ts` file or a JSON string value, but the assertion is correct and fail-closed. **Does not weaken any gate.**
- **Obs-2 (predict-vs-reality, non-material):** the implementer report predicted `version: link:../../typescript`; the actual canonical on-disk edge is `link:../typescript` (relative to the importer dir). The step0-revalidation artifact already adjudicated this as correct (`../typescript` → `packages/presets/typescript`; the predicted `../../typescript` would point at nonexistent `packages/typescript`). Mechanism identical. Not a defect.

## Severity gate assessment
- **critical:** NONE (no copied harness logic — W-NEG-COPIED-HARNESS-LOGIC fail-closed; no private/internal scoped import into harness — W-NEG-PRIVATE-SCOPED-IMPORT fail-closed + preset consumes via public bare specifier; no out-of-license edit — scope clean; no fake/shape-only witness — all seams real-boundary; no DL-16 layout infidelity — layout DL-16-faithful; no domain-specific core defaults — matcher enforces domain-neutrality and over-inference negative fail-closed).
- **major-local:** NONE.
- **minor-local:** NONE (Obs-1/Obs-2 are cosmetic, non-blocking, no gate weakened).
- **clean:** YES.

**I-15B-1 truth-green** (the I-15B-1-scoped keystone witnesses — W-RESOLVE-TS-PRESET, W-PRESET-CONTRACT compile+runtime, preset-side W-NEG-* — are all real-boundary green; positives green; all negatives fail-closed; dirty-tree scope clean; root-cause matcher fix verified non-weakening). The remaining I-15B witnesses (W-TEMPLATE-*, W-HARNESS-IMPORT, W-CONSUMER-MANIFEST-CONSISTENCY, W-CONTEXT-PLACEHOLDERS-VALIDATE) belong to I-15B-2/I-15B-3, not I-15B-1.

## Decision: I-15B-1 truth-green → **UNBLOCKS I-15B-2** (the serialized dependent that consumes the `@vibe-engineer/preset-nest-react-rn` public contract: `getStarterLayoutDeclaration`, `renderNestReactRnPresetFiles`, `validateNestReactRnPresetFiles`, `getNestReactRnPresetMetadata`, `getNestReactRnPresetFileManifest`, `STARTER_LAYOUT`, + DL-16 file-kind/finding types).

## Exact next action
Proceed to I-15B-2 (source-template monorepo), which materializes `examples/starter-reference/.source-template/**` from the I-15B-1 preset's rendered skeletons + locked DL-16 layout, declaring `@vibe-engineer/preset-nest-react-rn` as a workspace dep in its OWN template-local manifests (in-license, inside `.source-template/**`) — NOT mutating the real harness workspace graph. No fix required for I-15B-1.

## Files written by THIS revalidator (owned WRITE only)
- `.vibe/work/I-15B-1-preset-package/I-15B-1-revalidation-artifact.md` (this artifact).
- `.vibe/work/I-15B-1-preset-package/revalidation-evidence/revalidator-matcher-probe.mjs` + `revalidator-matcher-probe.json` (independent matcher/gauntlet evidence).

Zero edits to product source, prior reports/evidence, prompts/briefs/ledger/status/handoff, or `.git**`. No git/package-manager ops (read-only witnesses + read-only `git status`/`git diff` only).
