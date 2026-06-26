import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  SecurityDecision,
  SecurityGateStatus,
  runSecurityGate,
} from '@vibe-engineer/security';

const fixtureDir = new URL('./', import.meta.url);
const evidenceDir = new URL('../../../../../.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fifth-fix-evidence/negative/', import.meta.url);
await mkdir(evidenceDir, { recursive: true });

function classifications(result) {
  return result.findings.map((finding) => finding.classification).sort();
}

function buildCommand(fixture) {
  if (fixture.command) return fixture.command;
  if (fixture.generate?.type === 'over_cap_tokens') {
    return {
      command: Array.from({ length: fixture.generate.count }, () => fixture.generate.token).join(' '),
      argv: [],
      classification: fixture.generate.classification,
    };
  }
  throw new Error(`Unsupported fixture shape for ${fixture.name}`);
}

function assertNoLeak(name, result) {
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890',
    'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890',
    'abc123',
  ]) {
    assert.ok(!serialized.includes(forbidden), `${name} leaked ${forbidden}`);
  }
}

function assertBlocked(name, result, expectedClassification) {
  assert.equal(result.status, SecurityGateStatus.Blocked, `${name} should block`);
  assert.equal(result.decision, SecurityDecision.Block, `${name} should block decision`);
  assert.ok(classifications(result).includes(expectedClassification), `${name} should include ${expectedClassification}; got ${classifications(result).join(',')}`);
  assertNoLeak(name, result);
}

function assertPassed(name, result) {
  assert.equal(result.status, SecurityGateStatus.Passed, `${name} should pass`);
  assert.equal(result.decision, SecurityDecision.Allow, `${name} should allow`);
  assert.deepEqual(result.findings, [], `${name} should have no findings`);
}

const matrix = JSON.parse(await readFile(new URL('matrix.json', fixtureDir), 'utf8'));
const rows = [];
for (const fixture of matrix.negative) {
  const result = runSecurityGate({ command: buildCommand(fixture) });
  assertBlocked(fixture.name, result, fixture.expectedClassification);
  rows.push({ name: fixture.name, status: result.status, decision: result.decision, classifications: classifications(result) });
}
for (const fixture of matrix.positive) {
  const result = runSecurityGate({ command: fixture.command });
  assertPassed(fixture.name, result);
  rows.push({ name: fixture.name, status: result.status, decision: result.decision, classifications: classifications(result) });
}

const summary = { ok: true, total: rows.length, rows };
const serialized = JSON.stringify(summary, null, 2);
assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890'), 'summary leaked inline sentinel');
assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890'), 'summary leaked colon sentinel');
assert.ok(!serialized.includes('abc123'), 'summary leaked split value');
await writeFile(new URL('fifth-fix-command-carriers-summary.json', evidenceDir), `${serialized}\n`);
console.log(JSON.stringify({ ok: true, total: rows.length }));
