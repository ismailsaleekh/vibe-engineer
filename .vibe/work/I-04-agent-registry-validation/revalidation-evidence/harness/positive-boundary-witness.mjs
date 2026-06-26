import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const registryApi = await import(pathToFileURL(path.join(repoRoot, 'packages/registry/src/index.js')).href);
const artifactsApi = await import(pathToFileURL(path.join(repoRoot, 'packages/artifacts/src/index.js')).href);
const { ARTIFACT_FLOW, LOCKED_SKILLS, PRODUCT_NAME, assertRegistryOk, canonicalSchemaIdsByKind, loadRegistry } = registryApi;
const { validateArtifactFile } = artifactsApi;

const coreRoot = path.join(repoRoot, '.vibe/registry/core-agents');
const coreEvidenceRoot = path.join(repoRoot, '.vibe/registry/evidence');
const fixtureRoot = path.join(repoRoot, 'packages/registry/fixtures/valid/core-set');
const fixtureEvidenceRoot = path.join(repoRoot, 'packages/registry/fixtures/evidence');
const projectExtension = path.join(repoRoot, 'packages/registry/fixtures/valid/scoped/project-extension.json');
const sampleDemo = path.join(repoRoot, 'packages/registry/fixtures/valid/scoped/sample-demo.json');

function jsonFiles(root) {
  return fs.readdirSync(root).filter((name) => name.endsWith('.json')).sort().map((name) => path.join(root, name));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function requireAllArtifacts(files, kind) {
  const failures = [];
  for (const file of files) {
    const result = validateArtifactFile(file, { kind });
    if (!result.ok) failures.push({ file, errors: result.errors });
  }
  assert.deepEqual(failures, [], `${kind} carrier schema failures`);
}

requireAllArtifacts(jsonFiles(coreRoot), 'agent_registry_entry');
requireAllArtifacts(jsonFiles(fixtureRoot), 'agent_registry_entry');
requireAllArtifacts([...jsonFiles(coreEvidenceRoot), ...jsonFiles(fixtureEvidenceRoot)], 'evidence_packet');

const core = assertRegistryOk(loadRegistry(coreRoot));
const fixtures = assertRegistryOk(loadRegistry(fixtureRoot));

const expectedTypes = new Set(['orchestrator', 'specialist', 'validator', 'fixer', 'reviewer', 'meta', 'skill_adapter']);
assert.deepEqual(new Set(core.entries.map((entry) => entry.agentType)), expectedTypes);
assert.deepEqual(new Set(fixtures.entries.map((entry) => entry.agentType)), expectedTypes);
assert.equal(core.entries.length, 7);
assert.equal(fixtures.entries.length, 7);

for (const result of [core, fixtures]) {
  assert.ok(result.graph.topLevelLinks.some((link) => link.from !== link.to && link.required), 'non-self top-level agent_registry_entry link exists');
  for (const entry of result.entries) {
    assert.ok(entry.evals.length > 0, `${entry.agentId} eval refs exist`);
    assert.ok(entry.extensions['dev.vibe.registry'].smokeRefs.length > 0, `${entry.agentId} smoke refs exist`);
    for (const ref of entry.evals) {
      assert.equal(ref.artifactKind, 'evidence_packet');
      assert.equal(ref.required, true);
      assert.equal(ref.statusAtLinkTime, 'passed');
    }
    for (const ref of entry.extensions['dev.vibe.registry'].smokeRefs) {
      assert.equal(ref.artifactKind, 'evidence_packet');
      assert.equal(ref.required, true);
      assert.equal(ref.statusAtLinkTime, 'passed');
    }
    for (const ref of entry.validatorRefs.filter((ref) => ref.artifactKind === 'agent_registry_entry')) {
      assert.ok(['validator', 'reviewer'].includes(result.entriesById.get(ref.artifactId).agentType), `${entry.agentId} validatorRef ${ref.artifactId} type-compatible`);
    }
    for (const ref of entry.fixerRefs.filter((ref) => ref.artifactKind === 'agent_registry_entry')) {
      assert.ok(['fixer', 'orchestrator'].includes(result.entriesById.get(ref.artifactId).agentType), `${entry.agentId} fixerRef ${ref.artifactId} type-compatible`);
    }
  }
}

const skillAdapter = core.entries.find((entry) => entry.agentType === 'skill_adapter');
assert.deepEqual(skillAdapter.extensions['dev.vibe.registry'].linkedSkills, [...LOCKED_SKILLS]);
const meta = core.entries.find((entry) => entry.agentType === 'meta');
assert.ok(['recommendation_only', 'patch_material'].includes(meta.extensions['dev.vibe.registry'].outputAuthority));
assert.deepEqual(meta.extensions['dev.vibe.registry'].normalRoute, ['planning', 'build', 'verification']);
assert.equal(meta.safety.writesAllowed, false);

const projectDenied = loadRegistry(projectExtension);
assert.equal(projectDenied.ok, false);
assert.ok(projectDenied.errors.some((error) => error.ruleId === 'registry.policy.scope_classification'));
assert.equal(assertRegistryOk(loadRegistry(projectExtension, { allowedScopes: ['project_extension'] })).entries[0].agentId, 'fixture-project-extension');
const sampleDenied = loadRegistry(sampleDemo);
assert.equal(sampleDenied.ok, false);
assert.ok(sampleDenied.errors.some((error) => error.ruleId === 'registry.policy.scope_classification'));
assert.equal(assertRegistryOk(loadRegistry(sampleDemo, { allowSamples: true })).entries[0].agentId, 'fixture-sample-demo');

const forbiddenTerms = ['ecommerce', 'e-commerce', 'inventory', 'fashion', 'billz', 'telegram', 'instagram', 'shopify', 'cart', 'sku'];
const coreCarrierText = [...jsonFiles(coreRoot), ...jsonFiles(coreEvidenceRoot)].map((file) => fs.readFileSync(file, 'utf8').toLowerCase()).join('\n');
const foundTerms = forbiddenTerms.filter((term) => coreCarrierText.includes(term));
const businessCheckoutMatches = coreCarrierText.match(/(?<!git_)\bcheckout\b/g) ?? [];
assert.deepEqual([...foundTerms, ...businessCheckoutMatches], [], 'core entries/evidence must remain domain-neutral; git_checkout safety forbiddance is not business checkout leakage');

assert.equal(PRODUCT_NAME, 'vibe-engineer');
assert.deepEqual([...LOCKED_SKILLS], ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship']);
assert.deepEqual([...ARTIFACT_FLOW], ['raw_intent', 'work_brief', 'implementation_plan', 'build_result', 'ship_packet']);
assert.equal(fs.existsSync(path.join(repoRoot, 'packages/core')), false);
const registryPackage = readJson(path.join(repoRoot, 'packages/registry/package.json'));
assert.equal(JSON.stringify(registryPackage).includes('@vibe-engineer/testing'), false);
assert.ok(canonicalSchemaIdsByKind().agent_registry_entry.endsWith('/agent-registry-entry.schema.json'));
assert.ok(canonicalSchemaIdsByKind().evidence_packet.endsWith('/evidence-packet.schema.json'));

const output = {
  ok: true,
  coreEntries: core.entries.map((entry) => ({ agentId: entry.agentId, agentType: entry.agentType })),
  fixtureEntries: fixtures.entries.map((entry) => ({ agentId: entry.agentId, agentType: entry.agentType })),
  coreEvidencePackets: jsonFiles(coreEvidenceRoot).length,
  fixtureEvidencePackets: jsonFiles(fixtureEvidenceRoot).length,
  topLevelLinks: core.graph.topLevelLinks.filter((link) => link.from !== link.to),
  productName: PRODUCT_NAME,
  lockedSkills: [...LOCKED_SKILLS],
  artifactFlow: [...ARTIFACT_FLOW]
};
console.log(JSON.stringify(output, null, 2));
