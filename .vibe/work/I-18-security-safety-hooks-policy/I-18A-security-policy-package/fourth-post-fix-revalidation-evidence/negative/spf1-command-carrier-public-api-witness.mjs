import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fourth-post-fix-revalidation-evidence');
const fixtureDir = path.join(repoRoot, 'packages/security/fixtures/policy/fourth-fix-command-carriers');
const summaryPath = path.join(evidenceRoot, 'negative/spf1-command-carrier-public-api-witness-summary.json');

async function importSecurityFrom(contextPackageJson) {
  const requireFromContext = createRequire(contextPackageJson);
  const resolved = requireFromContext.resolve('@vibe-engineer/security');
  const security = await import(pathToFileURL(resolved).href);
  return { resolved, security };
}

function classifications(result) {
  return result.findings.map((finding) => finding.classification).sort();
}

function assertNoRawSecretLeak(label, result) {
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    'FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_INLINE_1234567890',
    'FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_COLON_1234567890',
    'abc123',
  ]) {
    assert.ok(!serialized.includes(forbidden), `${label} leaked raw secret/split value ${forbidden}: ${serialized}`);
  }
}

function assertBlocked(label, security, command) {
  const result = security.runSecurityGate({ command });
  assert.equal(result.status, security.SecurityGateStatus.Blocked, `${label} status`);
  assert.equal(result.decision, security.SecurityDecision.Block, `${label} decision`);
  assert.ok(classifications(result).includes(security.SecurityClassification.SecretLikeValue), `${label} classifications ${classifications(result).join(',')}`);
  assertNoRawSecretLeak(label, result);
  return { label, status: result.status, decision: result.decision, classifications: classifications(result), findingCount: result.findings.length };
}

function assertPassed(label, security, command) {
  const result = security.runSecurityGate({ command });
  assert.equal(result.status, security.SecurityGateStatus.Passed, `${label} status`);
  assert.equal(result.decision, security.SecurityDecision.Allow, `${label} decision`);
  assert.deepEqual(result.findings, [], `${label} findings`);
  return { label, status: result.status, decision: result.decision, classifications: classifications(result), findingCount: result.findings.length };
}

const negativeCaseInputs = [
  ['embedded api-key flag without argv', { command: 'node --api-key', argv: [] }],
  ['embedded api-key flag split value', { command: 'node --api-key', argv: ['abc123'] }],
  ['embedded client-secret flag split value', { command: 'node --client-secret', argv: ['abc123'] }],
  ['embedded token flag without argv', { command: 'node --token', argv: [] }],
  ['embedded token flag split value', { command: 'node --token', argv: ['abc123'] }],
  ['embedded api-key inline equals', { command: 'node --api-key=FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_INLINE_1234567890', argv: [] }],
  ['embedded client-secret inline equals', { command: 'node --client-secret=FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_INLINE_1234567890', argv: [] }],
  ['argv api-key flag without value', { command: 'node', argv: ['--api-key'] }],
  ['argv api-key adjacent value', { command: 'node', argv: ['--api-key', 'abc123'] }],
  ['argv client-secret adjacent value', { command: 'node', argv: ['--client-secret', 'abc123'] }],
  ['embedded api-key inline colon', { command: 'node --api-key:FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_COLON_1234567890', argv: [] }],
  ['argv token inline colon', { command: 'node', argv: ['--token:FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_COLON_1234567890'] }],
];

const contexts = [
  ['packages/security', path.join(repoRoot, 'packages/security/package.json')],
  ['packages/cli', path.join(repoRoot, 'packages/cli/package.json')],
];

const contextSummaries = [];
for (const [contextName, contextPackageJson] of contexts) {
  const { resolved, security } = await importSecurityFrom(contextPackageJson);
  const checks = [];
  const negativeCases = negativeCaseInputs.map(([label, command]) => [label, { ...command, classification: security.CommandSafetyClassification.ReadOnly }]);
  const positiveCommand = {
    command: 'node',
    argv: ['packages/security/fixtures/policy/fourth-fix-command-carriers/positive-safe-argv.json'],
    classification: security.CommandSafetyClassification.ReadOnly,
    targetPaths: ['packages/security/fixtures/policy/fourth-fix-command-carriers/positive-safe-argv.json'],
  };
  for (const [label, command] of negativeCases) checks.push(assertBlocked(`${contextName}: ${label}`, security, command));
  checks.push(assertPassed(`${contextName}: positive safe read-only carrier`, security, positiveCommand));

  const fixtureChecks = [];
  for (const file of (await readdir(fixtureDir)).filter((entry) => entry.endsWith('.json')).sort()) {
    const fixture = JSON.parse(await readFile(path.join(fixtureDir, file), 'utf8'));
    if (fixture.expectedStatus === security.SecurityGateStatus.Passed) {
      fixtureChecks.push({ file, ...assertPassed(`${contextName}: fixture ${file}`, security, fixture.command) });
    } else {
      fixtureChecks.push({ file, ...assertBlocked(`${contextName}: fixture ${file}`, security, fixture.command) });
    }
  }
  contextSummaries.push({ contextName, resolved, checks, fixtureChecks });
}

const summary = { ok: true, contexts: contextSummaries };
const serialized = JSON.stringify(summary, null, 2);
assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_INLINE_1234567890'), 'summary leaked inline sentinel');
assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_COLON_1234567890'), 'summary leaked colon sentinel');
assert.ok(!serialized.includes('abc123'), 'summary leaked split fake value');
await writeFile(summaryPath, `${serialized}\n`);
console.log(JSON.stringify({ ok: true, contextCount: contextSummaries.length, checks: contextSummaries.reduce((sum, item) => sum + item.checks.length + item.fixtureChecks.length, 0) }));
