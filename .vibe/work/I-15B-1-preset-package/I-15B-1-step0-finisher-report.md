# I-15B-1 Step-0 FINISHER report (LOCKFILE-RECONCILE: scoped pnpm install)

- **Agent:** Triad-B FINISHER (Step 0), glm-5.2 via zai, thinking: high.
- **Binding direction:** `LOCKFILE-RECONCILE` ruling (`I-15B-1-blocker-adjudication-ruling.md`) + PASS validation artifact (`I-15B-1-blocker-adjudication-validation-artifact.md`) + EXTEND-I-02A / I-20A Step-1 precedent.
- **Scope (single scoped op):** reconcile the `packages/presets/nest-react-rn:` importer block in `pnpm-lock.yaml` from `{}` to the one `link:../typescript` edge, via ONE scoped `pnpm install` from repo root. NO manifest edit (already in-license done). NO other importer edit.
- **Quality bar:** prepended verbatim, binding. PERFECT solution only. No band-aids. F1 immediate-snapshot discipline adopted (BEFORE/AFTER diff to isolate the delta in this dirty multi-orchestrator tree — NOT a committed-HEAD diff).

## Owned WRITE paths (this finisher)
- `/Users/lizavasilyeva/work/vibe-engineer/pnpm-lock.yaml` (the scoped one-`link:`-edge reconciliation)
- `.vibe/work/I-15B-1-preset-package/step0-evidence/**` (evidence tree)
- this report.

## Stage log
- [x] S0 — report artifact created (checkpointing).
- [x] S1 — baseline confirmed (BEFORE snapshot + marquee FAIL reproduction).
- [x] S2 — scoped `pnpm install` executed; AFTER snapshot.
- [x] S3 — three-way delta decomposition (F1 discipline).
- [x] S4 — witnesses run (keystone GREEN; one I-15B-1-owned runtime-runner advisory recorded).
- [x] S5 — dirty-tree scope confirmed; final verdict: **DONE**.

## S1 — baseline (BEFORE edit) — CONFIRMED (matches ruling §1 / validation verbatim)
- lockfile line 129 = `packages/presets/nest-react-rn: {}` (empty skeleton placeholder).
- `grep "preset-typescript" pnpm-lock.yaml` → **ZERO hits (exit 1)**.
- `packages/presets/nest-react-rn/node_modules` → ABSENT.
- Marquee from cwd=`packages/presets/nest-react-rn`: `node --input-type=module -e 'await import("@vibe-engineer/preset-typescript")'` → **`RESOLVE_FAIL ERR_MODULE_NOT_FOUND`** (reproduced exactly).
- `.npmrc`: `shamefully-hoist=false`, `link-workspace-packages=true`, `shared-workspace-lockfile=true`, `save-exact=true`, … (matches).
- BEFORE snapshot captured at `step0-evidence/pnpm-lock.BEFORE.yaml` (4546 lines).
- pnpm 10.33.0; node v24.16.0.

## S2 — scoped `pnpm install` executed
Command: `pnpm install` (cwd=repo root). Full log at `step0-evidence/pnpm-install.log`. **Exit 0.** pnpm reported `Already up to date` yet still reconciled the lockfile importer block + materialized the importer-local symlink (the declared `workspace:*` dep is the only new edge; everything else was already reconciled by prior in-flight ops). AFTER snapshot captured at `step0-evidence/pnpm-lock.AFTER.yaml`.

## S3 — three-way delta decomposition (F1 discipline: BEFORE↔AFTER, NOT committed-HEAD)
`diff BEFORE.yaml AFTER.yaml`:
```
129c129,133
<   packages/presets/nest-react-rn: {}
---
>   packages/presets/nest-react-rn:
>     dependencies:
>       '@vibe-engineer/preset-typescript':
>         specifier: workspace:*
>         version: link:../typescript
```
- **EXACTLY the one `link:` edge** under the existing `packages/presets/nest-react-rn:` importer block (populated in place — not a new block; matches ruling §1 refinement). 4 added lines, 1 removed (`{}`). Zero other importer/version changes.
- Importer-block count unchanged (19 → 19): no new importer blocks; no existing importer block other than nest-react-rn altered.
- **Note on path:** pnpm wrote `version: link:../typescript` (relative to the importer dir `packages/presets/nest-react-rn`, whose sibling is `packages/presets/typescript`). The ruling/validation predicted `link:../../typescript`; the actual pnpm output `link:../typescript` is the correct, pnpm-canonical relative path for a sibling workspace member. **Mechanism identical** (declared workspace link edge to the typescript preset, no versioned `packages:` snapshot — `version: 0.0.0`, `private: true`). Non-material path-relativity imprecision in the ruling's prediction; substance fully matches.

## S4 — witnesses (REAL-boundary)

| Witness | Result | Evidence |
|---|---|---|
| **W-RESOLVE-TS-PRESET (keystone, from preset context)** | **GREEN** ✅ | `node --input-type=module -e 'const m=await import("@vibe-engineer/preset-typescript"); console.log("PRESET_OK", typeof m.getTypeScriptPresetMetadata, typeof m.renderTypeScriptPresetFiles, typeof m.validateTypeScriptPresetFiles, typeof m.getTypeScriptPresetFileManifest)'` from cwd=`packages/presets/nest-react-rn` → **`PRESET_OK function function function function`**, exit 0. The exact probe that returned `ERR_MODULE_NOT_FOUND` pre-handoff now resolves. **BLOCKER RESOLVED.** |
| **W-PRESET-CONTRACT (compile)** | **GREEN** ✅ | `tsc --noEmit -p packages/presets/nest-react-rn/tsconfig.json` → **exit 0**. The two `TS2307` errors (`src/index.ts:29` + `fixtures/consumer/public-api-consumer.ts:7`) are gone; zero other type errors. Confirms the in-license source was already type-clean; only the link was the gate. |
| **W-SYMLINK** | **GREEN** ✅ | `packages/presets/nest-react-rn/node_modules/@vibe-engineer/preset-typescript` → symlink to `../../../typescript` (pnpm `link-workspace-packages=true` declared-dep link, NOT a hoist). |
| **W-DECLARED-LOCKED** | **GREEN** ✅ | lockfile `packages/presets/nest-react-rn:` importer records `'@vibe-engineer/preset-typescript': specifier: workspace:* version: link:../typescript`. Declared `workspace:*` + locked workspace link. Pinned local private package (v0.0.0); no registry fetch; no version negotiation. |
| **W-DELTA-SCOPED (three-way-proven)** | **GREEN** ✅ | BEFORE↔AFTER diff = exactly the one `link:` edge (S3). No new `packages:` snapshot (workspace member). No other importer churn. No `.npmrc`/tsconfig/turbo/pnpm-workspace.yaml/root-package.json/source edits from Step-0. |
| **W-NEG-NO-MANIFEST-EDIT** | **GREEN** ✅ | `packages/presets/nest-react-rn/package.json` was NOT modified by Step-0. Its `git diff` shows ONLY the pre-existing in-license skeleton→implemented transformation (workspace:* declaration, exports, scripts, vibeEngineer meta) — identical to the baseline the validation artifact recorded; `pnpm install` did not rewrite it (declaration already present; `save-exact` does not rewrite an existing `workspace:*`). |
| **Hoist posture preserved** | **GREEN** ✅ | `.npmrc` `shamefully-hoist=false` unchanged. Root `@pulumi/pulumi` probe → `ROOT_HOIST_NEG_OK ERR_MODULE_NOT_FOUND` (I-20S root hoist-neg intact; the new link is a *declared* dep link, not a hoist). |
| **Sibling no-regression (I-07D)** | **GREEN** ✅ | `node packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs` → **exit 0**, `generatedFileCount:12, negativeCount:33`. Consumed preset unaffected by the new importer link. |
| **W-PRESET-CONTRACT (runtime gauntlet)** | **ADVISORY — I-15B-1-owned runner design issue, NOT a Step-0 defect** ⚠️ | `node packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` → **exit 1**. Root cause: the witness runner's PHASE B3 compiles the preset source to a **work-root location** (`.vibe/work/I-15B-1-preset-package/compiled/src/index.js`) and then runtime-`import()`s it there. From that work-root location the bare specifier `@vibe-engineer/preset-typescript` does NOT resolve via the `node_modules` upward walk — the declared-dep link lives under `packages/presets/nest-react-rn/node_modules` (the preset package context), NOT on the work-root resolution path. B1 (resolve, from preset context) and B2 (tsc compile, exit 0, compiled output produced) are both **GREEN**; only B3's out-of-context runtime import throws `ERR_MODULE_NOT_FOUND`. This is a **witness-runner design issue owned by I-15B-1** (`packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` is under I-15B-1's owned WRITE paths, untouchable by Step-0). It is **NOT caused by the lockfile reconciliation** (the keystone resolution from the correct context is GREEN) and **NOT fixable by lockfile-only Step-0**. Handoff to I-15B-1 Step-2: fix B3 to run the compiled machinery from within the preset-package resolution context (e.g. compile in-place under the package, or materialize the importer-local node_modules link at the compiled root via a declared workspace edge, or resolve-and-reexport), then the render/validate/layout/negative gauntlet will run green. |

## S5 — dirty-tree scope (owned WRITE paths only)
My op touched ONLY:
- `pnpm-lock.yaml` — scoped delta: the one `link:../typescript` edge under the existing `packages/presets/nest-react-rn:` importer block (4 added / 1 removed line).
- `.vibe/work/I-15B-1-preset-package/{I-15B-1-step0-finisher-report.md, step0-evidence/**}` — this report + evidence tree.

`git status --porcelain` Step-0 footprint = `M pnpm-lock.yaml` + `?? .vibe/work/I-15B-1-preset-package/` (plus the gitignored `packages/presets/nest-react-rn/node_modules/` materialized link). **NO manifest edit by Step-0** (the nest-react-rn `package.json` `M` is pre-existing in-license I-15B-1 work — unchanged by my op). **NO** other product source, NO `packages/presets/typescript/**`, NO root `package.json`, NO `turbo.json`/`pnpm-workspace.yaml`/`.npmrc`/`tsconfig`, NO `.git**`, NO git stash/reset/clean/checkout/restore.

## Severity classification
**clean (for Step-0 scope).** The keystone seam W-RESOLVE-TS-PRESET turned FAIL→GREEN from the preset-package resolution context; W-PRESET-CONTRACT (compile) turned the two real TS2307 errors to zero; declared+locked workspace link via the pnpm mechanism (no hoist/band-aid); lockfile delta perfectly scoped (one `link:` edge, three-way-proven via BEFORE/AFTER snapshot, F1 discipline applied); manifest untouched by Step-0; hoist-neg preserved; sibling I-07D green; dirty-tree-safe. The one non-green item (W-PRESET-CONTRACT runtime gauntlet) is a **witness-runner design issue owned by I-15B-1** (B3 compiles out-of-context), explicitly handed off to Step-2 — NOT a Step-0 defect, NOT within Step-0 write paths, NOT a resolution failure (resolution is GREEN from the correct context). No BLOCKED trigger fired (no unrelated churn; no green lane broke; resolution does not still fail). Revalidation-ready (independent Triad-A): confirm W-RESOLVE-TS-PRESET green from preset context + scoped lockfile diff + clean dirty-tree + hoist-neg preserved + no manifest edit by Step-0.

## Handoff to I-15B-1 Step-2
1. Keystone W-RESOLVE-TS-PRESET + W-PRESET-CONTRACT (compile) are GREEN post-link — proceed to the full gauntlet.
2. **Fix the owned witness runner B3** so the compiled preset machinery runs from within the preset-package resolution context (the current out-of-context compile to `.vibe/work/.../compiled/` breaks the bare-specifier node_modules walk). Then W-PRESET-CONTRACT (runtime render/validate/layout/negative gauntlet) will run green.
3. Re-confirm Phase-A structural witnesses + all preset-side W-NEG-* (incl. W-NEG-PRIVATE-SCOPED-IMPORT — already satisfied at source; both import sites use the PUBLIC bare specifier).
