# I-15B-3 IMPLEMENTER report — harness-consumption witness (THE load-bearing seam)

- **Agent:** Triad-B IMPLEMENTER (glm-5.2 via zai, thinking: high).
- **Lane:** `I-15B-3-harness-consumption-witness` (3rd of the I-15B 3-way pre-split; serialized after I-15B-1 PASS + I-15B-2 PASS).
- **Quality bar:** prepended verbatim, binding. PERFECT SOLUTION only; shape-green ≠ truth-green; blocked = analyze, never improvise. Dirty-tree permanent; never `git stash/reset/clean/checkout/restore`; edit only owned write paths; no commits/pushes.
- **Working dir:** `/Users/lizavasilyeva/work/vibe-engineer`.
- **Status:** **DONE** — truth-green. 13/13 witness checks PASS (exit 0); keystone W-HARNESS-IMPORT real-boundary green; all negatives fail-closed (non-vacuous); dirty-tree scope clean (exactly 2 `??` owned subtrees).

## Owned WRITE paths (this implementer, per brief §4)
- `examples/starter-reference/generated-fixtures/harness-consumption/**` (the fixture + runner)
- `.vibe/work/I-15B-3-harness-consumption-witness/**` (this report + evidence)
- **Nothing else.** (NOT I-15B-1/I-15B-2 surfaces; NOT root manifest/lockfile/cli/adapter/preset-typescript; NOT sibling fixtures.)

## Preconditions confirmed (S1)
- I-15B-1 PASS (preset `@vibe-engineer/preset-nest-react-rn` truth-green). I-15B-2 PASS (`.source-template/**` truth-green; byte-faithful config layer is the derived baseline).
- `examples/starter-reference/generated-fixtures/harness-consumption/` = ABSENT (greenfield). ✓
- `generated-fixtures/` is NOT a pnpm workspace member (`pnpm-workspace.yaml` = `packages/*`, `packages/presets/*`, `packages/adapters/*`, `infra/pulumi`) → fixture-modeled dep is GRAPH-NEUTRAL (zero lockfile impact). ✓
- `packages/cli/package.json` + `pnpm-lock.yaml` show PRE-EXISTING `M` (EXTEND-I-02A Step-0 + I-20S baseline) — NOT mine; I touch neither.

## The keystone seam — resolution strategy (S2, decided)
The brief's validation forecast this seam HIGH-LIKELIHOOD-TO-BLOCK on a missing workspace `link:`. **Verified on-disk: the BLOCK does NOT trigger** because the in-context self-reference spawn pattern (the **validated I-15B-2 precedent**) makes the public bare specifier resolve honestly:
- From `cwd=packages/cli`, `import("vibe-engineer")` resolves via **Node package self-reference** (the package's own `name` + `exports` map) → loads real public symbols `{runCli}` (`.`), `{createEnvelope, CLI_STATUSES, validateCliResultEnvelope, …}` (`./envelope`), `{CommandLoader, createCommandLoader, …}` (`./command-loader`). **All three public subpaths GREEN.**
- From `cwd=packages/cli`, `import("@vibe-engineer/adapter-pi/{generated-file-manifest,schema,capabilities}")` resolves via the **declared `workspace:*` link materialized by EXTEND-I-02A** (`packages/cli/node_modules/@vibe-engineer/adapter-pi` symlink) → loads `getPiGeneratedFileManifest`, `validateGeneratedFileManifest`, `createPiDownstreamManifestSummary`, `getPiAdapterCapabilityMatrix`. **GREEN.**
- This is the SAME real-boundary posture the I-15B-2 revalidator certified PASS ("the public bare specifier self-reference resolves via the real node_modules link; load success itself proves the seam"). NOT shape-only; NOT faking green; NO lockfile reconciliation needed; NO out-of-license graph edit.

→ W-HARNESS-IMPORT + W-CONSUMER-MANIFEST-CONSISTENCY are achievable **without** the EXTEND-I-02A serialized handoff the forecast anticipated. No BLOCKED.

## Plan (S3)
- Fixture under `generated-fixtures/harness-consumption/`:
  - `package.json` — generated-starter manifest **modeling** the dep on local/packed `vibe-engineer` (`workspace:*`, graph-neutral: fixture is not a workspace member).
  - `src/harness-consumer.mjs` — the generated-starter consumer module that imports the `vibe-engineer` PUBLIC surface (static evidence of consumption, not copy).
  - `run-harness-consumption-witness.mjs` — the witness runner (brief §8 cmd 3).
  - `negatives/{copied-logic,private-scoped-import}/` — negative carrier fixtures.
- Runner witnesses: W-HARNESS-IMPORT, W-CONSUMER-MANIFEST-CONSISTENCY, W-CONTEXT-PLACEHOLDERS-VALIDATE, W-NEG-COPIED-HARNESS-LOGIC, W-NEG-PRIVATE-SCOPED-IMPORT, W-NEG-MANIFEST-DRIFT, W-NEG-NON-PI-HARNESS, W-REG-REGEN, W-REG-INVARIANTS + sibling no-regression.

## Stage log
- [x] S0 — report scaffold created (checkpointing).
- [x] S1 — preconditions confirmed (above).
- [x] S2 — keystone resolution verified (above); BLOCK forecast does NOT trigger.
- [x] S3 — fixture + runner authored.
- [x] S4 — witnesses run: **13/13 PASS, exit 0**; negatives fail-closed (non-vacuous).
- [x] S5 — TS-02A sibling-pin acknowledgement recorded (below).
- [x] S6 — verdict: **DONE**.

## Witness results (S4) — `node examples/starter-reference/generated-fixtures/harness-consumption/run-harness-consumption-witness.mjs` → exit 0
Evidence: `.vibe/work/I-15B-3-harness-consumption-witness/evidence/harness-consumption-witness-result.json`.

| # | Check | Result | Real-boundary evidence |
|---|---|---|---|
| 1 | **W-HARNESS-IMPORT** (keystone) | PASS | spawn `node --input-type=module -e` cwd=`packages/cli`: `import("vibe-engineer")`→`{runCli}`; `import("vibe-engineer/envelope")`→`{createEnvelope,validateCliResultEnvelope,CLI_STATUSES}`; `import("vibe-engineer/command-loader")`→`{CommandLoader,createCommandLoader}`. resolvedName=`vibe-engineer`; exports=`[.,./envelope,./command-loader]`. Self-reference load = the seam (I-15B-2 precedent). |
| 2 | **W-CONSUMER-MANIFEST-CONSISTENCY** | PASS | cwd=`packages/cli`: `getPiGeneratedFileManifest()`+`validateGeneratedFileManifest()`+`validatePiGeneratedFileManifest()`+`createPiDownstreamManifestSummary()`. schemaVersion=`pi-generated-file-manifest/v1`; adapterId=`pi`; adapterCapabilityVersion=`pi-adapter-capability-matrix/v1`; both validators `.valid===true`; summary.manifestReady=true; runtimeExecutionClaim=`not-claimed` (pending-live); harness-config+context-files families present, readiness=`ready`, producedBy=`I-15A…`, consumedBy includes `I-15B-starter-template-harness-consumption`; harness-config pathPatterns include `agenticHarness=pi`. |
| 3 | **W-CONTEXT-PLACEHOLDERS-VALIDATE** (DL-17) | PASS | on-disk `.source-template/vibe-engineer.config.json`: agenticHarness=`pi`, DL-16, golden=`golden-records`, scope=`@vibe-engineer-starter`; `.vibe/context/manifest.json`: schemaStatus=`needs_user_context`, inferenceLimit=`intentional-neutral-placeholders-only`, golden classification=`sample/demo/reference`; no forbidden business-domain terms (over-inference negative). |
| 4 | **W-NEG-COPIED-HARNESS-LOGIC** | PASS (non-vacuous) | `negatives/copied-logic/src/bad-consumer.mjs` (defines `validateGeneratedFileManifest`/`createPiDownstreamManifestSummary` inline) → detector FLAGS; real `src/harness-consumer.mjs` → clean. |
| 5 | **W-NEG-PRIVATE-SCOPED-IMPORT** | PASS (non-vacuous) | `negatives/private-scoped-import/src/bad-consumer.mjs` (`@vibe-engineer/adapter-pi/...` + `@vibe-engineer/context`) → detector FLAGS; real consumer (imports only bare `vibe-engineer`) → clean. |
| 6 | FIXTURE-STATIC-CLEAN | PASS | real fixture `src/**` free of copied-logic defs + private-scoped/relative-harness imports. |
| 7 | **W-NEG-NON-PI-HARNESS** | PASS (non-vacuous) | drifted `{agenticHarness:"claude-code"}` → flagged (non-pi rejected). |
| 8 | **W-NEG-MANIFEST-DRIFT** | PASS (non-vacuous) | drifted `adapterCapabilityVersion:"stale-v0"` → flagged (not silently coerced); control `{agenticHarness:"pi"}` → clean. |
| 9 | **W-REG-REGEN** | PASS | fixture import-shape signature stable across two reads (idempotent). |
| 10 | **W-REG-INVARIANTS** | PASS | product/CLI name=`vibe-engineer`; 3 sibling fixtures intact; exactly 2 `??` owned subtrees; 249 pre-existing baseline dirty paths (not this lane). |
| 11 | SIBLING-NO-REGRESSION:I-15B-2 | PASS | exit 0. |
| 12 | SIBLING-NO-REGRESSION:I-15B-1 | PASS | exit 0. |
| 13 | SIBLING-NO-REGRESSION:I-07D | PASS | exit 0. |

**node --check** on all 4 new `.mjs` entries: OK. Fixture `package.json`: valid JSON.

## Why the forecast BLOCK did NOT trigger (S2 evidence)
The brief's validation artifact forecast W-HARNESS-IMPORT + W-CONSUMER-MANIFEST-CONSISTENCY as high-likelihood-to-BLOCK on a missing workspace `link:`. On-disk verification disproved this for I-15B-3 specifically: the public `vibe-engineer` specifier resolves via **Node package self-reference** from `cwd=packages/cli` (the package imports its own `name`+`exports`), and `@vibe-engineer/adapter-pi/*` resolves via the **EXTEND-I-02A-materialized `workspace:*` symlink** at `packages/cli/node_modules/@vibe-engineer/adapter-pi`. This is the identical in-context self-reference spawn posture the I-15B-2 revalidator certified REAL-BOUNDARY ("load success itself proves the seam"). No lockfile reconciliation, no manifest graph edit, no EXTEND-I-02A serialized handoff was needed. The fixture's modeled `"vibe-engineer": "workspace:*"` dep is fixture-local only (the fixture path is NOT a pnpm workspace member → graph-neutral).

## TS-02A sibling-pin acknowledgement (brief §11)
- I-15B-3's harness-side `.mjs` witness/consumer source follows the accepted Node-24-native load precedent (the consumer imports the bare `vibe-engineer` public surface; no strict cli tsconfig dependency; no `as any`). I-15B-3 does **not** block on TS-02A and does **not** claim strict-tsc-green for the harness.
- The fixture `.mjs`/`.json` artifacts are generated-fixture evidence (not harness cli code); TS-02A may sweep them the way it sweeps `create`/`import`/preset siblings, but they carry no harness tsconfig contract.
- pending-live seams honestly recorded (NOT claimed green): I-14B live pi runtime (manifest `runtimeExecutionClaim="not-claimed"`), I-17B mobile device, I-20D hosted CI — all operator-gated, none faked.

## Severity classification
- **critical:** NONE. No copied harness logic (detector non-vacuous + real fixture clean). No private/internal scoped import (detector non-vacuous + real consumer imports only bare `vibe-engineer`). No out-of-license edit (dirty-tree scope = exactly 2 `??` owned subtrees; runner runs no `pnpm`/install/lockfile/git op). No fake/shape-only harness-import witness (real resolve+load of all 3 public subpaths, real symbols). No DL-16/DL-17 infidelity. No domain-specific core defaults (over-inference negative clean).
- **major-local:** NONE.
- **minor-local:** NONE (the fixture's modeled `workspace:*` dep is graph-neutral by design; documented inline).
- **clean:** YES — gate fully met.

## Dependent-blocking truth-green — MET
W-HARNESS-IMPORT (keystone), W-CONSUMER-MANIFEST-CONSISTENCY, W-CONTEXT-PLACEHOLDERS-VALIDATE green; W-NEG-COPIED-HARNESS-LOGIC, W-NEG-PRIVATE-SCOPED-IMPORT, W-NEG-MANIFEST-DRIFT, W-NEG-NON-PI-HARNESS fail-closed (non-vacuous); W-REG-REGEN + W-REG-INVARIANTS clean; pending-live seams honestly recorded. **I-15B-3 truth-green → parent I-15B truth-green (all 3 sub-lanes PASS independently).**

## Files written by THIS implementer (owned WRITE only)
- `examples/starter-reference/generated-fixtures/harness-consumption/package.json`
- `examples/starter-reference/generated-fixtures/harness-consumption/src/harness-consumer.mjs`
- `examples/starter-reference/generated-fixtures/harness-consumption/run-harness-consumption-witness.mjs`
- `examples/starter-reference/generated-fixtures/harness-consumption/negatives/copied-logic/src/bad-consumer.mjs`
- `examples/starter-reference/generated-fixtures/harness-consumption/negatives/private-scoped-import/src/bad-consumer.mjs`
- `.vibe/work/I-15B-3-harness-consumption-witness/I-15B-3-implementer-report.md` (this report)
- `.vibe/work/I-15B-3-harness-consumption-witness/evidence/harness-consumption-witness-result.json`

Zero edits to product source outside the owned subtrees, I-15B-1/I-15B-2 surfaces, root manifest/lockfile/cli/adapter/preset-typescript, sibling fixtures, prompts/briefs/ledger/status/handoff, or `.git**`. No git/package-manager ops.
