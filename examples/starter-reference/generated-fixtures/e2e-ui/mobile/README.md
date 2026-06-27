# @sample @demo @reference — e2e-ui/mobile fixture (I-17B / DL-13 / DL-16 / DL-20A)

The generated **mobile UI-verification carrier** for the starter golden-records
React Native surface — the mobile UI-verification half of `I-17`
(DL-13 LOCKED). **UI verification is separate from behavior E2E** (DL-13 §5.8;
verification-layer §5.8): an E2E-pass-alone fixture does **not** close UI
verification, even though mobile UI verification **consumes** Maestro+Detox
capture artifacts.

## What this fixture is

Per **DL-13 (LOCKED)**:

- **`capture-matrix.json`** — the DL-13 v1 default mobile matrix: ≥1 iOS phone
  simulator profile (`iphone-15-pro-sim`) + ≥1 Android phone emulator profile
  (`pixel-8-emu`) × the required state set (`default`, `loading`, `empty`,
  `error`, `long_content`, `focused` interaction state). Every row declares its
  expected artifacts (screenshot, baseline_ref, a11y_tree, geometry, visual_diff).
- **`checks/{visual-diff,accessibility,layout-geometry,interaction-state}.json`** —
  the deterministic check set. Visual-diff uses a `pixelmatch`-class comparator
  with explicit thresholds + normalization rules that mask ONLY volatile data
  (timestamps/ids/animation) and **must not mask semantic changes**.
  Accessibility/layout/interaction checks use RN/platform tree + geometry
  metadata. Advisory (LLM/subjective) is explicitly classified advisory-only.
- **`baselines/governance.json`** + **`baselines/proposal/iphone-default.json`** —
  baseline-governance artifacts: identity fields, the proposal/update policy
  (explicit proposal + before/after + diff + metrics + rationale + approval +
  independent validation), and the **forbidden auto-accept / silent-regenerate
  rule**. NO live screenshots committed (pending-live).
- **`evidence/evidence-packet-schema.json`** — the DL-13 semantic evidence fields
  (exact schema syntax owned by DL-02/DL-10).
- **`src/validate/ui-capture.ts`** — the DL-13 metadata/missing-artifact validator
  that fail-closes on missing artifact / silent baseline / E2E-as-UI /
  advisory-hard-block / fake-live.

## Live-boundary honesty (shape-green ≠ truth-green)

No usable iOS simulator device / Android emulator / Maestro / Detox / RN build
exists in this env (see report Stage 1). Therefore the **live mobile UI capture
is `pending-live/BLOCKED`** (DL-13 §mobile capture) — NOT claimed green. Every
matrix row's `capture_status` is `pending-live/BLOCKED`; no baseline PNGs are
committed; the governance + proposal **structure** is the deterministic
deliverable. The validator forces this honesty (W-NEG-FAKE-LIVE).

To unblock the live capture: boot an iOS simulator / Android emulator, build the
RN app, run Maestro/Detox capture, then produce screenshots + RN/platform tree +
geometry + pixelmatch diffs against approved baselines.

## Graph-neutrality

This fixture path is NOT a pnpm workspace member. `pixelmatch`/`axe-core` appear
ONLY as **modeled/peer** declarations — never resolved/installed. No graph edge,
no install, no lockfile edit (mirrors the green I-16A/I-16B fixture precedent).

## Runner

```sh
node --experimental-strip-types examples/starter-reference/generated-fixtures/e2e-ui/mobile/run-ui-witness.mjs
# negative witnesses (fail-closed probes):
node --experimental-strip-types examples/starter-reference/generated-fixtures/e2e-ui/mobile/run-ui-witness.mjs --neg=missing-artifact
node --experimental-strip-types examples/starter-reference/generated-fixtures/e2e-ui/mobile/run-ui-witness.mjs --neg=silent-baseline
node --experimental-strip-types examples/starter-reference/generated-fixtures/e2e-ui/mobile/run-ui-witness.mjs --neg=e2e-as-ui
node --experimental-strip-types examples/starter-reference/generated-fixtures/e2e-ui/mobile/run-ui-witness.mjs --neg=advisory-hard-block
node --experimental-strip-types examples/starter-reference/generated-fixtures/e2e-ui/mobile/run-ui-witness.mjs --neg=fake-live
```
