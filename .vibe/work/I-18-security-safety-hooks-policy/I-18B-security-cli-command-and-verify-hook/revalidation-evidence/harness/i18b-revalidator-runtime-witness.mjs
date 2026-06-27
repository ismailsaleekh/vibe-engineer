// REVALIDATOR-owned stronger-equivalent runtime witness harness for I-18B post-finisher revalidation.
// Independent adversarial execution. All writes rooted under revalidation-evidence/witnesses/**
// (NEVER product, NEVER finisher-evidence/**, NEVER prior evidence/**/fix-evidence/**/validation-evidence/**).
//
// Imports the ACTUAL securityCommand from ./index.ts (Node 24 native type-stripping — no flag/loader)
// and the actual createCommandLoader, @vibe-engineer/security, verifyCommand, runVerificationPlan,
// Evidence Packets, envelope/result-file carrier, sanitization, and artifacts validator.
//
// Package resolution mirrors the accepted harness pattern: relative imports to package SOURCE.
// 6 "../" ascend from this harness dir (revalidation-evidence/harness/) to the repo root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createCommandLoader } from '../../../../../../packages/cli/src/command-loader/loader.js';
import { validateCliResultEnvelope } from '../../../../../../packages/cli/src/envelope/result-envelope.js';
import { sanitizeArgvForMetadata } from '../../../../../../packages/cli/src/errors/sanitization.js';
import { validateArtifactFile } from '../../../../../../packages/artifacts/src/index.js';
import { EVIDENCE_FAILURE_CLASSIFICATIONS } from '../../../../../../packages/verification/src/index.js';
import { redactSecurityValue } from '../../../../../../packages/security/src/index.js';
import securityCommand from '../../../../../../packages/cli/src/commands/security/index.ts';
import verifyCommand from '../../../../../../packages/cli/src/commands/verify/index.ts';

const repoRoot = path.resolve('/Users/lizavasilyeva/work/vibe-engineer');
const workRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook');
const revalRoot = path.join(workRoot, 'revalidation-evidence');
const evidenceRoot = path.join(revalRoot, 'witnesses');
const cliSecurityCommandPath = path.join(repoRoot, 'packages/cli/src/commands/security/index.ts');
const cliVerifyCommandPath = path.join(repoRoot, 'packages/cli/src/commands/verify/index.ts');
const fixturesRoot = path.join(repoRoot, 'examples/starter-reference/generated-fixtures/security');
const safeRequest = path.join(fixturesRoot, 'requests/safe-local-read-only-command.json');
const blockedRequest = path.join(fixturesRoot, 'requests/blocked-prod-credential.json');
const destructiveRequest = path.join(fixturesRoot, 'requests/blocked-destructive-command.json');
const externalRequest = path.join(fixturesRoot, 'requests/blocked-external-live-credential-budget.json');
const policyFile = path.join(fixturesRoot, 'policies/default-security-policy.json');
const malformedPolicyFile = path.join(fixturesRoot, 'policies/malformed-policy.json');
const approvedPlan = path.join(fixturesRoot, 'verify-hook/approved-security-plan.json');
const draftPlan = path.join(fixturesRoot, 'verify-hook/draft-security-plan.json');
const runnerScript = path.join(fixturesRoot, 'runner/security-hook-runner.mjs');
// REVALIDATOR-owned sentinel (distinct from finisher's); must NOT leak into any written evidence.
const redactionSentinel = 'I18B_REVALIDATOR_SENTINEL_VALUE';

async function writeJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(redactSecurityValue(data), null, 2)}\n`, 'utf8');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertEnvelope(envelope) {
  const validation = validateCliResultEnvelope(envelope);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
}

async function dispatchSecurity(caseName, args) {
  const caseRoot = path.join(evidenceRoot, 'cli-security', caseName);
  await fsp.rm(caseRoot, { recursive: true, force: true });
  await fsp.mkdir(caseRoot, { recursive: true });
  const invocation = {
    id: `i18b-reval-${caseName}`,
    command: 'security',
    argv: sanitizeArgvForMetadata(['security', ...args]),
    projectRoot: null,
    configPath: null,
    startedAt: '2026-06-26T00:00:00.000Z',
    endedAt: '2026-06-26T00:00:01.000Z'
  };
  const loader = createCommandLoader([securityCommand]);
  const result = await loader.dispatch('security', args, { invocation, packageJsonPath: path.join(repoRoot, 'packages/cli/package.json'), config: null });
  assertEnvelope(result.envelope);
  await writeJson(path.join(caseRoot, 'summary.json'), result.envelope);
  return { caseRoot, envelope: result.envelope };
}

function securityCommandSpec({ requestPath, outputPath, id = 'safety-hooks' }) {
  return {
    id,
    requiredItemIds: ['safety-hooks'],
    layer: 'safety_hooks',
    evidenceClass: 'deterministic',
    blocking: true,
    kind: 'command',
    command: process.execPath,
    args: [runnerScript, requestPath, outputPath],
    cwd: '.',
    expectedArtifacts: [outputPath],
    argPaths: [
      { index: 0, root: 'projectRoot' },
      { index: 1, root: 'projectRoot' },
      { index: 2, root: 'evidenceRoot' }
    ],
    safety: {
      classification: 'local_deterministic_write',
      timeoutMs: 5000,
      maxStdoutBytes: 65536,
      maxStderrBytes: 65536,
      maxOutputBytes: 262144,
      allowedReadRoots: [repoRoot],
      allowedWriteRoots: [path.dirname(outputPath)],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true
    },
    failureClassification: EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE
  };
}

function malformedEvidenceValidatorSpec() {
  return {
    id: 'safety-hooks',
    requiredItemIds: ['safety-hooks'],
    layer: 'safety_hooks',
    evidenceClass: 'deterministic',
    blocking: true,
    kind: 'validator',
    validator: 'malformedEvidencePacketCandidate'
  };
}

async function requestWithPolicy(caseName, baseRequest, policyPath) {
  const request = readJson(baseRequest);
  request.policy = readJson(policyPath);
  const out = path.join(evidenceRoot, 'verify-security', 'inputs', `${caseName}-request-with-policy.json`);
  await fsp.mkdir(path.dirname(out), { recursive: true });
  await fsp.writeFile(out, `${JSON.stringify(request, null, 2)}\n`, 'utf8');
  return out;
}

async function dispatchVerify(caseName, { plan = approvedPlan, catalog, runId = caseName.replaceAll('_', '-') }) {
  const caseRoot = path.join(evidenceRoot, 'verify-security', caseName);
  await fsp.rm(caseRoot, { recursive: true, force: true });
  await fsp.mkdir(caseRoot, { recursive: true });
  const packetsRoot = path.join(caseRoot, 'packets');
  const catalogPath = path.join(caseRoot, 'runner-catalog.json');
  await writeJson(catalogPath, catalog);
  const resultFile = path.join(caseRoot, 'cli-result.json');
  const args = [
    '--implementation-plan', plan,
    '--evidence-root', packetsRoot,
    '--project-root', repoRoot,
    '--run-id', runId,
    '--runner-catalog', catalogPath,
    '--result-file', resultFile
  ];
  const invocation = {
    id: `i18b-reval-verify-${caseName}`,
    command: 'verify',
    argv: sanitizeArgvForMetadata(['verify', ...args]),
    projectRoot: null,
    configPath: null,
    startedAt: '2026-06-26T00:00:00.000Z',
    endedAt: '2026-06-26T00:00:01.000Z'
  };
  const loader = createCommandLoader([verifyCommand]);
  const result = await loader.dispatch('verify', args, { invocation, packageJsonPath: path.join(repoRoot, 'packages/cli/package.json'), config: null });
  assertEnvelope(result.envelope);
  await writeJson(path.join(caseRoot, 'summary.json'), { status: result.envelope.status, exitCode: result.envelope.exitCode, payload: result.envelope.payload, errors: result.envelope.errors, diagnostics: result.envelope.diagnostics, artifacts: result.envelope.artifacts });
  return { caseRoot, packetsRoot, resultFile, envelope: result.envelope };
}

function spawnNode(args, cwd = repoRoot) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, env: {}, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code) => resolve({ code, stdout, stderr, argv: sanitizeArgvForMetadata(args), cwd }));
  });
}

function packetPaths(envelope) {
  return envelope?.payload?.data?.evidencePackets?.map((entry) => String(entry.path)) ?? [];
}

function assertEvidencePackets(envelope) {
  for (const packetPath of packetPaths(envelope)) {
    const validation = validateArtifactFile(packetPath, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, packetPath);
  }
}

function scanForProbe(root, probe) {
  const hits = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith('.command.txt')) continue;
      else {
        const text = fs.readFileSync(file, 'utf8');
        if (text.includes(probe)) hits.push(file);
      }
    }
  }
  walk(root);
  return hits;
}

async function main() {
  await fsp.mkdir(evidenceRoot, { recursive: true });
  // Clear stale top-level evidence so the post-write sentinel scan is authoritative.
  await fsp.rm(path.join(evidenceRoot, 'witness-summary.json'), { force: true });
  await fsp.rm(path.join(evidenceRoot, 'witness-failure.json'), { force: true });
  await fsp.rm(path.join(evidenceRoot, 'native-ts-load-probe.json'), { force: true });
  const summary = {};

  // Witness — explicit Node 24 native .ts load (no flag, no loader, no package mutation).
  const securityProbe = await import(pathToFileURL(cliSecurityCommandPath).href);
  const verifyProbe = await import(pathToFileURL(cliVerifyCommandPath).href);
  await writeJson(path.join(evidenceRoot, 'native-ts-load-probe.json'), {
    nodeVersion: process.version,
    flagUsed: false,
    loaderIntroduced: false,
    packageMutation: false,
    securityCommand: { typeofDefault: typeof securityProbe.default, id: securityProbe.default?.id, namedSecurityCommandId: securityProbe.securityCommand?.id, reexports: { SecurityDecision: typeof securityProbe.SecurityDecision, SecurityGateStatus: typeof securityProbe.SecurityGateStatus } },
    verifyCommand: { typeofDefault: typeof verifyProbe.default, id: verifyProbe.default?.id, namedVerifyCommandId: verifyProbe.verifyCommand?.id }
  });
  assert.equal(securityProbe.default?.id, 'security', 'native-loaded securityCommand.id');
  assert.equal(securityProbe.securityCommand?.id, 'security', 'native-loaded named securityCommand.id');
  assert.ok(securityProbe.SecurityDecision !== undefined, 'SecurityDecision re-export present');
  assert.ok(securityProbe.SecurityGateStatus !== undefined, 'SecurityGateStatus re-export present');
  assert.equal(verifyProbe.default?.id, 'verify', 'native-loaded verifyCommand.id (blast-radius)');
  summary.nativeTsLoad = { securityId: securityProbe.default?.id, verifyId: verifyProbe.default?.id, flagUsed: false };

  // ---- CLI security command real seam (actual createCommandLoader([securityCommand]) → @vibe-engineer/security → envelope/result writer) ----
  const positiveResultFile = path.join(evidenceRoot, 'cli-security', 'positive', 'safe-cli-result.json');
  const positive = await dispatchSecurity('positive/safe-cli', ['--request-file', safeRequest, '--policy-file', policyFile, '--project-root', repoRoot, '--result-file', positiveResultFile]);
  assert.equal(positive.envelope.status, 'success');
  assert.equal(positive.envelope.exitCode, 0);
  assert.equal(readJson(positiveResultFile).status, 'success');
  summary.cliPositive = { status: positive.envelope.status, securityStatus: positive.envelope.payload.data.securityStatus, resultFile: positiveResultFile };

  const unknown = await dispatchSecurity('negative/unknown-flag', ['--unknown-flag']);
  assert.equal(unknown.envelope.status, 'blocked');
  assert.equal(unknown.envelope.errors[0].classification, 'invalid_invocation');
  summary.unknownFlag = { classification: unknown.envelope.errors[0].classification };

  const positional = await dispatchSecurity('negative/unexpected-positional', ['unexpected']);
  assert.equal(positional.envelope.status, 'blocked');
  assert.equal(positional.envelope.errors[0].classification, 'invalid_invocation');
  summary.unexpectedPositional = { classification: positional.envelope.errors[0].classification };

  const secret = await dispatchSecurity('negative/secret-like-input', ['--api-key', redactionSentinel]);
  assert.equal(secret.envelope.status, 'blocked');
  assert.equal(secret.envelope.errors[0].classification, 'invalid_input');
  assert.equal(JSON.stringify(secret.envelope).includes(redactionSentinel), false);
  summary.secretLikeInput = { classification: secret.envelope.errors[0].classification, probePresentInEnvelope: JSON.stringify(secret.envelope).includes(redactionSentinel) };

  const malformedRequestPath = path.join(evidenceRoot, 'cli-security', 'negative', 'malformed-request-source.json');
  await fsp.mkdir(path.dirname(malformedRequestPath), { recursive: true });
  await fsp.writeFile(malformedRequestPath, '{ "command": ', 'utf8');
  const malformedRequest = await dispatchSecurity('negative/malformed-request', ['--request-file', malformedRequestPath, '--project-root', repoRoot]);
  assert.equal(malformedRequest.envelope.status, 'blocked');
  assert.equal(malformedRequest.envelope.errors[0].classification, 'invalid_input');
  summary.malformedRequest = { classification: malformedRequest.envelope.errors[0].classification };

  const malformedPolicy = await dispatchSecurity('negative/malformed-policy', ['--request-file', safeRequest, '--policy-file', malformedPolicyFile, '--project-root', repoRoot]);
  assert.equal(malformedPolicy.envelope.status, 'blocked');
  assert.equal(malformedPolicy.envelope.errors[0].classification, 'safety_policy_block');
  summary.malformedPolicy = { classification: malformedPolicy.envelope.errors[0].classification };

  for (const [caseName, file, expected] of [
    ['unsafe-destructive-command', destructiveRequest, 'destructive_command'],
    ['unsafe-env-config-defaults', blockedRequest, 'secret_like_value'],
    ['unsafe-external-integration', externalRequest, 'unsafe_env_default']
  ]) {
    const result = await dispatchSecurity(`negative/${caseName}`, ['--request-file', file, '--project-root', repoRoot]);
    assert.equal(result.envelope.status, 'blocked');
    assert.equal(result.envelope.errors[0].classification, 'safety_policy_block');
    assert.ok(JSON.stringify(result.envelope.payload.data.findings).includes(expected));
    summary[caseName] = { classification: result.envelope.errors[0].classification, finding: expected };
  }

  const protectedWrite = await dispatchSecurity('negative/protected-result-file', ['--request-file', safeRequest, '--project-root', repoRoot, '--result-file', path.join(repoRoot, 'package.json')]);
  assert.equal(protectedWrite.envelope.status, 'blocked');
  assert.equal(protectedWrite.envelope.errors[0].classification, 'invalid_input');
  summary.protectedResultFile = { classification: protectedWrite.envelope.errors[0].classification };

  const pathEscape = await dispatchSecurity('negative/path-escape-request', ['--request-file', '../outside.json', '--project-root', repoRoot]);
  assert.equal(pathEscape.envelope.status, 'blocked');
  assert.equal(pathEscape.envelope.errors[0].classification, 'invalid_input');
  summary.pathEscape = { classification: pathEscape.envelope.errors[0].classification };

  // ---- Verify security-hook real seam (actual createCommandLoader([verifyCommand]) → runVerificationPlan → security gate runner → Evidence Packets → result-file carrier) ----
  const safeRequestWithPolicy = await requestWithPolicy('approved-safe', safeRequest, policyFile);
  let outputPath = path.join(evidenceRoot, 'verify-security', 'approved-safe', 'packets', 'security-hook-result.json');
  const approvedSafe = await dispatchVerify('approved-safe', { catalog: [securityCommandSpec({ requestPath: safeRequestWithPolicy, outputPath })], runId: 'i18b-reval-approved-safe' });
  assert.equal(approvedSafe.envelope.status, 'success');
  assert.equal(approvedSafe.envelope.exitCode, 0);
  assertEvidencePackets(approvedSafe.envelope);
  assert.equal(readJson(outputPath).status, 'passed');
  summary.verifyApprovedSafe = { status: approvedSafe.envelope.status, packetCount: packetPaths(approvedSafe.envelope).length };

  outputPath = path.join(evidenceRoot, 'verify-security', 'blocked-security', 'packets', 'security-hook-result.json');
  const blocked = await dispatchVerify('blocked-security', { catalog: [securityCommandSpec({ requestPath: blockedRequest, outputPath })], runId: 'i18b-reval-blocked-security' });
  assert.equal(blocked.envelope.status, 'failure');
  assert.equal(blocked.envelope.errors[0].classification, 'safety_policy_block');
  assert.ok(JSON.stringify(blocked.envelope.payload.data.failures).includes('safety_or_security_policy_failure'));
  assertEvidencePackets(blocked.envelope);
  summary.verifyBlockedSecurity = { status: blocked.envelope.status, classification: blocked.envelope.errors[0].classification };

  const missing = await dispatchVerify('missing-required-security-evidence', { catalog: [], runId: 'i18b-reval-missing-security-evidence' });
  assert.equal(missing.envelope.status, 'blocked');
  assert.equal(missing.envelope.errors[0].classification, 'missing_prerequisite');
  assertEvidencePackets(missing.envelope);
  summary.verifyMissingRequiredEvidence = { classification: missing.envelope.errors[0].classification };

  const malformedPolicyVerifyInput = await requestWithPolicy('malformed-policy', safeRequest, malformedPolicyFile);
  outputPath = path.join(evidenceRoot, 'verify-security', 'malformed-policy', 'packets', 'security-hook-result.json');
  const malformedPolicyRun = await dispatchVerify('malformed-policy', { catalog: [securityCommandSpec({ requestPath: malformedPolicyVerifyInput, outputPath })], runId: 'i18b-reval-malformed-policy' });
  assert.equal(malformedPolicyRun.envelope.status, 'failure');
  assert.equal(malformedPolicyRun.envelope.errors[0].classification, 'safety_policy_block');
  assertEvidencePackets(malformedPolicyRun.envelope);
  summary.verifyMalformedPolicy = { classification: malformedPolicyRun.envelope.errors[0].classification };

  const malformedEvidence = await dispatchVerify('malformed-evidence-candidate', { catalog: [malformedEvidenceValidatorSpec()], runId: 'i18b-reval-malformed-evidence' });
  assert.equal(malformedEvidence.envelope.status, 'blocked');
  assert.equal(malformedEvidence.envelope.errors[0].classification, 'invalid_input');
  assertEvidencePackets(malformedEvidence.envelope);
  summary.verifyMalformedEvidence = { classification: malformedEvidence.envelope.errors[0].classification };

  const draft = await dispatchVerify('draft-plan-blocked', { plan: draftPlan, catalog: [malformedEvidenceValidatorSpec()], runId: 'i18b-reval-draft-plan' });
  assert.equal(draft.envelope.status, 'blocked');
  assert.equal(draft.envelope.errors[0].classification, 'invalid_input');
  assert.equal(packetPaths(draft.envelope).length, 0);
  summary.verifyDraftPlanBlocked = { classification: draft.envelope.errors[0].classification };

  // ---- Regression: default shipped entry remains unsupported_operation + redacted argv (NO default loader/entry edit) ----
  const defaultEntry = await spawnNode(['packages/cli/src/entry/vibe-engineer.js', 'security', '--api-key', redactionSentinel]);
  await writeJson(path.join(evidenceRoot, 'regression', 'default-entry-security-unsupported.json'), defaultEntry);
  assert.equal(defaultEntry.code, 2);
  const defaultEnvelope = JSON.parse(defaultEntry.stdout);
  assert.equal(defaultEnvelope.errors[0].classification, 'unsupported_operation');
  assert.equal(defaultEntry.stdout.includes(redactionSentinel), false);
  // Adversarial: confirm argv is redacted to <redacted> in the default-entry stdout.
  assert.ok(JSON.stringify(defaultEnvelope).includes('<redacted>'), 'default-entry argv must be redacted');
  summary.defaultEntryUnsupported = { exit: defaultEntry.code, classification: defaultEnvelope.errors[0].classification, probePresentInStdout: defaultEntry.stdout.includes(redactionSentinel), argvRedacted: JSON.stringify(defaultEnvelope).includes('<redacted>') };

  const foundation = await spawnNode(['packages/cli/src/entry/vibe-engineer.js', '--json', '--non-interactive', 'foundation', '--status', 'success']);
  await writeJson(path.join(evidenceRoot, 'regression', 'foundation-envelope.json'), foundation);
  assert.equal(foundation.code, 0);
  assert.equal(JSON.parse(foundation.stdout).status, 'success');
  summary.foundationEnvelopeRegression = { exit: foundation.code, status: JSON.parse(foundation.stdout).status };

  // ---- Build-facing API consumer fixture: real @vibe-engineer/security API, I-21 pending; no build command paths touched ----
  const buildConsumer = await spawnNode(['examples/starter-reference/generated-fixtures/security/build-facing/build-security-api-consumer.mjs']);
  await writeJson(path.join(evidenceRoot, 'real-boundary', 'build-facing-api-fixture', 'consumer-spawn.json'), buildConsumer);
  assert.equal(buildConsumer.code, 0);
  assert.equal(JSON.parse(buildConsumer.stdout).futureJoin, 'I-21');
  summary.buildFacingApiFixture = { exit: buildConsumer.code, futureJoin: 'I-21' };

  // ---- Redaction: sentinel must not appear anywhere under revalidation-evidence/witnesses ----
  const hits = scanForProbe(evidenceRoot, redactionSentinel);
  assert.deepEqual(hits, []);
  const { createHash } = await import('node:crypto');
  summary.redaction = { sentinelRef: '<redacted>', sentinelSha256: createHash('sha256').update(redactionSentinel).digest('hex'), forbiddenProbeHits: hits.length, scanRanBeforeSummaryWrite: true };

  await writeJson(path.join(evidenceRoot, 'witness-summary.json'), summary);
  console.log(JSON.stringify(redactSecurityValue({ ok: true, summaryPath: path.join(evidenceRoot, 'witness-summary.json'), cases: Object.keys(summary) })));
}

main().catch(async (error) => {
  await writeJson(path.join(evidenceRoot, 'witness-failure.json'), { name: error?.name, message: error?.message, stack: error?.stack });
  console.error(error);
  process.exitCode = 1;
});
