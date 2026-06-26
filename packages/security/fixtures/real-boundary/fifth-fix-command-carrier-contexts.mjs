import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(new URL('../../../../', import.meta.url).pathname);
const evidenceDir = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fifth-fix-evidence/real-boundary');
await mkdir(evidenceDir, { recursive: true });
const fixturePath = path.join(repoRoot, 'packages/security/fixtures/policy/fifth-fix-command-carriers/matrix.json');

async function importSecurityFrom(contextPackageJson) {
  const requireFromContext = createRequire(contextPackageJson);
  const resolved = requireFromContext.resolve('@vibe-engineer/security');
  return { resolved, security: await import(pathToFileURL(resolved).href) };
}

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
  ]) assert.ok(!serialized.includes(forbidden), `${name} leaked ${forbidden}`);
}

const matrix = JSON.parse(await readFile(fixturePath, 'utf8'));
const contexts = [
  ['packages/security', path.join(repoRoot, 'packages/security/package.json')],
  ['packages/cli', path.join(repoRoot, 'packages/cli/package.json')],
];
const rows = [];
for (const [contextName, contextPackageJson] of contexts) {
  const { resolved, security } = await importSecurityFrom(contextPackageJson);
  for (const fixture of matrix.negative) {
    const result = security.runSecurityGate({ command: buildCommand(fixture) });
    const cls = classifications(result);
    assert.equal(result.status, security.SecurityGateStatus.Blocked, `${contextName} ${fixture.name} should block`);
    assert.equal(result.decision, security.SecurityDecision.Block, `${contextName} ${fixture.name} should block decision`);
    assert.ok(cls.includes(fixture.expectedClassification), `${contextName} ${fixture.name} missing ${fixture.expectedClassification}`);
    assertNoLeak(`${contextName} ${fixture.name}`, result);
    rows.push({ contextName, resolved, name: fixture.name, status: result.status, decision: result.decision, classifications: cls });
  }
  for (const fixture of matrix.positive) {
    const result = security.runSecurityGate({ command: fixture.command });
    assert.equal(result.status, security.SecurityGateStatus.Passed, `${contextName} ${fixture.name} should pass`);
    assert.equal(result.decision, security.SecurityDecision.Allow, `${contextName} ${fixture.name} should allow`);
    assert.deepEqual(result.findings, [], `${contextName} ${fixture.name} should have no findings`);
    rows.push({ contextName, resolved, name: fixture.name, status: result.status, decision: result.decision, classifications: [] });
  }
}

const summary = { ok: true, total: rows.length, rows };
const serialized = JSON.stringify(summary, null, 2);
assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890'), 'summary leaked inline sentinel');
assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890'), 'summary leaked colon sentinel');
assert.ok(!serialized.includes('abc123'), 'summary leaked split value');
await writeFile(path.join(evidenceDir, 'fifth-command-carrier-context-summary.json'), `${serialized}\n`);
console.log(JSON.stringify({ ok: true, total: rows.length, contexts: contexts.map(([name]) => name) }));
