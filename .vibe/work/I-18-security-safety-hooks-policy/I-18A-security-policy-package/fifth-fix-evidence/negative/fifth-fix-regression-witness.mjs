import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const evidenceDir = new URL('./', import.meta.url);
await mkdir(evidenceDir, { recursive: true });
const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const requireFromSecurityPackage = createRequire(path.join(repoRoot, 'packages/security/package.json'));
const resolvedSecurity = requireFromSecurityPackage.resolve('@vibe-engineer/security');
const {
  CommandSafetyClassification,
  DEFAULT_SECURITY_POLICY,
  ExternalIntegrationMode,
  SandboxCapabilityStatus,
  SecurityClassification,
  SecurityDecision,
  SecurityGateStatus,
  evaluateCommandSafety,
  runSecurityGate,
} = await import(pathToFileURL(resolvedSecurity).href);

function classifications(result) {
  return result.findings.map((finding) => finding.classification).sort();
}

function assertBlocked(name, result, expected) {
  assert.equal(result.status, SecurityGateStatus.Blocked, `${name} should block`);
  assert.equal(result.decision, SecurityDecision.Block, `${name} should block decision`);
  assert.ok(classifications(result).includes(expected), `${name} expected ${expected}; got ${classifications(result).join(',')}`);
  return { name, status: result.status, decision: result.decision, classifications: classifications(result) };
}

function assertPassed(name, result) {
  assert.equal(result.status, SecurityGateStatus.Passed, `${name} should pass`);
  assert.equal(result.decision, SecurityDecision.Allow, `${name} should allow`);
  assert.deepEqual(result.findings, [], `${name} should not produce findings`);
  return { name, status: result.status, decision: result.decision, classifications: classifications(result) };
}

const checks = [];
checks.push(assertPassed('positive safe fifth-fix argv command carrier remains allowed', runSecurityGate({ command: { command: 'node', argv: ['packages/security/fixtures/policy/fifth-fix-command-carriers/safe-label.txt'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/fixtures/policy/fifth-fix-command-carriers/safe-label.txt'] } })));

for (const targetPath of [
  'C:outside',
  'C:../outside',
  'C:/Users/outside',
  'C:\\Users\\outside',
  '//server/share',
  '\\\\server\\share',
  '~',
  '~/secret',
  '~user/.ssh/config',
  './package.json',
  './pnpm-lock.yaml',
  './pnpm-workspace.yaml',
  './turbo.json',
  './.git/config',
  'packages/cli/../cli/package.json',
  'safe/..',
  '../outside',
  '/Users/lizavasilyeva/work/vibe-engineer/package.json',
  '/',
  '',
  'safe//file',
]) {
  checks.push(assertBlocked(`SPF2 path canonicalization blocks ${targetPath || '<empty>'}`, runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: [targetPath] } }), SecurityClassification.UnsafeCommandTarget));
}

for (const targetPath of [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  '.git/config',
  'packages/cli/package.json',
  'packages/security/package.json',
  'packages/cli/src/command-loader/loader.js',
  'packages/cli/src/entry/vibe-engineer.js',
  'packages/cli/src/envelope/index.js',
  'packages/cli/src/errors/index.js',
  'packages/cli/src/testing/harness.js',
]) {
  checks.push(assertBlocked(`SPF3 mandatory protected floor blocks ${targetPath}`, runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: [targetPath] } }), SecurityClassification.UnsafeCommandTarget));
  checks.push(assertBlocked(`SPF3 unsafe direct policy cannot remove floor for ${targetPath}`, evaluateCommandSafety({ command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: [targetPath] }, { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }), SecurityClassification.UnsafeCommandTarget));
}

checks.push(assertBlocked('SPF3 omitted custom floor still blocks package manifest', evaluateCommandSafety({ command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['package.json'] }, { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: DEFAULT_SECURITY_POLICY.protectedPathPrefixes }), SecurityClassification.UnsafeCommandTarget));
checks.push(assertBlocked('PF1 unsafe command policy relaxation remains blocked', evaluateCommandSafety({ command: 'curl', argv: ['-X', 'POST', 'https://api.example.invalid/resource'], classification: CommandSafetyClassification.NetworkExternalMutation }, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] }), SecurityClassification.DestructiveCommand));
checks.push(assertBlocked('PF3 malformed external boolean strings remain blocked', runSecurityGate({ externalIntegrations: [{ id: 'bad-booleans', mode: ExternalIntegrationMode.Disabled, enabled: 'false', requiresCredential: 'true', requiresBudget: 'true', requiresNetwork: 'true', networkMutation: 'false', explicitApproval: 'false' }] }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('PF4 malformed sandbox provider/claim remains blocked', runSecurityGate({ sandboxClaims: [{ provider: 123, status: SandboxCapabilityStatus.Unknown, claim: { overclaim: true } }] }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('F4 pending-live sandbox remains blocked', runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.BlockedPendingLive, claim: 'Live proof pending.' }] }), SecurityClassification.UnsupportedSandboxClaim));
checks.push(assertBlocked('malformed command missing command remains blocked', runSecurityGate({ command: { argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed argv string remains blocked', runSecurityGate({ command: { command: 'node', argv: '--api-key FAKE_SECRET_VALUE_FOR_FIFTH_FIX_REGRESSION_1234567890', classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed targetPaths string remains blocked', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: '../outside' } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed declaredWritePaths string remains blocked', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, declaredWritePaths: '../outside' } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('secret array remains blocked', runSecurityGate({ config: { nested: ['FAKE_SECRET_VALUE_FOR_FIFTH_FIX_ARRAY_1234567890'] } }), SecurityClassification.SecretLikeValue));
const circular = { token: 'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_CIRCULAR_1234567890' };
circular.self = circular;
checks.push(assertBlocked('circular evidence remains typed blocked', runSecurityGate({ evidence: circular }), SecurityClassification.EvidenceSecretLeak));
checks.push(assertBlocked('BigInt evidence remains typed blocked', runSecurityGate({ evidence: { token: 'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_BIGINT_1234567890', counter: 1n } }), SecurityClassification.EvidenceSecretLeak));

const summary = { ok: true, total: checks.length, checks };
const serialized = JSON.stringify(summary, null, 2);
for (const forbidden of [
  'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_REGRESSION_1234567890',
  'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_ARRAY_1234567890',
  'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_CIRCULAR_1234567890',
  'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_BIGINT_1234567890',
]) assert.ok(!serialized.includes(forbidden), `summary leaked ${forbidden}`);
await writeFile(new URL('fifth-fix-regression-witness-summary.json', evidenceDir), `${serialized}\n`);
console.log(JSON.stringify({ ok: true, total: checks.length }));
