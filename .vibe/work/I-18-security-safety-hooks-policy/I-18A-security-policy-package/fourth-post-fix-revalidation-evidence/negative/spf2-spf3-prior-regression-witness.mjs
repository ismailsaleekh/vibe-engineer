import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fourth-post-fix-revalidation-evidence');
const requireFromSecurity = createRequire(path.join(repoRoot, 'packages/security/package.json'));
const security = await import(pathToFileURL(requireFromSecurity.resolve('@vibe-engineer/security')).href);
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
} = security;

function classifications(result) {
  return result.findings.map((finding) => finding.classification).sort();
}

function assertBlocked(label, result, expectedClassification) {
  assert.equal(result.status, SecurityGateStatus.Blocked, `${label} status`);
  assert.equal(result.decision, SecurityDecision.Block, `${label} decision`);
  assert.ok(classifications(result).includes(expectedClassification), `${label} expected ${expectedClassification}; got ${classifications(result).join(',')}`);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS'), `${label} leaked fake secret sentinel`);
  return { label, status: result.status, decision: result.decision, classifications: classifications(result), findingCount: result.findings.length };
}

function commandForTarget(targetPath) {
  return {
    command: 'node',
    argv: ['packages/security/fixtures/policy/fourth-fix-command-carriers/positive-safe-argv.json'],
    classification: CommandSafetyClassification.ReadOnly,
    targetPaths: [targetPath],
  };
}

const checks = [];

const spf2Targets = [
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
  '/tmp/outside',
  '/',
  '',
  'safe//file',
  './',
];
for (const target of spf2Targets) {
  checks.push(assertBlocked(`SPF2 path canonicalization blocks ${JSON.stringify(target)}`, runSecurityGate({ command: commandForTarget(target) }), SecurityClassification.UnsafeCommandTarget));
}

const spf3Targets = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  '.git/config',
  'packages/cli/package.json',
  'packages/security/package.json',
  'packages/cli/src/command-loader/loader.js',
  'packages/cli/src/entry/vibe-engineer.js',
  'packages/cli/src/envelope/result.js',
  'packages/cli/src/errors/index.js',
  'packages/cli/src/testing/harness.js',
];
for (const target of spf3Targets) {
  checks.push(assertBlocked(`SPF3 mandatory protected floor blocks ${target}`, runSecurityGate({ command: commandForTarget(target) }), SecurityClassification.UnsafeCommandTarget));
}

checks.push(assertBlocked('SPF3 runSecurityGate blocks policy protectedPathPrefixes empty', runSecurityGate({ policy: { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }, command: commandForTarget('package.json') }), SecurityClassification.MalformedPolicy));
const { protectedPathPrefixes: _removedProtectedFloor, ...policyWithoutFloor } = DEFAULT_SECURITY_POLICY;
checks.push(assertBlocked('SPF3 runSecurityGate omitted protectedPathPrefixes still blocks floor via defaults', runSecurityGate({ policy: policyWithoutFloor, command: commandForTarget('package.json') }), SecurityClassification.UnsafeCommandTarget));
checks.push(assertBlocked('SPF3 direct evaluator cannot remove mandatory floor with empty protectedPathPrefixes', evaluateCommandSafety(commandForTarget('packages/cli/package.json'), { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }), SecurityClassification.UnsafeCommandTarget));
checks.push(assertBlocked('PF1 unsafe command policy relaxation blocks unsafe command classification', evaluateCommandSafety({ command: 'curl', argv: ['-X', 'POST', 'https://api.example.invalid/resource'], classification: CommandSafetyClassification.NetworkExternalMutation }, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] }), SecurityClassification.DestructiveCommand));
checks.push(assertBlocked('malformed policy unknown version fails closed', runSecurityGate({ policy: { ...DEFAULT_SECURITY_POLICY, schemaVersion: 'security-policy.v999' } }), SecurityClassification.UnsupportedPolicyVersion));
checks.push(assertBlocked('malformed policy unknown field fails closed', runSecurityGate({ policy: { ...DEFAULT_SECURITY_POLICY, unsafeUnknownPolicyField: true } }), SecurityClassification.UnknownPolicyField));
checks.push(assertBlocked('malformed command carrier command array fails closed', runSecurityGate({ command: { command: ['node'], argv: [], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed argv carrier string fails closed', runSecurityGate({ command: { command: 'node', argv: '--api-key FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_MALFORMED_1234567890', classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed targetPaths carrier string fails closed', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: '../outside' } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed declaredWritePaths carrier string fails closed', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, declaredWritePaths: '../outside' } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('secret array in config fails closed and redacts', runSecurityGate({ config: { nested: ['FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_ARRAY_1234567890'] } }), SecurityClassification.SecretLikeValue));
checks.push(assertBlocked('malformed external booleans fail closed', runSecurityGate({ externalIntegrations: [{ id: 'string-booleans', mode: ExternalIntegrationMode.Disabled, enabled: 'false', requiresCredential: 'true', requiresBudget: 'true', requiresNetwork: 'true', networkMutation: 'false', explicitApproval: 'false' }] }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed sandbox provider and claim fail closed', runSecurityGate({ sandboxClaims: [{ provider: 123, status: SandboxCapabilityStatus.Unknown, claim: { overclaim: true } }] }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('pending-live sandbox claim blocks', runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.BlockedPendingLive, claim: 'Live sandbox proof unavailable.' }] }), SecurityClassification.UnsupportedSandboxClaim));

const circular = { name: 'circular-evidence' };
circular.self = circular;
checks.push(assertBlocked('circular evidence fails closed and redacts', runSecurityGate({ evidence: circular }), SecurityClassification.EvidenceSecretLeak));
checks.push(assertBlocked('BigInt evidence fails closed and redacts', runSecurityGate({ evidence: { value: 1n } }), SecurityClassification.EvidenceSecretLeak));
checks.push(assertBlocked('secret diagnostic evidence fails closed and redacts', runSecurityGate({ evidence: { diagnostics: [{ message: 'token=FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_DIAG_1234567890' }] } }), SecurityClassification.EvidenceSecretLeak));

const summary = { ok: true, total: checks.length, checks };
const serialized = JSON.stringify(summary, null, 2);
assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS'), 'summary leaked fake sentinel');
await writeFile(path.join(evidenceRoot, 'negative/spf2-spf3-prior-regression-witness-summary.json'), `${serialized}\n`);
console.log(JSON.stringify({ ok: true, total: checks.length }));
