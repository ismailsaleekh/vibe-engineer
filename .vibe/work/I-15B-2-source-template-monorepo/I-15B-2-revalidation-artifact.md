# I-15B-2 REVALIDATION ARTIFACT (Triad-B adversarial revalidator)

- **Agent:** independent adversarial REVALIDATOR (glm-5.2 via zai, thinking xhigh).
- **Task:** independently verify the I-15B-2 DL-16 `.source-template/**` materialization (80 files: 29 preset-derived verbatim + 51 source skeleton). Shape-green is not truth-green; implementer DONE is never validator PASS.
- **Quality bar:** prepended verbatim, binding. Blocked = analyze, never improvise. No edits except this artifact + my evidence tree; no git/package-manager ops.
- **VERDICT: `PASS`** — I-15B-2 is **truth-green**; unblocks serialized dependent I-15B-3.

## Target paths (under revalidation)
- Materializer/witness runner: `.vibe/work/I-15B-2-source-template-monorepo/materialize-source-template.mjs`
- Impl report (claims treated unverified until confirmed): `I-15B-2-implementer-report.md`
- On-disk product: `examples/starter-reference/.source-template/**` (80 files)
- Ground truth: `…/implementation-briefs/I-15B-brief-generated.md` §3 (I-15B-2 row), §6, §7, §9; `docs/decisions/DL-16-starter-architecture.md`; I-15B-1 revalidation (PASS).

## Stage log
- [x] S0 artifact scaffold created FIRST.
- [x] S1 on-disk `.source-template/**` snapshot captured (80 files, pre-run) → `revalidation-evidence/ondisk-prerun-sha256.txt`.
- [x] S2 ran the witness runner MYSELF → exit 0, 13/13 PASS; captured pre↔post on-disk for idempotency.
- [x] S3 independent preset render + byte-compare 29 preset-declared paths vs ON-DISK files (`byte-match-probe.mjs`).
- [x] S4 independent ON-DISK DL-16 fidelity sweep (`ondisk-fidelity-sweep.mjs`): scope/private, per-package boundary rules (real preset typed `forbiddenImports`), harness-config defaults, golden module.
- [x] S5 W-NEG-OVER-INFERENCE non-vacuous probe (inject forbidden term → fail-closed) + on-disk clean scan.
- [x] S6 W-NEG-PRIVATE-SCOPED-IMPORT / no-copied-logic on-disk scan (folded into S4).
- [x] S7 harness-import seam honestly deferred to I-15B-3 (W-HARNESS-IMPORT absent from 13 checks; I-15B-3 path absent on disk).
- [x] S8 sibling no-regression (I-15B-1, I-07D) independent re-run.
- [x] S9 dirty-tree scope clean (2 `??` owned subtrees; materializer runs no pnpm/lockfile).
- [x] S10 NODE-CHECK honesty spot-check (37 entries; .tsx advisory verified).
- [x] S11 verdict + gate assessment.

---

## Findings (numbered; severity + exact evidence)

### F1 — 13-witness matrix reproduces REAL-BOUNDARY (exit 0, 13/13). **CLEAN.**
`node .vibe/work/I-15B-2-source-template-monorepo/materialize-source-template.mjs` → **exit 0**, `ok:true`, 13/13 checks PASS. Evidence: `revalidation-evidence/` snapshots + the runner's own `evidence/source-template-witness-result.json`.
- The preset render is REAL-BOUNDARY: in-context self-reference spawn (`cwd=presetRoot`); the public bare specifier `@vibe-engineer/preset-nest-react-rn` resolves via the real `node_modules/@vibe-engineer/preset-typescript` link (load success itself proves the seam). Independently confirmed `presetId=vibe-engineer.nest-react-rn.starter`, `consumedTypescriptPresetId=vibe-engineer.typescript.strict`, `scope=@vibe-engineer-starter`.
- Check names (13): W-TEMPLATE-CONSUMES-PRESET, PRESET-SELF-VALIDATION, DL16-APP-PACKAGE-DIRS-PRESENT, DL16-SCOPE-AND-PRIVATE, DL16-HARNESS-CONFIG-DEFAULTS, DL16-PER-PACKAGE-BOUNDARY-RULES, W-NEG-OVER-INFERENCE, DL16-SINGLE-GOLDEN-MODULE-LABELED, W-NEG-PRIVATE-SCOPED-IMPORT-AND-COPIED-LOGIC, NODE-CHECK-PROBE, W-REG-REGEN, SIBLING-NO-REGRESSION:I-15B-1, SIBLING-NO-REGRESSION:I-07D.

### F2 — W-TEMPLATE-CONSUMES-PRESET 29/29 byte-match REAL (not circular/false-green). **CLEAN.** (decisive)
The runner's consume-check compares in-memory sha256s (`written[].sha256` vs `sha256(f.content)`), which is circular w.r.t. its own write — it does NOT re-read on-disk. So I rendered the preset MYSELF and byte-compared each of the 29 preset-declared paths against the ACTUAL ON-DISK `.source-template/<path>` files.
- `node revalidation-evidence/byte-match-probe.mjs` → **29/29 byte-identical on-disk**, exit 0. Evidence: `revalidation-evidence/byte-match-probe-output.txt`.
- Proves the 29 config files are DERIVED from the live preset render, not hand-written lookalikes.

### F3 — DL-16 fidelity + per-package boundary rules correctly encoded (ON-DISK, typed contract). **CLEAN.**
`node revalidation-evidence/ondisk-fidelity-sweep.mjs` (scans all 80 ON-DISK files; uses the REAL preset manifest's typed `forbiddenImports`, re-rendered, + DL-16 app import-direction rules) → **0 findings**, exit 0. Evidence: `revalidation-evidence/ondisk-fidelity-sweep-output.txt`.
- (1) 10/10 manifests `@vibe-engineer-starter/*` + `private:true`.
- (2) 0 boundary violations across 6 package + 3 app rules. Boundary rules are a **TYPED CONTRACT** (the preset's `STARTER_PACKAGES[].forbiddenImports`) — proven by re-rendering the preset and reading its typed forbidden-imports list (not a heuristic/regex invented by the template).
- (3) harness-config defaults confirmed ON-DISK: `vibe-engineer.config.json` → `agenticHarness:"pi"`, DL-16 architecture decision, appNames=[api,web,mobile], 6 packageNames, goldenModule=golden-records, scope=@vibe-engineer-starter; `.vibe/generated/.../manifest.json` layout block → no-auth, "PostgreSQL + Prisma", "ts-rest + named Zod schemas", golden-records, agenticHarness=pi.
- (4) single golden module `apps/api/src/golden-records/sample.ts` present + labeled sample/demo/reference.
- DL-16 layout complete: apps/{api,web,mobile}, packages/{domain,contracts,api-client,config,testing,ui}, .vibe/{context,work,evidence,registry,generated}, .tooling/{scripts,dev-services,ci,generated}, docs/reference. No layout infidelity.

### F4 — W-NEG-OVER-INFERENCE non-vacuous fail-closed. **CLEAN.** (decisive)
- **Over-inference non-vacuous:** ran a modified materializer copy (`materializer-injected.mjs`, writes redirected to a TEMP path under my evidence tree → real product untouched) with the forbidden term **`checkout`** injected into the CORE file `apps/api/src/health/health.controller.ts` → **W-NEG-OVER-INFERENCE FAILED** with `{path:"apps/api/src/health/health.controller.ts", term:"checkout"}`, witness **exit 1**. Evidence: `revalidation-evidence/materializer-injected-output.txt` + `_injected-work/evidence/source-template-witness-result.json`.
- **Boundary non-vacuous (bonus):** injecting `@prisma/client` into `packages/domain/src/.../golden-record.ts` (a golden-records sample path, so over-inference correctly skips it) → **DL16-PER-PACKAGE-BOUNDARY-RULES FAILED** with `{rule:"domain", specifier:"@prisma/client", forbidden:"@prisma/client"}`, exit 1. Proves the typed boundary contract fail-closes.
- **Real product untouched:** post-injection on-disk snapshot == pre-run snapshot (80 files identical). Real core files clean (grep confirmed).
- The matcher uses `\b${term}\b`/i over the real DL-16 forbidden term list (ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout, product, customer, order, cart, payment, social-feed); on-disk core scan = 0 hits.

### F5 — Idempotent regen (ON-DISK, stronger than runner's in-memory check). **CLEAN.**
Captured pre-run on-disk sha256 of all 80 files → ran the witness (which `rm`s + re-materializes) → captured post-run → **pre == post byte-identical** (80/80). Evidence: `ondisk-prerun-sha256.txt` vs `ondisk-postrun-sha256.txt` (diff empty). The runner's internal regen compares in-memory hashes; this on-disk comparison is the stronger deterministic proof (two full disk writes → identical tree).

### F6 — Harness-import seam honestly deferred to I-15B-3 (NOT faked). **CLEAN.** (critical-severity gate)
- The 13 checks do **NOT** include W-HARNESS-IMPORT: `has W-HARNESS-IMPORT? false`. I-15B-2 makes NO claim of the load-bearing `vibe-engineer` resolve+import seam.
- The I-15B-3-owned path `examples/starter-reference/generated-fixtures/harness-consumption/**` is **ABSENT** on disk (not prematurely created / not faked). `generated-fixtures/` contains only create-ux/selected-harness/security (I-15A/I-18-owned).
- The report + handoff notes explicitly defer the seam to I-15B-3 with the resolution-strategy pre-routing (in-context self-reference first; STOP-BLOCKED if `vibe-engineer` can't resolve honestly). No shape-only/copy stand-in.

### F7 — No sibling break (blast radius). **CLEAN.**
- I-15B-1 preset witness (re-run independently, read-only): **exit 0**, `ok:true`, 11 negatives, renderFileCount=29.
- I-07D typescript preset witness (re-run independently): **exit 0**, `ok:true`, generatedFileCount=12, negativeCount=33.
- cli/other lanes disjoint from I-15B-2's write set.

### F8 — NODE-CHECK probe honest. **CLEAN.**
25 `.ts` + 10 `.tsx` + 2 `.mjs` = **37 source-type files** (matches the report's "37 entries checked"). `.ts`/`.mjs` pass `node --check` (spot-checked `packages/domain/src/.../golden-record.ts`, `apps/api/src/main.ts` → exit 0). The 10 `.tsx` hit `ERR_UNKNOWN_FILE_EXTENSION` — the honest JSX limitation (app build via vite/metro owned by I-16/I-17, pending-live, recorded advisory, NOT gated, NOT a hidden template defect).

### F9 — Dirty-tree / scope clean. **CLEAN.**
- `git status --porcelain -- examples/starter-reference/.source-template/ .vibe/work/I-15B-2-source-template-monorepo/` → **exactly 2 `??` entries** (the two owned greenfield subtrees). No `M`/`D` of any file.
- The materializer only spawns `node` (3 `spawnSync`: preset render, `node --check`, sibling witnesses) + fs `rm`/`mkdir`/`writeFile`/`readFile` on owned paths. **NO `pnpm`/`npm`/install/lockfile-mutating call** (grep confirmed — only comment text mentions "no lockfile touch").
- `.source-template` is **NOT** a pnpm workspace member (`pnpm-workspace.yaml` = `packages/*`, `packages/presets/*`, `packages/adapters/*`, `infra/pulumi`) → graph-neutral: materialization adds **zero** lockfile edges.
- The I-15B-3 harness-consumption path is ABSENT (not prematurely created).
- Root `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml`/`turbo.json` diffs (`package.json` +3: `quality` script, mechanical-gates, js-yaml; lockfile +1663) are the pre-existing multi-orchestrator baseline (I-20A quality script + mechanical-gates + js-yaml; I-15A adapter-pi/context; I-15B-1 `nest-react-rn` preset edge = 1 `link:` edge) — none reference I-15B-2 surfaces. Consistent with the I-15B-1 revalidation's three-way baseline isolation. No `.git**` ops; no stash/reset/clean/checkout/restore.

---

## Required explicit confirmations
- **(a) 13 witnesses reproduce real-boundary:** YES (F1). exit 0; real preset render (self-reference spawn), real on-disk template, real sibling witnesses; presetId/consumedTypescriptPresetId confirmed.
- **(b) W-TEMPLATE-CONSUMES-PRESET 29/29 byte-match real:** YES (F2). Independently rendered the preset and byte-compared all 29 paths against ACTUAL on-disk files → 29/29 identical. (Overrides the runner's circular in-memory check.)
- **(c) DL-16 fidelity + boundary rules:** YES (F3). On-disk sweep 0 findings; layout complete; harness-config defaults faithful; boundary rules = real preset typed `forbiddenImports` contract.
- **(d) W-NEG-OVER-INFERENCE non-vacuous fail-closed:** YES (F4). Injected `checkout` → check FAILED, exit 1; boundary injection also fail-closed; real product untouched; on-disk clean.
- **(e) Idempotent regen:** YES (F5). On-disk pre == post (80/80) across a full re-materialize.
- **(f) Harness-import seam honestly deferred to I-15B-3 (not faked):** YES (F6). W-HARNESS-IMPORT absent from 13 checks; I-15B-3 path absent on disk; explicit deferral, no shape-only stand-in.
- **(g) No sibling break:** YES (F7). I-15B-1 exit 0 (11 neg/29 files); I-07D exit 0 (33 neg/12 files); disjoint surfaces.
- **(h) Dirty-tree scope clean:** YES (F9). Exactly 2 `??` owned subtrees; no M/D; materializer runs no pnpm/lockfile; `.source-template` not a workspace member (graph-neutral); root diffs = baseline.

## Recorded observations (NON-BLOCKING — minor-local; no gate weakened)
- **Obs-1 (witness on-disk-blindness, robustness suggestion):** the runner's consume-match / boundary / over-inference checks read IN-MEMORY content (`getContentForPath`), not re-read on-disk files. A tampered on-disk file would NOT be caught by re-running the witness (it re-materializes from scratch from the preset render + the static `SUPPLEMENTARY_FILES` constant). HOWEVER this does NOT weaken any gate here, because: (i) F2 independently proves the 29 preset files byte-match on-disk; (ii) the 51 supplementary files are static constants and F3 swept all 80 on-disk files independently (0 violations); (iii) F5 proves on-disk == in-memory (idempotent). F4's injection test closes the shape-green-vs-truth-green concern for the matcher (it genuinely fail-closes). A future hardening could have the witness re-read on-disk for defense-in-depth, but I-15B-2 truth-green stands as-is.
- **Obs-2 (cosmetic):** the over-inference forbidden-term list (13 terms) correctly includes the DL-16 project-specific negatives (fashion, Billz, Telegram, Instagram). Correct, non-weakening.

## Severity gate assessment
- **critical:** NONE. (No copied harness logic — on-disk sweep 0 markers; no private/internal scoped import — 0 hits; no out-of-license edit — scope = exactly 2 `??` owned subtrees, materializer runs no pnpm/lockfile; **no fake harness-import seam** — honestly deferred to I-15B-3, W-HARNESS-IMPORT absent; no DL-16 layout/scope/name/boundary infidelity — on-disk sweep 0 findings; no domain-specific core defaults — on-disk 0 over-inference hits + non-vacuous matcher proven.)
- **major-local:** NONE.
- **minor-local:** Obs-1 (witness on-disk-blindness — non-blocking, gate not weakened) + Obs-2 (cosmetic). Neither blocks.
- **clean:** YES — gate fully met.

**I-15B-2 truth-green.** The I-15B-2-scoped keystone witnesses (W-TEMPLATE-CONSUMES-PRESET, W-TEMPLATE-DL16-FIDELITY, W-NEG-OVER-INFERENCE, W-REG-REGEN, W-NEG-PRIVATE-SCOPED-IMPORT/COPIED-LOGIC) are all REAL-BOUNDARY green; the load-bearing W-HARNESS-IMPORT seam is correctly NOT claimed by I-15B-2 (I-15B-3-owned); pending-live seams (app build `.tsx`, persistence join, live pi runtime) honestly recorded; dirty-tree scope clean.

## Decision: I-15B-2 truth-green → **UNBLOCKS I-15B-3**
I-15B-3 owns the load-bearing real-boundary seam: `examples/starter-reference/generated-fixtures/harness-consumption/**` must declare a dep on local/packed `vibe-engineer` and actually import its public surface; consume the I-14A adapter manifest + I-07D preset; prove generated config/context placeholders validate (DL-17); W-NEG-COPIED-HARNESS-LOGIC / W-NEG-PRIVATE-SCOPED-IMPORT / W-NEG-MANIFEST-DRIFT / W-NEG-NON-PI-HARNESS fail-closed. The I-15B-2 template's byte-faithful config layer (F2 proven) is the derived-config baseline I-15B-3 may rely on.

## Exact next action
Proceed to I-15B-3 (harness-consumption witness). Per implementer handoff notes + brief §9: attempt the in-context self-reference spawn pattern first to resolve `vibe-engineer`; if it cannot resolve honestly as a local/packed dependency without an unlicensed graph edit → STOP `BLOCKED` (do NOT fake green with a shape-only/copy stand-in). No fix required for I-15B-2.

## Files written by THIS revalidator (owned WRITE only)
- `.vibe/work/I-15B-2-source-template-monorepo/I-15B-2-revalidation-artifact.md` (this artifact).
- `.vibe/work/I-15B-2-source-template-monorepo/revalidation-evidence/**`: `ondisk-prerun-sha256.txt`, `ondisk-postrun-sha256.txt`, `ondisk-postinjection-sha256.txt`, `byte-match-probe.mjs`(+output), `ondisk-fidelity-sweep.mjs`(+output), `materializer-injected.mjs`(+output), `materializer-injected-boundary.mjs`, `_injected-work/evidence/source-template-witness-result.json` (injected-run results).

Zero edits to product source, the impl report, prior evidence trees, prompts/briefs/ledger/status/handoff, or `.git**`. No git/package-manager ops (read-only witnesses + read-only `git status`/`git diff` only). The real `.source-template/**` re-materialization by the witness runner was idempotent (net-zero; pre==post proven).
