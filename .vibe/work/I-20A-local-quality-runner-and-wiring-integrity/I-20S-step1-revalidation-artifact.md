# I-20S Step-1 REVALIDATION Artifact (Triad-B adversarial)

- **Revalidator:** independent adversarial REVALIDATOR (glm-5.2 via zai, thinking xhigh).
- **Mode:** read-only on both repos (no product edits, no mutating git/pkg-manager ops). Write ONLY this artifact + own evidence tree.
- **Quality bar:** `prompts/quality-bar.md` prepended verbatim, binding. Implementer `DONE` ≠ validator `PASS`. Shape-green ≠ truth-green.
- **Target under revalidation:** `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/I-20S-step1-finisher-report.md`
- **Scope of the op under test:** Step-1 of EXTEND-I-20S ruling — add `"@vibe-engineer/mechanical-gates": "workspace:*"` to root `package.json` `devDependencies` + reconcile `pnpm-lock.yaml`. NOTHING ELSE (I-00A field-override scoped to this single atomic op; I-20S scripts-only holds for all else).

## Verdict

**`PASS`** — Step-1 is **truth-green**. The marquee seam W-RESOLVE-ROOT is real and reproducible (ERR_MODULE_NOT_FOUND → `ROOT_RESOLVE_OK 5`); resolution is via the **declared+locked workspace dep** (symlink + `shamefully-hoist=false`, NOT a hoist); the lockfile delta is **perfectly scoped to 3 additive lines** in the root `.` importer (decomposed independently against the committed `HEAD` baseline, not on the finisher's word); no green lane broke (frozen-lockfile exit 0 across all 20 projects + sibling probes GREEN); dirty-tree footprint is exactly package.json (1 line) + pnpm-lock.yaml (3 lines) + the I-20A work root. **Severity: clean. I-20A may resume.**

## Independent witnesses (all reproduced by THIS revalidator)

Evidence log: `step1-revalidation-evidence/revalidation-witnesses.log` (+ `pnpm-lock.BASE-HEAD.yaml`, `base-to-before.diff`).

### F1 — devDep is the ONLY root-manifest change attributable to this op — CONFIRMED (clean)
Witness: `git --no-pager diff -- package.json` (vs committed HEAD). The diff adds **exactly two** lines:
```
+    "quality": "node scripts/quality/run-quality.mjs",
+    "@vibe-engineer/mechanical-gates": "workspace:*",
```
- The `"quality"` script line is the **I-20S baseline** (scripts-only), independently corroborated by the ruling's validation artifact F2 (which recorded — *before* Step-1 — that `git diff package.json` showed *only* the `quality` script). It is therefore **NOT a new change from this finisher.**
- The `@vibe-engineer/mechanical-gates` devDep line is the **only** NEW change from this op, correctly placed alphabetically under `devDependencies`.
- **No other field touched:** no `scripts` (beyond baseline), no `engines`/`packageManager`/`exports`/`overrides`/`dependencies`/other-deps change. I-20S scripts-only constraint honored for all else; override-note scoped to this single dep. ✓

### F2 — W-RESOLVE-ROOT real + reproducible — CONFIRMED (clean; marquee seam GREEN)
Witness (run from cwd=repo root):
```
node -e "import('@vibe-engineer/mechanical-gates/aggregate').then(m=>console.log('ROOT_RESOLVE_OK', Object.keys(m).length, ...))"
→ ROOT_RESOLVE_OK 5 keys= P1AggregateFamily,P2AggregateFamily,runP0Aggregate,runP1Aggregate,runP2Aggregate   exit=0
```
This is the **exact probe that FAILED (`ERR_MODULE_NOT_FOUND`) in ruling §1** before this op. It now resolves to the real aggregate. **BLOCKER RESOLVED.** ✓

### F3 — resolution via declared workspace dep, NOT a hoist — CONFIRMED (clean)
- `.npmrc`: `shamefully-hoist=false` (unchanged). No `public-hoist-pattern`.
- `node_modules/@vibe-engineer/mechanical-gates` → **symlink** `../../packages/mechanical-gates` (pnpm `link-workspace-packages=true` mechanism — the declared-dep model, identical to `packages/cli`/`packages/verification` precedent).
- Lockfile root `.` importer records the **declared+locked workspace link**: `specifier: workspace:*`, `version: link:packages/mechanical-gates` (no registry fetch, no version negotiation — the private v0.0.0 local member).
- **Root Pulumi hoist-neg still holds:** root does NOT spuriously resolve `@pulumi/pulumi` → `ROOT_PULUMI_FAIL_OK Cannot find package '@pulumi/pulumi'`. `shamefully-hoist=false` honored; this op introduced a *declared* link, not a hoist. ✓

### F4 — lockfile delta SCOPED (critical) — CONFIRMED (clean)
Independently decomposed the dirty-tree churn via a **three-way comparison** using the true committed baseline (`git show HEAD:pnpm-lock.yaml`, a read-only git witness), so scope is proven WITHOUT relying on the finisher's word:

| comparison | delta | attribution |
| --- | --- | --- |
| **BEFORE → NOW** (this op) | **3 added lines, 0 removed** | **THIS op** (mechanical-gates root importer link) |
| BASE(HEAD) → BEFORE | 3 removed / 1638 added | **pre-existing** I-20S Pulumi Model-1 churn (NOT this op) |

**The finisher's BEFORE→NOW delta is exactly:**
```
13a14,16
>       '@vibe-engineer/mechanical-gates':
>         specifier: workspace:*
>         version: link:packages/mechanical-gates
```
(3 additive lines under the root `.` importer `devDependencies` block; **0 removals; no other importer changed; no version re-resolution.**)

**BEFORE-snapshot honesty proven independently:**
- BEFORE already contains the pre-existing Pulumi churn (`infra/pulumi` at line 30; 4 pulumi refs) → Pulumi churn is NOT this op.
- BEFORE contains `mechanical-gates` **only** at `packages/mechanical-gates: {}` (the package's own self-entry) — it **lacks** the root importer devDep.
- BASE(HEAD)→BEFORE touches **0** mechanical-gates lines.

Current lockfile: only **3** total `mechanical-gates` lines — the root importer key+link (2) + the unchanged self-entry `packages/mechanical-gates: {}` at line 110 (shifted from 107 by this op's 3-line insert). No new `packages:` resolution entry was needed (self-entry pre-existed). **The finisher's "3 lines" claim is exactly correct.** ✓

### F5 — no green lane broke (sibling/blast-radius) — CONFIRMED (clean)
- **`pnpm install --frozen-lockfile` → exit 0** ("Lockfile is up to date, resolution step is skipped. Already up to date." — all 20 workspace projects consistent). Lockfile↔manifest integrity holds.
- Sibling/green-lane resolution probes (per-package cwd, real PUBLIC imports):
  - `packages/mechanical-gates` self → `MG_SELF_OK 5` (exit 0)
  - `packages/verification` → `@vibe-engineer/artifacts` → `VERIF->ARTIFACTS_OK` (exit 0)
  - `packages/cli` → `@vibe-engineer/verification` → `CLI->VERIF_OK` (exit 0)
- No external consumer of `@vibe-engineer/mechanical-gates` existed before (sibling sweep clean per ruling §5); this op created the first external importer additively → cannot have broken a prior consumer. ✓

### F6 — dirty-tree scope clean — CONFIRMED (clean)
This op's footprint is exactly:
- `package.json` — 1 devDep line (F1).
- `pnpm-lock.yaml` — 3 scoped lines (F4).
- `.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/{I-20S-step1-finisher-report.md, step1-evidence/**}` — finisher's report + evidence; `step1-revalidation-evidence/**` + this artifact — this revalidator.

All other dirty-tree entries are **pre-existing, attributable to other orchestrators**, NOT this op:
- `pnpm-workspace.yaml` diff = **only** `+ - 'infra/pulumi'` (I-20S Pulumi Model-1 baseline — confirmed in validation F2; this op does not touch it).
- `turbo.json` = 8 insertions (pre-existing I-20S Pulumi/CI wiring — this op adds no turbo task).
- `.npmrc`, `tsconfig.base.json`, `eslint.config.mjs` = **0 diff**.
- Remaining dirty entries (`packages/**` source, other `.vibe/work/**`) = pre-existing I-13C / I-12 / I-10C-AGG / DL-18P lanes — disjoint from this op's root-manifest+lockfile surface.
- **No `.git/**` ops; no stash/reset/clean/checkout/restore; no broad `pnpm update`.** ✓

### F7 — `./aggregate` resolves to a HEALTHY entry — CONFIRMED (clean)
W-RESOLVE-ROOT returns the full registered set `{p0,p1,p2}`: keys `P1AggregateFamily, P2AggregateFamily, runP0Aggregate, runP1Aggregate, runP2Aggregate` (5 keys, incl. `runP2Aggregate`). The public consumption model this dep enables is sound; the real aggregate is reachable from repo-root via the PUBLIC bare specifier. ✓

## Severity gate assessment

**clean / Step-1 truth-green.** Every mandatory checkpoint passes with independent, real-boundary evidence: (a) single devDep line only; (b) W-RESOLVE-ROOT real (the exact previously-failing probe); (c) declared-workspace resolution, not a hoist; (d) lockfile delta scoped to 3 additive lines (decomposed against committed HEAD, finisher's BEFORE snapshot proven honest); (e) no sibling breakage (frozen-lockfile exit 0 + sibling probes GREEN); (f) dirty-tree scope limited to owned paths; (g) `./aggregate` healthy with `{p0,p1,p2}` registered.

The `ERR_MODULE_NOT_FOUND` blocker on the repo-root public-import seam — the **hard precondition for I-20A** (and downstream I-20B/I-20D/I-20-COMPLETE) — is **resolved**. **Step-1 is truth-green → I-20A may resume** with the re-framed witness matrix (W-RUN, W-POS-{p0,p1,p2}, W-FC-NEG phantom-family, W-FC-POS now achievable via landed I-13C, N1–N8, R1–R2).

## Exact next action

1. **Step-1 REVALIDATION = PASS** — root manifest + lockfile surface is green and stable; no fix required.
2. **Launch I-20A Step-2** (resume the blocked implementer) to build the repo-root quality runner + fail-closed wiring-integrity gate under `scripts/quality/**` + `scripts/ci/quality/**`, now that `@vibe-engineer/mechanical-gates/aggregate` resolves from repo-root via the declared+locked workspace dep. Apply the re-framed witness matrix per ruling §8 Step 2.

*Independent adversarial revalidation — read-only on both repos; only this artifact + `step1-revalidation-evidence/**` written. No product edits, no git/pkg-manager mutations.*
