// @sample @demo @reference — DL-12 runner-selection + conflict validator (I-17B / DL-12).
//
// THE LOAD-BEARING DETERMINISTIC CORE of the golden-mobile lane. Encodes the
// DL-12 selection algorithm (steps 1–6) + conflict policy and FAIL-CLOSES on
// every DL-12 negative witness:
//   W-NEG-SEL-CONFLICT       — Detox-required trigger present but runner: maestro-only.
//   W-NEG-MISSING-METADATA   — any of the 14 DL-12 fields missing/malformed.
//   W-NEG-MAESTRO-ONLY-POLICY— fixture/policy downgrades Detox to advisory/absent
//                              (no Detox-required/both scenario present).
//   W-NEG-DETOX-ONLY-POLICY  — fixture/policy downgrades Maestro to advisory/absent
//                              (no Maestro-default/both scenario present).
//   W-NEG-FAKE-LIVE          — live_proof_status claims proven green without real
//                              device evidence (forced pending-live/BLOCKED here).
//
// Plus DL-12 selection-algorithm validation: target_platforms / required_app_state /
// device_assumptions / artifact_expectations compatibility with the selected
// runner(s); both-mode split coverage (NOT a duplicate shallow smoke); Detox-only
// for a high-risk user-visible scenario without equivalent black-box proof.
//
// This is a PURE function over declarative metadata — it runs REAL against the
// generated metadata artifacts (NO mock/synthetic green). Negative witnesses are
// exercised by the runner via `runNegativeScenario(id)` which injects a
// deliberately-broken scenario and confirms the validator fail-closes.

export type Runner = "maestro" | "detox" | "both";
export type CoverageIntent =
  | "black_box_user_flow"
  | "synchronization_control"
  | "app_lifecycle_control"
  | "native_module_control"
  | "state_reset_or_fixture";
export type TargetPlatform = "ios_simulator" | "android_emulator" | "physical_device";
export type LiveProofStatus =
  | "not_run"
  | "required_before_closure"
  | "proven_by"
  | "pending-live/BLOCKED";

export type DetoxRequiredTrigger =
  | "rn_sync_bridge_timing_load_bearing" // DL-12 Detox-required #1
  | "deterministic_state_reset_or_fixture" // #2
  | "native_module_lifecycle_deeplink_push_permission_keyboard" // #3
  | "precise_wait_on_rn_state" // #4
  | "prior_failure_maestro_cannot_distinguish"; // #5

/** The 14 DL-12 required semantic fields (+ declarative trigger inputs). */
export interface SelectionMetadata {
  scenario_id: string;
  scenario_title: string;
  runner: Runner;
  runner_selection_rationale: string;
  coverage_intent: CoverageIntent | CoverageIntent[];
  target_platforms: TargetPlatform[];
  required_app_state: unknown;
  device_assumptions: unknown;
  app_build_ref: string;
  artifact_expectations: unknown;
  flake_policy_ref: string;
  owner_lane: string;
  evidence_consumer: string;
  live_proof_status: string;
  // declarative trigger inputs consumed by the algorithm (not DL-12 fields):
  maestro_default_criteria?: Record<string, boolean>;
  detox_required_triggers?: DetoxRequiredTrigger[];
  high_risk_user_visible?: boolean;
  equivalent_black_box_proof_ref?: string | null;
}

export interface SelectionValidationError {
  scenario_id: string;
  rule: string;
  detail: string;
}

export interface SelectionValidationResult {
  ok: boolean;
  errors: SelectionValidationError[];
}

const RUNNERS: readonly Runner[] = ["maestro", "detox", "both"];
const COVERAGE_INTENTS: readonly CoverageIntent[] = [
  "black_box_user_flow",
  "synchronization_control",
  "app_lifecycle_control",
  "native_module_control",
  "state_reset_or_fixture"
];
const DETOX_TRIGGERS: readonly string[] = [
  "rn_sync_bridge_timing_load_bearing",
  "deterministic_state_reset_or_fixture",
  "native_module_lifecycle_deeplink_push_permission_keyboard",
  "precise_wait_on_rn_state",
  "prior_failure_maestro_cannot_distinguish"
];
const REQUIRED_PLATFORMS: readonly TargetPlatform[] = ["ios_simulator", "android_emulator"];

const DETOX_INTENTS: readonly CoverageIntent[] = [
  "synchronization_control",
  "app_lifecycle_control",
  "native_module_control",
  "state_reset_or_fixture"
];

function isString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

/**
 * Validate a single scenario's metadata against the DL-12 selection algorithm +
 * conflict policy. Returns the list of rule violations (empty = valid).
 *
 * `allowLiveProofProven` — when false (the pending-live env), any
 * `live_proof_status` claiming `proven_by` is rejected (W-NEG-FAKE-LIVE). The
 * runner forces this false; real-device closure lanes may pass true later.
 */
export function validateOneScenario(
  raw: unknown,
  opts: { allowLiveProofProven: boolean }
): SelectionValidationError[] {
  const errors: SelectionValidationError[] = [];
  const m = raw as Partial<SelectionMetadata> & Record<string, unknown>;
  const sid = isString(m.scenario_id) ? m.scenario_id : "<unknown>";

  const requiredStringFields: (keyof SelectionMetadata)[] = [
    "scenario_id",
    "scenario_title",
    "runner_selection_rationale",
    "app_build_ref",
    "flake_policy_ref",
    "owner_lane",
    "evidence_consumer"
  ];
  for (const f of requiredStringFields) {
    if (!isString(m[f])) {
      errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: `field '${String(f)}' missing/empty` });
    }
  }

  // runner ∈ {maestro,detox,both}
  if (!RUNNERS.includes(m.runner as Runner)) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: `runner '${String(m.runner)}' not in {maestro,detox,both}` });
  }
  const runner = m.runner as Runner;

  // target_platforms: non-empty subset incl. ≥1 of ios_simulator/android_emulator
  const platforms = m.target_platforms;
  if (!isNonEmptyArray(platforms) || !platforms.every((p) => REQUIRED_PLATFORMS.includes(p as TargetPlatform) || p === "physical_device")) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: "target_platforms must be a non-empty subset of {ios_simulator,android_emulator[,physical_device]}" });
  } else if (!platforms.some((p) => REQUIRED_PLATFORMS.includes(p as TargetPlatform))) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: "target_platforms must include ≥1 of ios_simulator/android_emulator" });
  }

  // required_app_state / device_assumptions / artifact_expectations must be present objects/arrays
  for (const f of ["required_app_state", "device_assumptions", "artifact_expectations"] as const) {
    const v = m[f];
    if (v === null || v === undefined || (typeof v !== "object" && !Array.isArray(v))) {
      errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: `field '${f}' missing/not-structured` });
    } else if (Array.isArray(v) ? v.length === 0 : false) {
      errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: `field '${f}' empty` });
    }
  }

  // live_proof_status
  const lps = m.live_proof_status;
  if (!isString(lps)) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: "live_proof_status missing" });
  } else if (lps.startsWith("proven_by")) {
    if (!opts.allowLiveProofProven) {
      errors.push({ scenario_id: sid, rule: "W-NEG-FAKE-LIVE", detail: "live_proof_status claims proven_by without real device evidence in a pending-live env" });
    }
  } else if (lps !== "not_run" && lps !== "required_before_closure" && lps !== "pending-live/BLOCKED") {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: `live_proof_status '${lps}' not a DL-12 value` });
  }

  // coverage_intent ∈ allowed set
  const ciRaw = m.coverage_intent;
  const ciArr: CoverageIntent[] = [];
  if (typeof ciRaw === "string") ciArr.push(ciRaw as CoverageIntent);
  else if (Array.isArray(ciRaw)) ciArr.push(...(ciRaw as CoverageIntent[]));
  else errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: "coverage_intent missing" });
  if (ciArr.length === 0 || !ciArr.every((c) => COVERAGE_INTENTS.includes(c))) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: `coverage_intent '${JSON.stringify(ciRaw)}' not in DL-12 allowed set` });
  }

  // runner_selection_rationale must cite an exact DL-12 category (not a filename/prose guess)
  const rationale = isString(m.runner_selection_rationale) ? m.runner_selection_rationale : "";
  if (rationale && !/DL-12/i.test(rationale)) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: "runner_selection_rationale does not cite a DL-12 category" });
  }

  // declarative triggers must be known ids
  const triggers = Array.isArray(m.detox_required_triggers) ? (m.detox_required_triggers as string[]) : [];
  if (triggers.some((t) => !DETOX_TRIGGERS.includes(t))) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: `detox_required_triggers has unknown id: ${JSON.stringify(triggers)}` });
  }
  const hasDetoxTrigger = triggers.length > 0;

  // --- DL-12 conflict policy (selection algorithm) ---

  // Rule 1: if any Detox-required trigger is present, runner may NOT be maestro-only.
  if (hasDetoxTrigger && runner === "maestro") {
    errors.push({ scenario_id: sid, rule: "W-NEG-SEL-CONFLICT", detail: "Detox-required trigger(s) present but runner=maestro-only — DL-12 conflict: must be detox or both" });
  }

  // Rule 2: high-risk user-visible + Detox-only without equivalent black-box proof.
  const highRisk = m.high_risk_user_visible === true;
  const equivRef = m.equivalent_black_box_proof_ref;
  if (highRisk && runner === "detox" && !isString(equivRef)) {
    errors.push({ scenario_id: sid, rule: "W-NEG-SEL-CONFLICT", detail: "high-risk user-visible scenario is Detox-only without an equivalent_black_box_proof_ref — DL-12 requires equivalent user-observable proof" });
  }

  // Rule 3: both-mode split coverage (NOT a duplicate shallow smoke).
  if (runner === "both") {
    if (!hasDetoxTrigger) {
      errors.push({ scenario_id: sid, rule: "W-NEG-SEL-CONFLICT", detail: "runner=both but no Detox-required trigger present — both-mode requires a genuine Detox-required risk" });
    }
    if (ciArr.length < 2) {
      errors.push({ scenario_id: sid, rule: "W-NEG-SEL-CONFLICT", detail: "runner=both but coverage_intent is not split — must include black_box_user_flow + a Detox intent" });
    } else {
      if (!ciArr.includes("black_box_user_flow")) {
        errors.push({ scenario_id: sid, rule: "W-NEG-SEL-CONFLICT", detail: "runner=both but coverage_intent lacks the Maestro black_box_user_flow half" });
      }
      if (!ciArr.some((c) => DETOX_INTENTS.includes(c))) {
        errors.push({ scenario_id: sid, rule: "W-NEG-SEL-CONFLICT", detail: "runner=both but coverage_intent lacks a Detox synchronization/control half" });
      }
    }
  }

  // Rule 4: a maestro runner must be a genuine black-box flow (no Detox trigger).
  if (runner === "maestro" && hasDetoxTrigger) {
    // already covered by Rule 1, but keep an explicit signal
  }

  // Rule 5: compatibility — artifact_expectations must reference the selected runner(s)' artifacts.
  const ae = JSON.stringify(m.artifact_expectations ?? "");
  if (runner === "maestro" && !/maestro/i.test(ae)) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: "runner=maestro but artifact_expectations has no maestro artifact reference" });
  }
  if (runner === "detox" && !/detox/i.test(ae)) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: "runner=detox but artifact_expectations has no detox artifact reference" });
  }
  if (runner === "both" && (!/maestro/i.test(ae) || !/detox/i.test(ae))) {
    errors.push({ scenario_id: sid, rule: "W-NEG-MISSING-METADATA", detail: "runner=both but artifact_expectations must reference both maestro + detox artifacts" });
  }

  return errors;
}

/**
 * Validate a whole collection: per-scenario DL-12 selection/conflict rules PLUS
 * the DL-12 negative-policy witnesses:
 *   W-NEG-MAESTRO-ONLY-POLICY — collection must include ≥1 Detox-covered scenario
 *                               (runner detox or both) so Detox is not advisory/absent.
 *   W-NEG-DETOX-ONLY-POLICY  — collection must include ≥1 Maestro-covered scenario
 *                               (runner maestro or both) so Maestro is not advisory/absent,
 *                               AND ≥1 both-mode split-coverage scenario.
 */
export function validateSelectionMetadata(
  scenarios: unknown[],
  opts: { allowLiveProofProven: boolean }
): SelectionValidationResult {
  const errors: SelectionValidationError[] = [];
  if (!isNonEmptyArray(scenarios)) {
    return { ok: false, errors: [{ scenario_id: "<collection>", rule: "W-NEG-MISSING-METADATA", detail: "no scenarios provided" }] };
  }
  for (const raw of scenarios) {
    errors.push(...validateOneScenario(raw, opts));
  }

  const validScenarios = scenarios as (Partial<SelectionMetadata> & Record<string, unknown>)[];
  // Only count scenarios that are individually valid for the policy-level witnesses
  // (a broken scenario's runner must not be trusted to satisfy policy).
  const individuallyClean = validScenarios.filter(
    (s) => validateOneScenario(s, opts).length === 0
  );
  const hasDetoxCovered = individuallyClean.some((s) => s.runner === "detox" || s.runner === "both");
  const hasMaestroCovered = individuallyClean.some((s) => s.runner === "maestro" || s.runner === "both");
  const hasBothSplit = individuallyClean.some((s) => s.runner === "both");

  if (!hasDetoxCovered) {
    errors.push({ scenario_id: "<collection>", rule: "W-NEG-MAESTRO-ONLY-POLICY", detail: "collection downgrades Detox to advisory/absent: no detox/both scenario present (DL-12 locks both runners)" });
  }
  if (!hasMaestroCovered) {
    errors.push({ scenario_id: "<collection>", rule: "W-NEG-DETOX-ONLY-POLICY", detail: "collection downgrades Maestro to advisory/absent: no maestro/both scenario present (DL-12 locks both runners)" });
  }
  if (!hasBothSplit) {
    errors.push({ scenario_id: "<collection>", rule: "W-NEG-DETOX-ONLY-POLICY", detail: "collection has no runner=both split-coverage scenario (DL-12 requires both-mode support)" });
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Negative-witness fixture factory (W-NEG-* probes). Returns a deliberately
// broken scenario/collection so the runner can confirm the validator fail-closes
// with the expected rule + diagnostic. These are NOT valid metadata — they exist
// only to prove the gates are load-bearing.
// ---------------------------------------------------------------------------

export type NegativeWitnessId =
  | "sel-conflict"
  | "missing-metadata"
  | "maestro-only-policy"
  | "detox-only-policy"
  | "fake-live";

const VALID_BASE: SelectionMetadata = {
  scenario_id: "GR-NEG-base",
  scenario_title: "Negative base",
  runner: "maestro",
  runner_selection_rationale: "DL-12 Maestro-default category: black-box user journey.",
  coverage_intent: "black_box_user_flow",
  target_platforms: ["ios_simulator", "android_emulator"],
  required_app_state: { kind: "installed_seeded_app", reset: "clearState on launch", fixture_ref: "golden-records seeded list", owner: "I-16B" },
  device_assumptions: { runtime_family: ["ios", "android"], orientation: "portrait", locale: "en-US", text_scale: "default" },
  app_build_ref: "apps/mobile built RN binary",
  artifact_expectations: ["screenshot:launch", "maestro-runner.log", "device.log"],
  flake_policy_ref: "DL-10/DL-12 deterministic-failure-hard-blocks",
  owner_lane: "I-17B-mobile-e2e-ui-verification",
  evidence_consumer: "verification runner / build / ship / I-23",
  live_proof_status: "pending-live/BLOCKED",
  maestro_default_criteria: { primarily_black_box_user_journey: true, setup_via_public_app_entry_no_rn_internals: true, assertions_user_observable: true, no_rn_sync_or_state_reset_required: true },
  detox_required_triggers: [],
  high_risk_user_visible: false,
  equivalent_black_box_proof_ref: null
};

const VALID_DETOX: SelectionMetadata = {
  ...VALID_BASE,
  scenario_id: "GR-NEG-detox",
  runner: "detox",
  runner_selection_rationale: "DL-12 Detox-required category #2: deterministic state reset; #4: precise wait on RN state.",
  coverage_intent: "state_reset_or_fixture",
  artifact_expectations: ["detox-runner.log", "screenshot:reset", "device.log", "rn-tree-state.json"],
  maestro_default_criteria: { primarily_black_box_user_journey: false, setup_via_public_app_entry_no_rn_internals: false, assertions_user_observable: false, no_rn_sync_or_state_reset_required: false },
  detox_required_triggers: ["deterministic_state_reset_or_fixture", "precise_wait_on_rn_state"]
};

const VALID_BOTH: SelectionMetadata = {
  ...VALID_BASE,
  scenario_id: "GR-NEG-both",
  runner: "both",
  runner_selection_rationale: "DL-12 BOTH mode: user-visible acceptance + Detox-required trigger #1 RN sync.",
  coverage_intent: ["black_box_user_flow", "synchronization_control"],
  artifact_expectations: ["maestro: screenshot, maestro-runner.log", "detox: detox-runner.log, rn-tree-state.json"],
  maestro_default_criteria: { primarily_black_box_user_journey: true, setup_via_public_app_entry_no_rn_internals: true, assertions_user_observable: true, no_rn_sync_or_state_reset_required: false },
  detox_required_triggers: ["rn_sync_bridge_timing_load_bearing"],
  high_risk_user_visible: true,
  equivalent_black_box_proof_ref: "e2e/maestro/gr-03-reload-reread-maestro-half.yaml"
};

/**
 * Returns the deliberately-broken scenario(s) for a negative witness, the rule
 * the validator MUST fire, and a substring of the expected diagnostic.
 */
export function negativeWitness(id: NegativeWitnessId): {
  scenarios: unknown[];
  expectRule: string;
  expectDetailContains: string;
} {
  switch (id) {
    case "sel-conflict": {
      // Detox-required trigger present but runner=maestro-only.
      const broken: SelectionMetadata = { ...VALID_BOTH, runner: "maestro", scenario_id: "GR-NEG-sel-conflict" };
      return { scenarios: [VALID_DETOX, VALID_BOTH, broken], expectRule: "W-NEG-SEL-CONFLICT", expectDetailContains: "Detox-required trigger" };
    }
    case "missing-metadata": {
      const broken = { ...VALID_BASE, runner_selection_rationale: "" } as unknown;
      return { scenarios: [VALID_DETOX, VALID_BOTH, broken], expectRule: "W-NEG-MISSING-METADATA", expectDetailContains: "runner_selection_rationale" };
    }
    case "maestro-only-policy": {
      // Collection with NO Detox-covered scenario → Detox advisory/absent.
      const maestroOnly: SelectionMetadata = { ...VALID_BASE };
      return { scenarios: [maestroOnly], expectRule: "W-NEG-MAESTRO-ONLY-POLICY", expectDetailContains: "downgrades Detox" };
    }
    case "detox-only-policy": {
      // Collection with NO Maestro-covered scenario → Maestro advisory/absent.
      return { scenarios: [VALID_DETOX], expectRule: "W-NEG-DETOX-ONLY-POLICY", expectDetailContains: "downgrades Maestro" };
    }
    case "fake-live": {
      const broken: SelectionMetadata = { ...VALID_BASE, scenario_id: "GR-NEG-fake-live", live_proof_status: "proven_by screenshot.png" };
      return { scenarios: [VALID_DETOX, VALID_BOTH, broken], expectRule: "W-NEG-FAKE-LIVE", expectDetailContains: "proven_by without real device" };
    }
  }
}
