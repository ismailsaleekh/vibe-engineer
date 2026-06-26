import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const requireFromCliPackage = createRequire('/Users/lizavasilyeva/work/vibe-engineer/packages/cli/package.json');
const resolvedSecurityPackageApi = requireFromCliPackage.resolve('@vibe-engineer/security');
const security = await import(pathToFileURL(resolvedSecurityPackageApi).href);
const {
  CommandSafetyClassification,
  DEFAULT_SECURITY_POLICY,
  ExternalIntegrationMode,
  SandboxCapabilityStatus,
  SecurityClassification,
  SecurityDecision,
  SecurityGateStatus,
  SecuritySeverity,
  createSecurityAuditEvent,
  evaluateCommandSafety,
  evaluateEvidenceSafety,
  parseSecurityPolicy,
  redactSecurityText,
  redactSecurityValue,
  runSecurityGate,
} = security;

const evidenceRoot = new URL('../', import.meta.url);
const summaryUrl = new URL('second-post-fix-adversarial-witness-summary.json', import.meta.url);

const FAKE_SECRET = 'FAKE_SECRET_VALUE_FOR_SECOND_POST_FIX_VALIDATOR_1234567890';

function gateFrom(value) {
  return value && value.ok === false ? value.result : value;
}

function classifications(result) {
  return [...(result.findings ?? []).map((finding) => finding.classification)].sort();
}

function hasClassification(result, expected) {
  return classifications(result).includes(expected);
}

function publicResult(result) {
  return {
    status: result?.status ?? null,
    decision: result?.decision ?? null,
    blocking: result?.blocking ?? null,
    classifications: classifications(result),
  };
}

const failures = [];
const passes = [];

function record(name, ok, details) {
  const entry = { name, ok, ...details };
  if (ok) passes.push(entry);
  else failures.push(entry);
}

function expectGateBlocked(name, rawResult, expectedClassification) {
  const result = gateFrom(rawResult);
  const ok = result?.status === SecurityGateStatus.Blocked
    && result?.decision === SecurityDecision.Block
    && result?.blocking === true
    && (expectedClassification ? hasClassification(result, expectedClassification) : true);
  const serialized = JSON.stringify(result);
  const redactionOk = !serialized.includes(FAKE_SECRET);
  record(name, ok && redactionOk, {
    expected: { status: SecurityGateStatus.Blocked, classification: expectedClassification ?? '<any>' },
    actual: publicResult(result),
    redactionOk,
  });
}

function expectGatePassed(name, rawResult) {
  const result = gateFrom(rawResult);
  const ok = result?.status === SecurityGateStatus.Passed
    && result?.decision === SecurityDecision.Allow
    && result?.blocking === false
    && Array.isArray(result?.findings)
    && result.findings.length === 0;
  record(name, ok, { expected: { status: SecurityGateStatus.Passed }, actual: publicResult(result) });
}

function expectGateAdvisory(name, rawResult) {
  const result = gateFrom(rawResult);
  const ok = result?.status === SecurityGateStatus.Advisory
    && result?.decision === SecurityDecision.AllowWithAdvisory
    && result?.blocking === false
    && hasClassification(result, SecurityClassification.AdvisoryNotice);
  record(name, ok, { expected: { status: SecurityGateStatus.Advisory }, actual: publicResult(result) });
}

function expectPolicyRejected(name, rawResult, expectedClassification = SecurityClassification.MalformedPolicy) {
  const ok = rawResult?.ok === false && gateFrom(rawResult)?.status === SecurityGateStatus.Blocked && hasClassification(gateFrom(rawResult), expectedClassification);
  record(name, ok, { expected: { ok: false, classification: expectedClassification }, actual: rawResult?.ok === false ? publicResult(rawResult.result) : { ok: rawResult?.ok } });
}

function expectNoThrow(name, fn, predicate) {
  try {
    const value = fn();
    record(name, predicate(value), { actual: value && value.schemaVersion ? '<schema-object>' : value });
    return value;
  } catch (error) {
    record(name, false, { thrown: error && typeof error === 'object' ? { name: error.name, message: error.message } : String(error) });
    return undefined;
  }
}

// Positive witnesses.
expectGatePassed('positive safe read-only local command/env/config/default external disabled/sandbox unknown', runSecurityGate({
  command: { command: 'node', argv: ['packages/security/fixtures/policy/witness.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/fixtures/policy/witness.mjs'] },
  env: { NODE_ENV: 'test', VIBE_ENGINEER_MODE: 'local' },
  config: { runtime: { endpoint: 'http://127.0.0.1:4318', mode: 'local' } },
  externalIntegrations: [{ id: 'disabled-provider', mode: ExternalIntegrationMode.Disabled, enabled: false, requiresCredential: false, requiresNetwork: false }],
  sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.Unknown, claim: 'No isolation guarantee claimed.' }],
}));
expectGatePassed('positive local deterministic write in owned security fixture path', runSecurityGate({
  command: { command: 'node', argv: ['tools/write-fixture.mjs'], classification: CommandSafetyClassification.LocalDeterministicWrite, declaredWritePaths: ['packages/security/fixtures/local-output.json'] },
}));
expectGatePassed('positive external dry-run', runSecurityGate({ externalIntegrations: [{ id: 'dry-run-provider', mode: ExternalIntegrationMode.DryRun, enabled: false, requiresCredential: false, requiresBudget: false, requiresNetwork: false }] }));
expectGatePassed('positive external read-only network without credentials or mutation', runSecurityGate({ externalIntegrations: [{ id: 'read-only-provider', mode: ExternalIntegrationMode.ReadOnly, enabled: false, requiresCredential: false, requiresBudget: false, requiresNetwork: true, networkMutation: false }] }));
expectGateAdvisory('positive advisory note stays non-blocking advisory', runSecurityGate({ notes: [{ id: 'advisory-1', classification: SecurityClassification.AdvisoryNotice, severity: SecuritySeverity.Advisory, message: 'Advisory only.' }] }));

// Policy parsing / PF1/PF2 closure.
expectPolicyRejected('PF1 policy rejects network_external_mutation classification', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] }));
expectPolicyRejected('PF1 policy rejects credential_operation classification', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.CredentialOperation] }));
expectPolicyRejected('PF1 policy rejects unknown command classification', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.Unknown] }));
expectGateBlocked('PF1 direct unsafe policy cannot allow curl POST external mutation classification', evaluateCommandSafety({ command: 'curl', argv: ['-X', 'POST', 'https://api.example.invalid/resource'], classification: CommandSafetyClassification.NetworkExternalMutation }, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] }), SecurityClassification.DestructiveCommand);
expectPolicyRejected('PF2 policy rejects removing mandatory protected path floor', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }));
expectGateBlocked('PF2 direct unsafe policy cannot allow root package manifest target', evaluateCommandSafety({ command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['package.json'] }, { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }), SecurityClassification.UnsafeCommandTarget);

// Original F1/F2/F3/F4/F5/F6 closures and required negatives.
expectGateBlocked('original F1 terminal traversal segment safe/.. blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['safe/..'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('original F1 Windows drive absolute C:/ blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['C:\\Users\\outside'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('original F2 missing command blocks', runSecurityGate({ command: { argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField);
expectGateBlocked('original F2 argv string blocks', runSecurityGate({ command: { command: 'node', argv: `--api-key ${FAKE_SECRET}`, classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField);
expectGateBlocked('original F2 targetPaths string blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: '../outside' } }), SecurityClassification.UnknownRequestField);
expectGateBlocked('original F3 policy rejects invented command classification', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: ['read_only', 'invented_super_safe'] }), SecurityClassification.MalformedPolicy);
expectPolicyRejected('original F3 policy rejects fake sandbox status', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedSandboxCapabilityStatuses: ['unknown', 'docker_isolated'] }));
expectGateBlocked('original F4 blocked/pending-live sandbox blocks', runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.BlockedPendingLive, claim: 'Live proof unavailable.' }] }), SecurityClassification.UnsupportedSandboxClaim);
expectGateBlocked('original F5 secret inside config array blocks', runSecurityGate({ config: { nested: [`token=${FAKE_SECRET}`] } }), SecurityClassification.SecretLikeValue);
const circularEvidence = { token: FAKE_SECRET };
circularEvidence.self = circularEvidence;
expectGateBlocked('original F6 circular evidence blocks without throw', evaluateEvidenceSafety(circularEvidence), SecurityClassification.EvidenceSecretLeak);
expectGateBlocked('original F6 BigInt evidence blocks without throw', evaluateEvidenceSafety({ token: FAKE_SECRET, counter: 1n }), SecurityClassification.EvidenceSecretLeak);

// Malformed/unknown/unsafe policies and unsupported fields.
expectPolicyRejected('malformed policy non-object blocks', parseSecurityPolicy('not-an-object'), SecurityClassification.MalformedPolicy);
expectPolicyRejected('absent schema policy object blocks', parseSecurityPolicy({}), SecurityClassification.MalformedPolicy);
expectPolicyRejected('unknown policy version blocks', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, schemaVersion: 'security-policy.v999' }), SecurityClassification.UnsupportedPolicyVersion);
expectPolicyRejected('unknown policy field blocks', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, unsupported: true }), SecurityClassification.UnknownPolicyField);
expectPolicyRejected('unsafe defaultDecision allow blocks', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, defaultDecision: SecurityDecision.Allow }), SecurityClassification.MalformedPolicy);
expectPolicyRejected('unsafe allowProductionCredentials true blocks', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowProductionCredentials: true }), SecurityClassification.ProductionCredentialOrDefault);
expectPolicyRejected('unsafe external enabled mode policy blocks', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedExternalIntegrationModes: [ExternalIntegrationMode.Disabled, ExternalIntegrationMode.Enabled] }), SecurityClassification.MalformedPolicy);
expectPolicyRejected('unsafe advisory classification policy blocks', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, advisoryClassifications: [SecurityClassification.AdvisoryNotice, SecurityClassification.SecretLikeValue] }), SecurityClassification.MalformedPolicy);
expectGateBlocked('unknown top-level request field blocks', runSecurityGate({ unsupported: true }), SecurityClassification.UnknownRequestField);
expectGateBlocked('unknown command request field blocks', runSecurityGate({ command: { command: 'node', argv: [], classification: CommandSafetyClassification.ReadOnly, unsupported: true } }), SecurityClassification.UnknownRequestField);

// Command safety, secrets, destructive/external operations.
expectGateBlocked('secret-like CLI argv value blocks and redacts', runSecurityGate({ command: { command: 'node', argv: ['--api-key', FAKE_SECRET], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue);
expectGateBlocked('secret-like CLI token embedded in command string blocks and redacts', runSecurityGate({ command: { command: `node --api-key ${FAKE_SECRET}`, argv: [], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue);
expectGateBlocked('rm -rf destructive command blocks', runSecurityGate({ command: { command: 'rm', argv: ['-rf', '/'], classification: CommandSafetyClassification.DestructiveLocalOperation, targetPaths: ['/'] } }), SecurityClassification.DestructiveCommand);
expectGateBlocked('force push repository-state operation blocks', runSecurityGate({ command: { command: 'git', argv: ['push', '--force', 'origin', 'main'], classification: CommandSafetyClassification.RepositoryStateOperation } }), SecurityClassification.DestructiveCommand);
expectGateBlocked('deploy/apply primitive blocks', runSecurityGate({ command: { command: 'pulumi', argv: ['apply'], classification: CommandSafetyClassification.ProductionImpactingOperation } }), SecurityClassification.DestructiveCommand);
expectGateBlocked('publish primitive blocks', runSecurityGate({ command: { command: 'pnpm', argv: ['publish'], classification: CommandSafetyClassification.ProductionImpactingOperation } }), SecurityClassification.DestructiveCommand);
expectGateBlocked('DB destructive operation blocks', runSecurityGate({ command: { command: 'psql', argv: ['-c', 'DROP TABLE users'], classification: CommandSafetyClassification.ProductionImpactingOperation } }), SecurityClassification.DestructiveCommand);
expectGateBlocked('network external mutation classification blocks without unsafe policy', runSecurityGate({ command: { command: 'curl', argv: ['-X', 'POST', 'https://api.example.invalid/resource'], classification: CommandSafetyClassification.NetworkExternalMutation } }), SecurityClassification.DestructiveCommand);
expectGateBlocked('credential operation classification blocks', runSecurityGate({ command: { command: 'security', argv: ['find-generic-password'], classification: CommandSafetyClassification.CredentialOperation } }), SecurityClassification.DestructiveCommand);
expectGateBlocked('unknown command classification blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.Unknown } }), SecurityClassification.DestructiveCommand);
expectGateBlocked('malformed command classification blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: 'fake_safe' } }), SecurityClassification.UnknownRequestField);

// Path safety edge cases: traversal/absolute/protected roots/root manifests/package-manager/workspace/package manifests.
expectGateBlocked('path escape ../outside blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['../outside'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('POSIX absolute path blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['/tmp/outside'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('UNC path blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['\\\\server\\share'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('Windows drive-relative path blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['C:Users/outside'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('tilde home path blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['~/secrets'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('tilde user home path blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['~root/.ssh'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('dot-slash root package manifest target blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['./package.json'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('dot-slash git path blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['./.git/config'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('root package manifest target blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['package.json'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('root lockfile target blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['pnpm-lock.yaml'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('workspace file target blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['pnpm-workspace.yaml'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('turbo config target blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['turbo.json'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('CLI package manifest target blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/cli/package.json'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('security package manifest target blocks unless manifest-owned handoff', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/package.json'] } }), SecurityClassification.UnsafeCommandTarget);
expectGateBlocked('CLI entry protected path target blocks', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/cli/src/entry/vibe-engineer.js'] } }), SecurityClassification.UnsafeCommandTarget);

// Env/config safety and bounded inputs.
expectGateBlocked('secret-like env var blocks', runSecurityGate({ env: { API_TOKEN: FAKE_SECRET } }), SecurityClassification.SecretLikeValue);
expectGateBlocked('secret-like config value blocks', runSecurityGate({ config: { service: { clientSecret: FAKE_SECRET } } }), SecurityClassification.SecretLikeValue);
expectGateBlocked('production env default blocks', runSecurityGate({ env: { NODE_ENV: 'production' } }), SecurityClassification.ProductionCredentialOrDefault);
expectGateBlocked('production-like endpoint blocks', runSecurityGate({ config: { API_URL: 'https://api.example.invalid' } }), SecurityClassification.ProductionCredentialOrDefault);
expectGateBlocked('unsafe external integration enabled config default blocks', runSecurityGate({ config: { externalIntegrationEnabled: true } }), SecurityClassification.UnsafeEnvDefault);
const circularConfig = {};
circularConfig.self = circularConfig;
expectGateBlocked('circular env/config blocks without throw', runSecurityGate({ config: circularConfig }), SecurityClassification.UnsafeConfigDefault);
expectGateBlocked('BigInt env/config blocks without throw', runSecurityGate({ config: { counter: 1n } }), SecurityClassification.UnsafeConfigDefault);
expectGateBlocked('large env/config array blocks at item cap', runSecurityGate({ config: { values: Array.from({ length: 205 }, (_, index) => `safe-${index}`) } }), SecurityClassification.UnsafeConfigDefault);

// External integration typed input and unapproved live/network mutation safety.
expectGateBlocked('external integrations non-array blocks', runSecurityGate({ externalIntegrations: { id: 'not-array' } }), SecurityClassification.UnsafeExternalIntegration);
expectGateBlocked('external integration non-object entry blocks', runSecurityGate({ externalIntegrations: ['not-object'] }), SecurityClassification.UnsafeExternalIntegration);
expectGateBlocked('PF3 external string booleans block', runSecurityGate({ externalIntegrations: [{ id: 'string-bools', mode: ExternalIntegrationMode.Disabled, enabled: 'false', requiresCredential: 'true', requiresBudget: 'true', requiresNetwork: 'true', networkMutation: 'false', explicitApproval: 'false' }] }), SecurityClassification.UnknownRequestField);
expectGateBlocked('external malformed id type blocks', runSecurityGate({ externalIntegrations: [{ id: 123, mode: ExternalIntegrationMode.Disabled, enabled: false }] }), SecurityClassification.UnknownRequestField);
expectGateBlocked('external malformed mode type blocks', runSecurityGate({ externalIntegrations: [{ id: 'bad-mode-type', mode: false, enabled: false }] }), SecurityClassification.UnknownRequestField);
expectGateBlocked('external unknown field blocks', runSecurityGate({ externalIntegrations: [{ id: 'unknown-field', mode: ExternalIntegrationMode.Disabled, enabled: false, surprise: true }] }), SecurityClassification.UnknownRequestField);
expectGateBlocked('external enabled live credential/budget/network blocks', runSecurityGate({ externalIntegrations: [{ id: 'live-provider', mode: ExternalIntegrationMode.Enabled, enabled: true, requiresCredential: true, requiresBudget: true, requiresNetwork: true, networkMutation: true, explicitApproval: false }] }), SecurityClassification.UnsafeExternalIntegration);
expectGateBlocked('external mutation with explicitApproval still blocks in I-18A default', runSecurityGate({ externalIntegrations: [{ id: 'mutating-provider', mode: ExternalIntegrationMode.Mutating, enabled: true, requiresCredential: false, requiresBudget: false, requiresNetwork: true, networkMutation: true, explicitApproval: true }] }), SecurityClassification.UnsafeExternalIntegration);

// Sandbox exact semantics.
expectGatePassed('sandbox proven well-formed passes', runSecurityGate({ sandboxClaims: [{ provider: 'ci', status: SandboxCapabilityStatus.Proven, claim: 'Filesystem policy proven by external lane.' }] }));
expectGatePassed('sandbox not_provided well-formed passes as honest non-claim', runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.NotProvided, claim: 'No OS sandbox is claimed.' }] }));
expectGateBlocked('PF4 malformed sandbox provider/claim types block even with unknown status', runSecurityGate({ sandboxClaims: [{ provider: 123, status: SandboxCapabilityStatus.Unknown, claim: { overclaim: true } }] }), SecurityClassification.UnknownRequestField);
expectGateBlocked('sandbox malformed status type blocks', runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: 123, claim: 'bad status type' }] }), SecurityClassification.UnknownRequestField);
expectGateBlocked('sandbox unknown field blocks', runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.Unknown, claim: 'No overclaim.', extra: true }] }), SecurityClassification.UnknownRequestField);
expectGateBlocked('sandbox fake status blocks', runSecurityGate({ sandboxClaims: [{ provider: 'fake', status: 'docker_isolated', claim: 'full isolation' }] }), SecurityClassification.UnsupportedSandboxClaim);

// Redaction/evidence/audit safety.
const redactionPayload = {
  stdout: `token=${FAKE_SECRET}`,
  resultFiles: [{ path: 'result.json', content: `password=${FAKE_SECRET}` }],
  evidenceRefs: [{ authorization: `Bearer ${FAKE_SECRET}` }],
  diagnostics: [{ message: `client_secret=${FAKE_SECRET}` }],
  errors: [{ details: { apiKey: FAKE_SECRET } }],
  logs: [`credential=${FAKE_SECRET}`],
};
expectGateBlocked('redaction/audit surfaces with secret payload block and redact', runSecurityGate({ evidence: redactionPayload }), SecurityClassification.EvidenceSecretLeak);
expectNoThrow('redactSecurityValue circular audit/details does not throw and redacts', () => redactSecurityValue(circularEvidence), (value) => JSON.stringify(value).includes('<redacted:circular-reference>') && !JSON.stringify(value).includes(FAKE_SECRET));
expectNoThrow('createSecurityAuditEvent circular details does not throw and redacts', () => createSecurityAuditEvent('validator_circular', circularEvidence), (value) => JSON.stringify(value).includes('<redacted:circular-reference>') && !JSON.stringify(value).includes(FAKE_SECRET));
expectGateBlocked('large evidence string blocks and truncates', runSecurityGate({ evidence: { logs: ['x'.repeat(17000)] } }), SecurityClassification.EvidenceSecretLeak);
expectGateBlocked('large evidence array blocks and truncates', runSecurityGate({ evidence: { items: Array.from({ length: 205 }, (_, index) => `safe-${index}`) } }), SecurityClassification.EvidenceSecretLeak);
const manyKeys = Object.fromEntries(Array.from({ length: 205 }, (_, index) => [`key${index}`, `safe-${index}`]));
expectGateBlocked('large evidence object blocks and truncates', runSecurityGate({ evidence: manyKeys }), SecurityClassification.EvidenceSecretLeak);
const redactedText = redactSecurityText(`token=${FAKE_SECRET} Bearer ${FAKE_SECRET}`);
record('redactSecurityText removes fake secret sentinel', !redactedText.includes(FAKE_SECRET) && redactedText.includes('<redacted'), { actual: redactedText });

const summary = {
  ok: failures.length === 0,
  total: failures.length + passes.length,
  passCount: passes.length,
  failureCount: failures.length,
  failures,
  passes,
};
await writeFile(summaryUrl, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ ok: summary.ok, total: summary.total, passCount: summary.passCount, failureCount: summary.failureCount, failures: failures.map((failure) => failure.name) }));
process.exitCode = summary.ok ? 0 : 1;
