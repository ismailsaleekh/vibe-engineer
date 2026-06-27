# FINAL-BUGHUNT Report — vibe-engineer whole-system adversarial hunt

> Independent adversarial bug-hunt closure pass over the entire vibe-engineer system.
> Quality bar binding (prepended verbatim). Status: **COMPLETE**.

- Agent: FINAL-BUGHUNT (glm-5.2, thinking xhigh)
- Target repo: `/Users/lizavasilyeva/work/vibe-engineer` (dirty tree; baseline)
- Report path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/FINAL-BUGHUNT/final-bughunt-report.md`
- Owned write path: `.vibe/work/FINAL-BUGHUNT/**` only. No product-source / lane-work / git edits.
- Verification writes confined to `/tmp/ve-*` (outside repo) + regenerated lane witness outputs under their own `.vibe/work/<lane>/evidence/**`.

## Verdict: **NEEDS-FIX**

The system is **not** truth-green as a whole. The shipped CI-parity blocking quality gate (`pnpm quality -- --profile=ci`) **FAILS (exit 2)** against the real harness workspace — the p0 mechanical-gate aggregate returns `ok:false` with **3,679 blocking findings** — and `.github/workflows/quality.yml` ships a **false-green comment** asserting that gate "PASSES on the complete aggregate." This is the textbook shape-green≠truth-green failure the quality bar warns about: every per-lane p0 gate validator passes on fixtures, but the real-workspace aggregate is red. Wiring, schemas, skill/preset/CLI-dispatch seams, and pending-live disclosure are honestly green; the blocking defect is the aggregate-vs-real-workspace red + the false-green source claim.

---

## Numbered findings

### F1 — CRITICAL — System quality gate `pnpm quality` FAILS on the real workspace (p0 red, structural & persistent)

**Evidence (independently reproduced, exact CI command):**
```
$ pnpm quality -- --profile=ci --evidence-dir /tmp/ve-ci-exact --summary-out /tmp/ve-ci-exact/quality-summary.json
EXACT_CI_EXIT=2
quality FAIL (profile=ci)
  wiring: pass | aggregates ok: p0=fail(3679 blocking), p1=ok(0 blocking), p2=ok(0 blocking)
summary: overallOk=false exitCode=2  p0 ok=false blocking=3679 ; p1/p2 ok=true
```
Reproduced 3× this session with stable `ok:false` (3677 → 3321 → 3679 blocking; count drifts as the dirty tree evolves, the **red is stable**). I-20D's own evidence (`revalidation-evidence/w1core-eq/evidence/p0.aggregate.json`, `projectRoot=/Users/lizavasilyeva/work/vibe-engineer`) independently shows the same: `ok:false`, 3,321 blocking.

**Root cause is structural, not transient dirty-tree noise.** `scripts/quality/run-quality.mjs` sets `projectRoot = process.cwd()` (= repo root, exactly as CI runs it) and calls `runP0Aggregate(projectRoot)` with **no options**, so `validateGovernedSurface` reads `${projectRoot}/mechanical-surface.json` by default. The real repo root **has no `mechanical-surface.json`** (exists only under `packages/mechanical-gates/fixtures/**` and `.vibe/work/**`; not gitignored). The gate throws `P0_FILE_UNREADABLE: Required file is unreadable: mechanical-surface.json`, which the aggregate catches as `ruleId: aggregate.validator-exception` and fails-closed, cascading into:
- 922× `allowlist.unallowlisted-escape` ("policy unavailable")
- 2,744× `domain-purity.policy-missing-core-term` ("policy unavailable")
- `config-guards`: real — root has **no `tsconfig.json`** (only `tsconfig.base.json`), and root `package.json` has **no `lint` / `format:check`** scripts.
- `testing-boundary.policy-unreadable`.

The real harness workspace is inconsistent with what its own shipped p0 gates require (no `mechanical-surface.json`, no root `tsconfig.json`, no `lint`/`format:check`). Hosted CI being `pending-live` (no git remote) is the **only** reason this red has never blocked a build — if CI ran, it would block every PR/push with exit 2.

**Why this is a closure blocker:** the bug-hunt brief explicitly requires "Run `pnpm quality` … does it pass across the whole system?" → it does **not**. The quality bar forbids declaring done when a load-bearing witness fails (it ran and returned `ok:false`, so it is not "cannot-run-yet" pending-live).

**Fix direction (ruling needed — not improvised here):** either (a) author the real-workspace governance contract + root config the p0 gates require (root `mechanical-surface.json`, root `tsconfig.json` or make the gate target `tsconfig.base.json`, add `lint`/`format:check` root scripts, and the allowlist/domain/testing policy carriers), or (b) make `run-quality.mjs`/the wiring point the p0 aggregate at the correct validation root, or (c) explicitly reclassify the p0-real-workspace run as `pending-live/BLOCKED` with a real prerequisite and **correct the false-green claim (F2)**. Owner: the serialized I-02A/I-20A governance-surface handoff (the lane notes repeatedly defer the "loader/package edit" that wires real-workspace governance).

### F2 — CRITICAL — False-green claim shipped in `.github/workflows/quality.yml:18`

**Evidence (verbatim):** `.github/workflows/quality.yml` lines 17–19 state:
> "§3.4 fail-closed / CI-parity caveat (handled): … I-13C is truth-green and all three tiers are registered-and-running, so the gate **PASSES on the complete aggregate**."

This conflates **wiring-registered-and-running** with **ok:true**. p0 *is* registered-and-running (`wiring.verdict=pass`, `runP0Aggregate` invoked via the public export) **but `ok:false`** → the gate does **not** pass (F1). The CI step `pnpm quality -- --profile=ci …` exits 2. A reviewer reading this comment would believe the blocking gate is green. This is a false-green statement in shipped source and must be corrected alongside F1.

### F3 — MAJOR-LOCAL — I-20D mischaracterizes the persistent p0 red as transient "dirty-tree" drift

**Evidence:** `.vibe/work/I-20D-ci-pulumi-real-boundary-validation/I-20D-revalidation-artifact.md` lines 26–29 acknowledge exit 2 / 3,321 real blocking findings, but characterize them as "honest aggregate quality-red on the dirty in-flight tree … the exact blocking count drifts per run … expected and benign," and declare I-20D "truth-green for its owned scope" with p0 red treated as non-blocking. The root causes in F1 are **structural and persistent** (the workspace has never carried a root `mechanical-surface.json` / `tsconfig.json` / `lint`+`format:check`), not transient multi-orchestrator drift. This mischaracterization is what allowed a persistent blocking red to be carried forward as "benign." (Note: I-20D's *wiring-gate* scope genuinely is green — the defect is the framing of the p0 content red, and that status.md lists I-20A/B/C/D as truth-green without flagging the aggregate itself is red.)

### F4 — MINOR-LOCAL — Stale self-description in `packages/skills/package.json`

**Evidence:** `description` = "Skeleton manifest for @vibe-engineer/skills; implementation is owned by a later validated lane."; `vibeEngineer.implementationStatus` = "skeleton-only", `sourceStatus` = "not-created-in-I-00A". But `packages/skills/src/**` is fully implemented (`build/`, `ship/{orchestrator,intake}/`, `plan/`, `input/{brainstorm,grill-me,task}/`, `shared/`) and exports `./build`, `./ship`, `./ship/intake`. The build (9/9) and ship (13/13) CLI dispatch witnesses pass through the real skill modules. Stale metadata contradicts on-disk reality.

### F5 — CLEAN (disclosed pending-live) — CLI command registration gap (recorded for completeness, not a hidden defect)

**Evidence:** the shipped entry `packages/cli/src/entry/vibe-engineer.js` calls `createCommandLoader()` with **no args** → only foundation commands register. Real binary: `vibe-engineer help` → `[help, version, foundation]`; `vibe-engineer build` → `status:blocked`, `VE_UNSUPPORTED_OPERATION`, "Command family is not implemented in I-02A." The real command impls (`create/ship/build/verify/security/index.ts`, `config/doctor/schematic/index.js`) are exercised only inside per-lane witnesses that register them manually (`createCommandLoader([buildCommand])` via Node type-stripping). This is **honestly disclosed** as `pending-live/BLOCKED` (W-RB4 witnesses in `create`/`schematic`, README "Current status," `docs/guides/getting-started/repository-status.md` "not live yet"). Not a silent fake. Listed so it is on the record.

---

## Cross-lane seam results

| # | Seam | Result | Evidence |
|---|------|--------|----------|
| 1 | create→build→ship artifact chain (Build Result / Ship Packet shape via `@vibe-engineer/artifacts` schema, validated both sides) | **PASS** | `run-cli-witness.mjs` build 9/9; ship 13/13 (ship seeds a **real** build-result.json via sibling build, then consumes it) |
| 2 | plan→build (Implementation Plan / Verification Delta shape) | **PASS (witness-backed)** | build-skill validates plan via `validateArtifactFile({kind:'implementation_plan'})`; produces `build_result` validated against schema; ship intake re-validates `build_result`, requires status `passed` |
| 3 | preset template declarations → source-template render | **PASS** | typescript preset witness: `ok`, 12 files, 33 negs; nest-react-rn witness: phaseA/B green, contract green (29 render files, **0** validation findings), 11 negs |
| 4 | mechanical-gates public API ↔ quality runner call | **PASS (shape)** / **FAIL (content → F1)** | wiring `verdict=pass`; `runP0/P1/P2Aggregate` all present + really invoked via public `@vibe-engineer/mechanical-gates/aggregate` export; declared `exports` (incl. `.d.ts`) all resolve on disk. API **shape** matches; the **content** of the p0 run is red (F1) |
| 5 | CLI command registration ↔ skills-produced commands | **GAP (disclosed pending-live → F5)** | shipped binary registers only foundation; real commands wired only in witnesses |
| 6 | docs ↔ CLI/API surface | **PASS-honest** | README + repository-status explicitly mark CLI/skills/install/create "not live" and deliberately omit install/usage snippets |

---

## System-level check results

| Check | Result | Evidence |
|-------|--------|----------|
| `pnpm install --frozen-lockfile` | **PASS** | exit 0; workspace resolves cleanly (incl. workspace:* deps, adapters/presets/infra globs) |
| `pnpm quality -- --profile=ci --evidence-dir … --summary-out …` (exact CI command) | **FAIL** | exit 2; `overallOk=false`; p0 `ok:false` 3,679 blocking (p1/p2 ok). **→ F1/F2** |
| wiring-integrity gate | **PASS** | `verdict=pass`, expected={p0,p1,p2}=registered=running, missing=[] |
| `node --check` on key entry points | **PASS** | `cli/src/entry/vibe-engineer.js`, `command-loader/loader.js`, `envelope/result-envelope.js`, `scripts/quality/run-quality.mjs`, `mechanical-gates/src/aggregate/index.js`, `skills/src/{build/index.js,ship/orchestrator/index.js,ship/intake/index.js}` all parse |
| mechanical-gates `exports` (subpath + `types` + `import`) resolve | **PASS** | all 6 subpath exports + `.d.ts` exist |
| artifacts `SCHEMA_FILES` declared → file exists | **PASS** | all 10 kinds resolve (work_brief … skill_manifest) |
| build/ship/create/schematic/security CLI dispatch witnesses | **PASS** | build 9/9, ship 13/13, create (incl. W-RB4 pending-live), schematic, security |
| preset witnesses | **PASS** | typescript + nest-react-rn (above) |

---

## Pending-live honesty verification (all genuinely pending, none faked)

| Item | Status | Probe |
|------|--------|-------|
| Playwright browsers | **genuinely pending** | `~/Library/Caches/ms-playwright` absent → `PLAYWRIGHT_BROWSERS_NOT_INSTALLED` |
| Hosted GitHub Actions | **genuinely pending** | no git remote (I-20D W3; `.git**` untouchable, relied on I-20D `gh run list` probe) |
| Pulumi | **genuinely pending** | `pulumi whoami` → S3-backend auth error, `PULUMI_ACCESS_TOKEN` unset (I-20D W4) |
| Mobile device/simulator E2E | **genuinely pending** | I-17B lane (no simulator) |
| Live-pi runtime / shipped binary | **genuinely pending** | W-RB4 witnesses honestly mark default-binary registration `pending-live/BLOCKED` |

No `act`/mock/synthetic substitution detected for any live seam; no live seam falsely declared PASS (the one overclaim, F2, is a source comment about the deterministic gate, not a live seam).

---

## Stage log
- [x] S0 — report created first.
- [x] S1 — mapped system surface (20 packages, CLI entry/loader, 10 artifact schemas, 6 mechanical-gate exports, presets, skills).
- [x] S2 — system checks: frozen-lockfile PASS; `pnpm quality` FAIL (F1); `node --check` PASS.
- [x] S3 — 6 cross-lane seams verified (table above).
- [x] S4 — obvious-miss sweep: F2 (false-green comment), F3 (mischaracterization), F4 (stale metadata).
- [x] S5 — pending-live honesty verified (table above).
- [x] S6 — full chain build→ship exercised live via ship witness (seeds real build-result → ship-packet); plan→build shape coherent.
- [x] S7 — verdict + findings finalized.

## Final statement

**The system is NOT complete and NOT ready for operator commit as a truth-green whole.** The wiring layer, artifact schemas, skill/preset/CLI-dispatch witnesses, and pending-live disclosure are honestly green; but the system's own shipped CI-parity blocking quality gate (`pnpm quality -- --profile=ci`) fails against the real harness workspace — p0 `ok:false`, 3,679 blocking findings, root cause structural and persistent (no root `mechanical-surface.json` / `tsconfig.json` / `lint`+`format:check`) — and `.github/workflows/quality.yml:18` ships a false-green "gate PASSES on the complete aggregate" comment. This is shape-green≠truth-green at the aggregate level, uncaught only because hosted CI is pending-live. Fix F1 + correct F2 (and F3 framing / F4 metadata) before closure. **VERDICT: NEEDS-FIX.**
