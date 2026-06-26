import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const productRepoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(productRepoRoot, '.vibe/work/I-04-agent-registry-validation/revalidation-evidence');
const caseRoot = path.join(evidenceRoot, 'harness/adversarial-case-root');
const casesRoot = path.join(caseRoot, 'cases');
const generatedRoot = path.join(caseRoot, 'packages/registry/.generated-fixtures');
const fixtureRoot = path.join(productRepoRoot, 'packages/registry/fixtures/valid/core-set');
const fixtureEvidenceRoot = path.join(productRepoRoot, 'packages/registry/fixtures/evidence');
const scopedRoot = path.join(productRepoRoot, 'packages/registry/fixtures/valid/scoped');
const outputPath = path.join(evidenceRoot, 'outputs/adversarial-negative-witness.output.json');

const registryApi = await import(pathToFileURL(path.join(productRepoRoot, 'packages/registry/src/index.js')).href);
const { RegistryRuleId, loadRegistry } = registryApi;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fixture(id) {
  return readJson(path.join(fixtureRoot, `${id}.json`));
}

function fixtureEvidence(id, kind) {
  return readJson(path.join(fixtureEvidenceRoot, `${id}-${kind}.json`));
}

function rel(...parts) {
  return parts.join('/');
}

function setEntryIdentity(entry, id, type = entry.agentType) {
  entry.agentId = id;
  entry.artifactId = id;
  entry.title = id.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
  entry.displayName = entry.title;
  entry.agentType = type;
  entry.triggers = [{ event: `${id}.trigger`, description: `Adversarial trigger for ${id}.` }];
  entry.expectedArtifactPaths = [`cases/current/${id}.json`];
  entry.sourceRefs = [{ kind: 'artifact', ref: 'revalidation-evidence/adversarial-negative-witness' }];
  return entry;
}

function agentRef(relName, id, required = true) {
  return { rel: relName, artifactKind: 'agent_registry_entry', artifactId: id, path: `cases/current/${id}.json`, required, statusAtLinkTime: 'active' };
}

function evidenceRef(caseName, entry, kind) {
  return {
    rel: 'evidence_for',
    artifactKind: 'evidence_packet',
    artifactId: `evidence:${entry.agentId}:${kind}`,
    path: rel('packages/registry/.generated-fixtures', caseName, 'evidence', `${entry.agentId}-${kind}.json`),
    required: true,
    statusAtLinkTime: 'passed'
  };
}

function makeEvidence(caseName, entry, kind) {
  const template = fixtureEvidence('fixture-specialist', kind);
  const packet = clone(template);
  const registryEntryPath = `cases/${caseName}/${entry.agentId}.json`;
  packet.artifactId = `evidence:${entry.agentId}:${kind}`;
  packet.title = `${entry.agentId} ${kind} evidence`;
  packet.producer.runId = `q06-revalidation-${caseName}-${entry.agentId}-${kind}`.replaceAll('_', '-');
  packet.status = 'passed';
  packet.result = 'pass';
  delete packet.failureDetails;
  for (const link of packet.links ?? []) {
    if (link.rel === 'evidence_for') {
      link.artifactKind = 'agent_registry_entry';
      link.artifactId = entry.agentId;
      link.path = registryEntryPath;
      link.required = true;
      link.statusAtLinkTime = entry.status;
    }
  }
  packet.subjectRefs = [{ rel: 'evidence_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: registryEntryPath, required: true, statusAtLinkTime: entry.status }];
  packet.extensions['dev.vibe.registry.evidence'] = {
    schemaVersion: '1.0.0',
    agentId: entry.agentId,
    agentVersion: entry.agentVersion,
    evidenceType: kind,
    registryEntryPath
  };
  packet.artifacts = [rel('packages/registry/.generated-fixtures', caseName, 'evidence', `${entry.agentId}-${kind}.json`)];
  packet.warnings = [];
  return packet;
}

function prepareEntry(caseName, entry) {
  entry.ownership.ownerLane = 'I-04-agent-registry-validation-revalidation';
  entry.ownership.ownedWritePaths = ['.vibe/work/I-04-agent-registry-validation/revalidation-evidence/**'];
  entry.ownership.readOnlyPaths = ['packages/registry/**', 'packages/artifacts/**'];
  entry.ownership.untouchablePaths = ['.git/**', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
  entry.ownership.concurrencyNotes = 'Validation-owned adversarial carrier; product files are read-only.';
  entry.expectedArtifactPaths = [`cases/${caseName}/${entry.agentId}.json`];
  entry.evals = [evidenceRef(caseName, entry, 'eval')];
  const ext = entry.extensions['dev.vibe.registry'];
  ext.smokeRefs = [evidenceRef(caseName, entry, 'smoke')];
  entry.links = (entry.links ?? []).map((link) => link.artifactKind === 'agent_registry_entry' ? { ...link, path: `cases/${caseName}/${link.artifactId}.json` } : link);
  entry.validatorRefs = (entry.validatorRefs ?? []).map((link) => link.artifactKind === 'agent_registry_entry' ? { ...link, path: `cases/${caseName}/${link.artifactId}.json` } : link);
  entry.fixerRefs = (entry.fixerRefs ?? []).map((link) => link.artifactKind === 'agent_registry_entry' ? { ...link, path: `cases/${caseName}/${link.artifactId}.json` } : link);
  return entry;
}

function fullFixtureSet(caseName) {
  return ['fixture-orchestrator', 'fixture-specialist', 'fixture-validator', 'fixture-fixer', 'fixture-reviewer', 'fixture-meta-advisor', 'fixture-skill-adapter']
    .map((id) => prepareEntry(caseName, fixture(id)));
}

function singlePrepared(caseName, id = 'fixture-specialist') {
  return [prepareEntry(caseName, fixture(id))];
}

function writeCase(caseName, entries, mutator = () => {}) {
  const dir = path.join(casesRoot, caseName);
  const evidenceDir = path.join(generatedRoot, caseName, 'evidence');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(path.join(generatedRoot, caseName), { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });
  const packets = new Map();
  for (const entry of entries) {
    packets.set(`${entry.agentId}:eval`, makeEvidence(caseName, entry, 'eval'));
    packets.set(`${entry.agentId}:smoke`, makeEvidence(caseName, entry, 'smoke'));
  }
  const context = { caseName, entries, packets, dir, evidenceDir };
  mutator(context);
  for (const [key, packet] of packets) {
    if (packet === null) continue;
    const [id, kind] = key.split(':');
    fs.writeFileSync(path.join(evidenceDir, `${id}-${kind}.json`), JSON.stringify(packet, null, 2) + '\n');
  }
  entries.forEach((entry, index) => {
    const fileName = `${String(entry.agentId ?? entry.artifactId ?? 'entry')}-${index}.json`;
    fs.writeFileSync(path.join(dir, fileName), JSON.stringify(entry, null, 2) + '\n');
  });
  return dir;
}

function ruleIds(result) {
  return [...new Set(result.errors.map((error) => error.ruleId))].sort();
}

function runCase({ label, caseName, entries, mutate, expectedRule, forbiddenRule, options = {} }) {
  const dir = writeCase(caseName, entries, mutate);
  const result = loadRegistry(dir, { repoRoot: caseRoot, ...options });
  const rules = ruleIds(result);
  const pass = result.ok === false && rules.includes(expectedRule) && (!forbiddenRule || !rules.includes(forbiddenRule));
  return { label, caseName, pass, ok: result.ok, expectedRule, forbiddenRule: forbiddenRule ?? null, ruleIds: rules, errors: result.errors.map((error) => ({ ruleId: error.ruleId, pointer: error.pointer, entryId: error.entryId, message: error.message, details: error.details ?? null })) };
}

fs.rmSync(caseRoot, { recursive: true, force: true });
fs.mkdirSync(casesRoot, { recursive: true });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const cases = [];

// Sanity positive over validation-owned copies of the full fixture set.
{
  const caseName = 'valid-full-fixture-copy';
  const dir = writeCase(caseName, fullFixtureSet(caseName));
  const result = loadRegistry(dir, { repoRoot: caseRoot });
  cases.push({ label: 'valid validation-owned fixture copy passes', caseName, pass: result.ok === true, ok: result.ok, expectedRule: null, forbiddenRule: null, ruleIds: ruleIds(result), errors: result.errors.map((error) => ({ ruleId: error.ruleId, pointer: error.pointer, entryId: error.entryId, message: error.message })) });
}

cases.push(runCase({
  label: 'stable/core entry with only self registry_entry_for link rejects as unlinked',
  caseName: 'self-only-registry-entry-for',
  entries: singlePrepared('self-only-registry-entry-for'),
  expectedRule: RegistryRuleId.UNLINKED_STABLE_CORE,
  mutate: ({ entries }) => { const entry = entries[0]; entry.validatorRefs = []; entry.fixerRefs = []; entry.links = [agentRef('registry_entry_for', entry.agentId)]; }
}));

cases.push(runCase({
  label: 'active stable/core entry disconnected from loaded registry graph rejects',
  caseName: 'disconnected-component',
  entries: (() => {
    const entries = fullFixtureSet('disconnected-component');
    const a = prepareEntry('disconnected-component', setEntryIdentity(fixture('fixture-specialist'), 'island-specialist', 'specialist'));
    const b = prepareEntry('disconnected-component', setEntryIdentity(fixture('fixture-reviewer'), 'island-reviewer', 'reviewer'));
    a.validatorRefs = []; a.fixerRefs = []; a.links = [agentRef('registry_entry_for', 'island-specialist'), agentRef('context_for', 'island-reviewer')];
    b.validatorRefs = []; b.fixerRefs = []; b.links = [agentRef('registry_entry_for', 'island-reviewer'), agentRef('context_for', 'island-specialist')];
    return entries.concat(a, b);
  })(),
  expectedRule: RegistryRuleId.UNLINKED_STABLE_CORE
}));

cases.push(runCase({
  label: 'top-level required non-self agent_registry_entry link to missing entry rejects',
  caseName: 'missing-top-level-agent-link',
  entries: fullFixtureSet('missing-top-level-agent-link'),
  expectedRule: RegistryRuleId.REF_RESOLUTION,
  mutate: ({ entries }) => { const entry = entries.find((item) => item.agentId === 'fixture-specialist'); entry.links = [agentRef('registry_entry_for', entry.agentId), agentRef('context_for', 'missing-linked-entry')]; }
}));

cases.push(runCase({
  label: 'missing eval evidence file rejects',
  caseName: 'missing-eval-evidence-file',
  entries: fullFixtureSet('missing-eval-evidence-file'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ entries, packets }) => { const entry = entries.find((item) => item.agentId === 'fixture-specialist'); entry.evals[0].path = rel('packages/registry/.generated-fixtures', 'missing-eval-evidence-file', 'evidence', 'missing-eval.json'); packets.delete('fixture-specialist:eval'); }
}));

cases.push(runCase({
  label: 'missing smoke evidence file rejects',
  caseName: 'missing-smoke-evidence-file',
  entries: fullFixtureSet('missing-smoke-evidence-file'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ entries, packets }) => { const entry = entries.find((item) => item.agentId === 'fixture-specialist'); entry.extensions['dev.vibe.registry'].smokeRefs[0].path = rel('packages/registry/.generated-fixtures', 'missing-smoke-evidence-file', 'evidence', 'missing-smoke.json'); packets.delete('fixture-specialist:smoke'); }
}));

cases.push(runCase({
  label: 'evidence path traversal/out-of-owned location rejects',
  caseName: 'out-of-owned-evidence-path',
  entries: fullFixtureSet('out-of-owned-evidence-path'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ entries }) => { entries.find((item) => item.agentId === 'fixture-specialist').evals[0].path = '.vibe/work/I-04-agent-registry-validation/revalidation-evidence/not-allowed.json'; }
}));

cases.push(runCase({
  label: 'evidence packet artifactId/path mismatch rejects',
  caseName: 'evidence-artifactid-path-mismatch',
  entries: fullFixtureSet('evidence-artifactid-path-mismatch'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ packets }) => { packets.get('fixture-specialist:eval').artifactId = 'evidence:wrong-artifact-id'; }
}));

cases.push(runCase({
  label: 'evidence packet wrong artifact kind rejects through I-01A evidence validator',
  caseName: 'evidence-wrong-artifact-kind',
  entries: fullFixtureSet('evidence-wrong-artifact-kind'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ packets }) => { packets.get('fixture-specialist:eval').artifactKind = 'build_result'; }
}));

cases.push(runCase({
  label: 'evidence packet failed/stale status rejects',
  caseName: 'evidence-failed-status',
  entries: fullFixtureSet('evidence-failed-status'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ packets }) => { const packet = packets.get('fixture-specialist:eval'); packet.status = 'failed'; packet.result = 'fail'; packet.failureDetails = { code: 'Q06_FAIL', message: 'adversarial failed evidence', classification: 'test_assertion_failure' }; }
}));

cases.push(runCase({
  label: 'evidence packet subjectRef mismatch rejects',
  caseName: 'evidence-subjectref-mismatch',
  entries: fullFixtureSet('evidence-subjectref-mismatch'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ packets }) => { packets.get('fixture-specialist:eval').subjectRefs[0].artifactId = 'fixture-fixer'; }
}));

cases.push(runCase({
  label: 'evidence packet agent id mismatch rejects',
  caseName: 'evidence-agent-id-mismatch',
  entries: fullFixtureSet('evidence-agent-id-mismatch'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ packets }) => { packets.get('fixture-specialist:eval').extensions['dev.vibe.registry.evidence'].agentId = 'fixture-fixer'; }
}));

cases.push(runCase({
  label: 'evidence packet agent version mismatch rejects',
  caseName: 'evidence-agent-version-mismatch',
  entries: fullFixtureSet('evidence-agent-version-mismatch'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ packets }) => { packets.get('fixture-specialist:eval').extensions['dev.vibe.registry.evidence'].agentVersion = '9.9.9'; }
}));

cases.push(runCase({
  label: 'evidence packet evidence-type mismatch rejects',
  caseName: 'evidence-type-mismatch',
  entries: fullFixtureSet('evidence-type-mismatch'),
  expectedRule: RegistryRuleId.MATURITY_EVIDENCE,
  mutate: ({ packets }) => { packets.get('fixture-specialist:eval').extensions['dev.vibe.registry.evidence'].evidenceType = 'smoke'; }
}));

cases.push(runCase({
  label: 'validatorRef targeting fixer rejects with type compatibility rule',
  caseName: 'validator-ref-to-fixer',
  entries: fullFixtureSet('validator-ref-to-fixer'),
  expectedRule: RegistryRuleId.REF_TYPE_COMPATIBILITY,
  mutate: ({ entries }) => { entries.find((item) => item.agentId === 'fixture-specialist').validatorRefs = [agentRef('verifies', 'fixture-fixer')]; }
}));

cases.push(runCase({
  label: 'fixerRef targeting validator rejects with type compatibility rule',
  caseName: 'fixer-ref-to-validator',
  entries: fullFixtureSet('fixer-ref-to-validator'),
  expectedRule: RegistryRuleId.REF_TYPE_COMPATIBILITY,
  mutate: ({ entries }) => { entries.find((item) => item.agentId === 'fixture-specialist').fixerRefs = [agentRef('implements', 'fixture-validator')]; }
}));

cases.push(runCase({
  label: 'missing validator ref remains ref resolution, not wrong-type',
  caseName: 'missing-validator-ref-resolution',
  entries: fullFixtureSet('missing-validator-ref-resolution'),
  expectedRule: RegistryRuleId.REF_RESOLUTION,
  forbiddenRule: RegistryRuleId.REF_TYPE_COMPATIBILITY,
  mutate: ({ entries }) => { entries.find((item) => item.agentId === 'fixture-specialist').validatorRefs = [agentRef('verifies', 'missing-validator')]; }
}));

cases.push(runCase({
  label: 'missing fixer ref remains ref resolution, not wrong-type',
  caseName: 'missing-fixer-ref-resolution',
  entries: fullFixtureSet('missing-fixer-ref-resolution'),
  expectedRule: RegistryRuleId.REF_RESOLUTION,
  forbiddenRule: RegistryRuleId.REF_TYPE_COMPATIBILITY,
  mutate: ({ entries }) => { entries.find((item) => item.agentId === 'fixture-specialist').fixerRefs = [agentRef('implements', 'missing-fixer')]; }
}));

cases.push(runCase({
  label: 'duplicate id rejects',
  caseName: 'duplicate-id',
  entries: (() => { const a = prepareEntry('duplicate-id', fixture('fixture-specialist')); const b = prepareEntry('duplicate-id', fixture('fixture-fixer')); b.agentId = 'fixture-specialist'; b.artifactId = 'fixture-specialist'; return [a, b]; })(),
  expectedRule: RegistryRuleId.DUPLICATE_ID
}));

cases.push(runCase({ label: 'missing metadata rejects through schema', caseName: 'missing-metadata', entries: singlePrepared('missing-metadata'), expectedRule: RegistryRuleId.SCHEMA_I01A, mutate: ({ entries }) => { delete entries[0].owner; } }));
cases.push(runCase({ label: 'wrong schema version rejects through schema', caseName: 'wrong-schema-version', entries: singlePrepared('wrong-schema-version'), expectedRule: RegistryRuleId.SCHEMA_I01A, mutate: ({ entries }) => { entries[0].schemaVersion = '9.0.0'; } }));
cases.push(runCase({ label: 'wrong entry artifact kind rejects through schema', caseName: 'wrong-entry-artifact-kind', entries: singlePrepared('wrong-entry-artifact-kind'), expectedRule: RegistryRuleId.SCHEMA_I01A, mutate: ({ entries }) => { entries[0].artifactKind = 'build_result'; } }));
cases.push(runCase({ label: 'invalid schema refs reject', caseName: 'invalid-schema-ref', entries: singlePrepared('invalid-schema-ref'), expectedRule: RegistryRuleId.MATURITY_EVIDENCE, mutate: ({ entries }) => { entries[0].outputSchemas[0].schemaId = 'https://schemas.vibe-engineer.dev/artifacts/v1/work-brief.schema.json'; } }));
cases.push(runCase({ label: 'allowed tool / forbidden action contradiction rejects', caseName: 'tool-contradiction', entries: singlePrepared('tool-contradiction'), expectedRule: RegistryRuleId.TOOL_FORBIDDEN_PRECEDENCE, mutate: ({ entries }) => { entries[0].allowedTools = ['bash']; entries[0].forbiddenActions = ['bash']; } }));
cases.push(runCase({ label: 'self-validation-only rejects', caseName: 'self-validation-only', entries: singlePrepared('self-validation-only'), expectedRule: RegistryRuleId.SELF_VALIDATION_ONLY, mutate: ({ entries }) => { const entry = entries[0]; entry.validatorRefs = [agentRef('verifies', entry.agentId)]; entry.fixerRefs = []; entry.links = [agentRef('registry_entry_for', entry.agentId)]; } }));
cases.push(runCase({ label: 'independence cycle rejects', caseName: 'independence-cycle', entries: (() => { const a = prepareEntry('independence-cycle', setEntryIdentity(fixture('fixture-validator'), 'cycle-a', 'validator')); const b = prepareEntry('independence-cycle', setEntryIdentity(fixture('fixture-reviewer'), 'cycle-b', 'reviewer')); a.validatorRefs = [agentRef('verifies', 'cycle-b')]; b.validatorRefs = [agentRef('verifies', 'cycle-a')]; a.fixerRefs = []; b.fixerRefs = []; a.links = [agentRef('registry_entry_for', 'cycle-a'), agentRef('context_for', 'cycle-b')]; b.links = [agentRef('registry_entry_for', 'cycle-b'), agentRef('context_for', 'cycle-a')]; return [a, b]; })(), expectedRule: RegistryRuleId.INDEPENDENCE_CYCLE }));
cases.push(runCase({ label: 'unused validator rejects', caseName: 'unused-validator', entries: singlePrepared('unused-validator', 'fixture-validator'), expectedRule: RegistryRuleId.UNUSED_VALIDATOR_FIXER, mutate: ({ entries }) => { const entry = entries[0]; entry.validatorRefs = []; entry.fixerRefs = []; entry.links = [agentRef('registry_entry_for', entry.agentId)]; } }));
cases.push(runCase({ label: 'deprecation without supersession rejects', caseName: 'deprecation-supersession', entries: singlePrepared('deprecation-supersession'), expectedRule: RegistryRuleId.DEPRECATION_SUPERSESSION, mutate: ({ entries, packets }) => { const entry = entries[0]; entry.status = 'deprecated'; entry.deprecation = { reason: 'adversarial deprecated without supersession' }; delete entry.supersessionReason; entry.links = [agentRef('registry_entry_for', entry.agentId)]; for (const packet of packets.values()) { packet.subjectRefs[0].statusAtLinkTime = 'deprecated'; packet.links[0].statusAtLinkTime = 'deprecated'; } } }));
cases.push(runCase({ label: 'unknown skill link rejects', caseName: 'unknown-skill-link', entries: singlePrepared('unknown-skill-link', 'fixture-skill-adapter'), expectedRule: RegistryRuleId.SKILL_LINKS, mutate: ({ entries }) => { entries[0].extensions['dev.vibe.registry'].linkedSkills = ['brainstorm', 'unknown-skill']; } }));
cases.push(runCase({ label: 'domain leakage rejects', caseName: 'domain-leakage', entries: singlePrepared('domain-leakage'), expectedRule: RegistryRuleId.DOMAIN_NEUTRALITY, mutate: ({ entries }) => { entries[0].purpose = 'Coordinates ecommerce inventory fashion Billz Telegram Instagram workflows.'; } }));
cases.push(runCase({ label: 'meta silent mutation / bypass rejects', caseName: 'meta-mutation', entries: singlePrepared('meta-mutation', 'fixture-meta-advisor'), expectedRule: RegistryRuleId.META_AGENT_SAFETY, mutate: ({ entries }) => { const entry = entries[0]; entry.allowedTools = ['write']; entry.forbiddenActions = ['push']; entry.safety.writesAllowed = true; entry.extensions['dev.vibe.registry'].outputAuthority = 'direct_mutation'; entry.extensions['dev.vibe.registry'].normalRoute = ['build']; } }));
cases.push(runCase({ label: 'adapter runtime assumptions reject', caseName: 'adapter-assumptions', entries: singlePrepared('adapter-assumptions', 'fixture-skill-adapter'), expectedRule: RegistryRuleId.ADAPTER_SCOPE, mutate: ({ entries }) => { const entry = entries[0]; entry.selectedHarnessAdapters = ['pi', 'non-pi']; entry.extensions['dev.vibe.registry'].adapterRuntimeImplemented = true; } }));

// Scope gates against actual package scoped fixtures.
for (const [label, file, options] of [
  ['project-extension rejected without explicit scope', path.join(scopedRoot, 'project-extension.json'), {}],
  ['sample/demo rejected without explicit sample option', path.join(scopedRoot, 'sample-demo.json'), {}]
]) {
  const result = loadRegistry(file, options);
  const rules = ruleIds(result);
  cases.push({ label, caseName: path.basename(file), pass: result.ok === false && rules.includes(RegistryRuleId.SCOPE_CLASSIFICATION), ok: result.ok, expectedRule: RegistryRuleId.SCOPE_CLASSIFICATION, forbiddenRule: null, ruleIds: rules, errors: result.errors.map((error) => ({ ruleId: error.ruleId, pointer: error.pointer, entryId: error.entryId, message: error.message })) });
}

const failures = cases.filter((item) => !item.pass);
const summary = { ok: failures.length === 0, total: cases.length, failures: failures.map((item) => ({ label: item.label, ruleIds: item.ruleIds, ok: item.ok, errors: item.errors })), cases };
fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ ok: summary.ok, total: summary.total, failureCount: failures.length, outputPath }, null, 2));
if (failures.length > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
