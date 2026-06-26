import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCommandLoader } from '../../../../../../packages/cli/src/command-loader/loader.js';
import { validateCliResultEnvelope } from '../../../../../../packages/cli/src/envelope/result-envelope.js';
import { sanitizeArgvForMetadata } from '../../../../../../packages/cli/src/errors/sanitization.js';
import { validateArtifactFile } from '../../../../../../packages/artifacts/src/index.js';
import { EVIDENCE_FAILURE_CLASSIFICATIONS } from '../../../../../../packages/verification/src/index.js';
import securityCommand from '../../../../../../packages/cli/src/commands/security/index.js';
import verifyCommand from '../../../../../../packages/cli/src/commands/verify/index.ts';
import { redactSecurityValue } from '../../../../../../packages/security/src/index.js';

const repoRoot = path.resolve('/Users/lizavasilyeva/work/vibe-engineer');
const validatorRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook/validation-evidence');
const witnessRoot = path.join(validatorRoot, 'witnesses/runtime');
const fixturesRoot = path.join(repoRoot, 'examples/starter-reference/generated-fixtures/security');
const sentinel = ['I18B', 'VALIDATOR', 'SHOULD', 'BE', 'REDACTED'].join('_');
const localFakeCredential = ['LOCAL', 'ONLY', 'FAKE', 'CREDENTIAL', 'VALUE'].join('_');

const paths = {
  safeRequest: path.join(fixturesRoot, 'requests/safe-local-read-only-command.json'),
  prodCredentialRequest: path.join(fixturesRoot, 'requests/blocked-prod-credential.json'),
  destructiveRequest: path.join(fixturesRoot, 'requests/blocked-destructive-command.json'),
  externalRequest: path.join(fixturesRoot, 'requests/blocked-external-live-credential-budget.json'),
  policyFile: path.join(fixturesRoot, 'policies/default-security-policy.json'),
  malformedPolicyFile: path.join(fixturesRoot, 'policies/malformed-policy.json'),
  approvedPlan: path.join(fixturesRoot, 'verify-hook/approved-security-plan.json'),
  draftPlan: path.join(fixturesRoot, 'verify-hook/draft-security-plan.json'),
  runnerScript: path.join(fixturesRoot, 'runner/security-hook-runner.mjs')
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function writeJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(redactSecurityValue(data), null, 2)}\n`, 'utf8');
}

async function writeJsonRaw(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function assertContainedInValidationEvidence(absPath) {
  const rel = path.relative(validatorRoot, path.resolve(absPath));
  assert.ok(rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)), `${absPath} is outside validator evidence root`);
}

function assertEnvelope(envelope) {
  const validation = validateCliResultEnvelope(envelope);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
}

function assertNoRawSentinel(value, label) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  assert.equal(serialized.includes(sentinel), false, `${label} leaked validator sentinel`);
  assert.equal(serialized.includes(localFakeCredential), false, `${label} leaked local fake credential sentinel`);
}

function invocation(command, args, id) {
  return {
    id,
    command,
    argv: sanitizeArgvForMetadata([command, ...args]),
    projectRoot: null,
    configPath: null,
    startedAt: '2026-06-26T00:00:00.000Z',
    endedAt: '2026-06-26T00:00:01.000Z'
  };
}

async function dispatchSecurity(caseName, args) {
  const caseRoot = path.join(witnessRoot, 'cli-security', caseName);
  assertContainedInValidationEvidence(caseRoot);
  await fsp.rm(caseRoot, { recursive: true, force: true });
  await fsp.mkdir(caseRoot, { recursive: true });
  const loader = createCommandLoader([securityCommand]);
  const result = await loader.dispatch('security', args, {
    invocation: invocation('security', args, `validator-security-${caseName.replaceAll('/', '-')}`),
    packageJsonPath: path.join(repoRoot, 'packages/cli/package.json'),
    config: null
  });
  assertEnvelope(result.envelope);
  assertNoRawSentinel(result.envelope, `security ${caseName} envelope`);
  await writeJson(path.join(caseRoot, 'envelope.json'), result.envelope);
  return { caseRoot, envelope: result.envelope };
}

function spawnNode(args, cwd = repoRoot) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, env: {}, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr, argv: sanitizeArgvForMetadata(args), cwd }));
  });
}

function packetPaths(envelope) {
  return envelope?.payload?.data?.evidencePackets?.map((entry) => String(entry.path)) ?? [];
}

function assertEvidencePackets(envelope) {
  for (const packetPath of packetPaths(envelope)) {
    assertContainedInValidationEvidence(packetPath);
    const validation = validateArtifactFile(packetPath, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, packetPath);
    assertNoRawSentinel(fs.readFileSync(packetPath, 'utf8'), `packet ${packetPath}`);
  }
}

function securityCommandSpec({ requestPath, outputPath, id = 'safety-hooks' }) {
  assertContainedInValidationEvidence(outputPath);
  return {
    id,
    requiredItemIds: ['safety-hooks'],
    layer: 'safety_hooks',
    evidenceClass: 'deterministic',
    blocking: true,
    kind: 'command',
    command: process.execPath,
    args: [paths.runnerScript, requestPath, outputPath],
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
  const out = path.join(witnessRoot, 'verify-security', 'inputs', `${caseName}-request-with-policy.json`);
  assertContainedInValidationEvidence(out);
  await writeJsonRaw(out, request);
  return out;
}

async function dispatchVerify(caseName, { plan = paths.approvedPlan, catalog, runId = caseName.replaceAll('_', '-') }) {
  const caseRoot = path.join(witnessRoot, 'verify-security', caseName);
  assertContainedInValidationEvidence(caseRoot);
  await fsp.rm(caseRoot, { recursive: true, force: true });
  await fsp.mkdir(caseRoot, { recursive: true });
  const packetsRoot = path.join(caseRoot, 'packets');
  const catalogPath = path.join(caseRoot, 'runner-catalog.json');
  const resultFile = path.join(caseRoot, 'cli-result.json');
  assertContainedInValidationEvidence(packetsRoot);
  assertContainedInValidationEvidence(catalogPath);
  assertContainedInValidationEvidence(resultFile);
  await writeJsonRaw(catalogPath, catalog);
  const args = [
    '--implementation-plan', plan,
    '--evidence-root', packetsRoot,
    '--project-root', repoRoot,
    '--run-id', `validator-${runId}`,
    '--runner-catalog', catalogPath,
    '--result-file', resultFile
  ];
  const loader = createCommandLoader([verifyCommand]);
  const result = await loader.dispatch('verify', args, {
    invocation: invocation('verify', args, `validator-verify-${caseName}`),
    packageJsonPath: path.join(repoRoot, 'packages/cli/package.json'),
    config: null
  });
  assertEnvelope(result.envelope);
  assertNoRawSentinel(result.envelope, `verify ${caseName} envelope`);
  assert.deepEqual(readJson(resultFile), result.envelope);
  await writeJson(path.join(caseRoot, 'summary.json'), { status: result.envelope.status, exitCode: result.envelope.exitCode, payload: result.envelope.payload, errors: result.envelope.errors, diagnostics: result.envelope.diagnostics, artifacts: result.envelope.artifacts });
  return { caseRoot, packetsRoot, resultFile, envelope: result.envelope };
}

async function dispatchVerifyInvalidArgs(caseName, args) {
  const caseRoot = path.join(witnessRoot, 'verify-security', caseName);
  assertContainedInValidationEvidence(caseRoot);
  await fsp.rm(caseRoot, { recursive: true, force: true });
  await fsp.mkdir(caseRoot, { recursive: true });
  const loader = createCommandLoader([verifyCommand]);
  const result = await loader.dispatch('verify', args, {
    invocation: invocation('verify', args, `validator-verify-${caseName}`),
    packageJsonPath: path.join(repoRoot, 'packages/cli/package.json'),
    config: null
  });
  assertEnvelope(result.envelope);
  assertNoRawSentinel(result.envelope, `verify invalid ${caseName} envelope`);
  await writeJson(path.join(caseRoot, 'envelope.json'), result.envelope);
  return result.envelope;
}

async function runCliSecurityMatrix(summary) {
  const cli = {};
  const safeResultFile = path.join(witnessRoot, 'cli-security', 'positive-safe', 'safe-result.json');
  const positive = await dispatchSecurity('positive-safe', ['--request-file', paths.safeRequest, '--policy-file', paths.policyFile, '--project-root', repoRoot, '--result-file', safeResultFile]);
  assert.equal(positive.envelope.status, 'success');
  assert.equal(readJson(safeResultFile).status, 'success');
  cli.positiveSafe = { status: positive.envelope.status, resultFile: safeResultFile, securityStatus: positive.envelope.payload.data.securityStatus };

  const cases = [
    ['unknownFlag', 'unknown-flag', ['--unknown-flag'], 'invalid_invocation'],
    ['unexpectedPositional', 'unexpected-positional', ['unexpected'], 'invalid_invocation'],
    ['secretLikeCliInput', 'secret-like-input', ['--api-key', sentinel], 'invalid_input']
  ];
  for (const [key, caseName, args, classification] of cases) {
    const result = await dispatchSecurity(caseName, args);
    assert.equal(result.envelope.status, 'blocked');
    assert.equal(result.envelope.errors[0].classification, classification);
    cli[key] = { status: result.envelope.status, classification: result.envelope.errors[0].classification };
  }

  const malformedRequestPath = path.join(witnessRoot, 'cli-security', 'inputs', 'malformed-request.json');
  await fsp.mkdir(path.dirname(malformedRequestPath), { recursive: true });
  await fsp.writeFile(malformedRequestPath, '{ "command": ', 'utf8');
  const malformedRequest = await dispatchSecurity('malformed-request-json', ['--request-file', malformedRequestPath, '--project-root', repoRoot]);
  assert.equal(malformedRequest.envelope.status, 'blocked');
  assert.equal(malformedRequest.envelope.errors[0].classification, 'invalid_input');
  cli.malformedRequestJson = { status: malformedRequest.envelope.status, classification: malformedRequest.envelope.errors[0].classification };

  const malformedConfigPath = path.join(witnessRoot, 'cli-security', 'inputs', 'malformed-config-request.json');
  await writeJsonRaw(malformedConfigPath, { config: 'not-a-config-object' });
  const malformedConfig = await dispatchSecurity('malformed-config-request', ['--request-file', malformedConfigPath, '--project-root', repoRoot]);
  assert.equal(malformedConfig.envelope.status, 'blocked');
  assert.equal(malformedConfig.envelope.errors[0].classification, 'safety_policy_block');
  cli.malformedConfig = { status: malformedConfig.envelope.status, classification: malformedConfig.envelope.errors[0].classification };

  const malformedPolicy = await dispatchSecurity('malformed-policy', ['--request-file', paths.safeRequest, '--policy-file', paths.malformedPolicyFile, '--project-root', repoRoot]);
  assert.equal(malformedPolicy.envelope.status, 'blocked');
  assert.equal(malformedPolicy.envelope.errors[0].classification, 'safety_policy_block');
  cli.malformedPolicy = { status: malformedPolicy.envelope.status, classification: malformedPolicy.envelope.errors[0].classification };

  const blockedCases = [
    ['productionCredentialOrLiveSecret', 'blocked-prod-credential', paths.prodCredentialRequest],
    ['destructiveCommand', 'blocked-destructive-command', paths.destructiveRequest],
    ['unsafeExternalIntegration', 'blocked-external-live-credential-budget', paths.externalRequest]
  ];
  for (const [key, caseName, requestPath] of blockedCases) {
    const result = await dispatchSecurity(caseName, ['--request-file', requestPath, '--project-root', repoRoot]);
    assert.equal(result.envelope.status, 'blocked');
    assert.equal(result.envelope.errors[0].classification, 'safety_policy_block');
    cli[key] = { status: result.envelope.status, classification: result.envelope.errors[0].classification, findingClassifications: result.envelope.payload.data.findings.map((finding) => finding.classification) };
  }

  const protectedWrite = await dispatchSecurity('protected-result-file', ['--request-file', paths.safeRequest, '--project-root', repoRoot, '--result-file', path.join(repoRoot, 'package.json')]);
  assert.equal(protectedWrite.envelope.status, 'blocked');
  assert.equal(protectedWrite.envelope.errors[0].classification, 'invalid_input');
  cli.protectedResultFile = { status: protectedWrite.envelope.status, classification: protectedWrite.envelope.errors[0].classification };

  const pathEscape = await dispatchSecurity('path-escape-request', ['--request-file', '../outside.json', '--project-root', repoRoot]);
  assert.equal(pathEscape.envelope.status, 'blocked');
  assert.equal(pathEscape.envelope.errors[0].classification, 'invalid_input');
  cli.pathEscape = { status: pathEscape.envelope.status, classification: pathEscape.envelope.errors[0].classification };

  summary.cliSecurity = cli;
}

async function runVerifyMatrix(summary) {
  const verify = {};
  const safeRequestWithPolicy = await requestWithPolicy('approved-safe', paths.safeRequest, paths.policyFile);
  let outputPath = path.join(witnessRoot, 'verify-security', 'approved-safe', 'packets', 'security-hook-result.json');
  const approvedSafe = await dispatchVerify('approved-safe', { catalog: [securityCommandSpec({ requestPath: safeRequestWithPolicy, outputPath })], runId: 'approved-safe' });
  assert.equal(approvedSafe.envelope.status, 'success');
  assert.equal(approvedSafe.envelope.exitCode, 0);
  assertEvidencePackets(approvedSafe.envelope);
  assert.equal(readJson(outputPath).status, 'passed');
  verify.approvedSafe = { status: approvedSafe.envelope.status, packetCount: packetPaths(approvedSafe.envelope).length, outputPath };

  outputPath = path.join(witnessRoot, 'verify-security', 'blocked-security', 'packets', 'security-hook-result.json');
  const blocked = await dispatchVerify('blocked-security', { catalog: [securityCommandSpec({ requestPath: paths.prodCredentialRequest, outputPath })], runId: 'blocked-security' });
  assert.equal(blocked.envelope.status, 'failure');
  assert.equal(blocked.envelope.errors[0].classification, 'safety_policy_block');
  assert.ok(JSON.stringify(blocked.envelope.payload.data.failures).includes('safety_or_security_policy_failure'));
  assertEvidencePackets(blocked.envelope);
  verify.blockedSecurity = { status: blocked.envelope.status, cliClassification: blocked.envelope.errors[0].classification, runnerFailure: 'safety_or_security_policy_failure' };

  const missing = await dispatchVerify('missing-required-security-evidence', { catalog: [], runId: 'missing-security-evidence' });
  assert.equal(missing.envelope.status, 'blocked');
  assert.equal(missing.envelope.errors[0].classification, 'missing_prerequisite');
  assertEvidencePackets(missing.envelope);
  verify.missingRequiredEvidence = { status: missing.envelope.status, classification: missing.envelope.errors[0].classification };

  const malformedRequestWithPolicy = await requestWithPolicy('malformed-policy', paths.safeRequest, paths.malformedPolicyFile);
  outputPath = path.join(witnessRoot, 'verify-security', 'malformed-policy', 'packets', 'security-hook-result.json');
  const malformedPolicyRun = await dispatchVerify('malformed-policy', { catalog: [securityCommandSpec({ requestPath: malformedRequestWithPolicy, outputPath })], runId: 'malformed-policy' });
  assert.equal(malformedPolicyRun.envelope.status, 'failure');
  assert.equal(malformedPolicyRun.envelope.errors[0].classification, 'safety_policy_block');
  assertEvidencePackets(malformedPolicyRun.envelope);
  verify.malformedPolicy = { status: malformedPolicyRun.envelope.status, classification: malformedPolicyRun.envelope.errors[0].classification };

  const malformedEvidence = await dispatchVerify('malformed-evidence-candidate', { catalog: [malformedEvidenceValidatorSpec()], runId: 'malformed-evidence' });
  assert.equal(malformedEvidence.envelope.status, 'blocked');
  assert.equal(malformedEvidence.envelope.errors[0].classification, 'invalid_input');
  assertEvidencePackets(malformedEvidence.envelope);
  verify.malformedEvidence = { status: malformedEvidence.envelope.status, classification: malformedEvidence.envelope.errors[0].classification };

  const draft = await dispatchVerify('draft-plan-blocked', { plan: paths.draftPlan, catalog: [malformedEvidenceValidatorSpec()], runId: 'draft-plan' });
  assert.equal(draft.envelope.status, 'blocked');
  assert.equal(draft.envelope.errors[0].classification, 'invalid_input');
  assert.equal(packetPaths(draft.envelope).length, 0);
  verify.draftPlanBlocked = { status: draft.envelope.status, classification: draft.envelope.errors[0].classification };

  const protectedEvidenceArgs = [
    '--implementation-plan', paths.approvedPlan,
    '--evidence-root', 'package.json',
    '--project-root', repoRoot,
    '--run-id', 'validator-protected-evidence',
    '--runner-catalog', path.join(witnessRoot, 'verify-security', 'approved-safe', 'runner-catalog.json')
  ];
  const protectedEvidence = await dispatchVerifyInvalidArgs('protected-evidence-root', protectedEvidenceArgs);
  assert.equal(protectedEvidence.status, 'blocked');
  assert.equal(protectedEvidence.errors[0].classification, 'invalid_input');
  verify.protectedEvidenceRoot = { status: protectedEvidence.status, classification: protectedEvidence.errors[0].classification };

  summary.verifySecurity = verify;
}

async function runRegressionAndBuildFacing(summary) {
  const regression = {};
  const defaultEntry = await spawnNode(['packages/cli/src/entry/vibe-engineer.js', 'security', '--api-key', sentinel]);
  await writeJson(path.join(witnessRoot, 'regression/default-entry-security-unsupported.json'), defaultEntry);
  assert.equal(defaultEntry.code, 2);
  assertNoRawSentinel(defaultEntry.stdout, 'default entry stdout');
  assertNoRawSentinel(defaultEntry.stderr, 'default entry stderr');
  const defaultEnvelope = JSON.parse(defaultEntry.stdout);
  assert.equal(defaultEnvelope.errors[0].classification, 'unsupported_operation');
  regression.defaultEntryUnsupported = { exit: defaultEntry.code, classification: defaultEnvelope.errors[0].classification, argv: defaultEnvelope.invocation.argv };

  const foundation = await spawnNode(['packages/cli/src/entry/vibe-engineer.js', '--json', '--non-interactive', 'foundation', '--status', 'success']);
  await writeJson(path.join(witnessRoot, 'regression/foundation-envelope.json'), foundation);
  assert.equal(foundation.code, 0);
  const foundationEnvelope = JSON.parse(foundation.stdout);
  assert.equal(foundationEnvelope.status, 'success');
  assertEnvelope(foundationEnvelope);
  regression.foundationEnvelope = { exit: foundation.code, status: foundationEnvelope.status };

  const defaultLoader = createCommandLoader();
  assert.equal(defaultLoader.hasCommand('security'), false);
  regression.defaultLoaderSecurityRegistered = defaultLoader.hasCommand('security');

  const buildConsumer = await spawnNode(['examples/starter-reference/generated-fixtures/security/build-facing/build-security-api-consumer.mjs']);
  await writeJson(path.join(witnessRoot, 'build-facing/consumer-spawn.json'), buildConsumer);
  assert.equal(buildConsumer.code, 0);
  assertNoRawSentinel(buildConsumer.stdout, 'build consumer stdout');
  const buildPayload = JSON.parse(buildConsumer.stdout);
  assert.equal(buildPayload.futureJoin, 'I-21');
  regression.buildFacingApiConsumer = { exit: buildConsumer.code, futureJoin: buildPayload.futureJoin, status: buildPayload.status };

  summary.regression = regression;
}

function walkFiles(root) {
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else files.push(file);
    }
  }
  walk(root);
  return files.sort();
}

async function scanOutputs(summary) {
  const hits = [];
  for (const file of walkFiles(witnessRoot)) {
    if (file.endsWith('.command.txt')) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes(sentinel) || text.includes(localFakeCredential)) hits.push(file);
  }
  assert.deepEqual(hits, []);
  summary.redaction = { scannedRoot: witnessRoot, forbiddenProbeHits: hits.length };
}

async function main() {
  assertContainedInValidationEvidence(witnessRoot);
  await fsp.rm(witnessRoot, { recursive: true, force: true });
  await fsp.mkdir(witnessRoot, { recursive: true });
  const summary = { ok: true, witnessRoot };
  await runCliSecurityMatrix(summary);
  await runVerifyMatrix(summary);
  await runRegressionAndBuildFacing(summary);
  await scanOutputs(summary);
  await writeJson(path.join(witnessRoot, 'runtime-witness-summary.json'), summary);
  console.log(JSON.stringify(redactSecurityValue({ ok: true, summaryPath: path.join(witnessRoot, 'runtime-witness-summary.json'), sections: Object.keys(summary) })));
}

main().catch(async (error) => {
  const failurePath = path.join(witnessRoot, 'runtime-witness-failure.json');
  await writeJson(failurePath, { name: error?.name, message: error?.message, stack: error?.stack });
  console.error(error);
  process.exitCode = 1;
});
