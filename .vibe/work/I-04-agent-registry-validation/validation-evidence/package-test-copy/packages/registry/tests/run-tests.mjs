import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARTIFACT_FLOW,
  LOCKED_SKILLS,
  PRODUCT_NAME,
  RegistryRuleId,
  canonicalSchemaIdsByKind,
  loadRegistry
} from '@vibe-engineer/registry';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '../..');
const coreRoot = path.join(repoRoot, '.vibe/registry/core-agents');
const fixtureCoreRoot = path.join(packageRoot, 'fixtures/valid/core-set');
const generatedRoot = path.join(packageRoot, '.generated-fixtures/invalid');

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeCase(name, entries) {
  const dir = path.join(generatedRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of Array.isArray(entries) ? entries : [entries]) {
    fs.writeFileSync(path.join(dir, `${entry.agentId ?? entry.artifactId ?? name}.json`), JSON.stringify(entry, null, 2) + '\n');
  }
  return dir;
}

function fixture(name = 'fixture-specialist') {
  return readJson(path.join(fixtureCoreRoot, `${name}.json`));
}

function expectRule(result, ruleId, label) {
  assert.equal(result.ok, false, `${label} should fail`);
  assert.ok(result.errors.some((error) => error.ruleId === ruleId), `${label} should include ${ruleId}; got ${result.errors.map((error) => error.ruleId).join(', ')}`);
}

function canonicalRef(kind) {
  return { schemaId: canonicalSchemaIdsByKind()[kind], schemaVersion: '1.0.0', artifactKind: kind };
}

rmrf(generatedRoot);
fs.mkdirSync(generatedRoot, { recursive: true });

// Positive: real core entries through public package API and I-01A schema validation.
const core = loadRegistry(coreRoot);
assert.equal(core.ok, true, core.errors.map((error) => `${error.ruleId}: ${error.message}`).join('\n'));
assert.deepEqual(new Set(core.entries.map((entry) => entry.agentType)), new Set(['orchestrator', 'specialist', 'validator', 'fixer', 'reviewer', 'meta', 'skill_adapter']));
assert.ok(core.graph.validatorLinks.some((link) => link.from === 'core-orchestrator' && link.to === 'registry-quality-validator' && link.required));
assert.ok(!core.graph.validatorLinks.some((link) => link.from === link.to && link.required));
assert.ok(core.entries.every((entry) => String(entry.domainNeutralityReview).includes('PASS')));

// Positive: package-owned fixtures cover all supported agent types and skill linkage.
const fixtureSet = loadRegistry(fixtureCoreRoot);
assert.equal(fixtureSet.ok, true, fixtureSet.errors.map((error) => `${error.ruleId}: ${error.message}`).join('\n'));
assert.deepEqual(new Set(fixtureSet.entries.map((entry) => entry.agentType)), new Set(['orchestrator', 'specialist', 'validator', 'fixer', 'reviewer', 'meta', 'skill_adapter']));
const skillAdapter = fixtureSet.entriesById.get('fixture-skill-adapter');
assert.deepEqual(skillAdapter.extensions['dev.vibe.registry'].linkedSkills, [...LOCKED_SKILLS]);
const meta = fixtureSet.entriesById.get('fixture-meta-advisor');
assert.equal(meta.extensions['dev.vibe.registry'].outputAuthority, 'recommendation_only');
assert.equal(meta.safety.writesAllowed, false);

// Positive/negative scope gates for project extension and sample/demo fixtures.
const projectFixture = path.join(packageRoot, 'fixtures/valid/scoped/project-extension.json');
expectRule(loadRegistry(projectFixture), RegistryRuleId.SCOPE_CLASSIFICATION, 'project extension without extension scope');
assert.equal(loadRegistry(projectFixture, { allowedScopes: ['project_extension'] }).ok, true);
const sampleFixture = path.join(packageRoot, 'fixtures/valid/scoped/sample-demo.json');
expectRule(loadRegistry(sampleFixture), RegistryRuleId.SCOPE_CLASSIFICATION, 'sample demo without sample enablement');
assert.equal(loadRegistry(sampleFixture, { allowSamples: true }).ok, true);

// Schema-backed negatives.
{
  const entry = fixture();
  delete entry.owner;
  expectRule(loadRegistry(writeCase('missing-metadata', entry)), RegistryRuleId.SCHEMA_I01A, 'missing metadata');
}
{
  const entry = fixture();
  entry.schemaVersion = '9.0.0';
  expectRule(loadRegistry(writeCase('wrong-version', entry)), RegistryRuleId.SCHEMA_I01A, 'wrong schema version');
}
{
  const entry = fixture();
  entry.artifactKind = 'build_result';
  expectRule(loadRegistry(writeCase('wrong-kind', entry)), RegistryRuleId.SCHEMA_I01A, 'wrong artifact kind');
}
{
  const entry = fixture();
  entry.inputSchemas = [];
  expectRule(loadRegistry(writeCase('missing-schema-refs', entry)), RegistryRuleId.SCHEMA_I01A, 'missing input schema refs');
}
{
  const entry = fixture();
  entry.outputSchemas = [canonicalRef('work_brief')];
  entry.outputSchemas[0].schemaId = canonicalSchemaIdsByKind().build_result;
  expectRule(loadRegistry(writeCase('invalid-schema-ref', entry)), RegistryRuleId.MATURITY_EVIDENCE, 'invalid schema ref');
}

// DL-05 policy negatives.
{
  const entry = fixture();
  entry.allowedTools = ['bash'];
  entry.forbiddenActions = ['bash'];
  expectRule(loadRegistry(writeCase('tool-contradiction', entry)), RegistryRuleId.TOOL_FORBIDDEN_PRECEDENCE, 'allowed/forbidden contradiction');
}
{
  const entry = fixture();
  entry.validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'self.json', required: true, statusAtLinkTime: 'active' }];
  expectRule(loadRegistry(writeCase('self-validation-only', entry)), RegistryRuleId.SELF_VALIDATION_ONLY, 'self validation only');
}
{
  const entry = fixture();
  entry.validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'missing-validator', path: 'missing.json', required: true, statusAtLinkTime: 'active' }];
  expectRule(loadRegistry(writeCase('orphan-ref', entry)), RegistryRuleId.REF_RESOLUTION, 'orphan validator ref');
}
{
  const a = fixture('fixture-specialist');
  const b = fixture('fixture-reviewer');
  a.agentId = a.artifactId = 'cycle-a';
  b.agentId = b.artifactId = 'cycle-b';
  a.agentType = 'specialist';
  b.agentType = 'reviewer';
  a.validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'cycle-b', path: 'cycle-b.json', required: true, statusAtLinkTime: 'active' }];
  b.validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'cycle-a', path: 'cycle-a.json', required: true, statusAtLinkTime: 'active' }];
  expectRule(loadRegistry(writeCase('independence-cycle', [a, b])), RegistryRuleId.INDEPENDENCE_CYCLE, 'independence cycle');
}
{
  const entry = fixture();
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'evidence_for', artifactKind: 'evidence_packet', artifactId: 'evidence:unlinked', path: 'evidence/unlinked.json', required: true, statusAtLinkTime: 'passed' }];
  expectRule(loadRegistry(writeCase('unlinked-stable-core', entry)), RegistryRuleId.UNLINKED_STABLE_CORE, 'unlinked stable core');
}
{
  const entry = fixture();
  entry.evals = [];
  entry.changelog = [];
  entry.extensions['dev.vibe.registry'].smokeRefs = [];
  expectRule(loadRegistry(writeCase('stale-evidence', entry)), RegistryRuleId.MATURITY_EVIDENCE, 'stale/missing evidence');
}
{
  const entry = fixture('fixture-meta-advisor');
  entry.allowedTools = ['write'];
  entry.forbiddenActions = ['push'];
  entry.safety.writesAllowed = true;
  entry.extensions['dev.vibe.registry'].outputAuthority = 'direct_mutation';
  expectRule(loadRegistry(writeCase('meta-mutation', entry)), RegistryRuleId.META_AGENT_SAFETY, 'meta mutation/bypass');
}
{
  const entry = fixture();
  entry.purpose = 'Coordinates ecommerce inventory fashion Billz Telegram Instagram workflows.';
  expectRule(loadRegistry(writeCase('domain-leakage', entry)), RegistryRuleId.DOMAIN_NEUTRALITY, 'domain-specific core leakage');
}
{
  const entry = fixture('fixture-skill-adapter');
  entry.selectedHarnessAdapters = ['pi', 'non-pi'];
  entry.extensions['dev.vibe.registry'].adapterRuntimeImplemented = true;
  expectRule(loadRegistry(writeCase('adapter-assumptions', entry)), RegistryRuleId.ADAPTER_SCOPE, 'adapter runtime assumptions');
}
{
  const entry = fixture('fixture-validator');
  entry.agentId = entry.artifactId = 'unused-validator';
  entry.validatorRefs = [];
  expectRule(loadRegistry(writeCase('unused-validator', entry)), RegistryRuleId.UNUSED_VALIDATOR_FIXER, 'unused validator');
}

// Regression invariants.
const rootPackage = readJson(path.join(repoRoot, 'package.json'));
assert.equal(PRODUCT_NAME, 'vibe-engineer');
assert.equal(rootPackage.vibeEngineer.publicPackage, 'packages/cli');
assert.equal(readJson(path.join(packageRoot, 'package.json')).name, '@vibe-engineer/registry');
assert.deepEqual([...LOCKED_SKILLS], ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship']);
assert.deepEqual([...ARTIFACT_FLOW], ['raw_intent', 'work_brief', 'implementation_plan', 'build_result', 'ship_packet']);
assert.equal(fs.existsSync(path.join(repoRoot, 'packages/core')), false);
const registryPackage = readJson(path.join(packageRoot, 'package.json'));
assert.equal(JSON.stringify(registryPackage).includes('@vibe-engineer/testing'), false);

console.log('registry tests passed');
