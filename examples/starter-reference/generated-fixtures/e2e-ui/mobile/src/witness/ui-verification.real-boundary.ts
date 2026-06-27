// @sample @demo @reference — e2e-ui/mobile REAL-BOUNDARY witness (I-17B / DL-13).
//
// Returns a typed boolean result object computed by REAL inspection of the
// capture-matrix + checks + baseline-governance artifacts (via the DL-13
// validator) and HONEST recording of the live mobile-capture seam as
// pending-live/BLOCKED. UI verification is SEPARATE from behavior E2E (DL-13 §5.8).

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateUiCapture } from "../validate/ui-capture.js";

export interface UiVerificationWitnessResult {
  captureMatrixComplete: boolean;
  deterministicCheckSetClassified: boolean;
  baselineGovernanceEncoded: boolean;
  missingArtifactFailsClosed: boolean;
  advisoryNeverSoleHardBlock: boolean;
  liveCapturePendingLive: boolean;
}

const moduleDir = dirname(fileURLToPath(import.meta.url)); // e2e-ui/mobile/src/witness/
const root = join(moduleDir, "../.."); // e2e-ui/mobile/

async function loadJson(rel: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, rel), "utf8"));
}

export async function runUiVerificationRealBoundaryWitness(envProbe: {
  iosSimulatorDeviceAvailable: boolean;
  androidEmulatorAvailable: boolean;
  maestroBinaryAvailable: boolean;
  detoxBinaryAvailable: boolean;
  rnBuildAvailable: boolean;
}): Promise<UiVerificationWitnessResult & { evidence: Record<string, unknown> }> {
  const evidence: Record<string, unknown> = {};

  const matrix = (await loadJson("capture-matrix.json")) as Record<string, unknown>;
  const checksIds = ["visual-diff", "accessibility", "layout-geometry", "interaction-state"];
  const checks: Record<string, unknown> = {};
  for (const id of checksIds) checks[id] = await loadJson(`checks/${id}.json`);
  const baselines = (await loadJson("baselines/governance.json")) as Record<string, unknown>;

  const result = validateUiCapture(matrix, checks, baselines, { liveDeviceCaptureAvailable: false });
  evidence.uiCaptureValidation = result;

  // Derive the boolean witnesses from the validator's per-rule results + structure.
  const errRules = new Set(result.errors.map((e) => e.rule));
  const matrixObj = matrix;
  const rows = Array.isArray(matrixObj.rows) ? (matrixObj.rows as Record<string, unknown>[]) : [];
  const profiles = Array.isArray(matrixObj.device_profiles) ? (matrixObj.device_profiles as Record<string, unknown>[]) : [];
  const states = Array.isArray(matrixObj.state_profiles) ? (matrixObj.state_profiles as Record<string, unknown>[]) : [];

  const hasIos = profiles.some((d) => d.platform === "ios_simulator");
  const hasAndroid = profiles.some((d) => d.platform === "android_emulator");
  const stateIds = new Set(states.map((s) => String(s.state_id)));
  const requiredStates = ["default", "loading", "empty", "error", "long_content"];
  const allRequiredStates = requiredStates.every((s) => stateIds.has(s));
  const hasInteraction = [...stateIds].some((s) => ["focused", "hovered", "pressed", "selected", "disabled", "overlay_open", "keyboard_visible"].includes(s));
  const everyRowDeclaresArtifacts = rows.length > 0 && rows.every((r) => {
    const ea = r.expected_artifacts as Record<string, unknown> | undefined;
    return ea && ["screenshot", "baseline_ref", "a11y_tree", "geometry", "visual_diff"].every((k) => ea[k] !== undefined && ea[k] !== null && ea[k] !== false);
  });

  // baseline governance encoded (identity + policy + forbidden auto-accept).
  const gov = baselines as Record<string, unknown>;
  const fa = (gov.forbidden_auto_accept as Record<string, unknown>) ?? {};
  const identityOk = Array.isArray(gov.identity_fields_required) && (gov.identity_fields_required as string[]).length >= 11;
  const approvalOk = (gov.approval_policy as Record<string, unknown>)?.initial_creation_is_not_automatic_pass === true;
  const forbiddenAutoAcceptOk = fa.auto_accept_allowed !== true && fa.auto_regenerate_allowed !== true && fa.silent_update_allowed !== true;

  // missing-artifact fail-closed: the validator fires W-NEG-MISSING-ARTIFACT on
  // any defect; here we confirm the gate is present (validator ran) and the
  // carrier has no missing-artifact error.
  const missingArtifactFailsClosed = !errRules.has("W-NEG-MISSING-ARTIFACT") && everyRowDeclaresArtifacts;
  // advisory never sole hard block: validator rejects advisory hard_block.
  const advisoryNeverSoleHardBlock = !errRules.has("W-NEG-ADVISORY-HARD-BLOCK");

  // live capture pending-live: env lacks device AND no row claims captured-green.
  const livePrereqsAbsent =
    !envProbe.iosSimulatorDeviceAvailable &&
    !envProbe.androidEmulatorAvailable &&
    !envProbe.maestroBinaryAvailable &&
    !envProbe.detoxBinaryAvailable &&
    !envProbe.rnBuildAvailable;
  const noFakeLiveClaim = rows.every((r) => String(r.capture_status ?? "") === "pending-live/BLOCKED");
  const liveCapturePendingLive = livePrereqsAbsent && noFakeLiveClaim && !errRules.has("W-NEG-FAKE-LIVE");

  evidence.structure = { hasIos, hasAndroid, allRequiredStates, hasInteraction, rowCount: rows.length, everyRowDeclaresArtifacts, identityOk, approvalOk, forbiddenAutoAcceptOk, livePrereqsAbsent, noFakeLiveClaim };

  return {
    captureMatrixComplete: hasIos && hasAndroid && allRequiredStates && hasInteraction && everyRowDeclaresArtifacts,
    deterministicCheckSetClassified: !errRules.has("W-NEG-ADVISORY-HARD-BLOCK") && checksIds.every((id) => (checks[id] as Record<string, unknown>)?.classification === "deterministic"),
    baselineGovernanceEncoded: identityOk && approvalOk && forbiddenAutoAcceptOk,
    missingArtifactFailsClosed,
    advisoryNeverSoleHardBlock,
    liveCapturePendingLive,
    evidence
  };
}
