# I-17B Implementation Report (Triad-B IMPLEMENT)

- **Lane:** `I-17B-mobile-e2e-ui-verification` (golden-mobile Maestro+Detox mobile-E2E + e2e-ui/mobile UI-verification carriers)
- **Implementer:** Triad-B IMPLEMENT, `glm-5.2`/high
- **Binding brief:** `.pi/hlo/vibe-engineer/implementation-briefs/I-17B-brief-generated.md` (validated PASS)
- **Working dir:** `/Users/lizavasilyeva/work/vibe-engineer`
- **Status:** DONE (deterministic PASS; live device-driven Maestro/Detox run + live mobile UI capture `pending-live/BLOCKED`)

## Owned WRITE paths (this lane only)

- `examples/starter-reference/generated-fixtures/golden-mobile/**`
- `examples/starter-reference/generated-fixtures/e2e-ui/mobile/**`
- `.vibe/work/I-17B-mobile-e2e-ui-verification/**`

## Stage 1 — Environment probe (pending-live honesty)

Live mobile device/runtime prerequisite inventory (DL-12 §device/CI; DL-13 §mobile; brief §1 "Pending-live honesty"):

| Prerequisite | Probed | Present? | Unblocking condition |
| --- | --- | --- | --- |
| iOS simulator (usable device) | `xcrun simctl list devices available/booed` | **NO** (simctl binary present, but zero available + zero booted devices) | install Xcode + iOS Simulator runtime, `xcrun simctl create`/boot a phone profile |
| Android emulator | `adb` / `emulator` binaries | **NO** (`which adb` exit 1; `which emulator` exit 1) | install Android SDK platform-tools + system image, `avdmanager` create + `emulator -avd` |
| Maestro binary | `which maestro` | **NO** (exit 1) | install Maestro CLI (`curl ... | bash`) |
| Detox binary / `detox` CLI | `which detox` | **NO** (exit 1) | `npm i -g detox-cli` + per-app `detox` + RN build |
| react-native CLI | `which react-native` | **NO** (exit 1) | RN toolchain + Metro bundle + app build |
| Live RN bundle/build/server | — | **NO** | Metro bundle + iOS/Android app build/install |

**Verdict:** the **live device-driven Maestro/Detox mobile-E2E run and the live mobile UI-verification capture are `pending-live/BLOCKED`** — they may NOT be claimed green. This blocks I-23/final-closure live proof, NOT I-17B deterministic PASS. I-17B's deterministic truth-green scope = everything reachable without a live device (generated flows + selection-metadata/conflict validator + DL-13 capture-matrix/baseline-governance + structural/regression/negative witnesses).

## Stage 2 — golden-mobile fixture

**DONE — witness green.** Files created under `examples/starter-reference/generated-fixtures/golden-mobile/`:

- `package.json` (graph-neutral; Maestro/Detox/react-native as **modeled/peer** only — no graph edge, no install), `README.md` (`@sample @demo @reference`), `src/index.ts` barrel.
- `e2e/maestro/gr-01-app-launch-smoke.yaml`, `gr-02-navigate-read-list.yaml`, `gr-03-reload-reread-maestro-half.yaml` — Maestro black-box flows (DL-12 Maestro-default + both-mode Maestro half).
- `e2e/detox/gr-04-deterministic-state-reset.spec.ts` (Detox-required), `gr-03-resync-after-reload-detox-half.spec.ts` (both-mode Detox half).
- `metadata/gr-01..gr-04.json` — all 14 DL-12 selection fields + declarative triggers for each scenario.
- `src/consumption/golden-records.rn-consumption.ts` — no-fork seam importing the I-16B shared client (useGoldenRecords + createMobileTransport + createGoldenRecordsSharedClient + contract type).
- `src/validate/selection-metadata.ts` (+ `.cli.ts`) — DL-12 selection algorithm + conflict validator (the deterministic core).
- `src/witness/mobile-e2e.real-boundary.ts` (+ `.cli.ts`), `src/witness/negative.cli.ts`.
- `run-mobile-witness.mjs` — orchestrator.

Witness: 13/13 checks PASS, exit 0. Live seam honestly `pending-live/BLOCKED`.

## Stage 3 — e2e-ui/mobile fixture

**DONE — witness green.** Files created under `examples/starter-reference/generated-fixtures/e2e-ui/mobile/`:

- `package.json` (graph-neutral; pixelmatch/axe-core **modeled/peer** only), `README.md` (`@sample @demo @reference`), `src/index.ts` barrel.
- `capture-matrix.json` — DL-13 v1 default mobile matrix: `iphone-15-pro-sim` + `pixel-8-emu` × {default, loading, empty, error, long_content, focused}; every row declares screenshot/baseline_ref/a11y_tree/geometry/visual_diff; `closure_basis: ui_verification`.
- `checks/{visual-diff,accessibility,layout-geometry,interaction-state}.json` — deterministic check set; visual-diff = pixelmatch-class with normalization that masks ONLY volatile data (must_not_mask_semantic_change: true); advisory explicitly advisory-only.
- `baselines/governance.json` + `baselines/proposal/iphone-default.json` — baseline identity fields + proposal/update policy + forbidden-auto-accept rule (auto_accept/regenerate/silent_update all false).
- `evidence/evidence-packet-schema.json` — DL-13 semantic evidence fields (exact syntax owned by DL-02/DL-10).
- `src/validate/ui-capture.ts` (+ `.cli.ts`) — DL-13 missing-artifact/baseline/classification validator.
- `src/witness/ui-verification.real-boundary.ts` (+ `.cli.ts`), `src/witness/negative.cli.ts`.
- `run-ui-witness.mjs` — orchestrator.

Witness: 14/14 checks PASS, exit 0. Live mobile UI capture honestly `pending-live/BLOCKED`.

## Stage 4 — Real-boundary witness + runner

**DONE.** Both runners (`golden-mobile/run-mobile-witness.mjs`, `e2e-ui/mobile/run-ui-witness.mjs`) drive the validators REAL against the generated artifacts (no mock/synthetic green), run all positive/negative/regression witnesses, and emit machine-readable evidence packets. The golden-mobile consumption seam drives the REAL `@ts-rest/core`+`zod` runtime via the I-16B mobile transport against the REAL I-16A provider (accepted) — through the I-16B dep-resolver register hook (read-only consumption of the golden-flow runner pattern). No Maestro/Detox/RN/pixelmatch packages are resolved/installed (modeled/peer only).

## Stage 5 — Evidence

**DONE.** Evidence packets under `.vibe/work/I-17B-mobile-e2e-ui-verification/evidence/`:

- `golden-mobile-witness-result.json` (13/13 PASS, exit 0)
- `e2e-ui-mobile-witness-result.json` (14/14 PASS, exit 0)
- `I-17B-evidence-summary.json` (consolidated)

### Validation commands run (exact exit codes)

```
node --experimental-strip-types examples/starter-reference/generated-fixtures/golden-mobile/run-mobile-witness.mjs   # exit 0
node --experimental-strip-types examples/starter-reference/generated-fixtures/e2e-ui/mobile/run-ui-witness.mjs        # exit 0
# negatives (each exit 0 = validator fail-closed correctly):
#   golden-mobile --neg= sel-conflict | missing-metadata | maestro-only-policy | detox-only-policy | fake-live
#   e2e-ui/mobile --neg= missing-artifact | silent-baseline | e2e-as-ui | advisory-hard-block | fake-live
```

## Stage 6 — Final

### Files changed (exact, owned WRITE paths only)

- `examples/starter-reference/generated-fixtures/golden-mobile/**` (36 files: package.json, README.md, 3 Maestro YAML, 2 Detox specs, 4 metadata JSON, consumption seam, selection-metadata validator + CLI, witness + CLI + neg CLI, runner, barrel)
- `examples/starter-reference/generated-fixtures/e2e-ui/mobile/**` (17 files: package.json, README.md, capture-matrix.json, 4 check JSON, governance.json + proposal, evidence-packet-schema.json, ui-capture validator + CLI, witness + CLI + neg CLI, runner, barrel)
- `.vibe/work/I-17B-mobile-e2e-ui-verification/**` (report + 3 evidence artifacts)

### Witnesses run + evidence

- Positive: W-MAESTRO-STRUCT, W-DETOX-STRUCT, W-SEL-METADATA, W-NO-FORK, W-NEG-FAKE-LIVE (golden-mobile); W-UI-MATRIX, W-UI-CHECKS-CLASSIFIED, W-BASELINE-GOV, W-NEG-MISSING-ARTIFACT, W-NEG-ADVISORY-HARD-BLOCK, W-NEG-FAKE-LIVE (e2e-ui/mobile).
- Negative (all fail-closed): W-NEG-SEL-CONFLICT, W-NEG-MISSING-METADATA, W-NEG-MAESTRO-ONLY-POLICY, W-NEG-DETOX-ONLY-POLICY (golden-mobile); W-NEG-MISSING-ARTIFACT, W-NEG-SILENT-BASELINE, W-NEG-E2E-AS-UI, W-NEG-ADVISORY-HARD-BLOCK (e2e-ui/mobile).
- Regression: W-REG-DOMAIN-NEUTRAL, W-REG-LOCKED, W-INVARIANTS (both fixtures).

### Dirty-tree scope confirmation

`git status --porcelain` owned subset = only `?? examples/starter-reference/generated-fixtures/golden-mobile/`, `?? examples/starter-reference/generated-fixtures/e2e-ui/` (contains ONLY `mobile/` — the `web/` subdir is the parallel I-17A sibling, file-disjoint baseline), and `?? .vibe/work/I-17B-mobile-e2e-ui-verification/`. Serialized surfaces (root manifest/lockfile/turbo/tsconfig, `.github/**`, `packages/**`) untouched. No graph edge / install / lockfile edit. I-16A/I-16B/I-15B predecessors read-only (no tracked modifications). A transient out-of-license `examples/.vibe/` evidence write from an incorrect REPO_ROOT depth in the e2e-ui/mobile runner was caught and removed; the runner was fixed (5-level depth) and re-run green.

### Deferred debts

None. The only deferred scope is the `pending-live/BLOCKED` live device run (env-gated, not a debt).

### Status

**DONE — deterministic PASS.** All deterministic witnesses/evidence present, negatives fail-closed, no-fork + domain-neutral + graph-neutral proven, I-17A file-disjoint. The live device-driven Maestro/Detox mobile-E2E run + live mobile UI capture remain honestly `pending-live/BLOCKED` (no iOS sim device / Android emu / Maestro / Detox / RN build in env) — blocks I-23/final-closure live proof, NOT I-17B deterministic PASS.
