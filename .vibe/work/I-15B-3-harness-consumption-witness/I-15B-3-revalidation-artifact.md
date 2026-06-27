# I-15B-3 REVALIDATION ARTIFACT (Triad-B adversarial revalidator)

- **Agent:** independent adversarial REVALIDATOR (glm-5.2 via zai, thinking: xhigh).
- **Task:** independently verify the I-15B-3 harness-consumption witness (proves the starter template genuinely CONSUMES `vibe-engineer` via public API). Shape-green ≠ truth-green; implementer `DONE` is never validator `PASS`.
- **Quality bar:** prepended verbatim, binding. Blocked = analyze, never improvise. No edits except this artifact + my evidence tree; no git/package-manager ops (read-only witnesses + read-only `git status`/`git diff` only).
- **VERDICT: `PASS`** — I-15B-3 is **truth-green**; the keystone W-HARNESS-IMPORT is a GENUINE real-boundary proof (not a false-green). Parent `I-15B` closes (all 3 sub-lanes PASS) → unblocks `I-16A` (and downstream `I-21`).

## Target under revalidation
- Impl report (claims treated unverified until confirmed): `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-15B-3-harness-consumption-witness/I-15B-3-implementer-report.md`
- Witness runner: `examples/starter-reference/generated-fixtures/harness-consumption/run-harness-consumption-witness.mjs`
- On-disk fixture (5 owned files): `package.json`, `src/harness-consumer.mjs`, `run-harness-consumption-witness.mjs`, `negatives/copied-logic/src/bad-consumer.mjs`, `negatives/private-scoped-import/src/bad-consumer.mjs`
- Ground truth: `…/implementation-briefs/I-15B-brief-generated.md` (I-15B-3 scope, §6/§7/§8/§9, the 13 checks, STOP boundary); I-15B-2 revalidation (PASS, the precedent posture).

## Stage log
- [x] S0 artifact scaffold created FIRST.
- [x] S1 read impl report + brief + I-15B-2 truth-green + on-disk fixture (5 owned files — matches impl claims).
- [x] S2 witness runner reproduced MYSELF → **exit 0, 13/13 PASS**. cli package.json = `name:"vibe-engineer"` + `exports{.,./envelope,./command-loader}`. `node_modules/vibe-engineer` ABSENT at repo root + packages/cli (no global hoist). `.pnpm/node_modules/vibe-engineer` → symlink realpath `packages/cli` (IS the real harness, not a shadow). `packages/cli/node_modules/@vibe-engineer/adapter-pi` → symlink realpath `packages/adapters/pi` (real external `workspace:*` link). Repo root name = `@vibe-engineer/workspace` (NOT vibe-engineer).
- [x] S3 **decisive 4-context contrast probe** (W-HARNESS-IMPORT genuine vs false-green) → CLEAN.
- [x] S4 lockfile not silently mutated → CLEAN (fixture name ABSENT from `pnpm-lock.yaml`; graph-neutral).
- [x] S5 negatives non-vacuous (independent detector probe) → CLEAN.
- [x] S6 idempotency (2nd full witness run) → CLEAN.
- [x] S7 sibling no-regression (witness's own sibling reruns + dirty-tree) → CLEAN.
- [x] S8 dirty-tree scope → CLEAN.
- [x] S9 verdict + gate assessment.

---

## Findings (numbered; severity + exact evidence)

### F1 — 13-witness matrix reproduces REAL-BOUNDARY (exit 0, 13/13). **CLEAN.**
`node examples/starter-reference/generated-fixtures/harness-consumption/run-harness-consumption-witness.mjs` → **exit 0**, `=== I-15B-3 harness-consumption witness: PASS (green) (13 checks, 0 failed) ===`.
- 13 checks: W-HARNESS-IMPORT, W-CONSUMER-MANIFEST-CONSISTENCY, W-CONTEXT-PLACEHOLDERS-VALIDATE, W-NEG-COPIED-HARNESS-LOGIC, W-NEG-PRIVATE-SCOPED-IMPORT, FIXTURE-STATIC-CLEAN, W-NEG-NON-PI-HARNESS, W-NEG-MANIFEST-DRIFT, W-REG-REGEN, W-REG-INVARIANTS, SIBLING-NO-REGRESSION:{I-15B-2,I-15B-1,I-07D}. All PASS.
- Evidence files: `evidence/harness-consumption-witness-result.json` (impl-written, owned path) + my `revalidation-evidence/idempotency-run2.json`.

### F2 — THE DECISIVE CHECK: W-HARNESS-IMPORT is a GENUINE real-boundary proof (NOT a false-green). **CLEAN.** (critical-severity gate)
I wrote a 4-context contrast probe (`revalidation-evidence/contrast-probe.mjs`, output `contrast-probe-output.txt`) that runs the IDENTICAL `import("vibe-engineer"{,/envelope,/command-loader})` probe from four cwds:

- **C1 `cwd=packages/cli` (the implementer's claimed context):** ALL 3 subpaths `importOk:true`, loading REAL typed symbols —
  - `vibe-engineer` → `runCli` = **`function`**.
  - `vibe-engineer/envelope` → `createEnvelope`=`function`, `validateCliResultEnvelope`=`function`, `CLI_STATUSES`=`object`.
  - `vibe-engineer/command-loader` → `CommandLoader`=`function`, `createCommandLoader`=`function`.
  - Resolved file paths (via `createRequire().resolve`) all point into the REAL harness source: `…/packages/cli/src/entry/vibe-engineer.js`, `…/packages/cli/src/envelope/result-envelope.js`, `…/packages/cli/src/command-loader/loader.js`. **NOT a `.pnpm` shadow; NOT undefined/stub.**
- **C2 `cwd=<repo root>`:** ALL 3 subpaths → `ERR_MODULE_NOT_FOUND` ("Cannot find package 'vibe-engineer' imported from …/vibe-engineer/[eval1]").
- **C3 `cwd=<neutral tmp dir OUTSIDE the repo>`:** ALL 3 subpaths → `ERR_MODULE_NOT_FOUND`.
- **C4 `cwd=packages/adapters/pi` (sibling workspace pkg, NOT named vibe-engineer, not a declared dep):** ALL 3 subpaths → `ERR_MODULE_NOT_FOUND`.

**Interpretation — rules out every false-green mode:**
- **Not an accidental hoist:** `node_modules/vibe-engineer` is ABSENT at repo root and packages/cli; the only such link is `node_modules/.pnpm/node_modules/vibe-engineer` (a pnpm-internal self-edge, `realpath`=`packages/cli`), which is NOT reachable via bare-specifier resolution from arbitrary cwds. C2/C3/C4 all fail → no global hoist makes `vibe-engineer` resolvable outside packages/cli.
- **Not a wrong-context resolution:** C1's resolved paths are unambiguously `packages/cli/src/**` (the real harness), not a different package.
- **Context-genuine (the contrast):** resolution succeeds ONLY where the package self-identifies as `vibe-engineer` (packages/cli, whose `package.json` name=`vibe-engineer` + has `exports`) — i.e. Node package **self-reference**. Every other context fails. This is a well-defined Node mechanism, not an accident.
- **Real symbols, not shape-only:** all probes return `function`/`object` types (not `undefined`/empty); the consumer's `consumeHarnessPublicSurface()` returns real keys.

**Is self-reference "the package importing itself" a hollow consumption proof?** No — and the contrast probe is exactly what proves it isn't:
- The public surface self-reference loads from C1 is byte-identical to what a real installed starter would load: a real starter with `"vibe-engineer": "workspace:*"` would get `node_modules/vibe-engineer` → symlink to `packages/cli` (exactly like the verified `.pnpm/node_modules/vibe-engineer` → `packages/cli` self-edge) and resolve the SAME `exports` to the SAME files.
- The witness ADDITIONALLY proves genuine **EXTERNAL** `node_modules`-link consumption for the I-14A manifest contract: `@vibe-engineer/adapter-pi/{generated-file-manifest,schema,capabilities}` resolves via the real `workspace:*` symlink at `packages/cli/node_modules/@vibe-engineer/adapter-pi` (`realpath`=`packages/adapters/pi`), loading real functions. So the seam is not self-reference-only.
- This is the IDENTICAL in-context self-reference spawn posture the I-15B-2 revalidator certified REAL-BOUNDARY ("load success itself proves the seam"), and the brief §9 explicitly sanctions it (a real external install would require an out-of-license lockfile edit → STOP BLOCKED; the implementer correctly used the self-reference spawn instead of faking an install or mutating the lockfile).

W-HARNESS-IMPORT is therefore genuine real-boundary, NOT false-green. The impl `DONE` claim holds.

### F3 — No lockfile silently mutated. **CLEAN.** (critical process gate)
- `grep -n -i "harness-consumption\|harness-consumption-fixture" pnpm-lock.yaml` → **no output** (the fixture path + the fixture name `@vibe-engineer-starter/harness-consumption-fixture` are ABSENT from the lockfile). The fixture is NOT a pnpm workspace member (`pnpm-workspace.yaml` = `packages/*`, `packages/presets/*`, `packages/adapters/*`, `infra/pulumi`) → graph-neutral → **zero** lockfile edges attributable to I-15B-3.
- `git diff --stat -- pnpm-lock.yaml` → `1657 insertions(+), 6 deletions(-)` — this is the **pre-existing multi-orchestrator baseline** (I-20A quality script + mechanical-gates + js-yaml; I-15A adapter-pi/context; I-15B-1 nest-react-rn preset edge), identical to what the I-15B-1 and I-15B-2 revalidations recorded as baseline. None of it references I-15B-3 surfaces (grep-proven). **No silent lockfile mutation; no LOCKFILE-RECONCILE violation.**

### F4 — Negatives non-vacuous fail-closed (independent detector probe). **CLEAN.** (critical gate)
I re-implemented the witness's two detector regexes VERBATIM in my own probe (`revalidation-evidence/nonvacuity-probe.mjs`, output `nonvacuity-probe-output.txt`) WITHOUT importing the auto-running witness, and ran them on read-only file contents + synthesized controls → `allCorrect:true`, **exit 0**:
- (a) real consumer `src/harness-consumer.mjs` → `copied:false, private:false` (clean). ✓
- (b) `negatives/copied-logic/src/bad-consumer.mjs` (inline `export function validateGeneratedFileManifest`/`createPiDownstreamManifestSummary`) → `copied:true`. ✓ (carrier contains REAL forbidden content, not whitespace.)
- (b) `negatives/private-scoped-import/src/bad-consumer.mjs` (`@vibe-engineer/adapter-pi/generated-file-manifest` + `@vibe-engineer/context`) → `private:true`. ✓
- (c) independently synthesized forbidden snippets: relative-harness import `from "../../packages/adapters/pi/..."` → `private:true`; `export function getPiAdapterCapabilityMatrix` → `copied:true`; `from "@vibe-engineer/context"` → `private:true`. ✓ (proves the detectors catch patterns the implementer did NOT pre-stage.)
- (d) benign control (`from "vibe-engineer"` + plain `main()`) → `copied:false, private:false`. ✓
The witness's own W-NEG-MANIFEST-DRIFT (`adapterCapabilityVersion:"stale-v0"` flagged) and W-NEG-NON-PI-HARNESS (`agenticHarness:"claude-code"` flagged) also passed in-run. **All negatives fail-closed and non-vacuous.**

### F5 — Idempotent (deterministic green). **CLEAN.**
Ran the FULL witness a 2nd time → **exit 0**, 13/13 PASS, identical check names/order (`revalidation-evidence/idempotency-run2.json`). The witness's internal W-REG-REGEN (import-shape signature stable across 2 reads) also passed. Deterministic green.

### F6 — No sibling break (blast radius). **CLEAN.**
- The witness's own SIBLING-NO-REGRESSION reruns: I-15B-2 template witness **exit 0**, I-15B-1 preset witness **exit 0**, I-07D typescript preset witness **exit 0** — reproduced in BOTH my runs.
- `git status --porcelain` shows the sibling fixtures (`create-ux`, `selected-harness`, `security`) and `.source-template/` as pre-existing `??` (untouched by I-15B-3). `packages/cli/package.json` `M` is the pre-existing EXTEND-I-02A + I-15A baseline (cli deps = adapter-pi/artifacts/config/context/security/verification; nothing I-15B-3); the keystone spawn is read-only (only `import` + reads `package.json`, no writes) → cli unaffected.

### F7 — Dirty-tree / scope clean. **CLEAN.**
- `git status --porcelain | grep -E "generated-fixtures/harness-consumption|I-15B-3-harness-consumption-witness"` → **exactly 2 `??` entries**:
  - `?? .vibe/work/I-15B-3-harness-consumption-witness/`
  - `?? examples/starter-reference/generated-fixtures/harness-consumption/`
  (the 2 owned greenfield subtrees).
- Total dirty = 251 paths = 2 owned + 249 pre-existing baseline (matches impl report's "249 baseline"). No `M`/`D` of any file in the owned subtrees.
- No I-15B-3-sensitive surface newly touched: `packages/cli/package.json` `M` = baseline; no `packages/presets/typescript`, no `packages/adapters/pi/**` product edit, no root `package.json`/`pnpm-workspace.yaml`/`turbo.json`, no sibling fixture edit, no `.git**` op, no `pnpm`/install call (the witness spawns only `node` + read-only `git status`; grep-confirmed).

### F8 — adapter-pi public-export consumption is genuine (bonus, corroborates F2). **CLEAN.**
`packages/adapters/pi/package.json` `exports` = `{./capabilities, ./generated-file-manifest, ./schema}` — exactly the brief §2 public surface. The witness imports exactly these 3 public subpaths via `import()` from `cwd=packages/cli`, resolving through the real `workspace:*` symlink (`realpath`=`packages/adapters/pi`); W-CONSUMER-MANIFEST-CONSISTENCY confirms `schemaVersion=pi-generated-file-manifest/v1`, `adapterCapabilityVersion=pi-adapter-capability-matrix/v1`, both validators `.valid===true`, `manifestReady=true`, `runtimeExecutionClaim="not-claimed"` (pending-live honesty — I-14B live runtime NOT faked), `harness-config`+`context-files` families `ready`, `consumedByLanes` includes `I-15B-starter-template-harness-consumption`, `pathPatterns` include `agenticHarness=pi`. NOT an internal leak — declared public exports only.

---

## Required explicit confirmations
- **(a) 13 checks reproduce real-boundary:** YES (F1). exit 0; real spawn resolve+load of `vibe-engineer` (self-reference from packages/cli), real `@vibe-engineer/adapter-pi` external-symlink consumption, real on-disk `.source-template` config/context, real sibling witnesses.
- **(b) W-HARNESS-IMPORT genuine (self-reference spawn context-genuine, NOT false-green — the contrast probe):** YES (F2). C1 packages/cli resolves all 3 subpaths to real `packages/cli/src/**` files with real typed symbols; C2 repo-root / C3 neutral-tmp / C4 sibling-adapter ALL `ERR_MODULE_NOT_FOUND`. Rules out accidental hoist + wrong-context. Complemented by genuine external adapter-pi symlink (F8).
- **(c) No lockfile silently mutated:** YES (F3). Fixture name/path ABSENT from `pnpm-lock.yaml`; +1657 = pre-existing baseline; graph-neutral (fixture not a workspace member).
- **(d) Negatives non-vacuous:** YES (F4). Independent detector probe `allCorrect:true`; carriers contain real forbidden content; synthesized injections flagged; benign control clean.
- **(e) Idempotent:** YES (F5). 2nd full run exit 0, 13/13 identical.
- **(f) No sibling break:** YES (F6). I-15B-2/I-15B-1/I-07D all exit 0 (both runs); cli read-only; sibling fixtures untouched.
- **(g) Dirty-tree scope clean:** YES (F7). Exactly 2 `??` owned subtrees + 249 baseline; no sensitive surface touched; no pnpm/git-mutating op.

## Recorded observations (NON-BLOCKING — minor-local; no gate weakened)
- **Obs-1 (introspection caveat, NOT a defect):** my contrast probe's `createRequire(import.meta.url).resolve("@vibe-engineer/adapter-pi/generated-file-manifest")` returned `"Package subpath './generated-file-manifest' is not defined by exports"` — a CJS-vs-ESM exports-condition quirk (the package's `exports` define only `types`+`import` conditions, no `require`/`default`), so CJS `require.resolve` cannot resolve the subpath while ESM `import()` does. The witness consumes via `import()` (which SUCCEEDS, `importOk:true`, real functions). This documents my probe's introspection method, not a package or witness defect. The brief's public-export contract (`./generated-file-manifest` etc.) is honored by the ESM import path.
- **Obs-2 (keystone posture, honestly classified):** the keystone is Node package self-reference (the package importing its own public specifier from packages/cli), used as the in-context proxy because the fixture cannot be a workspace member (graph-neutral) and a real external install would be an out-of-license lockfile edit (brief §9 STOP). This is the SAME posture I-15B-2 certified and the brief sanctions; the 4-context contrast probe (F2) proves it is NOT a hoist/wrong-context false-green, and the external adapter-pi symlink (F8) provides the genuine external-consumption complement. A future operator could optionally install the fixture as a real workspace member to exercise a fully-external `node_modules/vibe-engineer` resolution, but that is not required for I-15B-3 truth-green and is out-of-license here. Non-blocking.

## Severity gate assessment
- **critical:** NONE. (No copied harness logic — real consumer clean + non-vacuous detector; no private/internal scoped import — detector non-vacuous + real consumer clean; no out-of-license edit — scope = exactly 2 `??` owned subtrees, witness spawns only `node` + read-only `git status`; **no fake/shape-only harness-import witness** — real resolve+load of all 3 public subpaths with real typed symbols, contrast-proven genuine; **no false real-boundary green** — 4-context contrast rules out hoist/wrong-context; no lockfile mutation — fixture absent from lockfile; no DL-16/DL-17 infidelity — on-disk config/context faithful; no domain-specific core defaults — over-inference clean.)
- **major-local:** NONE.
- **minor-local:** Obs-1 (CJS-vs-ESM introspection caveat) + Obs-2 (keystone self-reference posture, honestly recorded + contrast-proven). Neither weakens any gate.
- **clean:** YES — gate fully met.

**Dependent-blocking truth-green — MET:** W-HARNESS-IMPORT (keystone), W-CONSUMER-MANIFEST-CONSISTENCY, W-CONTEXT-PLACEHOLDERS-VALIDATE green; W-NEG-COPIED-HARNESS-LOGIC, W-NEG-PRIVATE-SCOPED-IMPORT, W-NEG-MANIFEST-DRIFT, W-NEG-NON-PI-HARNESS fail-closed (non-vacuous); W-REG-REGEN + W-REG-INVARIANTS clean; pending-live seams (I-14B live pi runtime `runtimeExecutionClaim="not-claimed"`, I-17B device, I-20D hosted CI) honestly recorded, NOT faked.

## Decision: I-15B-3 truth-green → parent I-15B closes → UNBLOCKS I-16A (+ downstream I-21)
All three I-15B sub-lanes now PASS independently (I-15B-1 preset PASS, I-15B-2 source-template PASS, I-15B-3 harness-consumption PASS). Parent **I-15B truth-green**. Per brief §10 DAG: I-15B → **I-16A** → I-16B → {I-17A,I-17B} → I-19 → **I-21** → I-22 → I-23 → I-24 → FINAL-BUGHUNT. The load-bearing "starter imports harness package" seam (DAG §9) is proven genuine. No fix required.

## Exact next action
Proceed to **I-16A** (the next ready-queue dependent on I-15B). No blocker, no fix for I-15B-3. (Optional, out-of-scope: a future operator may install the fixture as a real workspace member to exercise a fully-external `node_modules/vibe-engineer` resolution — not required for truth-green.)

## Files written by THIS revalidator (owned WRITE only)
- `.vibe/work/I-15B-3-harness-consumption-witness/I-15B-3-revalidation-artifact.md` (this artifact).
- `.vibe/work/I-15B-3-harness-consumption-witness/revalidation-evidence/**`: `contrast-probe.mjs`(+`contrast-probe-output.txt`), `nonvacuity-probe.mjs`(+`nonvacuity-probe-output.txt`), `idempotency-run2.json`.

Zero edits to product source, the impl report, prior evidence trees, prompts/briefs/ledger/status/handoff, or `.git**`. No git/package-manager ops (read-only witnesses + read-only `git status`/`git diff` only). The witness runner's re-write of its own `evidence/harness-consumption-witness-result.json` is idempotent (owned path; net-zero semantic change across runs).
