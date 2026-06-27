# I-15B-1 Step-2 FINISHER report — fix B3 witness-runner + complete runtime gauntlet

- **Agent:** Triad-B FINISHER (Step 2), glm-5.2 via zai, thinking: high.
- **Binding direction:** Step-0 FINISHER report + Step-0 REVALIDATION (PASS) + I-15B brief §3/§6/§7/§8/§9 + quality bar (prepended verbatim).
- **Scope:** fix the I-15B-1-owned witness runner's B3 (out-of-context compile/import) WITHIN the owned witness-runner path so the runtime gauntlet executes IN-CONTEXT, then run the full I-15B-1 gauntlet.
- **Status:** see Stage log (updated after every stage).
- **Implementer is NOT self-judge:** a separate revalidation follows.

## Owned WRITE paths (this finisher)
- `packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` (the B3 fix — in-license, under I-15B-1 owned fixtures path).
- `.vibe/work/I-15B-1-preset-package/step2-evidence/**` (evidence tree).
- `.vibe/work/I-15B-1-preset-package/I-15B-1-step2-finisher-report.md` (this report).

## Untouchable (confirmed)
- `packages/presets/nest-react-rn/src/**` (preset product source — type-clean from Step-0; do NOT re-edit).
- `packages/presets/nest-react-rn/package.json`, `templates/**`, `tsconfig.json`.
- `pnpm-lock.yaml` (Step-0 closed), `packages/presets/typescript/**`, all other lanes, `.git**`, prior evidence/reports.

## Stage log
- [x] S0 — report artifact created (this checkpoint).
- [x] S1 — root-cause B3 confirmed + fix design chosen (in-context self-reference, I-07D `packageSelfImportCommand` precedent).
- [x] S2 — witness runner rewritten (B3 in-context; B2 → `tsc --noEmit` type-check; negative gauntlet added).
- [x] S3 — full gauntlet run; evidence captured.
- [x] S4 — siblings + dirty-tree scope confirmed.
- [x] S5 — verdict: BLOCKED (B3 fix DONE/truth-green; latent src defect blocks all-green).

## S1 — B3 root cause + fix design (DONE)
Root cause (independently reproduced + matches Step-0 advisory): the witness runner's PHASE B3 compiled preset source to a **work-root** (`.vibe/work/I-15B-1-preset-package/compiled/src/index.js`) and runtime-`import()`ed it THERE. From that work-root location the bare specifier `@vibe-engineer/preset-typescript` (a top-level import in `src/index.ts`) does NOT resolve via the node_modules upward walk — the declared-dep link lives under `packages/presets/nest-react-rn/node_modules` (the preset-package context), NOT on the work-root resolution path. (Contrast: I-07D's work-root compiled load works because I-07D `src/index.ts` has NO module-level bare-specifier imports — only `node:` + relative + string-literal content — so its compiled JS resolves from anywhere. I-15B-1 consumes `@vibe-engineer/preset-typescript` at module top level → the seam.)

**Fix (option (b) of the task direction — I-18B/I-15A/Node-24 type-stripping precedent; faithful to I-07D `packageSelfImportCommand`):** load the preset public API **IN-CONTEXT via package self-reference** — `await import("@vibe-engineer/preset-nest-react-rn")`. The witness runner `.mjs` is physically located under `packages/presets/nest-react-rn/`, so Node self-reference resolves (`exports.".".import` → `./src/index.ts`, loaded via Node-24 native type-stripping); the consumed `@vibe-engineer/preset-typescript` then resolves through the package's `node_modules` link (Step-0). This uses the **public bare specifier** (the package's own declared name+exports — the public contract; NOT a forbidden private/internal scoped import into harness internals, which `W-NEG-PRIVATE-SCOPED-IMPORT` forbids), creates NO new node_modules link, touches NO lockfile, and requires NO out-of-context compile. De-risked: a `.mjs` physically in `fixtures/witnesses/` self-imports the preset and loads the full API (26 keys, render fn present) — exit 0.

B2 (compile/type witness) becomes `tsc --noEmit -p packages/presets/nest-react-rn/tsconfig.json` (exit 0 from Step-0; the type-clean proof — emit no longer needed since B3 loads source in-context).

## S2 — witness runner rewritten (DONE)
Rewrote `packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs`:
- Phase A (A1–A5) preserved verbatim (structural/syntax; green; no link required).
- B1 W-RESOLVE-TS-PRESET preserved (resolve `@vibe-engineer/preset-typescript` from preset context).
- B2 W-PRESET-CONTRACT (compile) → `tsc --noEmit` type-check (exit 0 expected).
- B3 W-PRESET-CONTRACT (runtime) → IN-CONTEXT self-reference load + render + validate + layout/manifest + preset-side W-NEG-* negative gauntlet (over-inference, non-pi, copied-logic, private-scoped-import) + structural negatives + renderer-options negatives + defensive-copy. Removed the out-of-context `compiledRoot` emit/load entirely.

## S3 — full gauntlet run (DONE; evidence captured)

Witness: `node packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` → **exit 2 (BLOCKED — source defect, NOT a B3/keystone failure)**. Evidence: `.vibe/work/I-15B-1-preset-package/evidence/nest-react-rn-preset-witness-result.json` + `step2-evidence/{b3-load,b3-runtime}.json`.

| Component | Result | Evidence |
|---|---|---|
| **Phase A** (node --check ×3, 8 template JSON, manifest invariants, source hygiene, public-bare-specifier consumption) | **GREEN** ✅ | result.phaseA |
| **B1 W-RESOLVE-TS-PRESET** (resolve `@vibe-engineer/preset-typescript` from preset context) | **GREEN** ✅ | exit 0; `TS_PRESET_OK function true` |
| **B2 W-PRESET-CONTRACT (compile)** (`tsc --noEmit -p .../tsconfig.json`) | **GREEN** ✅ | exit 0 (type-clean; matches Step-0 revalidation F3) |
| **B3 W-PRESET-CONTRACT (runtime) — IN-CONTEXT LOAD** (the Step-2 fix) | **GREEN** ✅ | self-reference `import("@vibe-engineer/preset-nest-react-rn")` resolves IN-CONTEXT from the witness runner's physical location under the package; 26 exported keys; render/validate/layout/manifest/options-error all present. **B3 ADVISORY CLOSED.** |
| **B3 render** | **GREEN** ✅ | 29 files rendered |
| **B3 layout (DL-16 fidelity)** | **GREEN** ✅ | 3 apps (api/web/mobile), 6 packages (domain/contracts/api-client/config/testing/ui), scope `@vibe-engineer-starter`, golden-records, no-auth, PostgreSQL+Prisma, ts-rest+Zod, agenticHarness=pi |
| **B3 manifest** | **GREEN** ✅ | manifest length 29 == rendered count; presetId `vibe-engineer.nest-react-rn.starter`; consumedTypescriptPresetId `vibe-engineer.typescript.strict` (proves I-07D consumption) |
| **B3 negative gauntlet** (preset-side W-NEG-* + structural) | **GREEN** ✅ | **11/11** expectRejected ok (W-NEG-OVER-INFERENCE, W-NEG-NON-PI-HARNESS, W-NEG-COPIED-HARNESS-LOGIC, W-NEG-PRIVATE-SCOPED-IMPORT + TS_DEFAULTS_DRIFT, PACKAGE_TSCONFIG_WEAKENED, MISSING_REQUIRED_FILE, MALFORMED_JSON, UNSAFE_PATH, DUPLICATE_PATH, MANIFEST_MISMATCH) |
| **B3 renderer-options negatives** | **GREEN** ✅ | 3/3 throw `NestReactRnPresetOptionsError` (code `PRESET_MALFORMED_RENDER_OPTIONS`) |
| **B3 defensive-copy** | **GREEN** ✅ | manifest accessor immutable (blockedMutation) |
| **B3 positive validation** (`validate(rendered)`) | **BLOCKED — SOURCE DEFECT** ❌ | `validationOk:false`; 1 finding: `PRESET_DOMAIN_SPECIFIC_CORE_TEXT` on `.vibe/generated/nest-react-rn-preset/manifest.json`, evidence `["product"]`. See S5 root cause. |

The **B3 fix itself is truth-green**: the runtime gauntlet now EXECUTES IN-CONTEXT (the assigned Step-2 sub-task is DONE). The full gauntlet runs end-to-end; every component is green EXCEPT the preset's own positive self-validation, which is RED due to a latent source defect (S5).

## S4 — siblings + dirty-tree scope (DONE)
- **Sibling no-regression (I-07D consumed preset):** `node packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs` → **exit 0**, `{ok:true, generatedFileCount:12, negativeCount:33}`. Consumed preset unaffected.
- **Dirty-tree scope (`git status --porcelain`):**
  - `M packages/presets/nest-react-rn/package.json` — **pre-existing** in-license I-15B-1 skeleton→implemented manifest (Step-0 revalidation F6 confirmed; NOT touched by Step-2).
  - `M pnpm-lock.yaml` — **Step-0** lockfile reconciliation (NOT Step-2; Step-2 made ZERO lockfile edits).
  - `?? packages/presets/nest-react-rn/{src,templates,tsconfig.json,fixtures/consumer}` — **pre-existing** in-license I-15B-1 implementation (src mtime 04:18 predates Step-2; NOT touched by Step-2).
  - `?? packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` — **THIS Step-2's only product edit** (the B3 fix; owned fixtures path; in-license).
  - `?? .vibe/work/I-15B-1-preset-package/` — Step-2 evidence/report (+ pre-existing Step-0 evidence).
- **ZERO out-of-license edits:** NO `src/**` edit (mtime-confirmed), NO `package.json`/`templates/**`/`tsconfig.json` edit, NO `pnpm-lock.yaml` edit, NO `packages/presets/typescript/**` edit, NO `.git**` ops, NO stash/reset/clean/checkout/restore, NO new node_modules link, NO lockfile-mutating command. The temporary `.selfref-probe.mjs` used for de-risking was created and removed (`rm -f`); confirmed absent.

## S5 — verdict: `BLOCKED` (zero out-of-license edits; root cause + exact ruling below)

**The B3 sub-task is DONE and truth-green.** The Step-2 fix (in-context self-reference load) closes the B3 out-of-context advisory: the runtime gauntlet now executes in-context, and every gauntlet component — B1 resolve, B2 compile, B3 in-context load, render, DL-16 layout, manifest, the full 11-negative W-NEG-* gauntlet, renderer-options, defensive-copy — is GREEN. The witness runner is the ONLY product file Step-2 touched, and it is within the owned `fixtures/**` path; src is untouched (mtime-confirmed).

**The full I-15B-1 gauntlet cannot reach all-green because of a latent SOURCE DEFECT in `packages/presets/nest-react-rn/src/index.ts` — UNTOUCHABLE by Step-2** (the brief + task explicitly list `src/**` as untouchable: "the preset product source — already type-clean, don't re-edit"). The defect was invisible until now because B3 was always blocked (the gauntlet never ran); fixing B3 (in-license) is precisely what surfaced it truthfully. Per the quality bar ("Blocked means analyze, never improvise"), Step-2 makes ZERO out-of-license edits and does NOT weaken the validator assertion or fake green.

**Root cause (analyzed, not improvised):** the preset's positive self-validation `validate(renderNestReactRnPresetFiles())` returns `{ok:false}` with one finding: `PRESET_DOMAIN_SPECIFIC_CORE_TEXT` on the generated manifest, evidence `["product"]`. The `validateDomainNeutralText` matcher in `src/index.ts` checks every non-sample-demo file's content with a **coarse case-insensitive substring test** against `FORBIDDEN_DOMAIN_TERMS`. The forbidden e-commerce business-domain term `"product"` matches the legitimate technical word **"production"** embedded in `STARTER_PACKAGES.testing.boundaryRule` ("Test-only; no production package may depend on it."), which is serialized into the generated `.vibe/generated/nest-react-rn-preset/manifest.json`. The preset's own validator therefore false-positives on its own rendered output. (The negative `W-NEG-OVER-INFERENCE` witness — injecting a true business term — still fires correctly, confirming the matcher works for whole terms; only substring collisions like production/product are false positives.)

**Exact ruling needed (out-of-license edit to `packages/presets/nest-react-rn/src/**` — must be authorized):** make the `validateDomainNeutralText` domain-term matcher **word-boundary aware** (e.g. `\b`-anchored or token-based) so "production" no longer matches the forbidden term "product"; OR reword the `testing` package `boundaryRule` (and any other boundaryRule/serialized text) to avoid the "product" substring. Either fix is a one-localized-edit src change; after it, `validate(rendered)` → ok and the full I-15B-1 gauntlet goes all-green (B1/B2/B3-load/render/layout/manifest/negatives are already green). Recommended: word-boundary matcher (root-cause fix; robust against future boundaryRule text).

**Severity:** the source defect is **major-local** (blocks I-15B-1 truth-green + serialized dependent I-15B-2 until fixed/revalidated). It is NOT critical (no copied harness logic, no private scoped import, no out-of-license edit, no fake green, no DL-16 layout infidelity — all real-boundary witnesses including the 11-negative W-NEG-* gauntlet are green). The B3 fix itself is **clean** (in-license, faithful to the I-07D self-reference precedent, truth-green).
