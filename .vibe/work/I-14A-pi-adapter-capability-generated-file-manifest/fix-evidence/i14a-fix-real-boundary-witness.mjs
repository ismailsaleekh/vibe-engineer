import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const packageRoot = path.join(repoRoot, 'packages/adapters/pi');
const packageJsonPath = path.join(packageRoot, 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const evidenceRoot = path.join(repoRoot, '.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/fix-evidence');
await mkdir(evidenceRoot, { recursive: true });

const resolveExport = (subpath) => {
  const entry = packageJson.exports?.[subpath];
  const target = typeof entry === 'string' ? entry : entry?.import;
  if (typeof target !== 'string' || !target.startsWith('./src/') || !target.endsWith('.ts')) {
    throw new Error(`Export ${subpath} does not resolve to typed owned TypeScript source: ${String(target)}`);
  }
  return path.join(packageRoot, target);
};

const capabilitiesModule = await import(pathToFileURL(resolveExport('./capabilities')).href);
const manifestModule = await import(pathToFileURL(resolveExport('./generated-file-manifest')).href);
const schemaModule = await import(pathToFileURL(resolveExport('./schema')).href);

const packageFixtureRoot = path.join(packageRoot, 'fixtures/manifest');
const negativeFixtureRoot = path.join(packageFixtureRoot, 'negative');
const exampleFixtureRoot = path.join(repoRoot, 'examples/harness-integrations/pi/manifest-fixtures');
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));
const uniqueCodes = (result) => result.valid ? [] : [...new Set(result.issues.map((issue) => issue.code))].sort();
const hasCodes = (codes, expected) => expected.every((code) => codes.includes(code));
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const matrixFromApi = capabilitiesModule.getPiAdapterCapabilityMatrix();
const manifestFromApi = manifestModule.getPiGeneratedFileManifest();
const matrixPackageCarrier = await readJson(path.join(packageFixtureRoot, 'canonical-capability-matrix.json'));
const manifestPackageCarrier = await readJson(path.join(packageFixtureRoot, 'canonical-generated-file-manifest.json'));
const matrixExampleCarrier = await readJson(path.join(exampleFixtureRoot, 'canonical-capability-matrix.json'));
const manifestExampleCarrier = await readJson(path.join(exampleFixtureRoot, 'canonical-generated-file-manifest.json'));
const exampleSummaryCarrier = await readJson(path.join(exampleFixtureRoot, 'downstream-manifest-summary.json'));

const positiveChecks = [];
const pushPositive = (name, pass, extra = {}) => positiveChecks.push({ name, pass, ...extra });
const apiCapabilityValidation = schemaModule.validateCapabilityMatrix(matrixFromApi);
const apiManifestValidation = schemaModule.validateGeneratedFileManifest(manifestFromApi);
pushPositive('actual API capability matrix validates', apiCapabilityValidation.valid, { codes: uniqueCodes(apiCapabilityValidation) });
pushPositive('actual API generated-file manifest validates', apiManifestValidation.valid, { codes: uniqueCodes(apiManifestValidation) });
pushPositive('package carrier capability validates', schemaModule.validateCapabilityMatrix(matrixPackageCarrier).valid);
pushPositive('package carrier generated-file manifest validates', schemaModule.validateGeneratedFileManifest(manifestPackageCarrier).valid);
pushPositive('example carrier capability validates', schemaModule.validateCapabilityMatrix(matrixExampleCarrier).valid);
pushPositive('example carrier generated-file manifest validates', schemaModule.validateGeneratedFileManifest(manifestExampleCarrier).valid);
pushPositive('package capability carrier equals API output', sameJson(matrixPackageCarrier, matrixFromApi));
pushPositive('package manifest carrier equals API output', sameJson(manifestPackageCarrier, manifestFromApi));
pushPositive('example capability carrier equals API output', sameJson(matrixExampleCarrier, matrixFromApi));
pushPositive('example manifest carrier equals API output', sameJson(manifestExampleCarrier, manifestFromApi));

const summary = schemaModule.createDownstreamManifestSummary(matrixPackageCarrier, manifestPackageCarrier);
await writeJson(path.join(evidenceRoot, 'i14a-fix-downstream-summary.json'), summary);
pushPositive('example downstream summary equals actual API summary', sameJson(exampleSummaryCarrier, summary));
pushPositive('summary skills remain exact six', sameJson(summary.sixSkills, ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship']), { actual: summary.sixSkills });
pushPositive('summary runtime claim remains non-green', ['not-claimed', 'pending-live', 'blocked'].includes(summary.runtimeExecutionClaim), { actual: summary.runtimeExecutionClaim });
pushPositive('summary does not claim create/import ready', summary.createImportReady === false, { actual: summary.createImportReady });

const expectedNegativeCodes = {
  'missing-capability-block.json': ['missing_required'],
  'missing-generated-file-consumers.json': ['empty_array', 'missing_fail_closed_metadata'],
  'missing-generated-file-owner.json': ['missing_required', 'missing_fail_closed_metadata'],
  'missing-generated-file-pi-skill-path-pattern.json': ['missing_required_path_pattern'],
  'missing-generated-file-security-trust.json': ['missing_required', 'missing_fail_closed_metadata'],
  'missing-generated-file-version.json': ['missing_required', 'missing_fail_closed_metadata'],
  'missing-six-skill-mapping.json': ['missing_skill_mapping'],
  'runtime-proven-claim.json': ['i14a_runtime_claim_out_of_scope'],
  'silent-noop-unsupported-feature-attempt.json': ['unsupported_feature_policy_not_blocking', 'non_pi_enabled_flag'],
  'unsupported-generated-file-owner-lane.json': ['unsupported_value'],
  'unsupported-generated-file-produced-by-lane.json': ['unsupported_value'],
  'unsupported-selectable-non-pi-harness.json': ['non_pi_selectable'],
};

const negativeResults = [];
for (const fileName of (await readdir(negativeFixtureRoot)).sort()) {
  const document = await readJson(path.join(negativeFixtureRoot, fileName));
  const target = fileName.includes('generated-file') ? 'manifest' : 'capability';
  const result = target === 'manifest' ? schemaModule.validateGeneratedFileManifest(document) : schemaModule.validateCapabilityMatrix(document);
  const codes = uniqueCodes(result);
  const expectedCodes = expectedNegativeCodes[fileName];
  negativeResults.push({
    name: fileName,
    target,
    valid: result.valid,
    codes,
    expectedCodes,
    expectedCodesPresent: Array.isArray(expectedCodes) && hasCodes(codes, expectedCodes),
  });
}

const mutationChecks = [];
const addMutation = (name, target, document, expectedCodes) => {
  const result = target === 'manifest' ? schemaModule.validateGeneratedFileManifest(document) : schemaModule.validateCapabilityMatrix(document);
  const codes = uniqueCodes(result);
  mutationChecks.push({ name, target, valid: result.valid, codes, expectedCodes, expectedCodesPresent: hasCodes(codes, expectedCodes) });
};
{
  const doc = clone(matrixFromApi);
  doc.adapters[0].realBoundaryWitness.runtimeExecutionClaim = 'live-proven';
  addMutation('equivalent live runtime green claim rejected', 'capability', doc, ['i14a_runtime_claim_out_of_scope']);
}
{
  const doc = clone(matrixFromApi);
  doc.adapters[0].realBoundaryWitness.runtimeExecutionClaim = 'proven';
  addMutation('runtime proven claim rejected', 'capability', doc, ['i14a_runtime_claim_out_of_scope']);
  let threw = false;
  let message = '';
  try {
    schemaModule.createDownstreamManifestSummary(doc, manifestFromApi);
  } catch (error) {
    threw = true;
    message = error instanceof Error ? error.message : String(error);
  }
  mutationChecks.push({
    name: 'downstream summary does not silently remap invalid runtime claim',
    target: 'summary',
    valid: !threw,
    codes: threw && message.includes('i14a_runtime_claim_out_of_scope') ? ['i14a_runtime_claim_out_of_scope'] : [],
    expectedCodes: ['i14a_runtime_claim_out_of_scope'],
    expectedCodesPresent: threw && message.includes('i14a_runtime_claim_out_of_scope'),
  });
}
{
  const doc = clone(manifestFromApi);
  doc.families[0].pathPatterns = ['.agents/skills/<skill>/SKILL.md'];
  doc.families[0].owner.writePathScope = ['.agents/skills/<skill>/SKILL.md'];
  addMutation('required pi skill path pattern missing rejected', 'manifest', doc, ['missing_required_path_pattern']);
}
{
  const doc = clone(manifestFromApi);
  doc.families[1].pathPatterns = ['.pi/prompts/<name>.txt'];
  doc.families[1].owner.writePathScope = ['.pi/prompts/<name>.txt'];
  addMutation('prompt template path contract exact rejected', 'manifest', doc, ['missing_required_path_pattern']);
}
{
  const doc = clone(manifestFromApi);
  doc.families[5].pathPatterns = ['generated harness config field: agenticHarness=pi'];
  doc.families[5].owner.writePathScope = ['generated harness config field: agenticHarness=pi'];
  addMutation('harness config required fields missing rejected', 'manifest', doc, ['missing_required_path_pattern']);
}
{
  const doc = clone(manifestFromApi);
  doc.families[0].producedByLane = 'I-14A-pi-adapter-capability-generated-file-manifest';
  addMutation('unsupported generated-file producer lane rejected', 'manifest', doc, ['unsupported_value']);
}
{
  const doc = clone(manifestFromApi);
  doc.families[0].owner.ownerId = 'I-14A-pi-adapter-capability-generated-file-manifest';
  addMutation('unsupported generated-file owner lane rejected', 'manifest', doc, ['unsupported_value']);
}
{
  const doc = clone(manifestFromApi);
  doc.families[0].consumedByLanes = ['I-99-arbitrary-consumer'];
  addMutation('unsupported generated-file consumer lane rejected', 'manifest', doc, ['unsupported_value']);
}
{
  const doc = clone(manifestFromApi);
  doc.families[0].trustSecurity.projectTrustRequired = false;
  addMutation('unsupported generated-file project-trust metadata rejected', 'manifest', doc, ['unsupported_value']);
}

const nonPiReady = matrixFromApi.adapters
  .filter((adapter) => adapter.adapterId !== 'pi')
  .some((adapter) => adapter.selection.manifestSelectable || adapter.selection.createImportSelectable || adapter.selection.readiness === 'ready');
const regression = {
  exactSixSkills: sameJson(summary.sixSkills, ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship']),
  nonPiNeverReady: !nonPiReady,
  createImportReady: summary.createImportReady,
  runtimeExecutionClaim: summary.runtimeExecutionClaim,
  generatedFamilies: summary.generatedFamilies,
  blockedNonPiAdapters: summary.blockedNonPiAdapters,
};

const positiveOk = positiveChecks.every((check) => check.pass === true);
const negativeOk = negativeResults.length === Object.keys(expectedNegativeCodes).length && negativeResults.every((result) => result.valid === false && result.expectedCodesPresent === true);
const mutationOk = mutationChecks.every((result) => result.valid === false && result.expectedCodesPresent === true);
const regressionOk = regression.exactSixSkills && regression.nonPiNeverReady && regression.createImportReady === false && regression.runtimeExecutionClaim !== 'proven';

const result = {
  schemaVersion: 'i-14a-validation-fix-real-boundary-witness/v1',
  packageJsonPath,
  resolvedExports: {
    './capabilities': resolveExport('./capabilities'),
    './generated-file-manifest': resolveExport('./generated-file-manifest'),
    './schema': resolveExport('./schema'),
  },
  carriers: {
    packageCapability: path.join(packageFixtureRoot, 'canonical-capability-matrix.json'),
    packageManifest: path.join(packageFixtureRoot, 'canonical-generated-file-manifest.json'),
    exampleCapability: path.join(exampleFixtureRoot, 'canonical-capability-matrix.json'),
    exampleManifest: path.join(exampleFixtureRoot, 'canonical-generated-file-manifest.json'),
    exampleSummary: path.join(exampleFixtureRoot, 'downstream-manifest-summary.json'),
  },
  positiveChecks,
  negativeResults,
  mutationChecks,
  regression,
  outcome: { positiveOk, negativeOk, mutationOk, regressionOk },
};

await writeJson(path.join(evidenceRoot, 'i14a-fix-real-boundary-result.json'), result);
console.log(JSON.stringify(result.outcome));
if (!positiveOk || !negativeOk || !mutationOk || !regressionOk) {
  process.exitCode = 1;
}
