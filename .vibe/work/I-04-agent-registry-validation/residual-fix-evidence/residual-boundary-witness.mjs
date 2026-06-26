import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const packageRoot = path.join(repoRoot, 'packages/registry');
const evidenceRoot = path.join(repoRoot, '.vibe/work/I-04-agent-registry-validation/residual-fix-evidence');
const casesRoot = path.join(evidenceRoot, 'cases');
const outputPath = path.join(evidenceRoot, 'residual-boundary-witness.output.json');
const registryApi = await import(pathToFileURL(path.join(packageRoot, 'src/index.js')).href);
const artifactsApi = await import(pathToFileURL(path.join(repoRoot, 'packages/artifacts/src/index.js')).href);
const { loadRegistry, RegistryRuleId } = registryApi;
const { validateArtifactFile } = artifactsApi;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function fixture(name) {
  return readJson(path.join(packageRoot, 'fixtures/valid/core-set', `${name}.json`));
}

function fixtureSet() {
  return ['fixture-orchestrator', 'fixture-specialist', 'fixture-validator', 'fixture-fixer', 'fixture-reviewer', 'fixture-meta-advisor', 'fixture-skill-adapter'].map(fixture);
}

function writeEntriesCase(name, entries) {
  const dir = path.join(casesRoot, name, 'entries');
  fs.rmSync(path.join(casesRoot, name), { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of entries) writeJson(path.join(dir, `${entry.agentId}.json`), entry);
  return dir;
}

function writeNonLoadBearingEvidence(entry) {
  const packet = readJson(path.join(packageRoot, 'fixtures/evidence/fixture-specialist-eval.json'));
  packet.artifactId = `evidence:${entry.agentId}:non_load_bearing:residual`;
  packet.title = `${entry.agentId} residual non-load-bearing rationale evidence`;
  packet.subjectRefs = [{ rel: 'evidence_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: `${entry.agentId}.json`, required: true, statusAtLinkTime: entry.status }];
  packet.links = [{ rel: 'evidence_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: `${entry.agentId}.json`, required: true, statusAtLinkTime: entry.status }];
  packet.extensions['dev.vibe.registry.evidence'] = { schemaVersion: '1.0.0', agentId: entry.agentId, agentVersion: entry.agentVersion, evidenceType: 'non_load_bearing' };
  const packetPath = path.join(evidenceRoot, 'evidence', `${entry.agentId}-non-load-bearing.json`);
  writeJson(packetPath, packet);
  return { rel: 'evidence_for', artifactKind: 'evidence_packet', artifactId: packet.artifactId, path: path.relative(repoRoot, packetPath).replaceAll(path.sep, '/'), required: true, statusAtLinkTime: 'passed' };
}

function summarize(result) {
  return { ok: result.ok, ruleIds: [...new Set(result.errors.map((error) => error.ruleId))].sort(), errors: result.errors.map((error) => ({ entryId: error.entryId, ruleId: error.ruleId, pointer: error.pointer, message: error.message })) };
}

function expectRule(label, result, ruleId) {
  assert.equal(result.ok, false, `${label} should reject`);
  assert.ok(result.errors.some((error) => error.ruleId === ruleId), `${label} should include ${ruleId}: ${JSON.stringify(summarize(result), null, 2)}`);
  return { label, expectedRule: ruleId, ...summarize(result) };
}

fs.rmSync(casesRoot, { recursive: true, force: true });
fs.mkdirSync(casesRoot, { recursive: true });

const coreRoot = path.join(repoRoot, '.vibe/registry/core-agents');
const fixtureRoot = path.join(packageRoot, 'fixtures/valid/core-set');
const core = loadRegistry(coreRoot, { repoRoot });
const fixtures = loadRegistry(fixtureRoot, { repoRoot });
assert.equal(core.ok, true, core.errors.map((error) => `${error.ruleId}: ${error.message}`).join('\n'));
assert.equal(fixtures.ok, true, fixtures.errors.map((error) => `${error.ruleId}: ${error.message}`).join('\n'));

const coreFiles = fs.readdirSync(coreRoot).filter((file) => file.endsWith('.json')).map((file) => path.join(coreRoot, file));
const fixtureFiles = fs.readdirSync(fixtureRoot).filter((file) => file.endsWith('.json')).map((file) => path.join(fixtureRoot, file));
const evidenceFiles = [
  ...fs.readdirSync(path.join(repoRoot, '.vibe/registry/evidence')).filter((file) => file.endsWith('.json')).map((file) => path.join(repoRoot, '.vibe/registry/evidence', file)),
  ...fs.readdirSync(path.join(packageRoot, 'fixtures/evidence')).filter((file) => file.endsWith('.json')).map((file) => path.join(packageRoot, 'fixtures/evidence', file))
];
const agentSchema = [...coreFiles, ...fixtureFiles].map((file) => ({ file, ok: validateArtifactFile(file, { kind: 'agent_registry_entry' }).ok }));
const evidenceSchema = evidenceFiles.map((file) => ({ file, ok: validateArtifactFile(file, { kind: 'evidence_packet' }).ok }));
assert.ok(agentSchema.every((item) => item.ok));
assert.ok(evidenceSchema.every((item) => item.ok));

const positiveTypes = new Set([...core.entries, ...fixtures.entries].map((entry) => entry.agentType));
assert.deepEqual(positiveTypes, new Set(['orchestrator', 'specialist', 'validator', 'fixer', 'reviewer', 'meta', 'skill_adapter']));
assert.ok([...core.entries, ...fixtures.entries].filter((entry) => entry.agentType !== 'reviewer').every((entry) => entry.validatorRefs.some((ref) => ref.artifactKind === 'agent_registry_entry' && ref.artifactId !== entry.agentId && ref.required === true)));

const negatives = [];
{
  const entries = fixtureSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs = [];
  negatives.push(expectRule('connected load-bearing specialist with empty validatorRefs', loadRegistry(writeEntriesCase('missing-independent-validator', entries), { repoRoot }), RegistryRuleId.REQUIRED_VALIDATOR));
}
{
  const entries = fixtureSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'fixture-validator', path: 'fixture-validator.json', required: false, statusAtLinkTime: 'active' }];
  negatives.push(expectRule('optional-only validatorRef', loadRegistry(writeEntriesCase('optional-validator-only', entries), { repoRoot }), RegistryRuleId.REQUIRED_VALIDATOR));
}
{
  const entries = fixtureSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'missing-validator', path: 'missing-validator.json', required: true, statusAtLinkTime: 'active' }];
  negatives.push(expectRule('missing validator target remains ref-resolution', loadRegistry(writeEntriesCase('missing-validator-target', entries), { repoRoot }), RegistryRuleId.REF_RESOLUTION));
}
{
  const entry = fixture('fixture-specialist');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'self.json', required: true, statusAtLinkTime: 'active' }];
  entry.extensions['dev.vibe.registry'].allowDormant = true;
  negatives.push(expectRule('bare allowDormant no rationale', loadRegistry(writeEntriesCase('bare-allow-dormant', [entry]), { repoRoot }), RegistryRuleId.DORMANT_RATIONALE));
}
{
  const entry = fixture('fixture-specialist');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'self.json', required: true, statusAtLinkTime: 'active' }];
  entry.extensions['dev.vibe.registry'].allowDormant = true;
  entry.extensions['dev.vibe.registry'].nonLoadBearingRationale = { status: 'non_load_bearing', rationale: 'missing owner decision evidence' };
  negatives.push(expectRule('incomplete rationale', loadRegistry(writeEntriesCase('incomplete-rationale', [entry]), { repoRoot }), RegistryRuleId.DORMANT_RATIONALE));
}
{
  const entry = fixture('fixture-specialist');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'self.json', required: true, statusAtLinkTime: 'active' }];
  entry.extensions['dev.vibe.registry'].allowDormant = true;
  entry.extensions['dev.vibe.registry'].dormantRationale = { status: 'dormant', rationale: 'active dormant contradiction', owner: 'q06', decisionRef: 'DL-05', evidenceRef: entry.evals[0] };
  negatives.push(expectRule('contradictory active dormant rationale', loadRegistry(writeEntriesCase('contradictory-active-dormant', [entry]), { repoRoot }), RegistryRuleId.DORMANT_RATIONALE));
}

const validNonLoadBearing = fixture('fixture-specialist');
validNonLoadBearing.validatorRefs = [];
validNonLoadBearing.fixerRefs = [];
validNonLoadBearing.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: validNonLoadBearing.agentId, path: 'self.json', required: true, statusAtLinkTime: 'active' }];
validNonLoadBearing.extensions['dev.vibe.registry'].allowDormant = true;
validNonLoadBearing.extensions['dev.vibe.registry'].nonLoadBearingRationale = {
  status: 'non_load_bearing',
  rationale: 'Residual witness proves a non-load-bearing bypass must be typed, owned, decided, and evidence-backed.',
  owner: 'I-04-agent-registry-validation',
  decisionRef: 'DL-05-agent-registry-validation-meta',
  evidenceRef: writeNonLoadBearingEvidence(validNonLoadBearing)
};
const validBypass = loadRegistry(writeEntriesCase('valid-non-load-bearing', [validNonLoadBearing]), { repoRoot });
assert.equal(validBypass.ok, true, validBypass.errors.map((error) => `${error.ruleId}: ${error.message}`).join('\n'));

const output = {
  ok: true,
  positives: {
    coreOk: core.ok,
    fixtureOk: fixtures.ok,
    agentSchemaAllOk: agentSchema.every((item) => item.ok),
    evidenceSchemaAllOk: evidenceSchema.every((item) => item.ok),
    agentTypes: [...positiveTypes].sort(),
    loadBearingValidatorPolicy: 'all core/fixture non-reviewer load-bearing entries have non-self required validatorRefs; reviewer is terminal independent oversight target'
  },
  validTypedBypass: summarize(validBypass),
  negatives
};
writeJson(outputPath, output);
console.log(JSON.stringify(output, null, 2));
