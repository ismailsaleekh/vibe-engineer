import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPiAdapterCapabilityMatrix } from '../../../../../packages/adapters/pi/src/capabilities/index.ts';
import { getPiGeneratedFileManifest } from '../../../../../packages/adapters/pi/src/generated-file-manifest/index.ts';
import { generatePiRuntimeFixture } from '../../../../../packages/adapters/pi/src/generators/runtime-fixture-generator.ts';
import { validatePiRuntimeFixture, validatePiRuntimeFixtureAgainstI14A } from '../../../../../packages/adapters/pi/src/runtime/validation.ts';
import { validatePiRuntimeWritePlan } from '../../../../../packages/adapters/pi/src/runtime/write-plan.ts';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = dirname(__filename);
const resultPath = join(scriptDir, 'negative-witness-result.json');

const baseFixture = generatePiRuntimeFixture();
const baseCapabilityMatrix = getPiAdapterCapabilityMatrix();
const baseGeneratedFileManifest = getPiGeneratedFileManifest();
const clone = (value) => JSON.parse(JSON.stringify(value));
const issueCodes = (issues) => [...new Set(issues.map((issue) => issue.code))].sort();

const firstAsset = (fixture, kind) => {
  const asset = fixture.assets.find((candidate) => candidate.kind === kind);
  if (!asset) throw new Error(`Missing base asset kind ${kind}`);
  return asset;
};

const skillAsset = (fixture, skillId) => {
  const asset = fixture.assets.find((candidate) => candidate.kind === 'skill' && candidate.metadata.skillProtocol?.skillId === skillId);
  if (!asset) throw new Error(`Missing base skill ${skillId}`);
  return asset;
};

const promptAsset = (fixture, skillId) => {
  const asset = fixture.assets.find((candidate) => candidate.kind === 'prompt-template' && candidate.metadata.promptContract?.skillId === skillId);
  if (!asset) throw new Error(`Missing base prompt ${skillId}`);
  return asset;
};

const extensionAsset = (fixture) => firstAsset(fixture, 'extension');
const packageAsset = (fixture) => firstAsset(fixture, 'package-manifest');
const contextAsset = (fixture) => firstAsset(fixture, 'context');

const removeFrontmatterLine = (content, key) => content.split('\n').filter((line) => !line.startsWith(`${key}:`)).join('\n');
const replaceFrontmatterLine = (content, key, replacement) => content.split('\n').map((line) => line.startsWith(`${key}:`) ? `${key}: ${replacement}` : line).join('\n');

const runFixtureCase = (name, mutate, expectedCodes) => {
  const fixture = clone(baseFixture);
  mutate(fixture);
  const validation = validatePiRuntimeFixture(fixture);
  const actualCodes = validation.valid ? [] : issueCodes(validation.issues);
  const missingExpected = expectedCodes.filter((code) => !actualCodes.includes(code));
  return {
    name,
    kind: 'fixture',
    passed: !validation.valid && missingExpected.length === 0,
    valid: validation.valid,
    expectedCodes,
    actualCodes,
    missingExpected,
    issueCount: validation.valid ? 0 : validation.issues.length,
    issues: validation.valid ? [] : validation.issues,
  };
};

const runJoinedCase = (name, mutate, expectedCodes) => {
  const fixture = clone(baseFixture);
  const capabilityMatrix = clone(baseCapabilityMatrix);
  const generatedFileManifest = clone(baseGeneratedFileManifest);
  mutate({ fixture, capabilityMatrix, generatedFileManifest });
  const validation = validatePiRuntimeFixtureAgainstI14A(fixture, capabilityMatrix, generatedFileManifest);
  const actualCodes = validation.valid ? [] : issueCodes(validation.issues);
  const missingExpected = expectedCodes.filter((code) => !actualCodes.includes(code));
  return {
    name,
    kind: 'joined-i14a',
    passed: !validation.valid && missingExpected.length === 0,
    valid: validation.valid,
    expectedCodes,
    actualCodes,
    missingExpected,
    issueCount: validation.valid ? 0 : validation.issues.length,
    issues: validation.valid ? [] : validation.issues,
  };
};

const runWritePlanCase = (name, existingPaths, policy, expectedCodes) => {
  const validation = validatePiRuntimeWritePlan(clone(baseFixture), existingPaths, policy);
  const actualCodes = validation.valid ? [] : issueCodes(validation.issues);
  const missingExpected = expectedCodes.filter((code) => !actualCodes.includes(code));
  return {
    name,
    kind: 'write-plan',
    passed: !validation.valid && missingExpected.length === 0,
    valid: validation.valid,
    expectedCodes,
    actualCodes,
    missingExpected,
    issueCount: validation.valid ? 0 : validation.issues.length,
    issues: validation.valid ? [] : validation.issues,
  };
};

const cases = [];

cases.push(runFixtureCase('missing required skill', (fixture) => {
  fixture.assets = fixture.assets.filter((asset) => asset.metadata.skillProtocol?.skillId !== 'ship');
}, ['missing_required_skill']));

cases.push(runFixtureCase('duplicate skill id', (fixture) => {
  const duplicate = clone(skillAsset(fixture, 'brainstorm'));
  duplicate.path = '.agents/skills/brainstorm/SKILL.md';
  fixture.assets.push(duplicate);
}, ['duplicate_skill_id']));

cases.push(runFixtureCase('unknown skill id', (fixture) => {
  const asset = skillAsset(fixture, 'brainstorm');
  asset.path = '.pi/skills/unknown-skill/SKILL.md';
  asset.metadata.skillProtocol.skillId = 'unknown-skill';
  asset.content = replaceFrontmatterLine(asset.content, 'name', 'unknown-skill');
}, ['unknown_skill_id']));

cases.push(runFixtureCase('mismatched skill command/resource path', (fixture) => {
  const asset = skillAsset(fixture, 'brainstorm');
  asset.path = '.pi/skills/task/SKILL.md';
}, ['mismatched_skill_command_resource_path']));

cases.push(runFixtureCase('missing skill name frontmatter', (fixture) => {
  const asset = skillAsset(fixture, 'brainstorm');
  asset.content = removeFrontmatterLine(asset.content, 'name');
}, ['missing_skill_name']));

cases.push(runFixtureCase('missing skill description frontmatter', (fixture) => {
  const asset = skillAsset(fixture, 'brainstorm');
  asset.content = removeFrontmatterLine(asset.content, 'description');
}, ['missing_skill_description']));

cases.push(runFixtureCase('invalid skill name', (fixture) => {
  const asset = skillAsset(fixture, 'brainstorm');
  asset.content = replaceFrontmatterLine(asset.content, 'name', 'Invalid_Skill');
}, ['invalid_skill_name']));

cases.push(runFixtureCase('DL-03 protocol and output contradiction', (fixture) => {
  const asset = skillAsset(fixture, 'plan');
  asset.content = replaceFrontmatterLine(asset.content, 'vibe-protocol', 'work-brief-producer');
  asset.content = replaceFrontmatterLine(asset.content, 'vibe-output-artifact', 'work-brief');
}, ['dl03_protocol_contradiction', 'dl03_output_contradiction']));

cases.push(runFixtureCase('prompt missing description', (fixture) => {
  const asset = promptAsset(fixture, 'brainstorm');
  asset.content = removeFrontmatterLine(asset.content, 'description');
}, ['missing_prompt_description']));

cases.push(runFixtureCase('prompt missing argument contract', (fixture) => {
  const asset = promptAsset(fixture, 'brainstorm');
  asset.content = removeFrontmatterLine(asset.content, 'argument-hint');
  asset.metadata.promptContract.argumentContract = [];
}, ['missing_prompt_argument_contract']));

cases.push(runFixtureCase('prompt outside discoverable path', (fixture) => {
  const asset = promptAsset(fixture, 'brainstorm');
  asset.path = '.agents/prompts/vibe-brainstorm.md';
}, ['prompt_template_not_discoverable']));

cases.push(runFixtureCase('nested prompt path', (fixture) => {
  const asset = promptAsset(fixture, 'brainstorm');
  asset.path = '.pi/prompts/nested/vibe-brainstorm.md';
}, ['prompt_template_not_discoverable']));

cases.push(runFixtureCase('extension outside allowed path', (fixture) => {
  const asset = extensionAsset(fixture);
  asset.path = '.pi/extensions/nested/not-index.ts';
}, ['extension_path_not_discoverable']));

cases.push(runFixtureCase('extension claims unsupported sandboxing', (fixture) => {
  extensionAsset(fixture).metadata.extensionPolicy.claimsSandboxing = 'proven';
}, ['extension_claims_unsupported_sandboxing']));

cases.push(runFixtureCase('extension weakens default deny', (fixture) => {
  extensionAsset(fixture).metadata.extensionPolicy.defaultDeny = false;
}, ['extension_weakens_default_deny']));

cases.push(runFixtureCase('extension allows destructive operations by default', (fixture) => {
  extensionAsset(fixture).metadata.extensionPolicy.permitsDestructiveOperationsByDefault = true;
}, ['extension_allows_destructive_by_default']));

cases.push(runFixtureCase('extension allows external mutation by default', (fixture) => {
  extensionAsset(fixture).metadata.extensionPolicy.permitsExternalMutationByDefault = true;
}, ['extension_allows_external_mutation_by_default']));

cases.push(runFixtureCase('extension requires credentials by default', (fixture) => {
  extensionAsset(fixture).metadata.extensionPolicy.requiresCredentialsByDefault = true;
}, ['extension_requires_credentials_by_default']));

cases.push(runFixtureCase('extension content weakens DL-22 policy', (fixture) => {
  extensionAsset(fixture).content += '\n// process.env.API_KEY; rm -rf /; sandboxed: true\n';
}, ['extension_weakens_dl22_policy']));

cases.push(runFixtureCase('context embeds secret marker', (fixture) => {
  contextAsset(fixture).content += '\nExample credential: sk-abcdef\n';
}, ['context_embeds_secret_or_credential']));

cases.push(runFixtureCase('context embeds business domain assumption', (fixture) => {
  contextAsset(fixture).content += '\nAssume ecommerce inventory checkout behavior.\n';
}, ['context_embeds_business_domain_assumption']));

cases.push(runFixtureCase('context claims live runtime truth-green', (fixture) => {
  contextAsset(fixture).content += '\nThis is live-proven and runtime-proven.\n';
}, ['context_claims_live_runtime_truth_green']));

cases.push(runFixtureCase('package manifest missing pi resources', (fixture) => {
  const parsed = JSON.parse(packageAsset(fixture).content);
  delete parsed.pi;
  packageAsset(fixture).content = JSON.stringify(parsed, null, 2);
}, ['missing_pi_package_resources']));

cases.push(runFixtureCase('package manifest traversing resource path', (fixture) => {
  const parsed = JSON.parse(packageAsset(fixture).content);
  parsed.pi.skills = ['../outside'];
  packageAsset(fixture).content = JSON.stringify(parsed, null, 2);
}, ['path_traversal']));

cases.push(runFixtureCase('package manifest outside missing resource path', (fixture) => {
  const parsed = JSON.parse(packageAsset(fixture).content);
  parsed.pi.prompts = ['./.pi/prompts/missing'];
  packageAsset(fixture).content = JSON.stringify(parsed, null, 2);
}, ['pi_resource_path_missing_asset']));

cases.push(runFixtureCase('unknown generated-file family', (fixture) => {
  skillAsset(fixture, 'brainstorm').familyId = 'unknown-family';
}, ['unknown_generated_file_family']));

cases.push(runJoinedCase('unsupported non-pi adapter selection', ({ capabilityMatrix }) => {
  const adapter = capabilityMatrix.adapters.find((candidate) => candidate.adapterId === 'codex');
  adapter.selection.manifestSelectable = true;
  adapter.selection.readiness = 'ready';
}, ['non_pi_selectable', 'unsupported_non_pi_adapter_selection']));

cases.push(runFixtureCase('asset path traversal', (fixture) => {
  skillAsset(fixture, 'brainstorm').path = '.pi/skills/../escape/SKILL.md';
}, ['path_traversal']));

cases.push(runFixtureCase('absolute asset path write', (fixture) => {
  skillAsset(fixture, 'brainstorm').path = '/tmp/escape/SKILL.md';
}, ['absolute_path']));

for (const claim of ['proven', 'live-proven', 'runtime-proven', 'loaded', 'executed']) {
  cases.push(runFixtureCase(`runtime claim ${claim} without live evidence`, (fixture) => {
    fixture.runtimeExecutionClaim = claim;
  }, ['runtime_execution_claim_requires_live_evidence']));
}

const firstPath = baseFixture.assets[0].path;
cases.push(runWritePlanCase('write-plan symlink escape', [{ path: firstPath, kind: 'symlink' }], 'fail-on-conflict', ['symlink_write_escape']));
cases.push(runWritePlanCase('unsafe overwrite conflict', [{ path: firstPath, kind: 'file', currentContent: 'different' }], 'fail-on-conflict', ['unsafe_overwrite_conflict']));

cases.push(runJoinedCase('silent unsupported-feature no-op is rejected', ({ capabilityMatrix }) => {
  const adapter = capabilityMatrix.adapters.find((candidate) => candidate.adapterId === 'pi');
  adapter.capabilityFlags.unsupportedFeaturePolicy = 'defer';
}, ['unsupported_feature_policy_not_blocking']));

const failed = cases.filter((entry) => !entry.passed);
const result = {
  ok: failed.length === 0,
  caseCount: cases.length,
  failedCount: failed.length,
  failed,
  cases,
};
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: result.ok, resultPath, caseCount: result.caseCount, failedCount: result.failedCount }, null, 2));
if (!result.ok) process.exit(1);
