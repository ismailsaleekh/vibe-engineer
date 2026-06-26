import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RegistryRuleId, loadRegistry } from '@vibe-engineer/registry';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const caseRoot = path.join(evidenceRoot, 'ref-type-case');
fs.rmSync(caseRoot, { recursive: true, force: true });
fs.mkdirSync(caseRoot, { recursive: true });

const fixtureRoot = path.join(repoRoot, 'packages/registry/fixtures/valid/core-set');
for (const file of fs.readdirSync(fixtureRoot).filter((name) => name.endsWith('.json')).sort()) {
  const entry = JSON.parse(fs.readFileSync(path.join(fixtureRoot, file), 'utf8'));
  if (entry.agentId === 'fixture-specialist') {
    entry.validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'fixture-fixer', path: 'fixture-fixer.json', required: true, statusAtLinkTime: 'active' }];
    entry.fixerRefs = [{ rel: 'implements', artifactKind: 'agent_registry_entry', artifactId: 'fixture-validator', path: 'fixture-validator.json', required: true, statusAtLinkTime: 'active' }];
  }
  fs.writeFileSync(path.join(caseRoot, file), `${JSON.stringify(entry, null, 2)}\n`);
}

const result = loadRegistry(caseRoot);
console.log(JSON.stringify({
  expectedReject: 'validatorRefs must target validator/reviewer and fixerRefs must target fixer/orchestrator per DL-05 type compatibility',
  actualOk: result.ok,
  refResolutionErrors: result.errors.filter((error) => error.ruleId === RegistryRuleId.REF_RESOLUTION).map((error) => ({ pointer: error.pointer, message: error.message })),
  errors: result.errors.map((error) => ({ ruleId: error.ruleId, pointer: error.pointer, message: error.message }))
}, null, 2));
if (result.ok) console.log('ADVERSARIAL_DEFECT validator-fixer-type-mismatch-not-rejected');
