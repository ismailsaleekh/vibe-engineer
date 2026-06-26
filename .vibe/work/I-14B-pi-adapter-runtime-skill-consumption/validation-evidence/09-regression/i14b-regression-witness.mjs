import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { getPiAdapterCapabilityMatrix } from '../../../../../packages/adapters/pi/src/capabilities/index.ts';
import { getPiGeneratedFileManifest } from '../../../../../packages/adapters/pi/src/generated-file-manifest/index.ts';
import {
  GENERATED_FILE_FAMILY_IDS,
  SKILL_IDS,
  validateCapabilityMatrix,
  validateGeneratedFileManifest,
} from '../../../../../packages/adapters/pi/src/schema/index.ts';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = dirname(__filename);
const repoRoot = resolve(scriptDir, '../../../../..');
const resultPath = join(scriptDir, 'regression-witness-result.json');
const fixtureRoot = join(repoRoot, 'examples/harness-integrations/pi/runtime-fixtures');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const walk = async (path) => {
  const entries = [];
  async function visit(current) {
    let s;
    try { s = await stat(current); } catch { return; }
    if (s.isDirectory()) {
      const names = await readdir(current);
      for (const name of names) await visit(join(current, name));
    } else if (s.isFile()) {
      entries.push(current);
    }
  }
  await visit(path);
  return entries.sort();
};
const hashFiles = async (paths) => {
  const result = {};
  for (const path of paths) {
    try {
      result[relative(repoRoot, path)] = sha256(await readFile(path));
    } catch {
      result[relative(repoRoot, path)] = null;
    }
  }
  return result;
};

const capabilityMatrix = getPiAdapterCapabilityMatrix();
const generatedFileManifest = getPiGeneratedFileManifest();
const capabilityValidation = validateCapabilityMatrix(capabilityMatrix);
const manifestValidation = validateGeneratedFileManifest(generatedFileManifest);
const piAdapter = capabilityMatrix.adapters.find((adapter) => adapter.adapterId === 'pi');
const nonPiAdapters = capabilityMatrix.adapters.filter((adapter) => adapter.adapterId !== 'pi').map((adapter) => ({
  adapterId: adapter.adapterId,
  manifestSelectable: adapter.selection.manifestSelectable,
  createImportSelectable: adapter.selection.createImportSelectable,
  readiness: adapter.selection.readiness,
  evidenceState: adapter.evidenceStatus.state,
  enabledFlags: Object.entries(adapter.capabilityFlags).filter(([key, value]) => key !== 'unsupportedFeaturePolicy' && value === true).map(([key]) => key),
}));

const i14aFiles = [
  ...(await walk(join(repoRoot, 'packages/adapters/pi/src/capabilities'))),
  ...(await walk(join(repoRoot, 'packages/adapters/pi/src/generated-file-manifest'))),
  ...(await walk(join(repoRoot, 'packages/adapters/pi/src/schema'))),
];
const protectedPaths = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.base.json',
  'packages/adapters/pi/package.json',
].map((path) => join(repoRoot, path));

const fixtureFiles = await walk(fixtureRoot);
const disallowedPatterns = {
  secret: /(BEGIN PRIVATE KEY|AKIA|xoxb-|ghp_|sk-[A-Za-z0-9]|password\s*=|api[_-]?key\s*=)/i,
  domain: /\b(billz|ecommerce|fashion|inventory|telegram|instagram|checkout|customer[- ]?order|product[- ]?catalog)\b/i,
  destructive: /(rm\s+-rf|git\s+push|createPullRequest|deploy\s+--prod|npm\s+publish)/i,
  unsupportedSandbox: /(sandboxed:\s*true|sandbox:\s*proven|claimsSandboxing:\s*['\"]proven)/i,
  unsupportedLiveProof: /(live-proven|runtime-proven|loaded by pi|executed by pi|runtimeExecutionClaim:\s*proven|"runtimeExecutionClaim"\s*:\s*"proven")/i,
  selectedPiTruthGreenPositive: /(selected\s+pi\s+(is|=|:).*truth-green|final\s+.*truth-green)/i,
};
const fixtureMatches = [];
for (const file of fixtureFiles) {
  const text = await readFile(file, 'utf8');
  for (const [kind, pattern] of Object.entries(disallowedPatterns)) {
    if (pattern.test(text)) fixtureMatches.push({ kind, path: relative(fixtureRoot, file) });
  }
}

const familyContracts = generatedFileManifest.families.map((family) => ({
  familyId: family.familyId,
  pathPatterns: family.pathPatterns,
  producedByLane: family.producedByLane,
  consumedByLanes: family.consumedByLanes,
  classification: family.trustSecurity.classification,
  commandPolicy: family.trustSecurity.commandPolicy,
  sandboxCapability: family.trustSecurity.sandboxCapability,
  credentialPolicy: family.trustSecurity.credentialPolicy,
  externalIntegration: family.trustSecurity.externalIntegration,
  destructiveOperationPolicy: family.trustSecurity.destructiveOperationPolicy,
  readiness: family.readiness.state,
}));

const errors = [];
if (!capabilityValidation.valid) errors.push({ check: 'capabilityValidation', issues: capabilityValidation.issues });
if (!manifestValidation.valid) errors.push({ check: 'manifestValidation', issues: manifestValidation.issues });
if (JSON.stringify([...SKILL_IDS].sort()) !== JSON.stringify(['brainstorm','build','grill-me','plan','ship','task'])) errors.push({ check: 'skillIds', skillIds: SKILL_IDS });
if (JSON.stringify([...GENERATED_FILE_FAMILY_IDS].sort()) !== JSON.stringify(['context-files','harness-config','pi-extensions','pi-package-manifest','pi-prompt-templates','pi-skill-files'])) errors.push({ check: 'familyIds', familyIds: GENERATED_FILE_FAMILY_IDS });
if (!piAdapter || piAdapter.realBoundaryWitness.runtimeExecutionClaim !== 'not-claimed') errors.push({ check: 'i14aRuntimeClaim', claim: piAdapter?.realBoundaryWitness?.runtimeExecutionClaim });
for (const adapter of nonPiAdapters) {
  if (adapter.manifestSelectable || adapter.createImportSelectable || adapter.readiness === 'ready' || adapter.enabledFlags.length > 0) {
    errors.push({ check: 'nonPiNonSelectable', adapter });
  }
}
if (fixtureMatches.length > 0) errors.push({ check: 'fixtureDisallowedMarkers', fixtureMatches });

const result = {
  ok: errors.length === 0,
  errors,
  i14a: {
    capabilityValidation: capabilityValidation.valid,
    manifestValidation: manifestValidation.valid,
    capabilitySchemaVersion: capabilityMatrix.schemaVersion,
    generatedManifestSchemaVersion: generatedFileManifest.schemaVersion,
    skillIds: [...SKILL_IDS],
    familyIds: [...GENERATED_FILE_FAMILY_IDS],
    piRuntimeClaimInI14A: piAdapter?.realBoundaryWitness.runtimeExecutionClaim,
    nonPiAdapters,
    familyContracts,
    hashes: await hashFiles(i14aFiles),
  },
  protectedNeighborHashes: await hashFiles(protectedPaths),
  fixtureScan: {
    fileCount: fixtureFiles.length,
    fixtureMatches,
  },
};
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: result.ok, resultPath, i14aFileCount: i14aFiles.length, fixtureFileCount: fixtureFiles.length, fixtureDisallowedMatchCount: fixtureMatches.length }, null, 2));
if (!result.ok) process.exit(1);
