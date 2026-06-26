import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  CommandSafetyClassification,
  SecurityClassification,
  SecurityDecision,
  SecurityGateStatus,
  runSecurityGate,
} from '@vibe-engineer/security';

const fixtureDir = new URL('./', import.meta.url);
const evidenceDir = new URL('../../../../../.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fourth-fix-evidence/negative/', import.meta.url);
await mkdir(evidenceDir, { recursive: true });

const fixtureFiles = [
  'embedded-api-key-flag.json',
  'split-api-key-value.json',
  'split-client-secret-value.json',
  'embedded-api-key-inline.json',
  'argv-adjacent-api-key.json',
  'positive-safe-argv.json',
];

function classifications(result) {
  return result.findings.map((finding) => finding.classification).sort();
}

function assertNoLeak(name, result) {
  const serialized = JSON.stringify(result);
  for (const forbidden of ['FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_INLINE_1234567890', 'abc123']) {
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
  assert.deepEqual(result.findings, [], `${name} should not produce findings`);
}

const checks = [];
for (const file of fixtureFiles) {
  const fixture = JSON.parse(await readFile(new URL(file, fixtureDir), 'utf8'));
  const result = runSecurityGate({ command: fixture.command });
  if (fixture.expectedStatus === SecurityGateStatus.Passed) assertPassed(fixture.name, result);
  else assertBlocked(fixture.name, result, fixture.expectedClassification);
  checks.push({ name: fixture.name, file, status: result.status, decision: result.decision, classifications: classifications(result) });
}

const directCases = [
  {
    name: 'third revalidation exact false green: command embedded api-key flag only',
    command: { command: 'node --api-key', argv: [], classification: CommandSafetyClassification.ReadOnly },
    expected: SecurityClassification.SecretLikeValue,
  },
  {
    name: 'third revalidation exact false green: command embedded api-key flag split value',
    command: { command: 'node --api-key', argv: ['abc123'], classification: CommandSafetyClassification.ReadOnly },
    expected: SecurityClassification.SecretLikeValue,
  },
  {
    name: 'third revalidation exact false green: command embedded client-secret flag split value',
    command: { command: 'node --client-secret', argv: ['abc123'], classification: CommandSafetyClassification.ReadOnly },
    expected: SecurityClassification.SecretLikeValue,
  },
  {
    name: 'embedded token flag without value',
    command: { command: 'node --token', argv: [], classification: CommandSafetyClassification.ReadOnly },
    expected: SecurityClassification.SecretLikeValue,
  },
  {
    name: 'embedded token flag split non-secret-looking value',
    command: { command: 'node --token', argv: ['abc123'], classification: CommandSafetyClassification.ReadOnly },
    expected: SecurityClassification.SecretLikeValue,
  },
  {
    name: 'argv-only api-key flag remains blocked',
    command: { command: 'node', argv: ['--api-key'], classification: CommandSafetyClassification.ReadOnly },
    expected: SecurityClassification.SecretLikeValue,
  },
  {
    name: 'argv adjacent api-key value remains blocked',
    command: { command: 'node', argv: ['--api-key', 'abc123'], classification: CommandSafetyClassification.ReadOnly },
    expected: SecurityClassification.SecretLikeValue,
  },
  {
    name: 'command-embedded api-key inline fake sentinel blocks and redacts',
    command: { command: 'node --api-key=FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_INLINE_1234567890', argv: [], classification: CommandSafetyClassification.ReadOnly },
    expected: SecurityClassification.SecretLikeValue,
  },
];

for (const item of directCases) {
  const result = runSecurityGate({ command: item.command });
  assertBlocked(item.name, result, item.expected);
  checks.push({ name: item.name, status: result.status, decision: result.decision, classifications: classifications(result) });
}

const positive = runSecurityGate({
  command: {
    command: 'node',
    argv: ['packages/security/fixtures/policy/fourth-fix-command-carriers/positive-safe-argv.json'],
    classification: CommandSafetyClassification.ReadOnly,
    targetPaths: ['packages/security/fixtures/policy/fourth-fix-command-carriers/positive-safe-argv.json'],
  },
});
assertPassed('positive safe command carrier direct API case', positive);
checks.push({ name: 'positive safe command carrier direct API case', status: positive.status, decision: positive.decision, classifications: classifications(positive) });

const summary = { ok: true, total: checks.length, checks };
const serializedSummary = JSON.stringify(summary, null, 2);
assert.ok(!serializedSummary.includes('FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_INLINE_1234567890'), 'summary leaked fake sentinel');
assert.ok(!serializedSummary.includes('abc123'), 'summary leaked split fake value');
await writeFile(new URL('fourth-fix-command-carriers-summary.json', evidenceDir), `${serializedSummary}\n`);
console.log(JSON.stringify({ ok: true, total: checks.length }));
