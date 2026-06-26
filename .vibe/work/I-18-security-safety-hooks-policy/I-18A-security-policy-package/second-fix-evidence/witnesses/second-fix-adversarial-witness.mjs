import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const evidenceRoot = '/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/second-fix-evidence/witnesses';
const requireFromCli = createRequire('/Users/lizavasilyeva/work/vibe-engineer/packages/cli/package.json');
const resolvedFromCli = requireFromCli.resolve('@vibe-engineer/security');
const security = await import(resolvedFromCli);

const {
  CommandSafetyClassification,
  DEFAULT_SECURITY_POLICY,
  ExternalIntegrationMode,
  SandboxCapabilityStatus,
  SecurityClassification,
  SecurityDecision,
  SecurityGateStatus,
  evaluateCommandSafety,
  parseSecurityPolicy,
  runSecurityGate,
} = security;

const results = [];
function classifications(result) {
  return Array.isArray(result?.findings) ? result.findings.map((finding) => finding.classification).sort() : [];
}
function record(name, ok, details = {}) {
  results.push({ name, ok, ...details });
}
function expectPassed(name, result) {
  record(name, result.status === SecurityGateStatus.Passed && result.decision === SecurityDecision.Allow && result.blocking === false, {
    status: result.status,
    decision: result.decision,
    classifications: classifications(result),
  });
}
function expectBlocked(name, expectedClassification, result) {
  record(name, result.status === SecurityGateStatus.Blocked && result.decision === SecurityDecision.Block && classifications(result).includes(expectedClassification), {
    status: result.status,
    decision: result.decision,
    expectedClassification,
    classifications: classifications(result),
  });
}
function expectPolicyRejected(name, expectedClassification, policy) {
  const parsed = parseSecurityPolicy(policy);
  const gate = parsed.ok === false ? parsed.result : null;
  record(name, parsed.ok === false && gate?.status === SecurityGateStatus.Blocked && classifications(gate).includes(expectedClassification), {
    parsedOk: parsed.ok,
    status: gate?.status ?? null,
    expectedClassification,
    classifications: gate ? classifications(gate) : [],
  });
}

record('real-boundary: CLI package resolver resolves public API', resolvedFromCli.endsWith('/packages/security/src/index.js'), { resolvedFromCli });
expectPassed('positive: safe read-only command remains allowed', runSecurityGate({
  command: { command: 'node', argv: ['packages/security/fixtures/policy/witness.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/fixtures/policy/witness.mjs'] },
  externalIntegrations: [{ id: 'dry-run', mode: ExternalIntegrationMode.DryRun, enabled: false, requiresCredential: false, requiresBudget: false, requiresNetwork: false, networkMutation: false }],
  sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.Unknown, claim: 'No isolation claim made.' }],
}));

expectPolicyRejected('PF1: network external mutation policy relaxation rejected', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] });
expectPolicyRejected('PF1: credential operation policy relaxation rejected', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.CredentialOperation] });
expectPolicyRejected('PF1: unknown command policy relaxation rejected', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.Unknown] });
expectBlocked('PF1: direct unsafe command policy object still blocks external mutation', SecurityClassification.DestructiveCommand, evaluateCommandSafety({
  command: 'curl',
  argv: ['-X', 'POST', 'https://api.example.invalid/resource'],
  classification: CommandSafetyClassification.NetworkExternalMutation,
}, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] }));

expectPolicyRejected('PF2: protected path mandatory floor cannot be removed', SecurityClassification.MalformedPolicy, { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] });
expectBlocked('PF2: direct unsafe path policy object still blocks package manifest target', SecurityClassification.UnsafeCommandTarget, evaluateCommandSafety({
  command: 'node',
  argv: ['safe.mjs'],
  classification: CommandSafetyClassification.ReadOnly,
  targetPaths: ['package.json'],
}, { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }));

expectBlocked('PF3: malformed external boolean strings fail closed', SecurityClassification.UnknownRequestField, runSecurityGate({
  externalIntegrations: [{ id: 'string-booleans', mode: ExternalIntegrationMode.Disabled, enabled: 'false', requiresCredential: 'true', requiresBudget: 'true', requiresNetwork: 'true', networkMutation: 'false', explicitApproval: 'false' }],
}));
expectBlocked('PF3: malformed external id/mode types fail closed', SecurityClassification.UnknownRequestField, runSecurityGate({
  externalIntegrations: [{ id: 123, mode: 456, enabled: false }],
}));

expectBlocked('PF4: malformed sandbox provider/claim types fail closed', SecurityClassification.UnknownRequestField, runSecurityGate({
  sandboxClaims: [{ provider: 123, status: SandboxCapabilityStatus.Unknown, claim: { overclaim: true } }],
}));
expectBlocked('PF4: empty sandbox status fails closed', SecurityClassification.UnknownRequestField, runSecurityGate({
  sandboxClaims: [{ provider: 'pi', status: '', claim: 'No isolation claim made.' }],
}));

const failures = results.filter((entry) => !entry.ok);
const summary = { ok: failures.length === 0, total: results.length, failureCount: failures.length, failures, results };
writeFileSync(`${evidenceRoot}/second-fix-adversarial-witness-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ ok: summary.ok, total: summary.total, failureCount: summary.failureCount, failures: failures.map((entry) => entry.name) }, null, 2));
if (failures.length > 0) process.exitCode = 1;
