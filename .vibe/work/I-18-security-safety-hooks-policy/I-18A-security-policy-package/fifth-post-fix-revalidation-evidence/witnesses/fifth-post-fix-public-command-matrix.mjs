import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceDir = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fifth-post-fix-revalidation-evidence/witnesses');
await mkdir(evidenceDir, { recursive: true });

async function importSecurityFrom(contextPackageJson) {
  const requireFromContext = createRequire(contextPackageJson);
  const resolved = requireFromContext.resolve('@vibe-engineer/security');
  const security = await import(pathToFileURL(resolved).href);
  return { resolved, security };
}

function classifications(result) {
  return result.findings.map((finding) => finding.classification).sort();
}

function buildGeneratedCommand(fixture) {
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

function assertNoGeneratedLeak(name, result) {
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890',
    'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890',
    'abc123',
  ]) {
    assert.ok(!serialized.includes(forbidden), `${name} leaked raw generated-output token`);
  }
}

function assertBlocked(security, contextName, name, result, expectedClassification) {
  assert.equal(result.status, security.SecurityGateStatus.Blocked, `${contextName} ${name} status`);
  assert.equal(result.decision, security.SecurityDecision.Block, `${contextName} ${name} decision`);
  assert.ok(classifications(result).includes(expectedClassification), `${contextName} ${name} expected ${expectedClassification}; got ${classifications(result).join(',')}`);
  assertNoGeneratedLeak(`${contextName} ${name}`, result);
}

function assertPassed(security, contextName, name, result) {
  assert.equal(result.status, security.SecurityGateStatus.Passed, `${contextName} ${name} status`);
  assert.equal(result.decision, security.SecurityDecision.Allow, `${contextName} ${name} decision`);
  assert.deepEqual(result.findings, [], `${contextName} ${name} findings`);
}

const fixturePath = path.join(repoRoot, 'packages/security/fixtures/policy/fifth-fix-command-carriers/matrix.json');
const matrix = JSON.parse(await readFile(fixturePath, 'utf8'));
const mandatoryCases = [
  { name: 'double-quoted embedded api-key flag without value', command: { command: 'node "--api-key"', argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'single-quoted embedded api-key flag without value', command: { command: "node '--api-key'", argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'double-quoted embedded api-key flag split value', command: { command: 'node "--api-key"', argv: ['abc123'], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'single-quoted embedded client-secret flag split value', command: { command: "node '--client-secret'", argv: ['abc123'], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'quoted token flag without value', command: { command: 'node "--token"', argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'quoted inline api-key sentinel', command: { command: 'node "--api-key=FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890"', argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'quoted colon client-secret sentinel', command: { command: "node '--client-secret:FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890'", argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'escaped quote api-key flag', command: { command: 'node \\"--api-key\\"', argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'unterminated double quote around api-key', command: { command: 'node "--api-key', argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'unterminated single quote around client-secret', command: { command: "node '--client-secret", argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'empty quoted token adjacent to secret-like flag', command: { command: 'node "--api-key" ""', argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'unquoted embedded api-key regression', command: { command: 'node --api-key', argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'unquoted split api-key regression', command: { command: 'node --api-key', argv: ['abc123'], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'unquoted split client-secret regression', command: { command: 'node --client-secret', argv: ['abc123'], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'argv-only flag regression', command: { command: 'node', argv: ['--api-key'], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'argv adjacent key value regression', command: { command: 'node', argv: ['--api-key', 'abc123'], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'inline equals regression', command: { command: 'node --api-key=FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890', argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
  { name: 'inline colon regression', command: { command: 'node --client-secret:FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890', argv: [], classification: 'read_only' }, expectedClassification: 'secret_like_value' },
];

const contexts = [
  ['packages/security', path.join(repoRoot, 'packages/security/package.json')],
  ['packages/cli', path.join(repoRoot, 'packages/cli/package.json')],
];
const rows = [];
for (const [contextName, packageJsonPath] of contexts) {
  const { resolved, security } = await importSecurityFrom(packageJsonPath);
  for (const fixture of matrix.negative) {
    const result = security.runSecurityGate({ command: buildGeneratedCommand(fixture) });
    assertBlocked(security, contextName, `fixture:${fixture.name}`, result, fixture.expectedClassification);
    rows.push({ contextName, resolved, source: 'fixture-matrix', name: fixture.name, status: result.status, decision: result.decision, classifications: classifications(result) });
  }
  for (const fixture of matrix.positive) {
    const result = security.runSecurityGate({ command: fixture.command });
    assertPassed(security, contextName, `fixture:${fixture.name}`, result);
    rows.push({ contextName, resolved, source: 'fixture-matrix', name: fixture.name, status: result.status, decision: result.decision, classifications: [] });
  }
  for (const testCase of mandatoryCases) {
    const result = security.runSecurityGate({ command: testCase.command });
    assertBlocked(security, contextName, `direct:${testCase.name}`, result, testCase.expectedClassification);
    rows.push({ contextName, resolved, source: 'direct-mandatory', name: testCase.name, status: result.status, decision: result.decision, classifications: classifications(result) });
  }
  const overCap = security.runSecurityGate({ command: { command: Array.from({ length: 513 }, () => 'safe-token').join(' '), argv: [], classification: security.CommandSafetyClassification.ReadOnly } });
  assertBlocked(security, contextName, 'direct:over cap command token count', overCap, security.SecurityClassification.UnknownRequestField);
  rows.push({ contextName, resolved, source: 'direct-mandatory', name: 'over cap command token count', status: overCap.status, decision: overCap.decision, classifications: classifications(overCap) });
}

const summary = { ok: true, contexts: contexts.map(([name]) => name), total: rows.length, rows };
const serialized = JSON.stringify(summary, null, 2);
for (const forbidden of ['FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890', 'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890', 'abc123']) {
  assert.ok(!serialized.includes(forbidden), 'summary leaked raw generated-output token');
}
await writeFile(path.join(evidenceDir, 'fifth-post-fix-public-command-matrix-summary.json'), `${serialized}\n`);
console.log(JSON.stringify({ ok: true, contexts: summary.contexts, total: summary.total }));
