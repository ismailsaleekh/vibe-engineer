# I-15B-1 Step-0 REVALIDATION Artifact (Triad-B adversarial)

- **Revalidator:** independent adversarial REVALIDATOR (glm-5.2 via zai, thinking: xhigh).
- **Mode:** read-only on both repos (no product edits, no mutating git ops). WRITE only this artifact + own evidence tree (`step0-revalidation-evidence/**`). One read-only `pnpm install --frozen-lockfile` consistency check (precedent-mandated; `--frozen`, does NOT mutate the lockfile; "Already up to date" = no-op — witness #4). Read-only git witnesses (`git diff/status/show`) explicitly required by the witness list.
- **Quality bar:** `prompts/quality-bar.md` prepended verbatim, binding. Implementer `DONE` ≠ validator `PASS`. Shape-green ≠ truth-green. Blocked means analyze, never improvise.
- **Target under revalidation:** finisher report `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-15B-1-preset-package/I-15B-1-step0-finisher-report.md` (claims **DONE** on the LOCKFILE-RECONCILE Step-0: scoped `pnpm install` → one `link:` edge under the `packages/presets/nest-react-rn:` importer block).
- **Scope of the op under test:** I-15B-1 LOCKFILE-RECONCILE Step-0 — populate the existing empty `packages/presets/nest-react-rn: {}` importer block in `pnpm-lock.yaml` with one `'@vibe-engineer/preset-typescript': specifier: workspace:* version: link:...` edge + materialize the importer-local symlink, via ONE scoped `pnpm install` from repo root. **NO manifest edit by Step-0** (declaration already in-license done). NO other importer edit.
- **Precedent (mirrored rigor):** I-20S Step-1 EXTEND-I-20S revalidation (PASS; 3-line importer link) + I-02A Step-0 EXTEND-I-02A revalidation (PASS; 6-line two-link importer block). This case is the **lowest-churn** of the three: one `link:` edge to an already-present workspace member, zero versioned snapshots.
- **Provenance:** node v24.16.0, pnpm 10.33.0, lockfileVersion 9.0. Date 2026-06-27. Evidence log: `step0-revalidation-evidence/revalidation-witnesses.log`.

## VERDICT: `PASS`

Step-0 is **truth-green**. The keystone seam W-RESOLVE-TS-PRESET is **real and reproducible from the preset-package resolution context** (the exact probe that returned `ERR_MODULE_NOT_FOUND` pre-handoff now resolves, with the public surface functions actually loaded — truth-green, not shape-only); W-PRESET-CONTRACT (compile) is **exit 0** (the two `TS2307` errors gone, zero other errors); resolution is via the **declared+locked workspace dep** (importer-local symlink + `shamefully-hoist=false` + root-context negative — NOT a hoist); the lockfile delta is **perfectly scoped to the one `link:../typescript` edge** under the existing `packages/presets/nest-react-rn:` importer block (three-way-proven via BEFORE↔AFTER snapshot + independent BEFORE-snapshot honesty checks + importer-set identity + single-version invariant; zero unrelated churn); no green lane broke (`pnpm install --frozen-lockfile` exit 0 across all 20 projects + I-07D sibling witness exit 0 + self-reference control GREEN); the manifest is **untouched by Step-0** (`workspace:*` intact; the `M` diff is the pre-existing in-license skeleton→implemented transformation); dirty-tree scope is clean (Step-0's only on-disk product footprint is `pnpm-lock.yaml`); the B3 advisory is **correctly scoped to Step-2** (an out-of-context compile/import design issue in the I-15B-1-owned runtime runner, NOT a Step-0 resolution failure). **Severity: clean. I-15B-1 may resume Step-2.**

## Stage log (checkpointed)
- [x] S0 — Artifact scaffolded (report-checkpointing discipline).
- [x] S1 — Ground-truth reading list read (finisher report, LOCKFILE-RECONCILE ruling + PASS validation artifact, I-20S + I-02A precedent revalidations).
- [x] S2 — Lockfile delta three-way-decomposed (BEFORE↔AFTER = one edge; AFTER==NOW; importer-set identity; single-version invariant). **F1.**
- [x] S3 — Keystone W-RESOLVE-TS-PRESET reproduced from preset-package context (real load). **F2.**
- [x] S4 — W-PRESET-CONTRACT (compile) reproduced (TSC exit 0). **F3.**
- [x] S5 — Resolution mechanism verified (declared link, not hoist; root-context negative; hoist-neg preserved). **F4.**
- [x] S6 — No green lane broke (frozen-lockfile exit 0 + I-07D sibling exit 0 + self-ref control). **F5.**
- [x] S7 — Manifest untouched by Step-0 (`workspace:*` intact; in-license diff). **F6.**
- [x] S8 — Dirty-tree scope clean; no `.git` ops. **F7.**
- [x] S9 — B3 advisory reproduced + correctly scoped to Step-2 (out-of-context runner design issue). **F8.**
- [x] S10 — Severity gate + verdict + next action.

---

## Numbered findings (severity + exact evidence; every claim independently reproduced by THIS revalidator)

### F1 — W-DELTA: lockfile delta EXACTLY one `link:` edge under the nest-react-rn importer block (three-way-proven). **CONFIRMED. (clean)**

Independently decomposed via the precedent's three-way method, using the finisher's BEFORE/AFTER snapshots (which the validation artifact F1 mandated for this dirty tree — a committed-HEAD diff would conflate the pre-existing in-flight cli/mechanical-gates/pulumi/js-yaml reconciliations). Scope is proven WITHOUT relying on the finisher's word:

| comparison | delta | attribution |
| --- | --- | --- |
| **BEFORE → AFTER** (finisher's op) | **1 line removed / 5 lines added** (net +4) | **THIS op** (populate the nest-react-rn importer block) |
| BASE(HEAD) → BEFORE | (pre-existing churn) | **pre-existing** I-20S/I-18B/mechanical-gates/EXTEND-I-02A baseline (NOT this op) |

`diff pnpm-lock.BEFORE.yaml pnpm-lock.AFTER.yaml`:
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
**EXACTLY the one `link:` edge** under the existing `packages/presets/nest-react-rn:` importer block (the empty `{}` skeleton placeholder at line 129 is populated in place — not a new block; matches ruling §1 refinement + validation §1). Zero other importer/version changes; zero mass re-resolution.

**Independently-verified honesty of the BEFORE snapshot + scoping (4 sub-checks):**
1. **Line counts:** BEFORE=4546, AFTER=4550, NOW(current on-disk)=4550 → net +4 (matches the one-edge populate).
2. **`preset-typescript` hits:** BEFORE=0, AFTER=1, NOW=1 → the op added exactly one occurrence; before had none.
3. **`AFTER == NOW`** (`diff` exit 0, byte-identical): the current on-disk lockfile is EXACTLY the finisher's post-op state — nothing further mutated it (incl. my own read-only frozen check, which was a no-op).
4. **Importer-header SET identity:** `diff <(BEFORE importer headers) <(NOW importer headers)` → **exit 0 (identical sets)**. No importer block added/removed/renamed — the nest-react-rn block was populated in place. (This resolves the only apparent anomaly: a naïve count of bare-colon headers rises 8→9 only because the block changed suffix from `: {}` → `:`; the SET of importer paths is unchanged.)
5. **Single-version invariant:** `grep -oE 'preset-typescript@[0-9]' pnpm-lock.yaml` → **empty.** The consumed package is a workspace member (`packages/presets/typescript: {}` importer pre-exists); `workspace:*` resolves as `link:`, NOT a versioned `packages:` snapshot. Zero new snapshot churn.

**Path-relativity (the one non-material ruling-vs-reality delta):** the LOCKFILE-RECONCILE ruling + validation predicted `version: link:../../typescript`; the actual on-disk + pnpm-canonical output is **`link:../typescript`**. Independently verified `link:../typescript` is **correct**: the `link:` path is relative to the importer dir `packages/presets/nest-react-rn`; `../typescript` → `packages/presets/typescript` (the consumed workspace member). The symlink target corroborates: `packages/presets/nest-react-rn/node_modules/@vibe-engineer/preset-typescript -> ../../../typescript` (3 `..` from the `@vibe-engineer/` node_modules dir = `packages/presets/typescript`). The ruling's `link:../../typescript` prediction would have pointed at `packages/typescript` (nonexistent). The finisher correctly flagged this as a non-material path-relativity imprecision in the ruling's prediction; the **mechanism is identical** (declared workspace link edge to the typescript preset, no versioned snapshot, `version: 0.0.0`/`private: true`). **Not a Step-0 defect.** ✓

### F2 — W-RESOLVE-TS-PRESET: real + reproducible from the PRESET-PACKAGE context (keystone, truth-green). **CONFIRMED. (clean)**

Witness (run from cwd=`packages/presets/nest-react-rn` — the preset `src/**` resolution context, exactly where ruling §1 / validation §1 reproduced `ERR_MODULE_NOT_FOUND` pre-handoff):
```
node --input-type=module -e 'const m=await import("@vibe-engineer/preset-typescript");
  console.log("PRESET_OK", typeof m.getTypeScriptPresetMetadata,
  typeof m.renderTypeScriptPresetFiles, typeof m.validateTypeScriptPresetFiles,
  typeof m.getTypeScriptPresetFileManifest)'
→ PRESET_OK function function function function   exit=0
```
The exact probe that returned `ERR_MODULE_NOT_FOUND` pre-handoff now resolves, and the **public surface functions are actually loaded** (truth-green, not shape-only). **BLOCKER RESOLVED.** ✓

### F3 — W-PRESET-CONTRACT (compile): exit 0. **CONFIRMED. (clean)**

Witness: `npx tsc --noEmit -p packages/presets/nest-react-rn/tsconfig.json` → **TSC exit=0**. (The `npm warn Unknown project config …` lines are harmless — npx/npm doesn't understand pnpm-only `.npmrc` keys; they do not affect tsc.) The two `TS2307` errors (`src/index.ts` + `fixtures/consumer/public-api-consumer.ts`) are gone; zero other type errors. Confirms the in-license source was already type-clean — only the link was the gate. ✓

### F4 — resolution via declared+locked workspace dep, NOT a hoist. **CONFIRMED. (clean)**
- **W-SYMLINK:** `packages/presets/nest-react-rn/node_modules/@vibe-engineer/preset-typescript -> ../../../typescript` (pnpm `link-workspace-packages=true` declared-dep link, NOT a hoist). ✓
- **W-DECLARED-LOCKED:** the `packages/presets/nest-react-rn:` importer records `'@vibe-engineer/preset-typescript': specifier: workspace:* version: link:../typescript` (declared AND locked; no registry fetch; pinned private `version: 0.0.0` workspace member). ✓
- **`.npmrc` posture:** `shamefully-hoist=false`, `link-workspace-packages=true`, `shared-workspace-lockfile=true` (unchanged). ✓
- **W-NEG-HOIST-POSTURE-PRESERVED (two negatives):**
  - root `@pulumi/pulumi` → `ROOT_HOIST_NEG_OK ERR_MODULE_NOT_FOUND` (the I-20S root hoist-neg intact). ✓
  - root `@vibe-engineer/preset-typescript` → `ROOT_NEG_OK ERR_MODULE_NOT_FOUND` — **proves the link is declared-dep-only under nest-react-rn's `node_modules`, NOT hoisted to root.** (The keystone resolves only from the preset-package context, never from root — exactly the `shamefully-hoist=false` posture.) ✓
- **Control:** self-reference from `packages/presets/typescript` → `SELF_OK function` (consumed package healthy via Node self-reference — the mechanism I-07D uses; unavailable to the different nest-react-rn package, which now resolves via the declared link). ✓

### F5 — no green lane broke (sibling/blast-radius). **CONFIRMED. (clean)**
- **`pnpm install --frozen-lockfile` → exit 0** ("Lockfile is up to date, resolution step is skipped. Already up to date. Scope: all 20 workspace projects." — read-only consistency check; lockfile not mutated; no-op on `node_modules`). Lockfile↔manifest integrity holds across all 20 projects. ✓
- **Sibling no-regression (I-07D consumed preset):** `node packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs` → **exit 0**, `{"ok":true, generatedFileCount:12, negativeCount:33}`. The consumed preset is unaffected by the new importer link. ✓
- This op created the **first external importer** of `preset-typescript` (validation §6 sweep: only self + nest-react-rn) → it cannot have broken a prior consumer. ✓

### F6 — manifest untouched by Step-0. **CONFIRMED. (clean)**
`git diff HEAD -- packages/presets/nest-react-rn/package.json` shows ONLY the pre-existing in-license skeleton→implemented transformation (description, `private`, `exports."."→src/index.ts`, `scripts`, `dependencies`, `vibeEngineer.implementationUnit/Status/SourceStatus`). **Decisive proof pnpm did not rewrite it:** the manifest STILL declares **`"@vibe-engineer/preset-typescript": "workspace:*"`** (NOT a resolved version/tarball reference). `pnpm install` with `save-exact=true` does NOT rewrite an existing `workspace:*` specifier; the diff contains no field pnpm would add (no `lockfileVersion`, no reordered deps, no resolved version). The validation artifact stage-1 (recorded pre-Step-0) recorded this exact manifest state. → The manifest `M` is **entirely attributable to I-15B-1's in-license implementation, NOT Step-0.** ✓

### F7 — dirty-tree scope clean; no `.git` ops. **CONFIRMED. (clean)**
Step-0's on-disk **product** footprint is **ONLY** `pnpm-lock.yaml` (the scoped one-edge delta — F1). The other dirty entries under `packages/presets/nest-react-rn/` (`M package.json`, `?? {src,fixtures,templates,tsconfig.json}`) are I-15B-1's in-license preset implementation (F6 + new source), **NOT Step-0 changes.** All remaining dirty-tree entries (cli source, mechanical-gates, I-13/I-18 evidence, etc.) are pre-existing sibling-lane churn, disjoint from Step-0's lockfile surface.
- `node_modules/@vibe-engineer/preset-typescript` symlink → `git check-ignore` exit 0 (gitignored — not a stray tracked file). ✓
- `git stash list` → empty; `HEAD` stable at `001c76d`. **No `.git**` ops; no stash/reset/clean/checkout/restore; no broad `pnpm update`.** The only package-manager invocations are the finisher's single scoped `pnpm install` (reconcile) + this revalidator's read-only `pnpm install --frozen-lockfile` (no-op). ✓

### F8 — B3 advisory correctly characterized + scoped to Step-2. **CONFIRMED. (clean for Step-0 scope)**
Reproduced the finisher's advisory myself: `node packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` → **exit 1**, `ERR_MODULE_NOT_FOUND: Cannot find package '@vibe-engineer/preset-typescript' imported from /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-15B-1-preset-package/compiled/src/index.js`.

**Root cause independently confirmed:** the witness runner's PHASE B3 compiles the preset source to a **work-root location** (`.vibe/work/I-15B-1-preset-package/compiled/src/index.js`) and then runtime-`import()`s it THERE. From that work-root location, the bare specifier `@vibe-engineer/preset-typescript` does NOT resolve via the `node_modules` upward walk — the declared-dep link lives under `packages/presets/nest-react-rn/node_modules` (the preset-package context), NOT on the work-root resolution path. This is an **out-of-context compile/import design issue in the I-15B-1-owned runtime runner** (`packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` is under I-15B-1's owned WRITE paths; the compiled output is in the I-15B-1 work root). It is:
- **NOT caused by the lockfile reconciliation** — the keystone W-RESOLVE-TS-PRESET (F2) + compile (F3) are both GREEN from the CORRECT preset-package context. The resolution seam is resolved.
- **NOT fixable by lockfile-only Step-0** — Step-0 has no write path to the runner; the fix is to run the compiled machinery from within the preset-package resolution context (compile in-place, or materialize the importer-local link at the compiled root, or resolve-and-reexport).

**The B3 advisory is genuinely separate from Step-0** (Step-0 correctly resolved the resolution seam; B3 is a witness-runner design issue within I-15B-1's owned paths). It is **NOT a Step-0 gap.** Correctly handed off to I-15B-1 Step-2. ✓

---

## Required statements (a–g)

- **(a) Lockfile delta three-way-scoped (one edge, zero churn):** **YES.** BEFORE→AFTER = exactly one hunk populating the existing `packages/presets/nest-react-rn:` block with one `'@vibe-engineer/preset-typescript': specifier: workspace:* version: link:../typescript` edge (1 removed / 5 added, net +4). AFTER==NOW (no further mutation). Importer-header SET identical. Single-version invariant (no versioned snapshot). Zero unrelated importer/version churn. (F1)
- **(b) W-RESOLVE-TS-PRESET real from preset context:** **YES.** `PRESET_OK function function function function`, exit 0, from `cwd=packages/presets/nest-react-rn` — the exact probe that returned `ERR_MODULE_NOT_FOUND` pre-handoff; public surface functions actually loaded. (F2)
- **(c) Compile exit 0:** **YES.** `tsc --noEmit -p packages/presets/nest-react-rn/tsconfig.json` → exit 0; the two `TS2307` errors gone; zero other errors. (F3)
- **(d) No sibling breakage:** **YES.** `pnpm install --frozen-lockfile` exit 0 (20 projects consistent) + I-07D `run-typescript-preset-witness.mjs` exit 0 (12 files/33 negatives) + self-ref control GREEN. (F5)
- **(e) Manifest untouched by Step-0:** **YES.** `workspace:*` intact; the `M` diff is the pre-existing in-license skeleton→implemented transformation; no field pnpm would add. (F6)
- **(f) Dirty-tree scope clean:** **YES.** Step-0's only on-disk product footprint is `pnpm-lock.yaml` (scoped edge); the `node_modules` link is gitignored; no `.git` ops (stash empty, HEAD stable). (F7)
- **(g) B3 advisory correctly scoped to Step-2:** **YES.** Reproduced; root cause is an out-of-context compile/import in the I-15B-1-owned runtime runner; the keystone resolution is GREEN from the correct context, so B3 is NOT a Step-0 defect and NOT a Step-0 gap. Correctly handed off to Step-2. (F8)

## Severity gate assessment

**clean / Step-0 truth-green.** Every mandatory checkpoint passes with independent, real-boundary evidence:
- (a) lockfile delta three-way-scoped (one edge, zero churn) — F1 ✓
- (b) keystone W-RESOLVE-TS-PRESET real from preset-package context (truth-green, not shape-only) — F2 ✓
- (c) W-PRESET-CONTRACT compile exit 0 — F3 ✓
- (d) declared-workspace resolution, not hoist; root-context negative; hoist-neg preserved — F4 ✓
- (e) no sibling breakage (frozen-lockfile exit 0 + I-07D sibling + self-ref) — F5 ✓
- (f) manifest untouched by Step-0 (`workspace:*` intact) — F6 ✓
- (g) dirty-tree scope clean; no `.git` ops — F7 ✓
- B3 advisory correctly scoped to Step-2 (out-of-context runner design, not a Step-0 gap) — F8 ✓

The `ERR_MODULE_NOT_FOUND` blocker on the load-bearing typed producer→consumer seam (`nest-react-rn preset → @vibe-engineer/preset-typescript`) — the **hard precondition for I-15B-1's compile + runtime gauntlet** — is **resolved** on real evidence. **Step-0 is truth-green → I-15B-1 may resume Step-2.** The one non-green item (the I-15B-1-owned runtime runner's B3 out-of-context failure) is correctly deferred to Step-2 (I-15B-1's owned paths; not a resolution failure; not fixable by lockfile-only Step-0).

## Exact next action

1. **Step-0 REVALIDATION = PASS** — the scoped `pnpm-lock.yaml` nest-react-rn-importer surface is green and stable; no fix required. **MARK I-15B-1 LOCKFILE-RECONCILE Step-0 TRUTH-GREEN.**
2. **Launch I-15B-1 Step-2** (resume the implementer on its owned paths): keystone W-RESOLVE-TS-PRESET + W-PRESET-CONTRACT (compile) are now GREEN → run the full I-15B-1 gauntlet. **First fix the owned witness runner B3** so the compiled preset machinery runs from within the preset-package resolution context (the current out-of-context compile to `.vibe/work/.../compiled/` breaks the bare-specifier `node_modules` walk); then W-PRESET-CONTRACT (runtime render/validate/layout/negative gauntlet) runs green. Re-confirm Phase-A structural witnesses + all preset-side W-NEG-* (incl. W-NEG-PRIVATE-SCOPED-IMPORT — both import sites use the PUBLIC bare specifier, satisfied at source). **Do NOT mark I-15B-1 truth-green until W-PRESET-CONTRACT (compile + runtime) pass with real post-link evidence.**
3. **I-15B-1 closes → I-15B-2 may proceed** (serialized precondition met). Handoff caveat: if I-15B-2 needs a real (non-template-local) harness-workspace resolution of the preset, it hits the same serialized lockfile seam → STOP BLOCKED and route via the same `LOCKFILE-RECONCILE` ruling class.

## Files touched (this agent — owned WRITE only)
- `.vibe/work/I-15B-1-preset-package/I-15B-1-step0-revalidation-artifact.md` (this file).
- `.vibe/work/I-15B-1-preset-package/step0-revalidation-evidence/revalidation-witnesses.log` (consolidated witness log).

No product edits; no finisher-report/prior-evidence/prompt/brief/ledger/status/handoff edits. No `.git**` ops; no mutating git/package-manager ops. Read-only witnesses only (`node import` probes; `git diff/status/show`; `diff`/`grep`/`wc`; `npx tsc --noEmit`; one read-only `pnpm install --frozen-lockfile` no-op).

*Independent adversarial revalidation — read-only on both repos; only this artifact + `step0-revalidation-evidence/**` written.*
