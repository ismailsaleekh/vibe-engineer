// @sample @demo @reference — e2e-ui/mobile real-boundary witness CLI (I-17B / DL-13).
//
//   node --experimental-strip-types ./src/witness/ui-verification.real-boundary.cli.ts [probeJson]

import { runUiVerificationRealBoundaryWitness } from "./ui-verification.real-boundary.js";

const probeJson = process.argv[2];
const envProbe = probeJson
  ? JSON.parse(probeJson)
  : { iosSimulatorDeviceAvailable: false, androidEmulatorAvailable: false, maestroBinaryAvailable: false, detoxBinaryAvailable: false, rnBuildAvailable: false };

const result = await runUiVerificationRealBoundaryWitness(envProbe);
const booleans = {
  captureMatrixComplete: result.captureMatrixComplete,
  deterministicCheckSetClassified: result.deterministicCheckSetClassified,
  baselineGovernanceEncoded: result.baselineGovernanceEncoded,
  missingArtifactFailsClosed: result.missingArtifactFailsClosed,
  advisoryNeverSoleHardBlock: result.advisoryNeverSoleHardBlock,
  liveCapturePendingLive: result.liveCapturePendingLive
};
const allGreen = Object.values(booleans).every((v) => v === true);
process.stdout.write(`${JSON.stringify({ ok: allGreen, ...booleans, evidence: result.evidence })}\n`);
if (!allGreen) {
  console.error(`e2e-ui/mobile real-boundary witness FAILED: ${JSON.stringify(booleans)}`);
  process.exit(1);
}
