import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceDir = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fifth-post-fix-revalidation-evidence/witnesses');
await mkdir(evidenceDir, { recursive: true });
const requireFromSecurity = createRequire(path.join(repoRoot, 'packages/security/package.json'));
const resolved = requireFromSecurity.resolve('@vibe-engineer/security');
const security = await import(pathToFileURL(resolved).href);

function classifications(result) {
  return result.findings.map((finding) => finding.classification).sort();
}

function gateFromPolicyParse(result) {
  return result.ok === false ? result.result : result;
}

function assertBlocked(name, result, expectedClassification) {
  const gate = gateFromPolicyParse(result);
  assert.equal(gate.status, security.SecurityGateStatus.Blocked, `${name} status`);
  assert.equal(gate.decision, security.SecurityDecision.Block, `${name} decision`);
  assert.ok(classifications(gate).includes(expectedClassification), `${name} expected ${expectedClassification}; got ${classifications(gate).join(',')}`);
  for (const forbidden of ['FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890', 'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890', 'abc123', 'FAKE_SECRET_VALUE_FOR_VALIDATION_REDACTION_1234567890']) {
    assert.ok(!JSON.stringify(gate).includes(forbidden), `${name} leaked raw generated-output token`);
  }
  return gate;
}

function assertPassed(name, result) {
  assert.equal(result.status, security.SecurityGateStatus.Passed, `${name} status`);
  assert.equal(result.decision, security.SecurityDecision.Allow, `${name} decision`);
  assert.deepEqual(result.findings, [], `${name} findings`);
}

const safeFixturePath = 'packages/security/fixtures/policy/fifth-fix-command-carriers/safe-label.txt';
const rows = [];
function record(name, result, expectedClassification = null, kind = 'negative') {
  const gate = expectedClassification ? assertBlocked(name, result, expectedClassification) : (assertPassed(name, result), result);
  rows.push({ name, kind, status: gate.status, decision: gate.decision, classifications: classifications(gate) });
}

record('positive safe read-only local deterministic command against lane fixture', security.runSecurityGate({ command: { command: 'node', argv: [safeFixturePath], classification: security.CommandSafetyClassification.ReadOnly, targetPaths: [safeFixturePath] } }), null, 'positive');
record('positive safe quoted non-secret command argument', security.runSecurityGate({ command: { command: `node "${safeFixturePath}"`, argv: [], classification: security.CommandSafetyClassification.ReadOnly, targetPaths: [safeFixturePath] } }), null, 'positive');
record('positive disabled external dry-run/local defaults', security.runSecurityGate({ env: { NODE_ENV: 'test' }, config: { runtime: { mode: 'local', endpoint: 'http://127.0.0.1:4318' } }, externalIntegrations: [{ id: 'offline-fixture', mode: security.ExternalIntegrationMode.Disabled, enabled: false, requiresCredential: false }], sandboxClaims: [{ provider: 'pi', status: security.SandboxCapabilityStatus.Unknown, claim: 'No live sandbox claim made.' }] }), null, 'positive');

for (const targetPath of [
  'C:outside', 'C:../outside', 'C:/Users/outside', 'C:\\Users\\outside', '//server/share', '\\\\server\\share', '~', '~/secret', '~user/.ssh/config', './package.json', './pnpm-lock.yaml', './pnpm-workspace.yaml', './turbo.json', './.git/config', 'packages/cli/../cli/package.json', 'safe/..', '../outside', '/Users/lizavasilyeva/work/vibe-engineer/package.json', '/', '', 'safe//file'
]) {
  record(`SPF2 path canonicalization blocks ${targetPath === '' ? '<empty>' : targetPath}`, security.runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: security.CommandSafetyClassification.ReadOnly, targetPaths: [targetPath] } }), security.SecurityClassification.UnsafeCommandTarget);
}

for (const targetPath of [
  'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'turbo.json', '.git/config', 'packages/cli/package.json', 'packages/security/package.json', 'packages/cli/src/command-loader/loader.js', 'packages/cli/src/entry/vibe-engineer.js', 'packages/cli/src/envelope/index.js', 'packages/cli/src/errors/index.js', 'packages/cli/src/testing/harness.js'
]) {
  record(`SPF3 mandatory protected floor blocks ${targetPath}`, security.runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: security.CommandSafetyClassification.ReadOnly, targetPaths: [targetPath] } }), security.SecurityClassification.UnsafeCommandTarget);
  record(`SPF3 direct policy floor removal still blocks ${targetPath}`, security.evaluateCommandSafety({ command: 'node', argv: ['safe.mjs'], classification: security.CommandSafetyClassification.ReadOnly, targetPaths: [targetPath] }, { ...security.DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }), security.SecurityClassification.UnsafeCommandTarget);
}
record('SPF3 parse policy cannot omit mandatory floor', security.parseSecurityPolicy({ ...security.DEFAULT_SECURITY_POLICY, protectedPathPrefixes: security.DEFAULT_SECURITY_POLICY.protectedPathPrefixes.filter((prefix) => prefix !== 'turbo.json') }), security.SecurityClassification.MalformedPolicy);

record('original F1 terminal traversal path remains blocked', security.runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: security.CommandSafetyClassification.ReadOnly, targetPaths: ['safe/..'] } }), security.SecurityClassification.UnsafeCommandTarget);
record('original F1 Windows drive absolute remains blocked', security.runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: security.CommandSafetyClassification.ReadOnly, targetPaths: ['C:\\Users\\outside'] } }), security.SecurityClassification.UnsafeCommandTarget);
record('original F2 missing command remains blocked', security.runSecurityGate({ command: { argv: ['safe.mjs'], classification: security.CommandSafetyClassification.ReadOnly } }), security.SecurityClassification.UnknownRequestField);
record('original F2 malformed argv string remains blocked', security.runSecurityGate({ command: { command: 'node', argv: '--api-key FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890', classification: security.CommandSafetyClassification.ReadOnly } }), security.SecurityClassification.UnknownRequestField);
record('original F2 malformed target array remains blocked', security.runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: security.CommandSafetyClassification.ReadOnly, targetPaths: '../outside' } }), security.SecurityClassification.UnknownRequestField);
record('malformed declaredWritePaths string remains blocked', security.runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: security.CommandSafetyClassification.ReadOnly, declaredWritePaths: 'safe' } }), security.SecurityClassification.UnknownRequestField);
record('original F3 invented command classification policy remains blocked', security.parseSecurityPolicy({ ...security.DEFAULT_SECURITY_POLICY, allowedCommandClassifications: ['read_only', 'invented_super_safe'] }), security.SecurityClassification.MalformedPolicy);
record('original F3 fake sandbox status policy remains blocked', security.parseSecurityPolicy({ ...security.DEFAULT_SECURITY_POLICY, allowedSandboxCapabilityStatuses: ['unknown', 'docker_isolated'] }), security.SecurityClassification.MalformedPolicy);
record('original F4 pending-live sandbox remains blocked', security.runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: security.SandboxCapabilityStatus.BlockedPendingLive, claim: 'Live proof unavailable.' }] }), security.SecurityClassification.UnsupportedSandboxClaim);
record('original F5 secret arrays remain blocked', security.runSecurityGate({ config: { nested: ['FAKE_SECRET_VALUE_FOR_VALIDATION_REDACTION_1234567890'] } }), security.SecurityClassification.SecretLikeValue);
const circularEvidence = { message: 'cycle' };
circularEvidence.self = circularEvidence;
record('original F6 circular evidence remains typed blocked', security.runSecurityGate({ evidence: circularEvidence }), security.SecurityClassification.EvidenceSecretLeak);
record('original F6 BigInt evidence remains typed blocked', security.runSecurityGate({ evidence: { counter: 1n } }), security.SecurityClassification.EvidenceSecretLeak);
record('PF1 unsafe command policy relaxation remains blocked', security.evaluateCommandSafety({ command: 'curl', argv: ['-X', 'POST', 'https://api.example.invalid/resource'], classification: security.CommandSafetyClassification.NetworkExternalMutation }, { ...security.DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [security.CommandSafetyClassification.ReadOnly, security.CommandSafetyClassification.NetworkExternalMutation] }), security.SecurityClassification.DestructiveCommand);
record('PF3 malformed external booleans remain blocked', security.runSecurityGate({ externalIntegrations: [{ id: 'string-booleans', mode: security.ExternalIntegrationMode.Disabled, enabled: 'false', requiresCredential: 'true', requiresBudget: 'true', requiresNetwork: 'true', networkMutation: 'false', explicitApproval: 'false' }] }), security.SecurityClassification.UnknownRequestField);
record('PF4 malformed sandbox provider and claim remain blocked', security.runSecurityGate({ sandboxClaims: [{ provider: 123, status: security.SandboxCapabilityStatus.Unknown, claim: { overclaim: true } }] }), security.SecurityClassification.UnknownRequestField);
record('malformed policy non-object remains blocked', security.parseSecurityPolicy('not-an-object'), security.SecurityClassification.MalformedPolicy);
record('unknown policy version remains blocked', security.parseSecurityPolicy({ schemaVersion: 'security-policy.v999', defaultDecision: 'block' }), security.SecurityClassification.UnsupportedPolicyVersion);
record('unknown policy field remains blocked', security.parseSecurityPolicy({ ...security.DEFAULT_SECURITY_POLICY, unsupported: true }), security.SecurityClassification.UnknownPolicyField);
record('unknown gate request field remains blocked', security.runSecurityGate({ unsupported: true }), security.SecurityClassification.UnknownRequestField);
record('unsafe env production default remains blocked', security.runSecurityGate({ env: { NODE_ENV: 'production' } }), security.SecurityClassification.ProductionCredentialOrDefault);
record('unsafe config external enabled default remains blocked', security.runSecurityGate({ config: { externalIntegrationEnabled: true } }), security.SecurityClassification.UnsafeEnvDefault);
record('unsafe live external integration remains blocked', security.runSecurityGate({ externalIntegrations: [{ id: 'live-provider', mode: security.ExternalIntegrationMode.Enabled, enabled: true, requiresCredential: true, requiresBudget: true, requiresNetwork: true, networkMutation: true, explicitApproval: false }] }), security.SecurityClassification.UnsafeExternalIntegration);
record('destructive rm remains blocked', security.runSecurityGate({ command: { command: 'rm', argv: ['-rf', '/'], classification: security.CommandSafetyClassification.DestructiveLocalOperation, targetPaths: ['/'] } }), security.SecurityClassification.DestructiveCommand);
record('force push remains blocked', security.runSecurityGate({ command: { command: 'git', argv: ['push', '--force', 'origin', 'main'], classification: security.CommandSafetyClassification.RepositoryStateOperation } }), security.SecurityClassification.DestructiveCommand);
record('publish primitive remains blocked', security.runSecurityGate({ command: { command: 'npm', argv: ['publish'], classification: security.CommandSafetyClassification.ProductionImpactingOperation } }), security.SecurityClassification.DestructiveCommand);

const redactionPayload = {
  stdout: 'token=FAKE_SECRET_VALUE_FOR_VALIDATION_REDACTION_1234567890',
  diagnostics: [{ message: 'client_secret=FAKE_SECRET_VALUE_FOR_VALIDATION_REDACTION_1234567890' }],
  evidenceRefs: [{ apiKey: 'FAKE_SECRET_VALUE_FOR_VALIDATION_REDACTION_1234567890' }],
};
const redacted = security.redactSecurityValue(redactionPayload);
assert.ok(!JSON.stringify(redacted).includes('FAKE_SECRET_VALUE_FOR_VALIDATION_REDACTION_1234567890'), 'redactSecurityValue leaked validation sentinel');
record('redaction/evidence payload remains blocked and redacted', security.evaluateEvidenceSafety(redactionPayload), security.SecurityClassification.EvidenceSecretLeak);

const summary = { ok: true, resolved, total: rows.length, rows };
const serialized = JSON.stringify(summary, null, 2);
for (const forbidden of ['FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890', 'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890', 'abc123', 'FAKE_SECRET_VALUE_FOR_VALIDATION_REDACTION_1234567890']) {
  assert.ok(!serialized.includes(forbidden), 'summary leaked raw generated-output token');
}
await writeFile(path.join(evidenceDir, 'fifth-post-fix-regression-matrix-summary.json'), `${serialized}\n`);
console.log(JSON.stringify({ ok: true, resolved, total: rows.length }));
