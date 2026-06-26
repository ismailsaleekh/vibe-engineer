import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const evidenceRoot = '/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/validation-evidence/negative';
const requireFromCli = createRequire('/Users/lizavasilyeva/work/vibe-engineer/packages/cli/package.json');
const resolvedFromCli = requireFromCli.resolve('@vibe-engineer/security');
const security = await import(resolvedFromCli);

const {
  CommandSafetyClassification,
  ExternalIntegrationMode,
  SandboxCapabilityStatus,
  SecurityClassification,
  SecurityDecision,
  SecurityGateStatus,
  SecuritySeverity,
  DEFAULT_SECURITY_POLICY,
  SECURITY_POLICY_VERSION,
  createSecurityAuditEvent,
  evaluateCommandSafety,
  evaluateEvidenceSafety,
  parseSecurityPolicy,
  redactSecurityValue,
  runSecurityGate,
} = security;

const results = [];
function stable(value) {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === 'bigint') return `${entry.toString()}n`;
    return entry;
  });
}
function classifications(result) {
  return Array.isArray(result?.findings) ? result.findings.map((finding) => finding.classification).sort() : [];
}
function record(name, ok, details = {}) {
  results.push({ name, ok, ...details });
}
function expectPassed(name, thunk) {
  try {
    const result = thunk();
    record(name, result.status === SecurityGateStatus.Passed && result.decision === SecurityDecision.Allow, {
      status: result.status,
      decision: result.decision,
      classifications: classifications(result),
    });
  } catch (error) {
    record(name, false, { threw: true, error: String(error?.stack || error) });
  }
}
function expectBlocked(name, expectedClassification, thunk) {
  try {
    const result = thunk();
    record(name, result.status === SecurityGateStatus.Blocked && classifications(result).includes(expectedClassification), {
      status: result.status,
      decision: result.decision,
      expectedClassification,
      classifications: classifications(result),
      serialized: stable(result).slice(0, 1000),
    });
  } catch (error) {
    record(name, false, { threw: true, expectedClassification, error: String(error?.stack || error) });
  }
}
function expectPolicyRejected(name, expectedClassification, policy) {
  try {
    const parsed = parseSecurityPolicy(policy);
    const gate = parsed.ok === false ? parsed.result : null;
    record(name, parsed.ok === false && gate.status === SecurityGateStatus.Blocked && classifications(gate).includes(expectedClassification), {
      parsedOk: parsed.ok,
      status: gate?.status ?? null,
      expectedClassification,
      classifications: gate ? classifications(gate) : [],
      policy,
    });
  } catch (error) {
    record(name, false, { threw: true, expectedClassification, error: String(error?.stack || error), policy });
  }
}
function expectNoThrowBlocked(name, expectedClassification, thunk) {
  try {
    const result = thunk();
    record(name, result.status === SecurityGateStatus.Blocked && classifications(result).includes(expectedClassification), {
      status: result.status,
      decision: result.decision,
      expectedClassification,
      classifications: classifications(result),
    });
  } catch (error) {
    record(name, false, { threw: true, expectedClassification, error: String(error?.stack || error) });
  }
}

expectPassed('positive: local read-only command/env/external dry-run passes', () => runSecurityGate({
  command: { command: 'node', argv: ['packages/security/fixtures/policy/witness.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/fixtures/policy/witness.mjs'] },
  env: { NODE_ENV: 'test', VIBE_ENGINEER_MODE: 'local' },
  externalIntegrations: [{ id: 'local-fixture', mode: ExternalIntegrationMode.LocalFixture, enabled: false, requiresCredential: false }],
  sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.Unknown, claim: 'No isolation claim made.' }],
}));
expectPassed('positive: read-only external integration without live credential passes', () => runSecurityGate({
  externalIntegrations: [{ id: 'readonly-doc-fetch', mode: ExternalIntegrationMode.ReadOnly, enabled: false, requiresNetwork: true, requiresCredential: false, requiresBudget: false, networkMutation: false }],
}));

expectBlocked('negative: POSIX absolute path escape blocks', SecurityClassification.UnsafeCommandTarget, () => runSecurityGate({
  command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['/tmp/outside'] },
}));
expectBlocked('negative: parent traversal target blocks', SecurityClassification.UnsafeCommandTarget, () => runSecurityGate({
  command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['../outside'] },
}));
expectBlocked('negative: terminal traversal segment safe/.. blocks', SecurityClassification.UnsafeCommandTarget, () => runSecurityGate({
  command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['safe/..'] },
}));
expectBlocked('negative: Windows drive absolute path blocks', SecurityClassification.UnsafeCommandTarget, () => runSecurityGate({
  command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['C:\\Users\\outside'] },
}));

expectBlocked('negative: secret-like CLI argument blocks and redacts', SecurityClassification.SecretLikeValue, () => runSecurityGate({
  command: { command: 'node', argv: ['--api-key', 'VALIDATOR_SECRET_VALUE_1234567890'], classification: CommandSafetyClassification.ReadOnly },
}));
expectBlocked('negative: production credential/default classified', SecurityClassification.ProductionCredentialOrDefault, () => runSecurityGate({
  config: { DATABASE_URL: 'postgres://user:VALIDATOR_SECRET_VALUE_1234567890@prod.invalid.example/app' },
}));
for (const [name, command, argv, classification] of [
  ['negative: rm -rf destructive blocks', 'rm', ['-rf', '/'], CommandSafetyClassification.DestructiveLocalOperation],
  ['negative: force push destructive blocks', 'git', ['push', '--force', 'origin', 'main'], CommandSafetyClassification.RepositoryStateOperation],
  ['negative: deploy/apply destructive blocks', 'pulumi', ['apply'], CommandSafetyClassification.ProductionImpactingOperation],
  ['negative: publish destructive blocks', 'pnpm', ['publish'], CommandSafetyClassification.ProductionImpactingOperation],
  ['negative: DB destructive blocks', 'psql', ['-c', 'DROP DATABASE app'], CommandSafetyClassification.ProductionImpactingOperation],
]) {
  expectBlocked(name, SecurityClassification.DestructiveCommand, () => runSecurityGate({ command: { command, argv, classification } }));
}
expectBlocked('negative: live external credential/budget/network without approval blocks', SecurityClassification.UnsafeExternalIntegration, () => runSecurityGate({
  externalIntegrations: [{ id: 'live-provider', mode: ExternalIntegrationMode.Enabled, enabled: true, requiresCredential: true, requiresBudget: true, requiresNetwork: true, networkMutation: true, explicitApproval: false }],
}));
expectPolicyRejected('negative: unknown policy version rejects', SecurityClassification.UnsupportedPolicyVersion, { schemaVersion: 'security-policy.v999', defaultDecision: SecurityDecision.Block });
expectPolicyRejected('negative: unknown top-level policy field rejects', SecurityClassification.UnknownPolicyField, { schemaVersion: SECURITY_POLICY_VERSION, defaultDecision: SecurityDecision.Block, unsupported: true });
expectPolicyRejected('negative: unknown command classification value in policy rejects typed contract', SecurityClassification.MalformedPolicy, {
  ...DEFAULT_SECURITY_POLICY,
  allowedCommandClassifications: ['read_only', 'invented_super_safe'],
});
expectPolicyRejected('negative: fake sandbox status in policy rejects typed contract', SecurityClassification.MalformedPolicy, {
  ...DEFAULT_SECURITY_POLICY,
  allowedSandboxCapabilityStatuses: ['unknown', 'docker_isolated'],
});
expectBlocked('negative: fake sandbox claim blocks with default policy', SecurityClassification.UnsupportedSandboxClaim, () => runSecurityGate({
  sandboxClaims: [{ provider: 'fake', status: 'docker_isolated', claim: 'full filesystem and network isolation' }],
}));
expectBlocked('negative: blocked/pending-live sandbox status is not green', SecurityClassification.UnsupportedSandboxClaim, () => runSecurityGate({
  sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.BlockedPendingLive, claim: 'Live sandbox proof unavailable.' }],
}));
expectBlocked('negative: malformed command missing command field blocks', SecurityClassification.UnknownRequestField, () => runSecurityGate({
  command: { argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly },
}));
expectBlocked('negative: malformed argv string blocks instead of being ignored', SecurityClassification.UnknownRequestField, () => runSecurityGate({
  command: { command: 'node', argv: '--api-key VALIDATOR_SECRET_VALUE_1234567890', classification: CommandSafetyClassification.ReadOnly },
}));
expectBlocked('negative: malformed targetPaths string blocks instead of being ignored', SecurityClassification.UnknownRequestField, () => runSecurityGate({
  command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: '../outside' },
}));
expectBlocked('negative: config array secret is scanned and blocked', SecurityClassification.SecretLikeValue, () => runSecurityGate({
  config: { nested: ['VALIDATOR_SECRET_VALUE_1234567890'] },
}));
expectNoThrowBlocked('negative: circular evidence fails closed without throwing', SecurityClassification.EvidenceSecretLeak, () => {
  const circular = { token: 'VALIDATOR_SECRET_VALUE_1234567890' };
  circular.self = circular;
  return evaluateEvidenceSafety(circular);
});
expectNoThrowBlocked('negative: BigInt evidence fails closed without throwing', SecurityClassification.EvidenceSecretLeak, () => evaluateEvidenceSafety({ token: 'VALIDATOR_SECRET_VALUE_1234567890', counter: 1n }));

const redacted = redactSecurityValue({ stdout: 'token=VALIDATOR_SECRET_VALUE_1234567890', nested: { apiKey: 'VALIDATOR_SECRET_VALUE_1234567890' } });
record('redaction: sentinel removed from structured value', !stable(redacted).includes('VALIDATOR_SECRET_VALUE_1234567890'), { redacted });
const audit = createSecurityAuditEvent('validator', { apiKey: 'VALIDATOR_SECRET_VALUE_1234567890' });
record('audit: event details redacted and deterministic carrier present', !stable(audit).includes('VALIDATOR_SECRET_VALUE_1234567890') && typeof audit.eventId === 'string' && audit.recordedAt === 'deterministic-clock-not-used', { audit });

const failures = results.filter((entry) => !entry.ok);
const summary = { ok: failures.length === 0, resolvedFromCli, total: results.length, failures, results };
writeFileSync(`${evidenceRoot}/adversarial-security-witness-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ ok: summary.ok, resolvedFromCli, total: summary.total, failureCount: failures.length, failures: failures.map((entry) => entry.name) }, null, 2));
if (failures.length > 0) process.exitCode = 1;
