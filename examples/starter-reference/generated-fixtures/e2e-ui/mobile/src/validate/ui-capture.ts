// @sample @demo @reference — DL-13 UI-verification capture/baseline validator (I-17B).
//
// THE LOAD-BEARING DETERMINISTIC CORE of the e2e-ui/mobile lane. Encodes the
// DL-13 hard/advisory boundary + missing-artifact-fails-closed + baseline-
// governance rules and FAIL-CLOSES on every DL-13 negative witness:
//   W-NEG-MISSING-ARTIFACT   — a required matrix row missing a screenshot/
//                              baseline/a11y/tree/geometry artifact declaration.
//   W-NEG-SILENT-BASELINE    — an auto-accept / silent-regenerate / auto-update
//                              baseline path present.
//   W-NEG-E2E-AS-UI          — E2E-pass-alone encoded as UI-verification closure.
//   W-NEG-ADVISORY-HARD-BLOCK— an LLM/subjective-only check classified as a
//                              deterministic hard block.
//   W-NEG-FAKE-LIVE          — a capture claiming live green without a real device.
//
// Plus DL-13 positive structure: ≥1 iOS sim + ≥1 Android emu device profile × the
// required state set; every row declares expected artifacts; check set correctly
// classified deterministic/advisory; baseline-governance identity + policy present;
// normalization must-not-mask-semantic.
//
// PURE function over declarative artifacts — runs REAL against the capture-matrix/
// checks/baselines (NO mock/synthetic green).

export interface UiCaptureValidationError {
  scope: string;
  rule: string;
  detail: string;
}
export interface UiCaptureValidationResult {
  ok: boolean;
  errors: UiCaptureValidationError[];
}

const REQUIRED_STATES = ["default", "loading", "empty", "error", "long_content"] as const;
const INTERACTION_STATES = ["focused", "hovered", "pressed", "selected", "disabled", "overlay_open", "keyboard_visible"] as const;
const REQUIRED_DEVICE_PLATFORMS = ["ios_simulator", "android_emulator"] as const;
const REQUIRED_ARTIFACT_KINDS = ["screenshot", "baseline_ref", "a11y_tree", "geometry", "visual_diff"] as const;
const VOLATILE_MASK_TARGETS = ["timestamps", "random_ids", "cursors", "animation_frames", "network_latency_indicators", "os_rendering_noise"];
const SEMANTIC_FORBIDDEN_MASKS = ["semantic.missing_elements", "semantic.clipping", "semantic.overlap", "semantic.accessibility", "semantic.layout", "missing_elements", "clipping", "overlap", "accessibility", "layout"];
const DETERMINISTIC_CHECK_IDS = ["visual-diff", "accessibility", "layout-geometry", "interaction-state"];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Validate the DL-13 mobile UI-verification carrier artifacts.
 *
 * `envProbe.liveDeviceCaptureAvailable` — when false (the pending-live env), any
 * row whose capture_status claims a live-captured/green state is rejected
 * (W-NEG-FAKE-LIVE); rows MUST be pending-live/BLOCKED until a real device run.
 */
export function validateUiCapture(
  matrix: unknown,
  checks: Record<string, unknown>,
  baselines: Record<string, unknown>,
  opts: { liveDeviceCaptureAvailable: boolean }
): UiCaptureValidationResult {
  const errors: UiCaptureValidationError[] = [];

  // --- matrix structure ---
  if (!isObj(matrix)) {
    return { ok: false, errors: [{ scope: "matrix", rule: "W-NEG-MISSING-ARTIFACT", detail: "capture-matrix is not an object" }] };
  }
  const closureBasis = matrix.closure_basis;
  if (closureBasis !== "ui_verification") {
    // E2E-pass-alone encoded as UI closure (or any non-ui basis).
    if (closureBasis === "e2e_pass" || closureBasis === "behavior_e2e_pass") {
      errors.push({ scope: "matrix", rule: "W-NEG-E2E-AS-UI", detail: `closure_basis='${String(closureBasis)}' — E2E-pass-alone does not close UI verification (DL-13 §5.8)` });
    } else {
      errors.push({ scope: "matrix", rule: "W-NEG-MISSING-ARTIFACT", detail: `closure_basis='${String(closureBasis)}' must be 'ui_verification'` });
    }
  }

  const deviceProfiles = Array.isArray(matrix.device_profiles) ? (matrix.device_profiles as Record<string, unknown>[]) : [];
  if (deviceProfiles.length === 0) {
    errors.push({ scope: "matrix.device_profiles", rule: "W-NEG-MISSING-ARTIFACT", detail: "no device_profiles declared" });
  }
  const platformSet = new Set(deviceProfiles.map((d) => d.platform));
  for (const p of REQUIRED_DEVICE_PLATFORMS) {
    if (!platformSet.has(p)) {
      errors.push({ scope: "matrix.device_profiles", rule: "W-NEG-MISSING-ARTIFACT", detail: `missing required device profile platform '${p}' (DL-13 requires ≥1 iOS sim + ≥1 Android emu)` });
    }
  }

  const stateIds = Array.isArray(matrix.state_profiles) ? new Set((matrix.state_profiles as Record<string, unknown>[]).map((s) => s.state_id)) : new Set();
  for (const s of REQUIRED_STATES) {
    if (!stateIds.has(s)) {
      errors.push({ scope: "matrix.state_profiles", rule: "W-NEG-MISSING-ARTIFACT", detail: `missing required state profile '${s}'` });
    }
  }
  const hasInteractionState = [...stateIds].some((s) => (INTERACTION_STATES as readonly string[]).includes(String(s)));
  if (!hasInteractionState) {
    errors.push({ scope: "matrix.state_profiles", rule: "W-NEG-MISSING-ARTIFACT", detail: "missing ≥1 interaction state (focused/pressed/disabled/...) (DL-13)" });
  }

  // --- rows: every required row declares all expected artifacts ---
  const rows = Array.isArray(matrix.rows) ? (matrix.rows as Record<string, unknown>[]) : [];
  if (rows.length === 0) {
    errors.push({ scope: "matrix.rows", rule: "W-NEG-MISSING-ARTIFACT", detail: "no matrix rows declared" });
  }
  for (const row of rows) {
    const rowId = isNonEmptyString(row.row_id) ? row.row_id : "<row>";
    const expected = row.expected_artifacts;
    if (!isObj(expected)) {
      errors.push({ scope: `matrix.rows.${rowId}`, rule: "W-NEG-MISSING-ARTIFACT", detail: "expected_artifacts missing/not-structured" });
      continue;
    }
    for (const kind of REQUIRED_ARTIFACT_KINDS) {
      if (!(kind in expected) || expected[kind] === undefined || expected[kind] === null || expected[kind] === false) {
        // baseline_ref may be a first-baseline-proposal ref string OR true; missing entirely = hard fail.
        errors.push({ scope: `matrix.rows.${rowId}`, rule: "W-NEG-MISSING-ARTIFACT", detail: `required artifact '${kind}' not declared (DL-13: missing artifact = hard failure)` });
      }
    }
    // capture_status honesty (W-NEG-FAKE-LIVE)
    const status = String(row.capture_status ?? "");
    if (!opts.liveDeviceCaptureAvailable) {
      if (status !== "pending-live/BLOCKED") {
        errors.push({ scope: `matrix.rows.${rowId}`, rule: "W-NEG-FAKE-LIVE", detail: `capture_status='${status}' claims live capture in a pending-live env (no device) — must be pending-live/BLOCKED` });
      }
    }
  }

  // --- checks: deterministic/advisory classification ---
  if (!isObj(checks)) {
    errors.push({ scope: "checks", rule: "W-NEG-MISSING-ARTIFACT", detail: "checks set is not an object" });
  } else {
    for (const id of DETERMINISTIC_CHECK_IDS) {
      const c = checks[id];
      if (!isObj(c)) {
        errors.push({ scope: `checks.${id}`, rule: "W-NEG-MISSING-ARTIFACT", detail: `deterministic check '${id}' missing` });
        continue;
      }
      const classification = c.classification;
      if (classification !== "deterministic") {
        errors.push({ scope: `checks.${id}`, rule: "W-NEG-ADVISORY-HARD-BLOCK", detail: `check '${id}' must be classification 'deterministic' (got '${String(classification)}')` });
      }
      // An advisory-classified check that claims hard_block is forbidden.
    }
    // Any advisory check that claims hard_block: true → W-NEG-ADVISORY-HARD-BLOCK.
    for (const [id, c] of Object.entries(checks)) {
      if (!isObj(c)) continue;
      if (c.classification === "advisory" && c.hard_block === true) {
        errors.push({ scope: `checks.${id}`, rule: "W-NEG-ADVISORY-HARD-BLOCK", detail: `advisory check '${id}' claims hard_block=true — advisory may not be the sole hard block (DL-13)` });
      }
    }
    // visual-diff normalization must-not-mask-semantic.
    const vd = checks["visual-diff"];
    if (isObj(vd)) {
      const norm = isObj(vd.normalization) ? vd.normalization : {};
      const rules = Array.isArray(norm.rules) ? (norm.rules as Record<string, unknown>[]) : [];
      const targets = rules.map((r) => String(r.target ?? ""));
      const forbiddenHit = targets.find((t) => SEMANTIC_FORBIDDEN_MASKS.some((f) => t.includes(f)));
      if (forbiddenHit) {
        errors.push({ scope: "checks.visual-diff.normalization", rule: "W-NEG-MISSING-ARTIFACT", detail: `normalization rule '${forbiddenHit}' would mask a semantic change (DL-13 forbids)` });
      }
      if (norm.must_not_mask_semantic_change !== true) {
        errors.push({ scope: "checks.visual-diff.normalization", rule: "W-NEG-MISSING-ARTIFACT", detail: "normalization.must_not_mask_semantic_change must be true (DL-13)" });
      }
    }
  }

  // --- baseline governance ---
  if (!isObj(baselines)) {
    errors.push({ scope: "baselines", rule: "W-NEG-SILENT-BASELINE", detail: "baseline governance missing" });
  } else {
    const gov = isObj(baselines.governance) ? baselines.governance : (isObj(baselines) ? baselines : {});
    const fa = isObj(gov.forbidden_auto_accept) ? gov.forbidden_auto_accept : (isObj((gov as Record<string, unknown>).forbidden_auto_accept) ? (gov as Record<string, unknown>).forbidden_auto_accept as Record<string, unknown> : {});
    if (fa.auto_accept_allowed === true || fa.auto_regenerate_allowed === true || fa.silent_update_allowed === true) {
      errors.push({ scope: "baselines.governance", rule: "W-NEG-SILENT-BASELINE", detail: "forbidden_auto_accept permits auto-accept/regenerate/silent-update (DL-13 forbids)" });
    }
    const identityFields = Array.isArray(gov.identity_fields_required) ? (gov.identity_fields_required as string[]) : [];
    const requiredIdentity = ["app", "state_id", "device_profile", "theme", "locale", "text_scale", "data_fixture", "screenshot_dimensions", "comparator_version", "normalization_rules", "approved_source"];
    const missingIdentity = requiredIdentity.filter((f) => !identityFields.includes(f));
    if (missingIdentity.length > 0) {
      errors.push({ scope: "baselines.governance", rule: "W-NEG-MISSING-ARTIFACT", detail: `baseline identity missing fields: ${missingIdentity.join(", ")}` });
    }
    const approval = isObj(gov.approval_policy) ? gov.approval_policy : {};
    if (approval.initial_creation_is_not_automatic_pass !== true) {
      errors.push({ scope: "baselines.governance", rule: "W-NEG-SILENT-BASELINE", detail: "approval_policy.initial_creation_is_not_automatic_pass must be true (DL-13)" });
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Negative-witness fixture factory (W-NEG-* probes).
// ---------------------------------------------------------------------------

export type UiNegativeWitnessId =
  | "missing-artifact"
  | "silent-baseline"
  | "e2e-as-ui"
  | "advisory-hard-block"
  | "fake-live";

export interface UiNegInput {
  matrix: Record<string, unknown>;
  checks: Record<string, unknown>;
  baselines: Record<string, unknown>;
  expectRule: string;
  expectDetailContains: string;
}

const VALID_CHECKS = {
  "visual-diff": { classification: "deterministic", hard_block: true, normalization: { rules: [{ target: "volatile.timestamps", action: "mask" }], must_not_mask_semantic_change: true } },
  accessibility: { classification: "deterministic", hard_block: true },
  "layout-geometry": { classification: "deterministic", hard_block: true },
  "interaction-state": { classification: "deterministic", hard_block: true }
};

const VALID_BASELINES = {
  identity_fields_required: ["app", "state_id", "device_profile", "theme", "locale", "text_scale", "data_fixture", "screenshot_dimensions", "comparator_version", "normalization_rules", "approved_source"],
  approval_policy: { initial_creation_is_not_automatic_pass: true },
  forbidden_auto_accept: { auto_accept_allowed: false, auto_regenerate_allowed: false, silent_update_allowed: false }
};

function validMatrix(): Record<string, unknown> {
  return {
    closure_basis: "ui_verification",
    device_profiles: [
      { device_id: "iphone", platform: "ios_simulator" },
      { device_id: "pixel", platform: "android_emulator" }
    ],
    state_profiles: [
      { state_id: "default" }, { state_id: "loading" }, { state_id: "empty" },
      { state_id: "error" }, { state_id: "long_content" }, { state_id: "focused" }
    ],
    rows: [
      { row_id: "r1", device_id: "iphone", state_id: "default", capture_status: "pending-live/BLOCKED",
        expected_artifacts: { screenshot: true, baseline_ref: "p.json", a11y_tree: true, geometry: true, visual_diff: true } }
    ]
  };
}

export function uiNegativeWitness(id: UiNegativeWitnessId): UiNegInput {
  const base = (clone: Record<string, unknown>) => ({ matrix: clone, checks: JSON.parse(JSON.stringify(VALID_CHECKS)) as Record<string, unknown>, baselines: JSON.parse(JSON.stringify(VALID_BASELINES)) as Record<string, unknown> });
  switch (id) {
    case "missing-artifact": {
      const m = validMatrix();
      (m.rows as Record<string, unknown>[])[0]!.expected_artifacts = { screenshot: true, baseline_ref: "p.json", a11y_tree: true, geometry: true /* visual_diff missing */ };
      return { ...base(m), expectRule: "W-NEG-MISSING-ARTIFACT", expectDetailContains: "visual_diff" };
    }
    case "silent-baseline": {
      const b = JSON.parse(JSON.stringify(VALID_BASELINES)) as Record<string, unknown>;
      (b.forbidden_auto_accept as Record<string, unknown>).auto_accept_allowed = true;
      return { matrix: validMatrix(), checks: JSON.parse(JSON.stringify(VALID_CHECKS)) as Record<string, unknown>, baselines: b, expectRule: "W-NEG-SILENT-BASELINE", expectDetailContains: "auto-accept" };
    }
    case "e2e-as-ui": {
      const m = validMatrix();
      m.closure_basis = "e2e_pass";
      return { ...base(m), expectRule: "W-NEG-E2E-AS-UI", expectDetailContains: "E2E-pass-alone" };
    }
    case "advisory-hard-block": {
      const c = JSON.parse(JSON.stringify(VALID_CHECKS)) as Record<string, unknown>;
      c["llm-vibe-check"] = { classification: "advisory", hard_block: true };
      return { matrix: validMatrix(), checks: c, baselines: JSON.parse(JSON.stringify(VALID_BASELINES)) as Record<string, unknown>, expectRule: "W-NEG-ADVISORY-HARD-BLOCK", expectDetailContains: "advisory" };
    }
    case "fake-live": {
      const m = validMatrix();
      (m.rows as Record<string, unknown>[])[0]!.capture_status = "captured-green";
      return { ...base(m), expectRule: "W-NEG-FAKE-LIVE", expectDetailContains: "claims live capture" };
    }
  }
}
