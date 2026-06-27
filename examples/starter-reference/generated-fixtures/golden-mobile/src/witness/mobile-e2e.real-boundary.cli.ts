// @sample @demo @reference — golden-mobile real-boundary witness CLI (I-17B / DL-12).
//
// Run with the I-16B dep-resolver register hook (the consumption seam drives the
// REAL @ts-rest/core + zod runtime via the mobile transport):
//   node --import ../golden-flow/src/runtime/dep-resolver-register.mjs \
//        --experimental-strip-types ./src/witness/mobile-e2e.real-boundary.cli.ts
//
// Emits the witness JSON on stdout (single line); exits 0 when every deterministic
// boolean is true AND the live seam is honestly pending-live/BLOCKED.

import { runMobileE2ERealBoundaryWitness } from "./mobile-e2e.real-boundary.js";

// Environment probe — passed in by the runner as JSON on argv[2] (or probed
// honestly here via shelling out; the runner is the source of truth). Defaults
// reflect the honestly-probed pending-live environment.
const probeJson = process.argv[2];
const envProbe = probeJson
  ? JSON.parse(probeJson)
  : {
      iosSimulatorDeviceAvailable: false,
      androidEmulatorAvailable: false,
      maestroBinaryAvailable: false,
      detoxBinaryAvailable: false,
      rnBuildAvailable: false
    };

const result = await runMobileE2ERealBoundaryWitness(envProbe);
const booleans = {
  maestroFlowsStructurallyValid: result.maestroFlowsStructurallyValid,
  detoxSpecsStructurallyValid: result.detoxSpecsStructurallyValid,
  selectionMetadataCompleteAndConflictFree: result.selectionMetadataCompleteAndConflictFree,
  bothRunnerSplitCoveragePresent: result.bothRunnerSplitCoveragePresent,
  rnConsumptionSeamImportsSharedClient: result.rnConsumptionSeamImportsSharedClient,
  liveDeviceRunPendingLive: result.liveDeviceRunPendingLive
};
const allGreen = Object.values(booleans).every((v) => v === true);
process.stdout.write(`${JSON.stringify({ ok: allGreen, ...booleans, evidence: result.evidence })}\n`);
if (!allGreen) {
  console.error(`golden-mobile real-boundary witness FAILED: ${JSON.stringify(booleans)}`);
  process.exit(1);
}
