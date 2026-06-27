# @sample @demo @reference — golden-mobile fixture (I-17B / DL-12 / DL-16 / DL-20A)

The generated **mobile behavior-E2E layer** for the starter golden-records
React Native surface — the load-bearing mobile half of `I-17` that `I-19`
(observability) and `I-23` (end-to-end witness) consume (brief §1).

## What this fixture is

Per **DL-12 (LOCKED)** mobile E2E uses **both** Maestro and Detox:

- **Maestro** is the default black-box user-flow layer (app-launch smoke,
  navigate to golden-records, read/render the seeded record list —
  user-observable assertions).
- **Detox** is **required** for synchronization / deterministic-state /
  app-control / internals-sensitive RN flows (deterministic RN state reset +
  synchronized wait on the golden-records list render).
- A high-risk user-visible scenario with a Detox-required trigger is split
  into complementary Maestro (black-box acceptance) + Detox (deterministic
  sync) coverage as `runner: both`.

Every generated scenario carries the **14 DL-12 semantic selection-metadata
fields** (`scenario_id`, `scenario_title`, `runner`, `runner_selection_rationale`,
`coverage_intent`, `target_platforms`, `required_app_state`, `device_assumptions`,
`app_build_ref`, `artifact_expectations`, `flake_policy_ref`, `owner_lane`,
`evidence_consumer`, `live_proof_status`) under `metadata/`, and the
`src/validate/selection-metadata.ts` validator encodes the **DL-12 selection
algorithm + conflict policy** and fail-closes on every DL-12 negative witness.

## No-fork RN consumption seam (DL-14 §5; DL-16 §60)

`src/consumption/golden-records.rn-consumption.ts` proves the mobile-E2E
surface targets the **SAME** golden-records RN screen that imports the **I-16B
shared client** (`useGoldenRecords` + `createMobileTransport`). It derives /
imports — it does **not** duplicate the client, the contract, any DTO, or any
Zod schema (DL-14 §5; DL-16 §60; W-NO-FORK enforced by the runner grep).

## Live-boundary honesty (shape-green ≠ truth-green)

This environment has **no usable iOS simulator device, no Android emulator,
no `maestro` binary, no `detox` binary, and no live RN bundle/build/server**
(see `.vibe/work/I-17B-mobile-e2e-ui-verification/I-17B-implementation-report.md`
Stage 1 probe). Therefore the **live device-driven Maestro/Detox run is
`pending-live/BLOCKED`** (DL-12 §device/CI; DL-13 §mobile; brief §1) — it is
**NOT** claimed green. The generated Maestro YAML + Detox specs are
**structurally valid** against their real tool APIs/schema but are **not** run
live here.

The deterministic truth-green scope of I-17B = everything reachable without a
live device: generated flows structurally valid, DL-12 selection-metadata
present/well-formed/conflict-free, both-runner split-coverage present, no-fork
seam proven, positive/negative/regression witnesses run **real** against the
generated artifacts by `run-mobile-witness.mjs`.

To unblock the live run: install an iOS Simulator runtime + boot a phone
profile (or install Android SDK + system image + `emulator -avd`), install the
Maestro CLI, add the RN `detox` toolchain + a built app binary, run `metro`
bundle + app build, then execute the generated flows against the real device.

## Graph-neutrality

This fixture path is **NOT** a pnpm workspace member. Maestro / Detox /
react-native appear ONLY as **modeled/peer** declarations in `package.json`
and are never resolved/installed. No graph edge, no install, no lockfile edit
(mirrors the green I-16A/I-16B fixture precedent). The validator runs real
against structural/metadata artifacts.

## Runner

```sh
node --experimental-strip-types examples/starter-reference/generated-fixtures/golden-mobile/run-mobile-witness.mjs
# negative witnesses (fail-closed probes):
node --experimental-strip-types examples/starter-reference/generated-fixtures/golden-mobile/run-mobile-witness.mjs --neg=sel-conflict
node --experimental-strip-types examples/starter-reference/generated-fixtures/golden-mobile/run-mobile-witness.mjs --neg=missing-metadata
node --experimental-strip-types examples/starter-reference/generated-fixtures/golden-mobile/run-mobile-witness.mjs --neg=maestro-only-policy
node --experimental-strip-types examples/starter-reference/generated-fixtures/golden-mobile/run-mobile-witness.mjs --neg=detox-only-policy
node --experimental-strip-types examples/starter-reference/generated-fixtures/golden-mobile/run-mobile-witness.mjs --neg=fake-live
```
