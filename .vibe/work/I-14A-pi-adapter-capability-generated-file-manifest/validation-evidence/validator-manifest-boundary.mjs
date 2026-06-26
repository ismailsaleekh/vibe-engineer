import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const scriptPath = fileURLToPath(import.meta.url);
const evidenceRoot = path.dirname(scriptPath);
const repoRoot = path.resolve(evidenceRoot, '../../../..');
const packageRoot = path.join(repoRoot, 'packages/adapters/pi');
const packageManifestPath = path.join(packageRoot, 'package.json');
const packageFixtureRoot = path.join(packageRoot, 'fixtures/manifest');
const negativeFixtureRoot = path.join(packageFixtureRoot, 'negative');
const exampleFixtureRoot = path.join(repoRoot, 'examples/harness-integrations/pi/manifest-fixtures');
const resultPath = path.join(evidenceRoot, 'validator-manifest-boundary-result.json');
const summaryPath = path.join(evidenceRoot, 'validator-downstream-summary.json');

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const stable = (value) => JSON.stringify(value);

const packageJson = await readJson(packageManifestPath);
const exportTargets = {};
for (const subpath of ['./capabilities', './generated-file-manifest', './schema']) {
  const entry = packageJson.exports?.[subpath];
  const importTarget = typeof entry === 'string' ? entry : entry?.import;
  const typeTarget = typeof entry === 'string' ? entry : entry?.types;
  assert.equal(typeof importTarget, 'string', `${subpath} import target must be a string`);
  assert.equal(typeof typeTarget, 'string', `${subpath} types target must be a string`);
  assert(importTarget.startsWith('./src/'), `${subpath} import target must point to owned src TS`);
  assert(typeTarget.startsWith('./src/'), `${subpath} types target must point to owned src TS`);
  assert(importTarget.endsWith('.ts'), `${subpath} import target must be TypeScript source`);
  assert(typeTarget.endsWith('.ts'), `${subpath} types target must be TypeScript source`);
  assert(!/[.]m?js$|[.]cjs$/.test(importTarget), `${subpath} must not export runtime JS shim`);
  exportTargets[subpath] = path.join(packageRoot, importTarget);
}

const capabilitiesModule = await import(pathToFileURL(exportTargets['./capabilities']).href);
const manifestModule = await import(pathToFileURL(exportTargets['./generated-file-manifest']).href);
const schemaModule = await import(pathToFileURL(exportTargets['./schema']).href);

const apiMatrix = capabilitiesModule.getPiAdapterCapabilityMatrix();
const apiManifest = manifestModule.getPiGeneratedFileManifest();
const apiSummary = manifestModule.createPiDownstreamManifestSummary();

const packageMatrix = await readJson(path.join(packageFixtureRoot, 'canonical-capability-matrix.json'));
const packageManifest = await readJson(path.join(packageFixtureRoot, 'canonical-generated-file-manifest.json'));
const exampleMatrix = await readJson(path.join(exampleFixtureRoot, 'canonical-capability-matrix.json'));
const exampleManifest = await readJson(path.join(exampleFixtureRoot, 'canonical-generated-file-manifest.json'));
const exampleSummary = await readJson(path.join(exampleFixtureRoot, 'downstream-manifest-summary.json'));

const positiveChecks = [];
const addPositive = (name, pass, details = {}) => positiveChecks.push({ name, pass: Boolean(pass), ...details });
const validateCapability = (doc) => schemaModule.validateCapabilityMatrix(doc);
const validateManifest = (doc) => schemaModule.validateGeneratedFileManifest(doc);
const codesOf = (result) => result.valid ? [] : [...new Set(result.issues.map((issue) => issue.code))].sort();

const apiMatrixValidation = validateCapability(apiMatrix);
const apiManifestValidation = validateManifest(apiManifest);
const packageMatrixValidation = validateCapability(packageMatrix);
const packageManifestValidation = validateManifest(packageManifest);
const exampleMatrixValidation = validateCapability(exampleMatrix);
const exampleManifestValidation = validateManifest(exampleManifest);

addPositive('api capability matrix validates', apiMatrixValidation.valid, { codes: codesOf(apiMatrixValidation) });
addPositive('api generated-file manifest validates', apiManifestValidation.valid, { codes: codesOf(apiManifestValidation) });
addPositive('package capability fixture validates', packageMatrixValidation.valid, { codes: codesOf(packageMatrixValidation) });
addPositive('package generated-file fixture validates', packageManifestValidation.valid, { codes: codesOf(packageManifestValidation) });
addPositive('example capability fixture validates', exampleMatrixValidation.valid, { codes: codesOf(exampleMatrixValidation) });
addPositive('example generated-file fixture validates', exampleManifestValidation.valid, { codes: codesOf(exampleManifestValidation) });
addPositive('package capability fixture equals API output', stable(packageMatrix) === stable(apiMatrix));
addPositive('package generated-file fixture equals API output', stable(packageManifest) === stable(apiManifest));
addPositive('example capability fixture equals API output', stable(exampleMatrix) === stable(apiMatrix));
addPositive('example generated-file fixture equals API output', stable(exampleManifest) === stable(apiManifest));
addPositive('example downstream summary equals API summary', stable(exampleSummary) === stable(apiSummary));

const expectedSkills = ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship'];
const expectedFamilies = ['pi-skill-files', 'pi-prompt-templates', 'pi-extensions', 'pi-package-manifest', 'context-files', 'harness-config'];
const requiredPathPatterns = new Map([
  ['pi-skill-files', ['.pi/skills/<skill>/SKILL.md', '.agents/skills/<skill>/SKILL.md']],
  ['pi-prompt-templates', ['.pi/prompts/<name>.md']],
  ['pi-extensions', ['.pi/extensions/<name>.ts', '.pi/extensions/<name>/index.ts']],
  ['pi-package-manifest', ['package.json#pi']],
  ['context-files', ['AGENTS.md', 'CLAUDE.md']],
  ['harness-config', ['generated harness config field: agenticHarness=pi', 'generated harness config field: adapterCapabilityVersion', 'generated harness config field: generatedFileManifestVersion']],
]);
const piAdapter = packageMatrix.adapters.find((adapter) => adapter.adapterId === 'pi');
const nonPiAdapters = packageMatrix.adapters.filter((adapter) => adapter.adapterId !== 'pi');
const familyById = new Map(packageManifest.families.map((family) => [family.familyId, family]));

addPositive('downstream summary six skills exact', stable(apiSummary.sixSkills) === stable(expectedSkills), { actual: apiSummary.sixSkills });
addPositive('downstream summary generated families exact', stable(apiSummary.generatedFamilies) === stable(expectedFamilies), { actual: apiSummary.generatedFamilies });
addPositive('downstream summary manifestReady true', apiSummary.manifestReady === true);
addPositive('downstream summary createImportReady false', apiSummary.createImportReady === false);
addPositive('downstream summary runtime not claimed/proven', apiSummary.runtimeExecutionClaim === 'not-claimed');
addPositive('pi adapter exists', piAdapter !== undefined);
addPositive('pi adapter manifest selectable only', piAdapter?.selection?.manifestSelectable === true && piAdapter?.selection?.createImportSelectable === false);
addPositive('non-pi adapters are never selectable/ready', nonPiAdapters.every((adapter) => adapter.selection.manifestSelectable === false && adapter.selection.createImportSelectable === false && adapter.selection.readiness !== 'ready'));
addPositive('all required family ids present', expectedFamilies.every((familyId) => familyById.has(familyId)));
addPositive('required family path patterns present exactly', [...requiredPathPatterns].every(([familyId, patterns]) => stable(familyById.get(familyId)?.pathPatterns) === stable(patterns)));
addPositive('each family carries owner/security/version/consumer/readiness metadata', packageManifest.families.every((family) => family.owner && family.trustSecurity && family.version && family.readiness && Array.isArray(family.consumedByLanes) && family.consumedByLanes.length > 0));
addPositive('DL-22 family metadata declares no sandbox guarantee and safe defaults', packageManifest.families.every((family) => family.trustSecurity.sandboxCapability === 'not_provided' && ['disabled-by-default', 'read-only', 'unknown-blocked'].includes(family.trustSecurity.externalIntegration) && ['forbidden', 'approval-required', 'not-applicable'].includes(family.trustSecurity.destructiveOperationPolicy)));

const negativeExpectations = {
  'missing-capability-block.json': { target: 'capability', requiredCodes: ['missing_required'] },
  'unsupported-selectable-non-pi-harness.json': { target: 'capability', requiredCodes: ['non_pi_selectable'] },
  'missing-generated-file-owner.json': { target: 'manifest', requiredCodes: ['missing_required', 'missing_fail_closed_metadata'] },
  'missing-generated-file-security-trust.json': { target: 'manifest', requiredCodes: ['missing_required', 'missing_fail_closed_metadata'] },
  'missing-generated-file-version.json': { target: 'manifest', requiredCodes: ['missing_required', 'missing_fail_closed_metadata'] },
  'missing-generated-file-consumers.json': { target: 'manifest', requiredCodes: ['empty_array', 'missing_fail_closed_metadata'] },
  'missing-six-skill-mapping.json': { target: 'capability', requiredCodes: ['missing_skill_mapping'] },
  'silent-noop-unsupported-feature-attempt.json': { target: 'capability', requiredCodes: ['unsupported_feature_policy_not_blocking', 'non_pi_enabled_flag'] },
};
const negativeResults = [];
for (const fileName of (await readdir(negativeFixtureRoot)).sort()) {
  const expectation = negativeExpectations[fileName];
  const document = await readJson(path.join(negativeFixtureRoot, fileName));
  const result = expectation?.target === 'manifest' ? validateManifest(document) : validateCapability(document);
  const codes = codesOf(result);
  negativeResults.push({
    name: fileName,
    expected: expectation !== undefined,
    valid: result.valid,
    codes,
    requiredCodes: expectation?.requiredCodes ?? [],
    requiredCodesPresent: (expectation?.requiredCodes ?? []).every((code) => codes.includes(code)),
  });
}

const mutationCases = [];
const addMutation = (name, target, document, requiredCodes, severityIfPass) => mutationCases.push({ name, target, document, requiredCodes, severityIfPass });
{
  const doc = clone(packageMatrix);
  doc.unexpected = true;
  addMutation('capability matrix unknown top-level field', 'capability', doc, ['unknown_field'], 'critical');
}
{
  const doc = clone(packageMatrix);
  doc.adapters[0].evidenceStatus.state = 'maybe';
  addMutation('unsupported evidence state', 'capability', doc, ['unsupported_value'], 'critical');
}
{
  const doc = clone(packageMatrix);
  doc.adapters.push(clone(doc.adapters[0]));
  addMutation('duplicate adapter id', 'capability', doc, ['duplicate_adapter_id'], 'critical');
}
{
  const doc = clone(packageMatrix);
  doc.adapters = doc.adapters.filter((adapter) => adapter.adapterId !== 'pi');
  addMutation('missing pi adapter row', 'capability', doc, ['missing_pi_adapter'], 'critical');
}
{
  const doc = clone(packageMatrix);
  doc.adapters[0].selection.createImportSelectable = true;
  addMutation('pi create/import selectable claim', 'capability', doc, ['create_import_claim_out_of_scope'], 'critical');
}
{
  const doc = clone(packageMatrix);
  doc.adapters[0].realBoundaryWitness.runtimeExecutionClaim = 'proven';
  addMutation('i14a live runtime proven claim', 'capability', doc, ['i14a_runtime_claim_out_of_scope'], 'critical');
}
{
  const doc = clone(packageManifest);
  doc.families = doc.families.filter((family) => family.familyId !== 'pi-extensions');
  addMutation('missing generated-file family', 'manifest', doc, ['missing_generated_file_family'], 'critical');
}
{
  const doc = clone(packageManifest);
  doc.families.push(clone(doc.families[0]));
  addMutation('duplicate generated-file family', 'manifest', doc, ['duplicate_generated_file_family'], 'critical');
}
{
  const doc = clone(packageManifest);
  doc.families[0].readiness.state = 'maybe';
  addMutation('unsupported generated-file readiness state', 'manifest', doc, ['unsupported_value'], 'critical');
}
{
  const doc = clone(packageManifest);
  const extension = doc.families.find((family) => family.familyId === 'pi-extensions');
  extension.trustSecurity.executesCode = false;
  addMutation('extension executable behavior not declared', 'manifest', doc, ['extension_execution_not_declared'], 'critical');
}
{
  const doc = clone(packageManifest);
  const skillFiles = doc.families.find((family) => family.familyId === 'pi-skill-files');
  skillFiles.pathPatterns = ['wrong/location/SKILL.md'];
  addMutation('required pi skill path patterns missing', 'manifest', doc, ['missing_required_path_pattern'], 'major-local');
}
{
  const doc = clone(packageManifest);
  const skillFiles = doc.families.find((family) => family.familyId === 'pi-skill-files');
  skillFiles.producedByLane = 'unknown-lane';
  addMutation('generated-file produced-by lane untyped', 'manifest', doc, ['unsupported_value'], 'major-local');
}
const mutationResults = mutationCases.map((testCase) => {
  const result = testCase.target === 'manifest' ? validateManifest(testCase.document) : validateCapability(testCase.document);
  const codes = codesOf(result);
  return {
    name: testCase.name,
    target: testCase.target,
    valid: result.valid,
    codes,
    requiredCodes: testCase.requiredCodes,
    requiredCodesPresent: testCase.requiredCodes.every((code) => codes.includes(code)),
    severityIfPass: testCase.severityIfPass,
  };
});

const result = {
  schemaVersion: 'i-14a-validator-owned-manifest-boundary/v1',
  packageManifestPath,
  exportTargets,
  positiveChecks,
  negativeResults,
  mutationResults,
  downstreamSummary: apiSummary,
};
await writeJson(summaryPath, apiSummary);
await writeJson(resultPath, result);

const positiveOk = positiveChecks.every((check) => check.pass);
const negativeOk = negativeResults.length === Object.keys(negativeExpectations).length && negativeResults.every((check) => check.expected && check.valid === false && check.requiredCodesPresent);
const mutationOk = mutationResults.every((check) => check.valid === false && check.requiredCodesPresent);
const ok = positiveOk && negativeOk && mutationOk;
console.log(JSON.stringify({ ok, positiveOk, negativeOk, mutationOk, resultPath, summaryPath, failedPositive: positiveChecks.filter((check) => !check.pass).map((check) => check.name), passedNegatives: negativeResults.filter((check) => check.valid).map((check) => check.name), passedMutations: mutationResults.filter((check) => check.valid || !check.requiredCodesPresent).map((check) => check.name) }));
if (!ok) {
  process.exitCode = 1;
}
