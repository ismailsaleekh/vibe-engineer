import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import {
  CommandSafetyClassification,
  DEFAULT_SECURITY_POLICY,
  ExternalIntegrationMode,
  SandboxCapabilityStatus,
  SecurityClassification,
  SecurityDecision,
  SecurityGateStatus,
  evaluateCommandSafety,
  evaluateEvidenceSafety,
  parseSecurityPolicy,
  runSecurityGate,
} from '../../../../../../packages/security/src/index.js';

const outputDir = new URL('./', import.meta.url);
await mkdir(outputDir, { recursive: true });

const SECRET = 'FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_THIRD_FIX_1234567890';

function classes(result) {
  return [...new Set(result.findings.map((finding) => finding.classification))].sort();
}

function gateFrom(value) {
  return value && value.ok === false ? value.result : value;
}

function assertBlocked(name, resultLike, classification) {
  const result = gateFrom(resultLike);
  assert.equal(result.status, SecurityGateStatus.Blocked, `${name}: status`);
  assert.equal(result.decision, SecurityDecision.Block, `${name}: decision`);
  assert.ok(classes(result).includes(classification), `${name}: expected ${classification}, got ${classes(result).join(',')}`);
  assert.ok(!JSON.stringify(result).includes(SECRET), `${name}: leaked fake secret sentinel`);
  return { name, ok: true, status: result.status, decision: result.decision, classifications: classes(result) };
}

function assertPassed(name, result) {
  assert.equal(result.status, SecurityGateStatus.Passed, `${name}: status`);
  assert.equal(result.decision, SecurityDecision.Allow, `${name}: decision`);
  assert.deepEqual(result.findings, [], `${name}: findings`);
  return { name, ok: true, status: result.status, decision: result.decision, classifications: [] };
}

function commandForTarget(targetPath, extra = {}) {
  return runSecurityGate({
    command: {
      command: 'node',
      argv: ['packages/security/fixtures/policy/witness.mjs'],
      classification: CommandSafetyClassification.ReadOnly,
      targetPaths: [targetPath],
      ...extra,
    },
  });
}

const circular = { token: SECRET };
circular.self = circular;

const checks = [];

checks.push(assertPassed('positive safe read-only command against lane fixture', runSecurityGate({
  command: { command: 'node', argv: ['packages/security/fixtures/policy/witness.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/fixtures/policy/witness.mjs'] },
  env: { NODE_ENV: 'test', VIBE_ENGINEER_MODE: 'local' },
  config: { runtime: { environment: 'local', endpoint: 'http://127.0.0.1:4318' } },
  externalIntegrations: [{ id: 'disabled-local', mode: ExternalIntegrationMode.Disabled, enabled: false, requiresCredential: false }],
  sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.Unknown, claim: 'No isolation claim made.' }],
})));
checks.push(assertPassed('positive local deterministic write against non-protected security fixture path', runSecurityGate({
  command: { command: 'node', argv: ['packages/security/fixtures/policy/witness.mjs'], classification: CommandSafetyClassification.LocalDeterministicWrite, targetPaths: ['packages/security/fixtures/generated-safe-output.json'], declaredWritePaths: ['packages/security/fixtures/generated-safe-output.json'] },
})));
checks.push(assertPassed('positive dry-run external integration', runSecurityGate({
  externalIntegrations: [{ id: 'dry-run-provider', mode: ExternalIntegrationMode.DryRun, enabled: false, requiresCredential: false, requiresBudget: false, requiresNetwork: false }],
})));

checks.push(assertBlocked('SPF1 command-string secret blocks and redacts', runSecurityGate({ command: { command: `node --api-key ${SECRET}`, argv: [], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.SecretLikeValue));

for (const [name, target] of [
  ['SPF2 Windows drive-relative path C:outside blocks', 'C:outside'],
  ['SPF2 Windows drive traversal path C:../outside blocks', 'C:../outside'],
  ['SPF2 Windows drive absolute slash path blocks', 'C:/Users/outside'],
  ['SPF2 Windows drive absolute backslash path blocks', 'C:\\Users\\outside'],
  ['SPF2 UNC slash path blocks', '//server/share'],
  ['SPF2 UNC backslash path blocks', '\\\\server\\share'],
  ['SPF2 bare tilde path blocks', '~'],
  ['SPF2 tilde home path blocks', '~/secret'],
  ['SPF2 tilde user path blocks', '~user/.ssh/config'],
  ['SPF2 dot-slash package manifest alias blocks', './package.json'],
  ['SPF2 dot-slash git alias blocks', './.git/config'],
  ['SPF2 dot-slash lockfile alias blocks', './pnpm-lock.yaml'],
  ['SPF2 package manifest traversal alias blocks', 'packages/cli/../cli/package.json'],
  ['prior path terminal traversal blocks', 'safe/..'],
  ['prior path traversal outside blocks', '../outside'],
  ['prior POSIX absolute path blocks', '/tmp/outside'],
  ['prior root path blocks', '/'],
  ['prior empty path blocks', ''],
  ['prior malformed empty segment path blocks', 'safe//nested'],
  ['SPF3 root package manifest blocks', 'package.json'],
  ['SPF3 root lockfile blocks', 'pnpm-lock.yaml'],
  ['SPF3 workspace manifest blocks', 'pnpm-workspace.yaml'],
  ['SPF3 turbo config blocks', 'turbo.json'],
  ['SPF3 git config blocks', '.git/config'],
  ['SPF3 CLI package manifest blocks', 'packages/cli/package.json'],
  ['SPF3 security package manifest blocks', 'packages/security/package.json'],
  ['SPF3 CLI loader blocks', 'packages/cli/src/command-loader/loader.js'],
  ['SPF3 CLI entry blocks', 'packages/cli/src/entry/vibe-engineer.js'],
]) {
  checks.push(assertBlocked(name, commandForTarget(target), SecurityClassification.UnsafeCommandTarget));
}

checks.push(assertBlocked('unsafe custom policy cannot remove mandatory floor', evaluateCommandSafety({ command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['pnpm-workspace.yaml'] }, { ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }), SecurityClassification.UnsafeCommandTarget));
checks.push(assertBlocked('unsafe command policy rejects external mutation classification', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] }), SecurityClassification.MalformedPolicy));
checks.push(assertBlocked('direct unsafe command classification remains blocked', evaluateCommandSafety({ command: 'curl', argv: ['-X', 'POST', 'https://example.invalid/resource'], classification: CommandSafetyClassification.NetworkExternalMutation }, { ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] }), SecurityClassification.DestructiveCommand));
checks.push(assertBlocked('malformed external boolean strings remain blocked', runSecurityGate({ externalIntegrations: [{ id: 'bad-bools', mode: ExternalIntegrationMode.Disabled, enabled: 'false', requiresCredential: 'true', requiresBudget: 'true', requiresNetwork: 'false', networkMutation: 'false', explicitApproval: 'false' }] }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed sandbox provider and claim remain blocked', runSecurityGate({ sandboxClaims: [{ provider: 123, status: SandboxCapabilityStatus.Unknown, claim: { overclaim: true } }] }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('pending-live sandbox remains blocked', runSecurityGate({ sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.BlockedPendingLive, claim: 'Live proof unavailable.' }] }), SecurityClassification.UnsupportedSandboxClaim));
checks.push(assertBlocked('malformed command missing command remains blocked', runSecurityGate({ command: { argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed argv string remains blocked', runSecurityGate({ command: { command: 'node', argv: `--api-key ${SECRET}`, classification: CommandSafetyClassification.ReadOnly } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('malformed targetPaths string remains blocked', runSecurityGate({ command: { command: 'node', argv: ['safe.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: '../outside' } }), SecurityClassification.UnknownRequestField));
checks.push(assertBlocked('secret in config array remains blocked and redacted', runSecurityGate({ config: { nested: [SECRET] } }), SecurityClassification.SecretLikeValue));
checks.push(assertBlocked('circular evidence remains typed blocked', evaluateEvidenceSafety(circular), SecurityClassification.EvidenceSecretLeak));
checks.push(assertBlocked('BigInt evidence remains typed blocked', evaluateEvidenceSafety({ token: SECRET, counter: 1n }), SecurityClassification.EvidenceSecretLeak));

const summary = { ok: true, total: checks.length, checks };
await writeFile(new URL('third-fix-adversarial-witness-summary.json', outputDir), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, total: checks.length, failureCount: 0 }));
