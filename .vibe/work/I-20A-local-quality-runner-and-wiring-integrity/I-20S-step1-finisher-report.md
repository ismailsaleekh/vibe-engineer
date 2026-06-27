# I-20S Step-1 FINISHER report (EXTEND-I-20S amendment: root workspace dep)

- **Agent:** Triad-B FINISHER (Step 1), glm-5.2 via zai, thinking: high.
- **Binding direction:** `EXTEND-I-20S` ruling (`reports/I-20A-blocker-adjudication-ruling.md` §6.2 + §8 Step 1) + PASS validation artifact + I-20S base brief.
- **Scope (single scoped op):** add `"@vibe-engineer/mechanical-gates": "workspace:*"` to ROOT `package.json` `devDependencies` + reconcile `pnpm-lock.yaml`. NO other root manifest field changes.
- **Quality bar:** prepended verbatim, binding. PERFECT solution only. No band-aids.

## Owned WRITE paths (this finisher)
- `/Users/lizavasilyeva/work/vibe-engineer/package.json` (the single devDeps line)
- `/Users/lizavasilyeva/work/vibe-engineer/pnpm-lock.yaml` (scoped reconciliation)
- `.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/step1-evidence/**`
- this report.

## Stage log
- [x] S0 — report artifact created (checkpointing).
- [x] S1 — binding docs read + baseline confirmed (see S1 below).
- [x] S2 — Step-1 edit applied (root devDeps line).
- [x] S3 — lockfile reconciled (`pnpm install`, exit 0).
- [x] S4 — witnesses run, all GREEN.
- [x] S5 — final verdict: **DONE**.

## S1 — baseline (before edit) [IN PROGRESS]

Confirmed on-disk against the ruling/validation:
- Root `package.json` `devDependencies`: `@eslint/js`, `eslint`, `prettier`, `turbo`, `typescript`, `typescript-eslint`. **No `@vibe-engineer/*`.** (matches ruling §1)
- Existing root `package.json` diff = I-20S scripts-only `quality` entry (matches F2). pnpm-workspace.yaml diff = `infra/pulumi` (Pulumi Model 1, I-20S). Both pre-existing, not mine.
- `.npmrc`: `shamefully-hoist=false`, `link-workspace-packages=true`, `shared-workspace-lockfile=true`, `save-exact=true`. (matches)
- `node_modules/@vibe-engineer/` at repo root: **ABSENT**.
- Probe A (root resolution): **ROOT_RESOLVE_FAIL: ERR_MODULE_NOT_FOUND** (reproduced). ✓ blocker confirmed.
- Probe B (in-package, cwd=`packages/mechanical-gates`): **PKG_RESOLVE_OK keys: 5, has runP2Aggregate: true** (reproduced). ✓ public export healthy.
- `packages/mechanical-gates/package.json` exports `./aggregate` → `types ./src/aggregate/index.d.ts`, `import ./src/aggregate/index.js`. `private:true`, `version:0.0.0`, workspace member (`packages/*`). ✓
- lockfile root `.` importer devDependencies block: no `@vibe-engineer/mechanical-gates`. pnpm 10.33.0 available; node v24.16.0.

Baseline matches ruling exactly. Proceeding to S2.

## S2 — Step-1 edit applied
Edit: root `package.json` `devDependencies`, added `"@vibe-engineer/mechanical-gates": "workspace:*"` (alphabetical, after `@eslint/js`). JSON validated (valid; 7 devDeps keys). `git diff package.json` shows ONLY this line (plus the pre-existing I-20S `quality` script, which is baseline — NOT my edit). No scripts/engines/exports/overrides/other field touched. I-20S scripts-only constraint preserved for all else (override-note honored).

## S3 — lockfile reconciled (scoped)
Snapshot taken (BEFORE) at `step1-evidence/pnpm-lock.BEFORE.yaml` to isolate my churn (the tree is dirty with pre-existing I-20S Pulumi churn — not mine).
Command: `pnpm install` (full log at `step1-evidence/pnpm-install.log`). **Exit code 0.**
Output salient: `+ @vibe-engineer/mechanical-gates 0.0.0 <- packages/mechanical-gates` (workspace link added); `Done in 668ms using pnpm v10.33.0`.

## S4 — witnesses (REAL-boundary, all GREEN)

**W-RESOLVE-ROOT (the marquee seam — the exact probe that FAILED in ruling §1):**
`node --input-type=module -e 'import("@vibe-engineer/mechanical-gates/aggregate");...'` from cwd=repo root → **`ROOT_RESOLVE_OK 5 has runP2Aggregate: true`**, exit 0. **BLOCKER RESOLVED.** ✓

**W-SYMLINK:** `node_modules/@vibe-engineer/mechanical-gates` present as symlink → `../../packages/mechanical-gates` (pnpm `link-workspace-packages=true` mechanism). ✓

**W-DECLARED-LOCKED (mechanical §7):** lockfile root `.` importer devDeps now records:
```yaml
      '@vibe-engineer/mechanical-gates':
        specifier: workspace:*
        version: link:packages/mechanical-gates
```
Declared `workspace:*` + locked workspace link. Pinned local package (private, v0.0.0), no registry fetch, no version negotiation. ✓

**W-NEG-UNRELATED-CHURN:** `diff BEFORE.yaml AFTER.yaml` = **exactly 3 lines added** to the root `.` importer devDeps block (the mechanical-gates link above). ZERO other importer churn; no version re-resolution; no `.npmrc`/tsconfig/turbo/scripts/aggregate-source edits from my op. (The full `git diff --stat pnpm-lock.yaml` ~1648 lines is pre-existing I-20S Pulumi churn — baseline dirty tree, NOT my op; isolated via the BEFORE snapshot.) ✓

**Sibling / blast-radius (no green lane broke):**
- `packages/cli` resolves `@vibe-engineer/artifacts` + `@vibe-engineer/verification` → OK (per-package cwd).
- `packages/verification` resolves `@vibe-engineer/artifacts` → OK.
- `packages/mechanical-gates` self-resolves `@vibe-engineer/mechanical-gates/aggregate` → OK (5 keys).
- `pnpm run workspace:graph` (existing I-00A witness) → exit 0 (workspace graph validates with new root importer devDep).
- Root does NOT spuriously resolve undeclared `@pulumi/pulumi` (Pulumi hoist-neg still holds; `shamefully-hoist=false` honored) → `ERR_MODULE_NOT_FOUND` at root. ✓

## S5 — dirty-tree scope (owned WRITE paths only)
**My op touched ONLY:**
- `package.json` — 1 devDep line (`@vibe-engineer/mechanical-gates: workspace:*`).
- `pnpm-lock.yaml` — 3 scoped lines (root `.` importer link).
- `.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/{I-20S-step1-finisher-report.md, step1-evidence/**}` — this report + evidence.

**No out-of-license edits:** `turbo.json`/`pnpm-workspace.yaml` diffs present are PRE-EXISTING I-20S Pulumi baseline (my op did NOT touch them); `.npmrc`/`tsconfig.base.json`/`eslint.config.mjs` = 0 diff. No `.github/**`, no `scripts/**`, no `packages/**` source, no `infra/**`, no git ops (no stash/reset/clean/checkout/restore).

## Severity classification
**clean.** Marquee seam W-RESOLVE-ROOT turned FAIL→GREEN; declared+locked workspace link via pnpm mechanism (no hoist/band-aid); lockfile delta perfectly scoped (3 lines, isolated via BEFORE snapshot); siblings unaffected; I-20S scripts-only preserved for all else; dirty-tree-safe. Revalidation-ready (independent Triad-A).
