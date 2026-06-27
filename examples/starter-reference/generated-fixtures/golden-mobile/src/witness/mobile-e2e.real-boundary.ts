// @sample @demo @reference — golden-mobile REAL-BOUNDARY witness (I-17B / DL-12).
//
// Returns a typed boolean result object. The booleans are computed by REAL
// inspection of the generated artifacts (Maestro YAML / Detox spec shape,
// selection metadata + conflict policy, no-fork RN consumption seam, both-mode
// split coverage) and by HONEST recording of the live-device seam as
// `pending-live/BLOCKED` (shape-green ≠ truth-green). No mock/synthetic green.
//
// The live device-driven Maestro/Detox run is NOT executed here — this env has
// no usable simulator/emulator + no Maestro/Detox/RN binaries (see report
// Stage 1). `liveDeviceRunPendingLive === true` is the honest state; the runner
// rejects any witness where it would be falsely `green`.

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { validateSelectionMetadata, type SelectionMetadata } from "../validate/selection-metadata.js";
import { runGoldenRecordsRnConsumptionSeam, GOLDEN_RECORDS_TEST_IDS } from "../consumption/golden-records.rn-consumption.js";

export interface MobileE2EWitnessResult {
  maestroFlowsStructurallyValid: boolean;
  detoxSpecsStructurallyValid: boolean;
  selectionMetadataCompleteAndConflictFree: boolean;
  bothRunnerSplitCoveragePresent: boolean;
  rnConsumptionSeamImportsSharedClient: boolean;
  liveDeviceRunPendingLive: boolean;
}

const moduleDir = dirname(fileURLToPath(import.meta.url)); // golden-mobile/src/witness/
const fixtureRoot = resolveFixtureRoot(moduleDir);
const maestroDir = join(fixtureRoot, "e2e/maestro");
const detoxDir = join(fixtureRoot, "e2e/detox");
const metadataDir = join(fixtureRoot, "metadata");
const goldenClientRoot = join(fixtureRoot, "../golden-client");

function resolveFixtureRoot(witnessDir: string): string {
  // golden-mobile/src/witness → golden-mobile/
  return join(witnessDir, "../..");
}

async function readDir(dir: string, ext: string): Promise<{ name: string; content: string }[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const out: { name: string; content: string }[] = [];
  for (const name of names) {
    if (!name.endsWith(ext)) continue;
    out.push({ name, content: await readFile(join(dir, name), "utf8") });
  }
  return out;
}

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

// --- structural validators ---

function isMaestroFlowStructurallyValid(content: string): boolean {
  // Maestro flow: a config block with appId + name (+ optional tags), a `---`
  // document separator, then ≥1 step that is either a string command or a
  // map with a recognized Maestro command key.
  if (!/^appId:\s*\S+/m.test(content)) return false;
  if (!/^name:\s*["']?[^"'\n]+["']?/m.test(content)) return false;
  const sep = content.indexOf("\n---");
  if (sep < 0) return false;
  const body = content.slice(sep + 4);
  // Recognized Maestro command keys (subset sufficient for these flows).
  const cmdRe = /^\s*-\s*(launchApp|assertVisible|tapOn|scrollUntilVisible|runFlow)\b/m;
  if (!cmdRe.test(body)) return false;
  // Every flow must target the golden-records RN screen (testID or appId).
  return /golden-records|golden-record-list|golden-record-item|com\.vibeEngineerStarter\.goldenMobile/.test(content);
}

function isDetoxSpecStructurallyValid(content: string): boolean {
  // Detox spec: describe/it + real Detox API surface (device.launchApp |
  // device.reloadReactNative | device.terminateApp | device.sendToBackground),
  // element(by.id(...)), waitFor(...).(toBeVisible|toExist)().withTimeout(...),
  // expect(element(by.id(...))).toBeVisible()/toExist().
  if (!/\bdescribe\s*\(/.test(content) || !/\bit\s*\(/.test(content)) return false;
  const api = /device\.(launchApp|reloadReactNative|terminateApp|sendToBackground)\b/.test(content);
  const byId = /element\(\s*by\.id\(/.test(content);
  // waitFor(<nested args>).<toBeVisible|toExist>().withTimeout(...) — use [^]*? to
  // span the nested element(by.id(...)) parens up to the matcher call.
  const wait = /waitFor\([^]*?\b(?:toBeVisible|toExist)\(\)\s*\.\s*withTimeout\(/.test(content);
  if (!api || !byId || !wait) return false;
  // Exercises a genuine DL-12 Detox-required category (sync/state/lifecycle).
  const detoxRequired = /synchroniz|state.?reset|reloadReactNative|terminateApp|sendToBackground|relaunch/i.test(content);
  return detoxRequired;
}

// --- no-fork structural proof ---

async function noForkSeamValid(): Promise<boolean> {
  // golden-mobile/src/consumption/*.ts must import the I-16B shared client
  // (useGoldenRecords + createMobileTransport + createGoldenRecordsSharedClient
  // + contract-derived type) and must NOT define a Zod schema / route contract /
  // hand-authored DTO (DL-14 §5; DL-16 §60).
  const consDir = join(fixtureRoot, "src/consumption");
  const files = await readDir(consDir, ".ts");
  if (files.length === 0) return false;
  const blob = files.map((f) => f.content).join("\n");
  const importsSharedClient = /golden-client\/src\/use-golden-records\.js/.test(blob)
    && /golden-client\/src\/transport\/mobile\.js/.test(blob)
    && /golden-client\/src\/golden-records\.shared-client\.js/.test(blob)
    && /golden-contracts\/src\/golden-records\.contract\.js/.test(blob);
  const noSchema = !/\bz\.(object|string|number|enum|literal|boolean|array|union)\s*\(/.test(blob);
  const noRouteContract = !/\binitContract\s*\(|\.router\s*\(/.test(blob);
  // shared client / contract files must still exist (read-only predecessors intact)
  let predecessorsIntact = false;
  try {
    await stat(join(goldenClientRoot, "src/use-golden-records.ts"));
    await stat(join(goldenClientRoot, "src/transport/mobile.ts"));
    await stat(join(goldenClientRoot, "src/golden-records.shared-client.ts"));
    predecessorsIntact = true;
  } catch {
    predecessorsIntact = false;
  }
  return importsSharedClient && noSchema && noRouteContract && predecessorsIntact;
}

// --- witness entry ---

export async function runMobileE2ERealBoundaryWitness(envProbe: {
  iosSimulatorDeviceAvailable: boolean;
  androidEmulatorAvailable: boolean;
  maestroBinaryAvailable: boolean;
  detoxBinaryAvailable: boolean;
  rnBuildAvailable: boolean;
}): Promise<MobileE2EWitnessResult & { evidence: Record<string, unknown> }> {
  const evidence: Record<string, unknown> = {};

  // 1. Maestro flows structurally valid.
  const maestroFiles = await readDir(maestroDir, ".yaml");
  const maestroOk = maestroFiles.length >= 2 && maestroFiles.every((f) => isMaestroFlowStructurallyValid(f.content));
  evidence.maestro = {
    count: maestroFiles.length,
    sha256: Object.fromEntries(maestroFiles.map((f) => [f.name, sha256(f.content)])),
    allStructurallyValid: maestroOk
  };

  // 2. Detox specs structurally valid.
  const detoxFiles = await readDir(detoxDir, ".ts");
  const detoxOk = detoxFiles.length >= 1 && detoxFiles.every((f) => isDetoxSpecStructurallyValid(f.content));
  evidence.detox = {
    count: detoxFiles.length,
    sha256: Object.fromEntries(detoxFiles.map((f) => [f.name, sha256(f.content)])),
    allStructurallyValid: detoxOk
  };

  // 3. Selection metadata complete + conflict-free (REAL validator).
  const metaFiles = await readDir(metadataDir, ".json");
  const scenarios: SelectionMetadata[] = metaFiles.map((f) => JSON.parse(f.content));
  const selResult = validateSelectionMetadata(scenarios, { allowLiveProofProven: false });
  evidence.selectionMetadata = { count: scenarios.length, result: selResult };

  // 4. both-runner split-coverage scenario present.
  const bothSplit = scenarios.some(
    (s) => s.runner === "both" && Array.isArray(s.coverage_intent) && s.coverage_intent.length >= 2
  );
  evidence.bothSplitCoverage = { present: bothSplit };

  // 5. RN consumption seam imports the shared client (no fork) — also drive the
  //    REAL accessor against the REAL I-16A provider through the mobile transport.
  let seamImportsOk = await noForkSeamValid();
  if (seamImportsOk) {
    try {
      const response = await runGoldenRecordsRnConsumptionSeam();
      seamImportsOk = seamImportsOk && response.accepted === true;
      evidence.rnConsumptionSeam = { accepted: response.accepted, goldenRecordId: response.goldenRecordId, testIds: GOLDEN_RECORDS_TEST_IDS };
    } catch (e) {
      seamImportsOk = false;
      evidence.rnConsumptionSeam = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  // 6. Live device-driven run honestly pending-live/BLOCKED. The live seam is
  //    pending-live ONLY when the real prerequisites are absent — if they were
  //    present, the live run would be REQUIRED (not green by assertion). Here we
  //    confirm the env genuinely lacks them and that NO metadata claims proven_by.
  const livePrereqsAbsent =
    !envProbe.iosSimulatorDeviceAvailable &&
    !envProbe.androidEmulatorAvailable &&
    !envProbe.maestroBinaryAvailable &&
    !envProbe.detoxBinaryAvailable &&
    !envProbe.rnBuildAvailable;
  const noFakeLiveClaim = scenarios.every((s) => !String(s.live_proof_status).startsWith("proven_by"));
  const liveDeviceRunPendingLive = livePrereqsAbsent && noFakeLiveClaim;
  evidence.liveDeviceRun = {
    iosSimulatorDeviceAvailable: envProbe.iosSimulatorDeviceAvailable,
    androidEmulatorAvailable: envProbe.androidEmulatorAvailable,
    maestroBinaryAvailable: envProbe.maestroBinaryAvailable,
    detoxBinaryAvailable: envProbe.detoxBinaryAvailable,
    rnBuildAvailable: envProbe.rnBuildAvailable,
    livePrereqsAbsent,
    noFakeLiveClaim,
    pendingLiveBLOCKED: liveDeviceRunPendingLive
  };

  return {
    maestroFlowsStructurallyValid: maestroOk,
    detoxSpecsStructurallyValid: detoxOk,
    selectionMetadataCompleteAndConflictFree: selResult.ok,
    bothRunnerSplitCoveragePresent: bothSplit,
    rnConsumptionSeamImportsSharedClient: seamImportsOk,
    liveDeviceRunPendingLive,
    evidence
  };
}
