import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RegistryRuleId, loadRegistry } from '@vibe-engineer/registry';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const caseRoot = path.join(evidenceRoot, 'evidence-ref-case');
fs.rmSync(caseRoot, { recursive: true, force: true });
fs.mkdirSync(caseRoot, { recursive: true });

const fixtureRoot = path.join(repoRoot, 'packages/registry/fixtures/valid/core-set');
for (const file of fs.readdirSync(fixtureRoot).filter((name) => name.endsWith('.json')).sort()) {
  const entry = JSON.parse(fs.readFileSync(path.join(fixtureRoot, file), 'utf8'));
  if (entry.agentId === 'fixture-specialist') {
    entry.evals = [{ rel: 'evidence_for', artifactKind: 'evidence_packet', artifactId: 'evidence:missing-file', path: 'definitely/missing/evidence-packet.json', required: true, statusAtLinkTime: 'passed' }];
    entry.extensions['dev.vibe.registry'].smokeRefs = ['definitely/missing/smoke-evidence.json'];
  }
  fs.writeFileSync(path.join(caseRoot, file), `${JSON.stringify(entry, null, 2)}\n`);
}

const result = loadRegistry(caseRoot);
const hasExpectedRule = result.errors.some((error) => error.ruleId === RegistryRuleId.MATURITY_EVIDENCE);
console.log(JSON.stringify({
  expectedRejectRule: RegistryRuleId.MATURITY_EVIDENCE,
  actualOk: result.ok,
  hasExpectedRule,
  errors: result.errors.map((error) => ({ ruleId: error.ruleId, pointer: error.pointer, message: error.message }))
}, null, 2));
if (result.ok || !hasExpectedRule) console.log('ADVERSARIAL_DEFECT evidence-reference-missing-not-rejected');
