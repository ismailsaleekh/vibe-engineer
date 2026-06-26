import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { getPiAdapterCapabilityMatrix } from '../../../../../packages/adapters/pi/src/capabilities/index.ts';
import { getPiGeneratedFileManifest } from '../../../../../packages/adapters/pi/src/generated-file-manifest/index.ts';
import {
  GENERATED_FILE_FAMILY_IDS,
  SKILL_IDS,
  validateCapabilityMatrix,
  validateGeneratedFileManifest,
} from '../../../../../packages/adapters/pi/src/schema/index.ts';
import {
  generatePiRuntimeFixture,
  generatePiRuntimeFixtureAssetsWithManifest,
} from '../../../../../packages/adapters/pi/src/generators/runtime-fixture-generator.ts';
import {
  validatePiRuntimeFixture,
  validatePiRuntimeFixtureAgainstI14A,
} from '../../../../../packages/adapters/pi/src/runtime/validation.ts';
import { validatePiRuntimeWritePlan } from '../../../../../packages/adapters/pi/src/runtime/write-plan.ts';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = dirname(__filename);
const repoRoot = resolve(scriptDir, '../../../../..');
const productRoot = join(repoRoot, 'examples/harness-integrations/pi/runtime-fixtures');
const rerunRoot = join(scriptDir, 'runtime-fixture-rerun');
const resultPath = join(scriptDir, 'positive-generation-result.json');

const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const isSafeRelative = (path) => path.length > 0 && !path.startsWith('/') && !path.startsWith('~') && !path.includes(':\\') && !path.split('/').some((segment) => segment === '' || segment === '..');

const issueCodes = (issues) => issues.map((issue) => issue.code).sort();

const capabilityMatrix = getPiAdapterCapabilityMatrix();
const generatedFileManifest = getPiGeneratedFileManifest();
const capabilityValidation = validateCapabilityMatrix(capabilityMatrix);
const manifestValidation = validateGeneratedFileManifest(generatedFileManifest);
const fixture = generatePiRuntimeFixture();
const fixtureValidation = validatePiRuntimeFixture(fixture);
const joinedValidation = validatePiRuntimeFixtureAgainstI14A(fixture, capabilityMatrix, generatedFileManifest);
const writePlanValidation = validatePiRuntimeWritePlan(
  fixture,
  fixture.assets.map((asset) => ({ path: asset.path, kind: 'missing' })),
  'fail-on-conflict',
);
const assetsWithManifest = generatePiRuntimeFixtureAssetsWithManifest();

const validationErrors = [];
if (!capabilityValidation.valid) validationErrors.push({ check: 'capabilityValidation', issueCodes: issueCodes(capabilityValidation.issues) });
if (!manifestValidation.valid) validationErrors.push({ check: 'manifestValidation', issueCodes: issueCodes(manifestValidation.issues) });
if (!fixtureValidation.valid) validationErrors.push({ check: 'fixtureValidation', issueCodes: issueCodes(fixtureValidation.issues) });
if (!joinedValidation.valid) validationErrors.push({ check: 'joinedValidation', issueCodes: issueCodes(joinedValidation.issues) });
if (!writePlanValidation.valid) validationErrors.push({ check: 'writePlanValidation', issueCodes: issueCodes(writePlanValidation.issues) });

const skillAssets = fixture.assets.filter((asset) => asset.kind === 'skill');
const promptAssets = fixture.assets.filter((asset) => asset.kind === 'prompt-template');
const familyIds = [...new Set(fixture.assets.map((asset) => asset.familyId))].sort();
const expectedFamilyIds = [...GENERATED_FILE_FAMILY_IDS].sort();
const skillIds = skillAssets.map((asset) => asset.metadata.skillProtocol?.skillId).sort();
const promptSkillIds = promptAssets.map((asset) => asset.metadata.promptContract?.skillId).sort();
const expectedSkillIds = [...SKILL_IDS].sort();

if (JSON.stringify(skillIds) !== JSON.stringify(expectedSkillIds)) validationErrors.push({ check: 'sixSkillAssets', actual: skillIds, expected: expectedSkillIds });
if (JSON.stringify(promptSkillIds) !== JSON.stringify(expectedSkillIds)) validationErrors.push({ check: 'sixPromptAssets', actual: promptSkillIds, expected: expectedSkillIds });
if (JSON.stringify(familyIds) !== JSON.stringify(expectedFamilyIds)) validationErrors.push({ check: 'familyIds', actual: familyIds, expected: expectedFamilyIds });
if (fixture.runtimeExecutionClaim !== 'pending-live' || fixture.downstreamLiveRuntimeBlock !== 'pending-live/BLOCKED') {
  validationErrors.push({ check: 'runtimeRouting', runtimeExecutionClaim: fixture.runtimeExecutionClaim, downstreamLiveRuntimeBlock: fixture.downstreamLiveRuntimeBlock });
}
if (capabilityMatrix.adapters.some((adapter) => adapter.adapterId !== 'pi' && (adapter.selection.manifestSelectable || adapter.selection.createImportSelectable || adapter.selection.readiness === 'ready'))) {
  validationErrors.push({ check: 'nonPiSelection', message: 'Non-pi adapter became selectable or ready.' });
}
if (assetsWithManifest.some((asset) => !isSafeRelative(asset.path))) {
  validationErrors.push({ check: 'assetPathSafety', paths: assetsWithManifest.filter((asset) => !isSafeRelative(asset.path)).map((asset) => asset.path) });
}

await rm(rerunRoot, { recursive: true, force: true });
for (const asset of assetsWithManifest) {
  const target = join(rerunRoot, asset.path);
  if (!target.startsWith(`${rerunRoot}/`)) {
    validationErrors.push({ check: 'writeTargetEscape', path: asset.path });
    continue;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, asset.content, 'utf8');
}

const comparisons = [];
for (const asset of assetsWithManifest) {
  const productPath = join(productRoot, asset.path);
  let productContent = null;
  try {
    productContent = await readFile(productPath, 'utf8');
  } catch (error) {
    comparisons.push({ path: asset.path, status: 'missing-product', generatedSha256: sha256(asset.content), error: error.message });
    continue;
  }
  comparisons.push({
    path: asset.path,
    status: productContent === asset.content ? 'match' : 'different',
    generatedSha256: sha256(asset.content),
    productSha256: sha256(productContent),
  });
}

const mismatches = comparisons.filter((entry) => entry.status !== 'match');
if (mismatches.length > 0) {
  validationErrors.push({ check: 'productFixtureComparison', mismatches });
}

const result = {
  ok: validationErrors.length === 0,
  validationErrors,
  consumedActualI14A: {
    capabilityAdapterCount: capabilityMatrix.adapters.length,
    capabilitySchemaVersion: capabilityMatrix.schemaVersion,
    generatedManifestFamilyCount: generatedFileManifest.families.length,
    generatedManifestSchemaVersion: generatedFileManifest.schemaVersion,
    capabilityValidation: capabilityValidation.valid,
    manifestValidation: manifestValidation.valid,
  },
  fixture: {
    schemaVersion: fixture.schemaVersion,
    mode: fixture.mode,
    adapterId: fixture.adapterId,
    adapterCapabilityVersion: fixture.adapterCapabilityVersion,
    generatedFileManifestVersion: fixture.generatedFileManifestVersion,
    runtimeExecutionClaim: fixture.runtimeExecutionClaim,
    downstreamLiveRuntimeBlock: fixture.downstreamLiveRuntimeBlock,
    assetCount: fixture.assets.length,
    assetsWithManifestCount: assetsWithManifest.length,
    skillIds,
    promptSkillIds,
    familyIds,
  },
  rerunRoot,
  productRoot,
  comparisons,
};
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: result.ok, resultPath, rerunRoot, assetCount: fixture.assets.length, assetsWithManifestCount: assetsWithManifest.length, mismatchCount: mismatches.length }, null, 2));
if (!result.ok) {
  process.exit(1);
}
