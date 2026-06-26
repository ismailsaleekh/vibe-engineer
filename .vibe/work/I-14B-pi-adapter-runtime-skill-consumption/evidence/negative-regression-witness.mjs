import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const evidenceRoot = join(repoRoot, '.vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence');
const load = (relative) => import(new URL(`../../../../${relative}`, import.meta.url).href);
const { generatePiRuntimeFixture } = await load('packages/adapters/pi/src/generators/runtime-fixture-generator.ts');
const { validatePiRuntimeFixtureAgainstI14A, validatePiRuntimeFixture } = await load('packages/adapters/pi/src/runtime/validation.ts');
const { validatePiRuntimeWritePlan } = await load('packages/adapters/pi/src/runtime/write-plan.ts');
const { getPiAdapterCapabilityMatrix, isAdapterManifestSelectable } = await load('packages/adapters/pi/src/capabilities/index.ts');
const { getPiGeneratedFileManifest, createPiDownstreamManifestSummary } = await load('packages/adapters/pi/src/generated-file-manifest/index.ts');
const { SKILL_IDS, GENERATED_FILE_FAMILY_IDS, validateCapabilityMatrix, validateGeneratedFileManifest } = await load('packages/adapters/pi/src/schema/index.ts');

const clone = (value) => JSON.parse(JSON.stringify(value));
const fixture = generatePiRuntimeFixture();
const matrix = getPiAdapterCapabilityMatrix();
const manifest = getPiGeneratedFileManifest();

const expectInvalid = (name, mutate, expectedCodes) => {
  const candidate = mutate(clone(fixture));
  const result = validatePiRuntimeFixture(candidate);
  const codes = result.valid ? [] : [...new Set(result.issues.map((issue) => issue.code))].sort();
  const ok = !result.valid && expectedCodes.every((code) => codes.includes(code));
  return { name, ok, valid: result.valid, expectedCodes, codes, issues: result.valid ? [] : result.issues };
};

const skillIndex = (candidate, skillId) => candidate.assets.findIndex((asset) => asset.kind === 'skill' && asset.metadata.skillProtocol?.skillId === skillId);
const promptIndex = (candidate, skillId) => candidate.assets.findIndex((asset) => asset.kind === 'prompt-template' && asset.metadata.promptContract?.skillId === skillId);
const extensionIndex = (candidate) => candidate.assets.findIndex((asset) => asset.kind === 'extension');
const contextIndex = (candidate, path) => candidate.assets.findIndex((asset) => asset.kind === 'context' && asset.path === path);
const packageIndex = (candidate) => candidate.assets.findIndex((asset) => asset.kind === 'package-manifest');
const configIndex = (candidate) => candidate.assets.findIndex((asset) => asset.kind === 'harness-config' && asset.path.endsWith('pi-runtime.json'));

const expectInvalidWritePlan = (name, existingPaths, conflictPolicy, expectedCodes) => {
  const result = validatePiRuntimeWritePlan(clone(fixture), existingPaths, conflictPolicy);
  const codes = result.valid ? [] : [...new Set(result.issues.map((issue) => issue.code))].sort();
  const ok = !result.valid && expectedCodes.every((code) => codes.includes(code));
  return { name, ok, valid: result.valid, expectedCodes, codes, issues: result.valid ? [] : result.issues };
};

const negativeCases = [
  expectInvalid('missing-one-required-skill', (candidate) => ({ ...candidate, assets: candidate.assets.filter((asset) => asset.metadata.skillProtocol?.skillId !== 'ship') }), ['missing_required_skill']),
  expectInvalid('duplicate-skill-id', (candidate) => { const index = skillIndex(candidate, 'task'); candidate.assets.push(clone(candidate.assets[index])); candidate.assets[candidate.assets.length - 1].path = '.pi/skills/task-copy/SKILL.md'; return candidate; }, ['duplicate_skill_id']),
  expectInvalid('unknown-skill-id', (candidate) => { const index = skillIndex(candidate, 'task'); candidate.assets[index].path = '.pi/skills/unknown/SKILL.md'; return candidate; }, ['unknown_skill_id']),
  expectInvalid('mismatched-skill-command-resource-path', (candidate) => { const index = skillIndex(candidate, 'task'); candidate.assets[index].path = '.pi/skills/build/SKILL.md'; return candidate; }, ['mismatched_skill_command_resource_path']),
  expectInvalid('skill-missing-name', (candidate) => { const index = skillIndex(candidate, 'brainstorm'); candidate.assets[index].content = candidate.assets[index].content.replace('name: brainstorm\n', ''); return candidate; }, ['missing_skill_name']),
  expectInvalid('skill-missing-description', (candidate) => { const index = skillIndex(candidate, 'brainstorm'); candidate.assets[index].content = candidate.assets[index].content.replace(/^description: .*\n/m, ''); return candidate; }, ['missing_skill_description']),
  expectInvalid('invalid-skill-name', (candidate) => { const index = skillIndex(candidate, 'brainstorm'); candidate.assets[index].content = candidate.assets[index].content.replace('name: brainstorm', 'name: Brainstorm'); return candidate; }, ['invalid_skill_name']),
  expectInvalid('dl03-contradicting-output', (candidate) => { const index = skillIndex(candidate, 'brainstorm'); candidate.assets[index].content = candidate.assets[index].content.replace('vibe-output-artifact: work-brief', 'vibe-output-artifact: implementation-plan-with-verification-delta'); return candidate; }, ['dl03_output_contradiction']),
  expectInvalid('prompt-missing-description', (candidate) => { const index = promptIndex(candidate, 'plan'); candidate.assets[index].content = candidate.assets[index].content.replace(/^description: .*\n/m, ''); return candidate; }, ['missing_prompt_description']),
  expectInvalid('prompt-missing-argument-contract', (candidate) => { const index = promptIndex(candidate, 'plan'); candidate.assets[index].content = candidate.assets[index].content.replace(/^argument-hint: .*\n/m, ''); candidate.assets[index].metadata.promptContract.argumentContract = []; return candidate; }, ['missing_prompt_argument_contract']),
  expectInvalid('prompt-outside-pi-prompts', (candidate) => { const index = promptIndex(candidate, 'plan'); candidate.assets[index].path = 'prompts/vibe-plan.md'; return candidate; }, ['prompt_template_not_discoverable']),
  expectInvalid('nested-prompt-not-discoverable', (candidate) => { const index = promptIndex(candidate, 'plan'); candidate.assets[index].path = '.pi/prompts/nested/vibe-plan.md'; return candidate; }, ['prompt_template_not_discoverable']),
  expectInvalid('extension-outside-allowed-path', (candidate) => { const index = extensionIndex(candidate); candidate.assets[index].path = '.pi/extensions/nested/not-index.ts'; return candidate; }, ['extension_path_not_discoverable']),
  expectInvalid('extension-claims-sandboxing', (candidate) => { const index = extensionIndex(candidate); candidate.assets[index].metadata.extensionPolicy.claimsSandboxing = 'proven'; return candidate; }, ['extension_claims_unsupported_sandboxing']),
  expectInvalid('extension-allows-destructive', (candidate) => { const index = extensionIndex(candidate); candidate.assets[index].metadata.extensionPolicy.permitsDestructiveOperationsByDefault = true; return candidate; }, ['extension_allows_destructive_by_default']),
  expectInvalid('extension-allows-external-mutation', (candidate) => { const index = extensionIndex(candidate); candidate.assets[index].metadata.extensionPolicy.permitsExternalMutationByDefault = true; return candidate; }, ['extension_allows_external_mutation_by_default']),
  expectInvalid('extension-requires-credentials', (candidate) => { const index = extensionIndex(candidate); candidate.assets[index].metadata.extensionPolicy.requiresCredentialsByDefault = true; return candidate; }, ['extension_requires_credentials_by_default']),
  expectInvalid('extension-weakens-content-policy', (candidate) => { const index = extensionIndex(candidate); candidate.assets[index].content += '\n// rm -rf / would be destructive\n'; return candidate; }, ['extension_weakens_dl22_policy']),
  expectInvalid('context-embeds-secret', (candidate) => { const index = contextIndex(candidate, 'AGENTS.md'); candidate.assets[index].content += '\nAPI_KEY=sk-real-looking\n'; return candidate; }, ['context_embeds_secret_or_credential']),
  expectInvalid('context-embeds-domain-assumption', (candidate) => { const index = contextIndex(candidate, 'AGENTS.md'); candidate.assets[index].content += '\nAssume ecommerce checkout inventory.\n'; return candidate; }, ['context_embeds_business_domain_assumption']),
  expectInvalid('context-claims-live-runtime-green', (candidate) => { const index = contextIndex(candidate, 'AGENTS.md'); candidate.assets[index].content += '\nSelected pi is truth-green and loaded by pi.\n'; return candidate; }, ['context_claims_live_runtime_truth_green']),
  expectInvalid('package-missing-pi-resources', (candidate) => { const index = packageIndex(candidate); candidate.assets[index].content = JSON.stringify({ name: 'bad' }); return candidate; }, ['missing_pi_package_resources']),
  expectInvalid('package-invalid-resource-path', (candidate) => { const index = packageIndex(candidate); const pkg = JSON.parse(candidate.assets[index].content); pkg.pi.skills = ['../escape']; candidate.assets[index].content = JSON.stringify(pkg); return candidate; }, ['path_traversal', 'pi_resource_path_missing_asset']),
  expectInvalid('package-resource-outside-fixture', (candidate) => { const index = packageIndex(candidate); const pkg = JSON.parse(candidate.assets[index].content); pkg.pi.prompts = ['./not-generated']; candidate.assets[index].content = JSON.stringify(pkg); return candidate; }, ['pi_resource_path_missing_asset']),
  expectInvalid('unknown-generated-file-family', (candidate) => { candidate.assets[0].familyId = 'unknown-family'; return candidate; }, ['unknown_generated_file_family']),
  expectInvalid('unsupported-non-pi-config-selection', (candidate) => { const index = configIndex(candidate); const config = JSON.parse(candidate.assets[index].content); config.agenticHarness = 'codex'; candidate.assets[index].content = JSON.stringify(config); return candidate; }, ['unsupported_non_pi_adapter_selection']),
  expectInvalid('path-traversal-asset', (candidate) => { candidate.assets[0].path = '../escape/SKILL.md'; return candidate; }, ['path_traversal']),
  expectInvalid('absolute-path-asset', (candidate) => { candidate.assets[0].path = '/tmp/escape/SKILL.md'; return candidate; }, ['absolute_path']),
  expectInvalid('runtime-proven-claim-rejected', (candidate) => { candidate.runtimeExecutionClaim = 'proven'; return candidate; }, ['runtime_execution_claim_requires_live_evidence']),
  expectInvalid('asset-runtime-loaded-claim-rejected', (candidate) => { candidate.assets[0].metadata.runtimeExecutionClaim = 'loaded'; return candidate; }, ['runtime_execution_claim_requires_live_evidence']),
  expectInvalidWritePlan('write-plan-rejects-symlink-target', [{ path: fixture.assets[0].path, kind: 'symlink' }], 'allow-identical-overwrite', ['symlink_write_escape']),
  expectInvalidWritePlan('write-plan-rejects-unsafe-overwrite-conflict', [{ path: fixture.assets[0].path, kind: 'file', currentContent: 'different' }], 'allow-identical-overwrite', ['unsafe_overwrite_conflict']),
];

const positive = validatePiRuntimeFixtureAgainstI14A(fixture, matrix, manifest);
const capabilityValidation = validateCapabilityMatrix(matrix);
const manifestValidation = validateGeneratedFileManifest(manifest);
const summary = createPiDownstreamManifestSummary();
const nonPiAdapters = matrix.adapters.filter((adapter) => adapter.adapterId !== 'pi');
const regression = {
  capabilityValidationValid: capabilityValidation.valid,
  manifestValidationValid: manifestValidation.valid,
  summaryRuntimeExecutionClaim: summary.runtimeExecutionClaim,
  summarySkills: summary.sixSkills,
  summaryFamilies: summary.generatedFamilies,
  allSixSkillsAligned: JSON.stringify(summary.sixSkills) === JSON.stringify(SKILL_IDS),
  allFamiliesAligned: JSON.stringify([...summary.generatedFamilies].sort()) === JSON.stringify([...GENERATED_FILE_FAMILY_IDS].sort()),
  piManifestSelectable: isAdapterManifestSelectable(matrix, 'pi'),
  nonPiSelectable: nonPiAdapters.filter((adapter) => adapter.selection.manifestSelectable || adapter.selection.createImportSelectable || adapter.selection.readiness === 'ready').map((adapter) => adapter.adapterId),
};

const hashFiles = [
  'packages/adapters/pi/src/capabilities/index.ts',
  'packages/adapters/pi/src/generated-file-manifest/index.ts',
  'packages/adapters/pi/src/schema/index.ts',
];
const i14aHashes = {};
for (const file of hashFiles) {
  const content = await readFile(join(repoRoot, file));
  i14aHashes[file] = createHash('sha256').update(content).digest('hex');
}

const result = {
  ok: positive.valid && negativeCases.every((entry) => entry.ok) && regression.capabilityValidationValid && regression.manifestValidationValid && regression.piManifestSelectable && regression.nonPiSelectable.length === 0 && regression.allSixSkillsAligned && regression.allFamiliesAligned,
  positive: { valid: positive.valid, issues: positive.valid ? [] : positive.issues },
  negativeCases,
  regression,
  i14aHashes,
};
await writeFile(join(evidenceRoot, 'negative-regression-result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ok: result.ok, negativeCount: negativeCases.length, failedNegativeCases: negativeCases.filter((entry) => !entry.ok).map((entry) => entry.name), regression }, null, 2));
if (!result.ok) process.exitCode = 1;
