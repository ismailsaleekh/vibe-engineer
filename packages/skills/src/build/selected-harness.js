// Selected-harness skill path (W7): reads the REAL I-14A generated-file manifest and
// capability matrix from @vibe-engineer/adapter-pi (the deterministic, manifest-based
// portion) and records the I-14B live-skill-execution seam as pending-live/BLOCKED.
//
// F1 (binding): the I-14B live-pi runtime skill execution requires an operator live-pi
// environment that is not present. This module runs the deterministic manifest-based path
// for real and discloses the live execution seam honestly. It does NOT fake/mock the
// live-pi seam. See reports/post-i15a-scheduler-validation-artifact.md §F1.

import {
  getPiGeneratedFileManifest,
  validatePiGeneratedFileManifest,
} from "@vibe-engineer/adapter-pi/generated-file-manifest";
import {
  getPiAdapterCapabilityMatrix,
  isAdapterManifestSelectable,
  PI_ADAPTER_ID,
} from "@vibe-engineer/adapter-pi/capabilities";

const LIVE_PI_PREREQUISITE =
  "operator live-pi environment (a real pi runtime/adapter capable of executing selected skills live); none is present in this deterministic build environment.";

/**
 * Run the deterministic selected-harness path against the real I-14A manifest + capability
 * matrix. Returns a manifest summary plus the honest pending-live disclosure for the I-14B
 * live-skill-execution seam.
 */
export function runSelectedHarnessPath() {
  const manifest = getPiGeneratedFileManifest();
  const manifestValidation = validatePiGeneratedFileManifest(manifest);
  if (!manifestValidation.valid) {
    return Object.freeze({
      ok: false,
      reason: "selected_harness_manifest_invalid",
      manifestValidation,
      pendingLive: null,
    });
  }
  const matrix = getPiAdapterCapabilityMatrix();
  const selectable = isAdapterManifestSelectable(matrix, PI_ADAPTER_ID);
  const families = Array.isArray(manifest.families) ? manifest.families : [];
  const summary = Object.freeze({
    adapterId: PI_ADAPTER_ID,
    manifestSchemaVersion: manifest.schemaVersion,
    manifestProducedByLane: manifest.producedByLane,
    familyCount: families.length,
    manifestSelectable: selectable,
    deterministicPath: "manifest-read-and-validated",
  });
  const pendingLive = Object.freeze({
    seam: "I-14B selected-harness live-skill-execution",
    status: "pending-live/BLOCKED",
    classification: "pending-live",
    prerequisite: LIVE_PI_PREREQUISITE,
    blocks: [
      "I-23/FINAL-BUGHUNT live build/ship proof",
      "any claim that selected-pi build-time skill execution is truth-green",
    ],
    doesNotBlock: ["I-21 deterministic build-skill PASS", "I-22 deterministic ship work"],
  });
  return Object.freeze({
    ok: true,
    summary,
    pendingLive,
    manifest,
  });
}

export { LIVE_PI_PREREQUISITE };
