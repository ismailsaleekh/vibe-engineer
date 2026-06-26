import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCKED_SKILLS,
  RegistryRuleId,
  canonicalSchemaIdsByKind,
  loadRegistry
} from '@vibe-engineer/registry';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const casesRoot = path.join(evidenceRoot, 'adversarial-cases');
fs.rmSync(casesRoot, { recursive: true, force: true });
fs.mkdirSync(casesRoot, { recursive: true });

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fixture(name = 'fixture-specialist') {
  return readJson(path.join(repoRoot, 'packages/registry/fixtures/valid/core-set', `${name}.json`));
}

function writeCase(name, entries) {
  const dir = path.join(casesRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of Array.isArray(entries) ? entries : [entries]) {
    const id = entry.agentId ?? entry.artifactId ?? name;
    fs.writeFileSync(path.join(dir, `${id}.json`), `${JSON.stringify(entry, null, 2)}\n`);
  }
  return dir;
}

function setId(entry, id) {
  entry.agentId = id;
  entry.artifactId = id;
  entry.title = id;
  entry.displayName = id;
  entry.expectedArtifactPaths = [`validation-evidence/adversarial-cases/${id}.json`];
  entry.links = [{
    rel: 'registry_entry_for',
    artifactKind: 'agent_registry_entry',
    artifactId: id,
    path: `validation-evidence/adversarial-cases/${id}.json`,
    required: true,
    statusAtLinkTime: 'active'
  }];
  return entry;
}

function resultSummary(result) {
  return result.errors.map((error) => ({ ruleId: error.ruleId, pointer: error.pointer, message: error.message })).slice(0, 5);
}

const observations = [];
function expectOk(label, result) {
  observations.push({ label, expected: 'ok', ok: result.ok, errors: resultSummary(result) });
}
function expectReject(label, result, ruleId) {
  observations.push({ label, expected: ruleId, ok: !result.ok && result.errors.some((error) => error.ruleId === ruleId), actualOk: result.ok, errors: resultSummary(result) });
}

expectOk('real core registry entries load through public API', loadRegistry(path.join(repoRoot, '.vibe/registry/core-agents')));
expectOk('valid fixture set loads through public API', loadRegistry(path.join(repoRoot, 'packages/registry/fixtures/valid/core-set')));

{
  const entry = fixture();
  delete entry.owner;
  expectReject('missing owner rejects through I-01A schema', loadRegistry(writeCase('missing-owner', entry)), RegistryRuleId.SCHEMA_I01A);
}
{
  const entry = fixture('fixture-skill-adapter');
  entry.extensions['dev.vibe.registry'].linkedSkills = [...LOCKED_SKILLS, 'unknown-skill'];
  expectReject('unknown skill link rejects', loadRegistry(writeCase('unknown-skill', entry)), RegistryRuleId.SKILL_LINKS);
}
{
  const entry = fixture('fixture-meta-advisor');
  entry.allowedTools = ['write'];
  entry.safety.writesAllowed = true;
  entry.extensions['dev.vibe.registry'].outputAuthority = 'direct_mutation';
  expectReject('unsafe meta mutation rejects', loadRegistry(writeCase('unsafe-meta', entry)), RegistryRuleId.META_AGENT_SAFETY);
}
{
  const entry = fixture();
  entry.inputSchemas[0].schemaId = canonicalSchemaIdsByKind().build_result;
  expectReject('schema-ref mismatch rejects', loadRegistry(writeCase('schema-ref-mismatch', entry)), RegistryRuleId.MATURITY_EVIDENCE);
}
{
  const entry = fixture();
  setId(entry, 'self-linked-stable-core-only');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  delete entry.extensions['dev.vibe.registry'].allowDormant;
  expectReject('stable core with only self registry_entry_for link rejects as unlinked', loadRegistry(writeCase('self-linked-stable-core-only', entry)), RegistryRuleId.UNLINKED_STABLE_CORE);
}
{
  const entry = fixture();
  setId(entry, 'orphan-top-level-agent-link');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{
    rel: 'consumed_by',
    artifactKind: 'agent_registry_entry',
    artifactId: 'missing-agent-entry',
    path: 'missing-agent-entry.json',
    required: true,
    statusAtLinkTime: 'active'
  }];
  expectReject('top-level required agent_registry_entry link to missing entry rejects', loadRegistry(writeCase('orphan-top-level-agent-link', entry)), RegistryRuleId.REF_RESOLUTION);
}
{
  const entry = fixture();
  entry.status = 'deprecated';
  entry.deprecation = { since: '1.0.0' };
  delete entry.supersessionReason;
  delete entry.extensions['dev.vibe.registry'].supersededBy;
  expectReject('deprecated entry missing supersession rejects', loadRegistry(writeCase('deprecated-missing-supersession', entry)), RegistryRuleId.DEPRECATION_SUPERSESSION);
}

const failures = observations.filter((observation) => observation.ok !== true);
console.log(JSON.stringify({ observations, failures, failureCount: failures.length }, null, 2));
if (failures.length > 0) {
  console.log(`ADVERSARIAL_DEFECTS ${failures.length}`);
}
