import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const evidenceRoot = '/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/post-fix-revalidation-evidence';
const requireFromCli = createRequire('/Users/lizavasilyeva/work/vibe-engineer/packages/cli/package.json');
const requireFromSecurity = createRequire('/Users/lizavasilyeva/work/vibe-engineer/packages/security/package.json');
const resolvedFromCli = requireFromCli.resolve('@vibe-engineer/security');
const resolvedFromSecurity = requireFromSecurity.resolve('@vibe-engineer/security');
const security = await import(resolvedFromCli);

const {
  CommandSafetyClassification,
  DEFAULT_SECURITY_POLICY,
  ExternalIntegrationMode,
  SandboxCapabilityStatus,
  SecurityClassification,
  SecurityDecision,
  SecurityGateStatus,
  SecuritySeverity,
  SECURITY_POLICY_VERSION,
  createSecurityAuditEvent,
  evaluateCommandSafety,
  evaluateEnvConfigSafety,
  evaluateEvidenceSafety,
  parseSecurityPolicy,
  redactSecurityText,
  redactSecurityValue,
  runSecurityGate,
} = security;

const SENTINELS = [
  'VALIDATOR_SECRET_VALUE_1234567890',
  'VALIDATOR_SECRET_VALUE_ALT_ABCDEFGHIJ',
  'sk_live_VALIDATOR_SUPERSECRET_1234567890',
];

const results = [];

function classifications(result) {
  return Array.isArray(result?.findings) ? result.findings.map((finding) => finding.classification).sort() : [];
}

function containsSentinel(value) {
  const text = stable(value);
  return SENTINELS.some((sentinel) => text.includes(sentinel));
}

function stable(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === 'bigint') return `${entry.toString()}n`;
    if (typeof entry === 'function') return '<function>';
    if (typeof entry === 'symbol') return '<symbol>';
    if (entry && typeof entry === 'object') {
      if (seen.has(entry)) return '<circular>';
      seen.add(entry);
    }
    return entry;
  });
}

function sanitizedDetails(details) {
  const raw = stable(details);
  let sanitized = raw;
  for (const sentinel of SENTINELS) sanitized = sanitized.split(sentinel).join('<validator-secret-sentinel>');
  return JSON.parse(sanitized);
}

function record(name, ok, details = {}) {
  results.push({ name, ok, ...sanitizedDetails(details) });
}

function expectPassed(name, thunk) {
  try {
    const result = thunk();
    record(name, result.status === SecurityGateStatus.Passed && result.decision === SecurityDecision.Allow && result.blocking === false, {
      status: result.status,
      decision: result.decision,
      classifications: classifications(result),
      leakedSentinel: containsSentinel(result),
    });
  } catch (error) {
    record(name, false, { threw: true, error: String(error?.stack || error) });
  }
}

function expectAdvisory(name, thunk) {
  try {
    const result = thunk();
    record(name, result.status === SecurityGateStatus.Advisory && result.decision === SecurityDecision.AllowWithAdvisory && result.blocking === false, {
      status: result.status,
      decision: result.decision,
      classifications: classifications(result),
      leakedSentinel: containsSentinel(result),
    });
  } catch (error) {
    record(name, false, { threw: true, error: String(error?.stack || error) });
  }
}

function expectBlocked(name, expectedClassification, thunk) {
  try {
    const result = thunk();
    record(name, result.status === SecurityGateStatus.Blocked && result.decision === SecurityDecision.Block && classifications(result).includes(expectedClassification) && !containsSentinel(result), {
      status: result.status,
      decision: result.decision,
      expectedClassification,
      classifications: classifications(result),
      leakedSentinel: containsSentinel(result),
    });
  } catch (error) {
    record(name, false, { threw: true, expectedClassification, error: String(error?.stack || error) });
  }
}

function expectPolicyRejected(name, expectedClassification, policy) {
  try {
    const parsed = parseSecurityPolicy(policy);
    const gate = parsed.ok === false ? parsed.result : null;
    record(name, parsed.ok === false && gate?.status === SecurityGateStatus.Blocked && classifications(gate).includes(expectedClassification) && !containsSentinel(gate), {
      parsedOk: parsed.ok,
      status: gate?.status ?? null,
      expectedClassification,
      classifications: gate ? classifications(gate) : [],
      leakedSentinel: gate ? containsSentinel(gate) : false,
    });
  } catch (error) {
    record(name, false, { threw: true, expectedClassification, error: String(error?.stack || error) });
  }
}

function expectNoThrowBlocked(name, expectedClassification, thunk) {
  try {
    const result = thunk();
    record(name, result.status === SecurityGateStatus.Blocked && classifications(result).includes(expectedClassification) && !containsSentinel(result), {
      status: result.status,
      decision: result.decision,
      expectedClassification,
      classifications: classifications(result),
      leakedSentinel: containsSentinel(result),
    });
  } catch (error) {
    record(name, false, { threw: true, expectedClassification, error: String(error?.stack || error) });
  }
}

function parsedPolicy(policy) {
  const parsed = parseSecurityPolicy(policy);
  if (!parsed.ok) return null;
  return parsed.policy;
}

// Real boundary/import shape
record('real-boundary: CLI package resolver resolves @vibe-engineer/security public API', resolvedFromCli.endsWith('/packages/security/src/index.js'), { resolvedFromCli });
record('real-boundary: security package self resolver resolves @vibe-engineer/security public API', resolvedFromSecurity.endsWith('/packages/security/src/index.js'), { resolvedFromSecurity });
record('public exports: required API names are exported', [
  'SECURITY_POLICY_VERSION',
  'DEFAULT_SECURITY_POLICY',
  'SecurityCategory',
  'SecurityClassification',
  'SecuritySeverity',
  'SecurityDecision',
  'SecurityGateStatus',
  'CommandSafetyClassification',
  'ExternalIntegrationMode',
  'SandboxCapabilityStatus',
  'parseSecurityPolicy',
  'runSecurityGate',
  'evaluateCommandSafety',
  'evaluateEnvConfigSafety',
  'evaluateExternalIntegrationSafety',
  'evaluateSandboxCapability',
  'evaluateEvidenceSafety',
  'redactSecurityText',
  'redactSecurityValue',
  'createSecurityAuditEvent',
  'createSecurityFinding',
  'createSecurityGateResult',
  '__i18aCliBoundarySmoke',
].every((name) => Object.prototype.hasOwnProperty.call(security, name)), { exports: Object.keys(security).sort() });

// Positive cases
expectPassed('positive: local read-only command/env/config/external disabled/sandbox unknown passes with default policy', () => runSecurityGate({
  command: { command: 'node', argv: ['packages/security/fixtures/policy/witness.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/fixtures/policy/witness.mjs'] },
  env: { NODE_ENV: 'test', VIBE_ENGINEER_MODE: 'local' },
  config: { runtime: { environment: 'local', endpoint: 'http://127.0.0.1:4318' } },
  externalIntegrations: [{ id: 'disabled-local-fixture', mode: ExternalIntegrationMode.Disabled, enabled: false, requiresCredential: false, requiresBudget: false, requiresNetwork: false, networkMutation: false }],
  sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.Unknown, claim: 'No sandbox isolation claim made.' }],
}));
expectPassed('positive: dry-run external integration default passes without live credentials', () => runSecurityGate({
  externalIntegrations: [{ id: 'dry-run', mode: ExternalIntegrationMode.DryRun, enabled: false, requiresCredential: false, requiresBudget: false, requiresNetwork: false, networkMutation: false }],
}));
expectPassed('positive: read-only external integration with network read passes without credentials or mutation', () => runSecurityGate({
  externalIntegrations: [{ id: 'read-only-docs', mode: ExternalIntegrationMode.ReadOnly, enabled: false, requiresCredential: false, requiresBudget: false, requiresNetwork: true, networkMutation: false }],
}));
expectAdvisory('positive: advisory note is non-blocking advisory, not green pass', () => runSecurityGate({
  notes: [{ id: 'note', classification: SecurityClassification.AdvisoryNotice, severity: SecuritySeverity.Advisory, message: 'Advisory-only note.' }],
}));

// Required negative command/path/secret/destructive cases and original F1/F2 closure.
for (const [name, targetPath] of [
  ['negative: POSIX absolute path escape blocks', '/tmp/outside'],
  ['negative: protected root target blocks', '/'],
  ['negative: parent traversal target blocks', '../outside'],
  ['negative: terminal traversal safe/.. blocks', 'safe/..'],
  ['negative: nested traversal segment blocks', 'safe/../outside'],
  ['negative: Windows drive absolute path blocks', 'C:\\Users\\outside'],
  ['negative: UNC absolute path blocks', '\\\\server\\share'],
  ['negative: tilde home target blocks', '~/outside'],
  ['negative: protected .git target blocks', '.git/config'],
  ['negative: protected package manifest target blocks', 'package.json'],
  ['negative: protected CLI entry target blocks', 'packages/cli/src/entry/vibe-engineer.js'],
]) {
  expectBlocked(name, SecurityClassification.UnsafeCommandTarget, () => runSecurityGate({
    command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: [targetPath] },
  }));
}
expectBlocked('negative: secret-like CLI argument blocks and redacts', SecurityClassification.SecretLikeValue, () => runSecurityGate({
  command: { command: 'node', argv: ['--api-key', SENTINELS[0]], classification: CommandSafetyClassification.ReadOnly },
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
for (const [name, commandInput] of [
  ['negative: malformed command missing command blocks', { argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly }],
  ['negative: malformed empty command blocks', { command: '   ', argv: [], classification: CommandSafetyClassification.ReadOnly }],
  ['negative: malformed argv string blocks', { command: 'node', argv: `--api-key ${SENTINELS[0]}`, classification: CommandSafetyClassification.ReadOnly }],
  ['negative: malformed argv non-string array blocks', { command: 'node', argv: ['safe.mjs', 7], classification: CommandSafetyClassification.ReadOnly }],
  ['negative: malformed targetPaths string blocks', { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: '../outside' }],
  ['negative: malformed declaredWritePaths string blocks', { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, declaredWritePaths: 'package.json' }],
  ['negative: malformed workingDirectory type blocks', { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, workingDirectory: 123 }],
  ['negative: unknown command field blocks', { command: 'node', argv: [], classification: CommandSafetyClassification.ReadOnly, unexpected: true }],
  ['negative: unknown command classification blocks', { command: 'node', argv: [], classification: 'invented_safe' }],
]) {
  expectBlocked(name, SecurityClassification.UnknownRequestField, () => runSecurityGate({ command: commandInput }));
}

// Required env/config/production/evidence/redaction cases and original F5/F6 closure.
expectBlocked('negative: secret-like env var blocks and redacts', SecurityClassification.SecretLikeValue, () => runSecurityGate({ env: { API_TOKEN: SENTINELS[0] } }));
expectBlocked('negative: secret-like nested config value blocks and redacts', SecurityClassification.SecretLikeValue, () => runSecurityGate({ config: { service: { clientSecret: SENTINELS[1] } } }));
expectBlocked('negative: secret inside config array blocks and redacts', SecurityClassification.SecretLikeValue, () => runSecurityGate({ config: { nested: ['safe', SENTINELS[1]] } }));
expectBlocked('negative: production env default blocks', SecurityClassification.ProductionCredentialOrDefault, () => runSecurityGate({ env: { NODE_ENV: 'production' } }));
expectBlocked('negative: production credential URL blocks and redacts', SecurityClassification.SecretLikeValue, () => runSecurityGate({ config: { DATABASE_URL: `postgres://user:${SENTINELS[0]}@prod.invalid.example/app` } }));
expectBlocked('negative: external integration enabled by config default blocks', SecurityClassification.UnsafeEnvDefault, () => runSecurityGate({ config: { externalIntegrationEnabled: true } }));
expectNoThrowBlocked('negative: circular env/config blocks without throwing', SecurityClassification.UnsafeConfigDefault, () => {
  const config = { safe: 'local' };
  config.self = config;
  return evaluateEnvConfigSafety({ config });
});
expectNoThrowBlocked('negative: BigInt env/config blocks without throwing', SecurityClassification.UnsafeConfigDefault, () => evaluateEnvConfigSafety({ config: { counter: 1n } }));
expectNoThrowBlocked('negative: large env/config array blocks with cap', SecurityClassification.UnsafeConfigDefault, () => evaluateEnvConfigSafety({ config: { values: Array.from({ length: 250 }, (_, index) => `value-${index}`) } }));
expectNoThrowBlocked('negative: circular evidence fails closed without throwing', SecurityClassification.EvidenceSecretLeak, () => {
  const circular = { token: SENTINELS[0] };
  circular.self = circular;
  return evaluateEvidenceSafety(circular);
});
expectNoThrowBlocked('negative: BigInt evidence fails closed without throwing', SecurityClassification.EvidenceSecretLeak, () => evaluateEvidenceSafety({ token: SENTINELS[0], counter: 1n }));
expectNoThrowBlocked('negative: symbol/function/undefined evidence fails closed without throwing', SecurityClassification.EvidenceSecretLeak, () => evaluateEvidenceSafety({ token: SENTINELS[0], fn: () => null, sym: Symbol('x'), missing: undefined }));
expectNoThrowBlocked('negative: large evidence array fails closed with cap', SecurityClassification.EvidenceSecretLeak, () => evaluateEvidenceSafety(Array.from({ length: 250 }, (_, index) => `value-${index}`)));
expectNoThrowBlocked('negative: large evidence string fails closed with cap', SecurityClassification.EvidenceSecretLeak, () => evaluateEvidenceSafety({ message: `token=${SENTINELS[0]}`, body: 'x'.repeat(20_000) }));

// Required policy contract and unsafe-policy cases.
expectPolicyRejected('negative: malformed policy non-object rejects', SecurityClassification.MalformedPolicy, 'not-an-object');
expectPolicyRejected('negative: invalid policy missing schemaVersion rejects', SecurityClassification.MalformedPolicy, { defaultDecision: SecurityDecision.Block });
expectPolicyRejected('negative: unknown policy version rejects', SecurityClassification.UnsupportedPolicyVersion, { schemaVersion: 'security-policy.v999', defaultDecision: SecurityDecision.Block });
expectPolicyRejected('negative: unknown policy field rejects', SecurityClassification.UnknownPolicyField, { schemaVersion: SECURITY_POLICY_VERSION, defaultDecision: SecurityDecision.Block, unsupported: true });
expectPolicyRejected('negative: unsafe policy default allow rejects', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, defaultDecision: SecurityDecision.Allow });
expectPolicyRejected('negative: policy allowProductionCredentials true rejects', SecurityClassification.ProductionCredentialOrDefault, { ...DEFAULT_SECURITY_POLICY, allowProductionCredentials: true });
expectPolicyRejected('negative: unknown command classification in policy rejects', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, 'invented_super_safe'] });
expectPolicyRejected('negative: fake sandbox status in policy rejects', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedSandboxCapabilityStatuses: [SandboxCapabilityStatus.Unknown, 'docker_isolated'] });
expectPolicyRejected('negative: pending-live sandbox status cannot be policy-green', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedSandboxCapabilityStatuses: [SandboxCapabilityStatus.Unknown, SandboxCapabilityStatus.BlockedPendingLive] });
expectPolicyRejected('negative: unsafe external enabled mode in policy rejects', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedExternalIntegrationModes: [ExternalIntegrationMode.Disabled, ExternalIntegrationMode.Enabled] });
expectPolicyRejected('negative: unsafe command mutation classification policy rejects', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] });
expectPolicyRejected('negative: unsafe command credential classification policy rejects', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.CredentialOperation] });
expectPolicyRejected('negative: unsafe command unknown classification policy rejects', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.Unknown] });
expectPolicyRejected('negative: unsafe policy may not remove required protected paths', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] });

// Defense in depth: even if an unsafe policy object parses, the gate must not allow unsafe actions.
const unsafeCommandPolicy = parsedPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] });
if (unsafeCommandPolicy) {
  expectBlocked('negative: external mutating command remains blocked even under unsafe custom command policy', SecurityClassification.DestructiveCommand, () => evaluateCommandSafety({
    command: 'curl',
    argv: ['-X', 'POST', 'https://api.example.invalid/resource'],
    classification: CommandSafetyClassification.NetworkExternalMutation,
  }, unsafeCommandPolicy));
} else {
  record('negative: external mutating command remains blocked even under unsafe custom command policy', true, { skippedBecausePolicyRejected: true });
}
const unsafePathPolicy = parsedPolicy({ ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] });
if (unsafePathPolicy) {
  expectBlocked('negative: protected package manifest target remains blocked even under unsafe path policy', SecurityClassification.UnsafeCommandTarget, () => evaluateCommandSafety({
    command: 'node',
    argv: ['safe.mjs'],
    classification: CommandSafetyClassification.ReadOnly,
    targetPaths: ['package.json'],
  }, unsafePathPolicy));
} else {
  record('negative: protected package manifest target remains blocked even under unsafe path policy', true, { skippedBecausePolicyRejected: true });
}

// External integration malformed/unsafe cases.
expectBlocked('negative: live external credential/budget/network without approval blocks', SecurityClassification.UnsafeExternalIntegration, () => runSecurityGate({
  externalIntegrations: [{ id: 'live-provider', mode: ExternalIntegrationMode.Enabled, enabled: true, requiresCredential: true, requiresBudget: true, requiresNetwork: true, networkMutation: true, explicitApproval: false }],
}));
expectBlocked('negative: external integration input must be array', SecurityClassification.UnsafeExternalIntegration, () => runSecurityGate({ externalIntegrations: { id: 'x' } }));
expectBlocked('negative: external integration entry must be object', SecurityClassification.UnsafeExternalIntegration, () => runSecurityGate({ externalIntegrations: ['x'] }));
expectBlocked('negative: malformed external boolean strings fail closed', SecurityClassification.UnknownRequestField, () => runSecurityGate({
  externalIntegrations: [{ id: 'string-booleans', mode: ExternalIntegrationMode.Disabled, enabled: 'false', requiresCredential: 'true', requiresBudget: 'true', requiresNetwork: 'true', networkMutation: 'false', explicitApproval: 'false' }],
}));
expectBlocked('negative: external integration unknown field blocks', SecurityClassification.UnknownRequestField, () => runSecurityGate({ externalIntegrations: [{ id: 'x', mode: ExternalIntegrationMode.Disabled, unexpected: true }] }));

// Sandbox capability status semantics.
expectPassed('positive: sandbox unknown/no-claim passes honestly without overclaiming isolation', () => runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.Unknown, claim: 'No isolation claim made.' }] }));
expectBlocked('negative: fake sandbox claim blocks', SecurityClassification.UnsupportedSandboxClaim, () => runSecurityGate({ sandboxClaims: [{ provider: 'fake', status: 'docker_isolated', claim: 'full filesystem and network isolation' }] }));
expectBlocked('negative: blocked/pending-live sandbox status blocks', SecurityClassification.UnsupportedSandboxClaim, () => runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.BlockedPendingLive, claim: 'Live sandbox proof unavailable.' }] }));
expectBlocked('negative: malformed sandbox provider/claim types fail closed', SecurityClassification.UnknownRequestField, () => runSecurityGate({ sandboxClaims: [{ provider: 123, status: SandboxCapabilityStatus.Unknown, claim: { overclaim: true } }] }));

// Redaction/audit carriers.
const redactionPayload = {
  stdout: `token=${SENTINELS[0]}`,
  resultFiles: [{ path: 'result.json', content: `password=${SENTINELS[1]}` }],
  evidenceRefs: [{ authorization: `Bearer ${SENTINELS[2]}` }],
  diagnostics: [{ message: `client_secret=${SENTINELS[1]}` }],
  errors: [{ details: { apiKey: SENTINELS[0] } }],
  logs: [`credential=${SENTINELS[1]}`],
};
const redactedText = redactSecurityText(`token=${SENTINELS[0]} bearer Bearer ${SENTINELS[2]}`);
const redactedValue = redactSecurityValue(redactionPayload);
const evidenceResult = evaluateEvidenceSafety(redactionPayload);
const auditEvent = createSecurityAuditEvent('post-fix-validator', redactionPayload);
record('redaction: stdout/result/evidence/diagnostics/errors/logs sentinels removed', !containsSentinel({ redactedText, redactedValue, evidenceResult, auditEvent }) && String(redactedText).includes('<redacted'), {
  redactedText,
  evidenceStatus: evidenceResult.status,
  auditEventId: auditEvent.eventId,
  leakedSentinel: containsSentinel({ redactedText, redactedValue, evidenceResult, auditEvent }),
});
record('audit: circular and BigInt audit payload redacts without throwing', (() => {
  try {
    const circular = { token: SENTINELS[0], counter: 1n };
    circular.self = circular;
    const audit = createSecurityAuditEvent('post-fix-validator-circular', circular);
    return !containsSentinel(audit) && typeof audit.eventId === 'string' && audit.recordedAt === 'deterministic-clock-not-used';
  } catch (_error) {
    return false;
  }
})(), {});

const failures = results.filter((entry) => !entry.ok);
const summary = {
  ok: failures.length === 0,
  resolvedFromCli,
  resolvedFromSecurity,
  total: results.length,
  failureCount: failures.length,
  failures,
  results,
};
writeFileSync(`${evidenceRoot}/negative/post-fix-adversarial-witness-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ ok: summary.ok, total: summary.total, failureCount: failures.length, failures: failures.map((entry) => entry.name) }, null, 2));
if (failures.length > 0) process.exitCode = 1;
