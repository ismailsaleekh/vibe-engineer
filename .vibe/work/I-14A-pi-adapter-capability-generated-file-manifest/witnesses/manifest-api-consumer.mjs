import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const packageRoot = path.join(repoRoot, 'packages/adapters/pi');
const packageJsonPath = path.join(packageRoot, 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

const resolveExport = (subpath) => {
  const entry = packageJson.exports?.[subpath];
  const target = typeof entry === 'string' ? entry : entry?.import;
  if (typeof target !== 'string' || !target.startsWith('./src/')) {
    throw new Error(`Export ${subpath} does not resolve to owned typed source: ${String(target)}`);
  }
  return path.join(packageRoot, target);
};

const capabilitiesModule = await import(pathToFileURL(resolveExport('./capabilities')).href);
const manifestModule = await import(pathToFileURL(resolveExport('./generated-file-manifest')).href);
const schemaModule = await import(pathToFileURL(resolveExport('./schema')).href);

const packageFixtureRoot = path.join(packageRoot, 'fixtures/manifest');
const negativeFixtureRoot = path.join(packageFixtureRoot, 'negative');
const exampleFixtureRoot = path.join(repoRoot, 'examples/harness-integrations/pi/manifest-fixtures');
const workRoot = path.join(repoRoot, '.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest');
await mkdir(negativeFixtureRoot, { recursive: true });
await mkdir(exampleFixtureRoot, { recursive: true });
await mkdir(workRoot, { recursive: true });

const clone = (value) => JSON.parse(JSON.stringify(value));
const writeJson = async (filePath, value) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const matrix = capabilitiesModule.getPiAdapterCapabilityMatrix();
const manifest = manifestModule.getPiGeneratedFileManifest();
const capabilityPositive = schemaModule.validateCapabilityMatrix(matrix);
const manifestPositive = schemaModule.validateGeneratedFileManifest(manifest);
if (!capabilityPositive.valid || !manifestPositive.valid) {
  throw new Error(`Canonical API failed validation: capability=${capabilityPositive.valid} manifest=${manifestPositive.valid}`);
}

await writeJson(path.join(packageFixtureRoot, 'canonical-capability-matrix.json'), matrix);
await writeJson(path.join(packageFixtureRoot, 'canonical-generated-file-manifest.json'), manifest);
await writeJson(path.join(exampleFixtureRoot, 'canonical-capability-matrix.json'), matrix);
await writeJson(path.join(exampleFixtureRoot, 'canonical-generated-file-manifest.json'), manifest);

const negativeCases = [];
const addNegative = (fileName, target, document, expectedCodes) => {
  negativeCases.push({ fileName, target, document, expectedCodes });
};

{
  const doc = clone(matrix);
  delete doc.adapters[0].skillsCommandsSurface;
  addNegative('missing-capability-block.json', 'capability', doc, ['missing_required']);
}
{
  const doc = clone(matrix);
  const codex = doc.adapters.find((adapter) => adapter.adapterId === 'codex');
  codex.selection.manifestSelectable = true;
  codex.selection.createImportSelectable = true;
  codex.selection.readiness = 'ready';
  addNegative('unsupported-selectable-non-pi-harness.json', 'capability', doc, ['non_pi_selectable']);
}
{
  const doc = clone(manifest);
  delete doc.families[0].owner;
  addNegative('missing-generated-file-owner.json', 'manifest', doc, ['missing_required', 'missing_fail_closed_metadata']);
}
{
  const doc = clone(manifest);
  delete doc.families[0].trustSecurity;
  addNegative('missing-generated-file-security-trust.json', 'manifest', doc, ['missing_required', 'missing_fail_closed_metadata']);
}
{
  const doc = clone(manifest);
  delete doc.families[0].version;
  addNegative('missing-generated-file-version.json', 'manifest', doc, ['missing_required', 'missing_fail_closed_metadata']);
}
{
  const doc = clone(manifest);
  doc.families[0].consumedByLanes = [];
  addNegative('missing-generated-file-consumers.json', 'manifest', doc, ['empty_array', 'missing_fail_closed_metadata']);
}
{
  const doc = clone(matrix);
  doc.adapters[0].skillsCommandsSurface.skills = doc.adapters[0].skillsCommandsSurface.skills.filter((skill) => skill.skillId !== 'ship');
  addNegative('missing-six-skill-mapping.json', 'capability', doc, ['missing_skill_mapping']);
}
{
  const doc = clone(matrix);
  const opencode = doc.adapters.find((adapter) => adapter.adapterId === 'opencode');
  opencode.capabilityFlags.prompts = true;
  opencode.capabilityFlags.unsupportedFeaturePolicy = 'defer';
  addNegative('silent-noop-unsupported-feature-attempt.json', 'capability', doc, ['unsupported_feature_policy_not_blocking', 'non_pi_enabled_flag']);
}

for (const negative of negativeCases) {
  await writeJson(path.join(negativeFixtureRoot, negative.fileName), negative.document);
}

const loadJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const positiveFixtureMatrix = await loadJson(path.join(packageFixtureRoot, 'canonical-capability-matrix.json'));
const positiveFixtureManifest = await loadJson(path.join(packageFixtureRoot, 'canonical-generated-file-manifest.json'));
const positiveResults = [
  { name: 'canonical-capability-matrix', valid: schemaModule.validateCapabilityMatrix(positiveFixtureMatrix).valid },
  { name: 'canonical-generated-file-manifest', valid: schemaModule.validateGeneratedFileManifest(positiveFixtureManifest).valid },
];

const negativeResults = [];
for (const fileName of (await readdir(negativeFixtureRoot)).sort()) {
  const doc = await loadJson(path.join(negativeFixtureRoot, fileName));
  const result = fileName.includes('generated-file') ? schemaModule.validateGeneratedFileManifest(doc) : schemaModule.validateCapabilityMatrix(doc);
  negativeResults.push({
    name: fileName,
    valid: result.valid,
    codes: result.valid ? [] : [...new Set(result.issues.map((issue) => issue.code))].sort(),
  });
}

const summary = schemaModule.createDownstreamManifestSummary(positiveFixtureMatrix, positiveFixtureManifest);
await writeJson(path.join(workRoot, 'downstream-summary.json'), summary);
await writeJson(path.join(exampleFixtureRoot, 'downstream-manifest-summary.json'), summary);

const exactSkills = JSON.stringify(summary.sixSkills) === JSON.stringify(['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship']);
const nonPiReady = positiveFixtureMatrix.adapters
  .filter((adapter) => adapter.adapterId !== 'pi')
  .some((adapter) => adapter.selection.manifestSelectable || adapter.selection.createImportSelectable || adapter.selection.readiness === 'ready');

const witness = {
  schemaVersion: 'i-14a-manifest-api-consumer-witness/v1',
  packageJsonPath,
  resolvedExports: {
    capabilities: resolveExport('./capabilities'),
    generatedFileManifest: resolveExport('./generated-file-manifest'),
    schema: resolveExport('./schema'),
  },
  positiveResults,
  negativeResults,
  downstreamSummaryPath: path.join(workRoot, 'downstream-summary.json'),
  regression: {
    exactSixSkills: exactSkills,
    nonPiNeverReady: !nonPiReady,
    createImportReadyClaimed: summary.createImportReady,
    runtimeExecutionClaim: summary.runtimeExecutionClaim,
  },
};
await writeJson(path.join(workRoot, 'witness-results.json'), witness);

const positiveOk = positiveResults.every((result) => result.valid);
const negativeOk = negativeResults.every((result) => !result.valid);
const regressionOk = exactSkills && !nonPiReady && summary.createImportReady === false && summary.runtimeExecutionClaim !== 'proven';
console.log(JSON.stringify({ positiveOk, negativeOk, regressionOk, negativeCount: negativeResults.length, summaryPath: witness.downstreamSummaryPath }));
if (!positiveOk || !negativeOk || !regressionOk) {
  process.exitCode = 1;
}
