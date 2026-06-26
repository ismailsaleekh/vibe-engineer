import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const productRepoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(productRepoRoot, '.vibe/work/I-04-agent-registry-validation/revalidation-evidence');
const caseRoot = path.join(evidenceRoot, 'harness/policy-gap-case-root');
const outputPath = path.join(evidenceRoot, 'outputs/policy-gap-witness.output.json');
const registryApi = await import(pathToFileURL(path.join(productRepoRoot, 'packages/registry/src/index.js')).href);
const { loadRegistry } = registryApi;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function fixture(id) { return readJson(path.join(productRepoRoot, 'packages/registry/fixtures/valid/core-set', `${id}.json`)); }
function evidenceTemplate(kind) { return readJson(path.join(productRepoRoot, 'packages/registry/fixtures/evidence', `fixture-specialist-${kind}.json`)); }
function agentRef(rel, id) { return { rel, artifactKind: 'agent_registry_entry', artifactId: id, path: `cases/current/${id}.json`, required: true, statusAtLinkTime: 'active' }; }

function prepareEntry(caseName, entry) {
  entry.evals = [{ rel: 'evidence_for', artifactKind: 'evidence_packet', artifactId: `evidence:${entry.agentId}:eval`, path: `packages/registry/.generated-fixtures/${caseName}/evidence/${entry.agentId}-eval.json`, required: true, statusAtLinkTime: 'passed' }];
  entry.extensions['dev.vibe.registry'].smokeRefs = [{ rel: 'evidence_for', artifactKind: 'evidence_packet', artifactId: `evidence:${entry.agentId}:smoke`, path: `packages/registry/.generated-fixtures/${caseName}/evidence/${entry.agentId}-smoke.json`, required: true, statusAtLinkTime: 'passed' }];
  entry.links = (entry.links ?? []).map((link) => link.artifactKind === 'agent_registry_entry' ? { ...link, path: `cases/${caseName}/${link.artifactId}.json` } : link);
  entry.validatorRefs = (entry.validatorRefs ?? []).map((link) => link.artifactKind === 'agent_registry_entry' ? { ...link, path: `cases/${caseName}/${link.artifactId}.json` } : link);
  entry.fixerRefs = (entry.fixerRefs ?? []).map((link) => link.artifactKind === 'agent_registry_entry' ? { ...link, path: `cases/${caseName}/${link.artifactId}.json` } : link);
  return entry;
}

function makePacket(caseName, entry, kind) {
  const packet = clone(evidenceTemplate(kind));
  packet.artifactId = `evidence:${entry.agentId}:${kind}`;
  packet.status = 'passed';
  packet.result = 'pass';
  delete packet.failureDetails;
  packet.links = [{ rel: 'evidence_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: `cases/${caseName}/${entry.agentId}.json`, required: true, statusAtLinkTime: entry.status }];
  packet.subjectRefs = clone(packet.links);
  packet.extensions['dev.vibe.registry.evidence'] = { schemaVersion: '1.0.0', agentId: entry.agentId, agentVersion: entry.agentVersion, evidenceType: kind, registryEntryPath: `cases/${caseName}/${entry.agentId}.json` };
  return packet;
}

function writeCase(caseName, entries) {
  const entriesDir = path.join(caseRoot, 'cases', caseName);
  const evidenceDir = path.join(caseRoot, 'packages/registry/.generated-fixtures', caseName, 'evidence');
  fs.rmSync(entriesDir, { recursive: true, force: true });
  fs.rmSync(path.dirname(evidenceDir), { recursive: true, force: true });
  fs.mkdirSync(entriesDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });
  entries.forEach((entry, index) => {
    writeJson(path.join(entriesDir, `${entry.agentId}-${index}.json`), entry);
    for (const kind of ['eval', 'smoke']) writeJson(path.join(evidenceDir, `${entry.agentId}-${kind}.json`), makePacket(caseName, entry, kind));
  });
  return entriesDir;
}

function fullSet(caseName) {
  return ['fixture-orchestrator', 'fixture-specialist', 'fixture-validator', 'fixture-fixer', 'fixture-reviewer', 'fixture-meta-advisor', 'fixture-skill-adapter'].map((id) => prepareEntry(caseName, fixture(id)));
}

function run(caseName, entries, expectation) {
  const dir = writeCase(caseName, entries);
  const result = loadRegistry(dir, { repoRoot: caseRoot });
  return { caseName, expectation, actualOk: result.ok, actualRuleIds: [...new Set(result.errors.map((error) => error.ruleId))].sort(), errors: result.errors.map((error) => ({ ruleId: error.ruleId, entryId: error.entryId, pointer: error.pointer, message: error.message })) };
}

fs.rmSync(caseRoot, { recursive: true, force: true });
fs.mkdirSync(caseRoot, { recursive: true });

const missingValidatorEntries = fullSet('missing-independent-validator');
missingValidatorEntries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs = [];

const dormantEntry = prepareEntry('allow-dormant-without-rationale', fixture('fixture-specialist'));
dormantEntry.validatorRefs = [];
dormantEntry.fixerRefs = [];
dormantEntry.links = [agentRef('registry_entry_for', dormantEntry.agentId)];
dormantEntry.extensions['dev.vibe.registry'].allowDormant = true;
delete dormantEntry.extensions['dev.vibe.registry'].rationale;

const cases = [
  run('missing-independent-validator', missingValidatorEntries, 'DL-05 requires every load-bearing stable/core producer to name an independent default validator or be explicitly blocked; connected stable/core specialist with validatorRefs=[] must reject.'),
  run('allow-dormant-without-rationale', [dormantEntry], 'Graph/orphan policy allows dormant stable/core entries only with explicit allowed dormant/deprecated/sample rationale; allowDormant=true without rationale must not silently bypass reachability.')
];
const defects = cases.filter((item) => item.actualOk === true);
const output = { ok: defects.length === 0, defectCount: defects.length, cases, defects };
writeJson(outputPath, output);
console.log(JSON.stringify({ ok: output.ok, defectCount: output.defectCount, outputPath }, null, 2));
if (defects.length > 0) process.exit(1);
