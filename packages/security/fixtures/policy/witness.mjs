import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  CommandSafetyClassification,
  DEFAULT_SECURITY_POLICY,
  ExternalIntegrationMode,
  SandboxCapabilityStatus,
  SecurityClassification,
  SecurityDecision,
  SecurityGateStatus,
  SecuritySeverity,
  evaluateCommandSafety,
  runSecurityGate,
} from '@vibe-engineer/security';

const evidenceDir = new URL('../../../../.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/evidence/positive/', import.meta.url);
const negativeDir = new URL('../../../../.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/evidence/negative/', import.meta.url);
await mkdir(evidenceDir, { recursive: true });
await mkdir(negativeDir, { recursive: true });

function classifications(result) {
  return result.findings.map((finding) => finding.classification).sort();
}

function assertPassed(name, result) {
  assert.equal(result.status, SecurityGateStatus.Passed, `${name} should pass`);
  assert.equal(result.decision, SecurityDecision.Allow, `${name} should allow`);
  assert.deepEqual(result.findings, [], `${name} should not produce findings`);
}

function assertBlocked(name, result, expected) {
  assert.equal(result.status, SecurityGateStatus.Blocked, `${name} should block`);
  assert.equal(result.decision, SecurityDecision.Block, `${name} should block decision`);
  assert.ok(classifications(result).includes(expected), `${name} should include ${expected}; got ${classifications(result).join(',')}`);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS'), `${name} leaked sentinel token`);
  assert.ok(!serialized.includes('FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS'), `${name} leaked sentinel secret`);
}

const allowedLocal = runSecurityGate({
  command: { command: 'node', argv: ['packages/security/fixtures/policy/witness.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/fixtures/policy/witness.mjs'] },
  env: { NODE_ENV: 'test', VIBE_ENGINEER_MODE: 'local' },
  config: { runtime: { environment: 'local', endpoint: 'http://127.0.0.1:4318' } },
  externalIntegrations: [{ id: 'model-provider-placeholder', mode: ExternalIntegrationMode.Disabled, enabled: false, requiresCredential: false }],
  sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.Unknown, claim: 'No isolation claim made.' }],
});
assertPassed('allowed local/read-only deterministic command/config/env/default external disabled', allowedLocal);

const externalDryRun = runSecurityGate({
  externalIntegrations: [{ id: 'package-registry-preview', mode: ExternalIntegrationMode.DryRun, enabled: false, requiresCredential: false, requiresNetwork: false }],
});
assertPassed('external dry-run default', externalDryRun);

const advisory = runSecurityGate({ notes: [{ id: 'note-1', classification: SecurityClassification.AdvisoryNotice, severity: SecuritySeverity.Advisory, message: 'Advisory-only note.' }] });
assert.equal(advisory.status, SecurityGateStatus.Advisory);
assert.equal(advisory.decision, SecurityDecision.AllowWithAdvisory);
assert.equal(advisory.findings[0].blocking, false);

const negativeCases = [
  ['secret-like CLI argument', runSecurityGate({ command: { command: 'node', argv: ['--api-key', 'FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_CLI_1234567890'], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue],
  ['secret-like CLI data embedded in command string', runSecurityGate({ command: { command: 'node --api-key FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_COMMAND_1234567890', argv: [], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue],
  ['embedded secret flag in command string without value', runSecurityGate({ command: { command: 'node --api-key', argv: [], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue],
  ['split secret flag value across command and argv', runSecurityGate({ command: { command: 'node --api-key', argv: ['abc123'], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue],
  ['split client secret flag value across command and argv', runSecurityGate({ command: { command: 'node --client-secret', argv: ['abc123'], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue],
  ['quoted embedded secret flag in command string without value', runSecurityGate({ command: { command: 'node "--api-key"', argv: [], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue],
  ['quoted split secret flag value across command and argv', runSecurityGate({ command: { command: "node '--client-secret'", argv: ['abc123'], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue],
  ['malformed unterminated quoted secret flag in command string', runSecurityGate({ command: { command: 'node "--token', argv: [], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue],
  ['secret-like env var', runSecurityGate({ env: { API_TOKEN: 'FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_12345' } }), SecurityClassification.SecretLikeValue],
  ['secret-like config value', runSecurityGate({ config: { service: { clientSecret: 'FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_ABCDE' } } }), SecurityClassification.SecretLikeValue],
  ['secret-like evidence field', runSecurityGate({ evidence: { evidenceRefs: [{ token: 'FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_EVIDENCE_abcdef123456' }] } }), SecurityClassification.EvidenceSecretLeak],
  ['secret-like diagnostic detail', runSecurityGate({ evidence: { diagnostics: [{ message: 'token=FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_DIAG_123456' }] } }), SecurityClassification.EvidenceSecretLeak],
  ['production credential/default', runSecurityGate({ config: { DATABASE_URL: 'postgres://user:FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS@prod.invalid.example/app' } }), SecurityClassification.SecretLikeValue],
  ['rm rf destructive', runSecurityGate({ command: { command: 'rm', argv: ['-rf', '/'], classification: CommandSafetyClassification.DestructiveLocalOperation, targetPaths: ['/'] } }), SecurityClassification.DestructiveCommand],
  ['force push destructive', runSecurityGate({ command: { command: 'git', argv: ['push', '--force', 'origin', 'main'], classification: CommandSafetyClassification.RepositoryStateOperation } }), SecurityClassification.DestructiveCommand],
  ['deploy primitive destructive', runSecurityGate({ command: { command: 'pulumi', argv: ['apply'], classification: CommandSafetyClassification.ProductionImpactingOperation } }), SecurityClassification.DestructiveCommand],
  ['publish primitive destructive', runSecurityGate({ command: { command: 'npm', argv: ['publish'], classification: CommandSafetyClassification.ProductionImpactingOperation } }), SecurityClassification.DestructiveCommand],
  ['db destructive operation', runSecurityGate({ command: { command: 'psql', argv: ['-c', 'DROP DATABASE app'], classification: CommandSafetyClassification.ProductionImpactingOperation } }), SecurityClassification.DestructiveCommand],
  ['protected root target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['/'] } }), SecurityClassification.UnsafeCommandTarget],
  ['path escape target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['../outside'] } }), SecurityClassification.UnsafeCommandTarget],
  ['terminal traversal segment target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['safe/..'] } }), SecurityClassification.UnsafeCommandTarget],
  ['windows drive absolute target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['C:\\Users\\outside'] } }), SecurityClassification.UnsafeCommandTarget],
  ['windows drive relative target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['C:outside'] } }), SecurityClassification.UnsafeCommandTarget],
  ['windows drive traversal target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['C:../outside'] } }), SecurityClassification.UnsafeCommandTarget],
  ['windows drive slash absolute target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['C:/Users/outside'] } }), SecurityClassification.UnsafeCommandTarget],
  ['UNC network slash target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['//server/share'] } }), SecurityClassification.UnsafeCommandTarget],
  ['UNC network backslash target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['\\\\server\\share'] } }), SecurityClassification.UnsafeCommandTarget],
  ['tilde home target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['~/secret'] } }), SecurityClassification.UnsafeCommandTarget],
  ['tilde user target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['~user/.ssh/config'] } }), SecurityClassification.UnsafeCommandTarget],
  ['dot-slash package manifest alias target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['./package.json'] } }), SecurityClassification.UnsafeCommandTarget],
  ['dot-slash git alias target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['./.git/config'] } }), SecurityClassification.UnsafeCommandTarget],
  ['protected package manifest target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['package.json'] } }), SecurityClassification.UnsafeCommandTarget],
  ['protected workspace manifest target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['pnpm-workspace.yaml'] } }), SecurityClassification.UnsafeCommandTarget],
  ['protected turbo config target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['turbo.json'] } }), SecurityClassification.UnsafeCommandTarget],
  ['protected root npm config target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['.npmrc'] } }), SecurityClassification.UnsafeCommandTarget],
  ['protected root tsconfig target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['tsconfig.base.json'] } }), SecurityClassification.UnsafeCommandTarget],
  ['protected CLI package manifest target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/cli/package.json'] } }), SecurityClassification.UnsafeCommandTarget],
  ['protected security package manifest target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/package.json'] } }), SecurityClassification.UnsafeCommandTarget],
  ['protected CLI loader target', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/cli/src/command-loader/loader.js'] } }), SecurityClassification.UnsafeCommandTarget],
  ['protected package manifest target under unsafe direct policy object', evaluateCommandSafety({ command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['package.json'] }, { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }), SecurityClassification.UnsafeCommandTarget],
  ['external mutation classification under unsafe direct policy object', evaluateCommandSafety({ command: 'curl', argv: ['-X', 'POST', 'https://api.example.invalid/resource'], classification: CommandSafetyClassification.NetworkExternalMutation }, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] }), SecurityClassification.DestructiveCommand],
  ['malformed command missing command', runSecurityGate({ command: { argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField],
  ['malformed argv string', runSecurityGate({ command: { command: 'node', argv: '--api-key FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_CLI_1234567890', classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField],
  ['malformed targetPaths string', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: '../outside' } }), SecurityClassification.UnknownRequestField],
  ['unsafe env default production', runSecurityGate({ env: { NODE_ENV: 'production' } }), SecurityClassification.ProductionCredentialOrDefault],
  ['missing confirmation external enabled default', runSecurityGate({ config: { externalIntegrationEnabled: true } }), SecurityClassification.UnsafeEnvDefault],
  ['secret inside config array', runSecurityGate({ config: { nested: ['FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_ARRAY_1234567890'] } }), SecurityClassification.SecretLikeValue],
  ['live credential/budget/network external', runSecurityGate({ externalIntegrations: [{ id: 'live-provider', mode: ExternalIntegrationMode.Enabled, enabled: true, requiresCredential: true, requiresBudget: true, requiresNetwork: true, networkMutation: true, explicitApproval: false }] }), SecurityClassification.UnsafeExternalIntegration],
  ['malformed external boolean strings', runSecurityGate({ externalIntegrations: [{ id: 'string-booleans', mode: ExternalIntegrationMode.Disabled, enabled: 'false', requiresCredential: 'true', requiresBudget: 'true', requiresNetwork: 'true', networkMutation: 'false', explicitApproval: 'false' }] }), SecurityClassification.UnknownRequestField],
  ['unsupported fake sandbox claim', runSecurityGate({ sandboxClaims: [{ provider: 'fake', status: 'docker_isolated', claim: 'full filesystem and network isolation' }] }), SecurityClassification.UnsupportedSandboxClaim],
  ['malformed sandbox provider and claim types', runSecurityGate({ sandboxClaims: [{ provider: 123, status: SandboxCapabilityStatus.Unknown, claim: { overclaim: true } }] }), SecurityClassification.UnknownRequestField],
  ['blocked pending-live sandbox claim', runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.BlockedPendingLive, claim: 'Live sandbox proof unavailable.' }] }), SecurityClassification.UnsupportedSandboxClaim],
];

const negativeSummary = [];
for (const [name, result, expected] of negativeCases) {
  assertBlocked(String(name), result, String(expected));
  negativeSummary.push({ name, status: result.status, decision: result.decision, classifications: classifications(result) });
}

const positiveSummary = {
  allowedLocal: { status: allowedLocal.status, decision: allowedLocal.decision },
  externalDryRun: { status: externalDryRun.status, decision: externalDryRun.decision },
  advisory: { status: advisory.status, decision: advisory.decision, classifications: classifications(advisory) },
};
await writeFile(new URL('policy-positive-summary.json', evidenceDir), `${JSON.stringify(positiveSummary, null, 2)}\n`);
await writeFile(new URL('policy-negative-summary.json', negativeDir), `${JSON.stringify(negativeSummary, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, positive: positiveSummary, negativeCount: negativeSummary.length }));
