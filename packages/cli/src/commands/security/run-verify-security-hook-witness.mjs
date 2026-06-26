import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createCommandLoader } from '../../command-loader/loader.js';
import { validateCliResultEnvelope } from '../../envelope/result-envelope.js';
import { sanitizeArgvForMetadata } from '../../errors/sanitization.js';
import { validateArtifactFile } from '../../../../artifacts/src/index.js';
import { EVIDENCE_FAILURE_CLASSIFICATIONS } from '@vibe-engineer/verification';
import { redactSecurityValue } from '@vibe-engineer/security';
import verifyCommand from '../verify/index.ts';

const repoRoot = path.resolve('/Users/lizavasilyeva/work/vibe-engineer');
const workRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook');
const evidenceRoot = path.join(workRoot, 'evidence/real-boundary/verify-security-hook');
const fixturesRoot = path.join(repoRoot, 'examples/starter-reference/generated-fixtures/security');
const approvedPlan = path.join(fixturesRoot, 'verify-hook/approved-security-plan.json');
const draftPlan = path.join(fixturesRoot, 'verify-hook/draft-security-plan.json');
const runnerScript = path.join(fixturesRoot, 'runner/security-hook-runner.mjs');
const safeRequest = path.join(fixturesRoot, 'requests/safe-local-read-only-command.json');
const blockedRequest = path.join(fixturesRoot, 'requests/blocked-prod-credential.json');
const safePolicy = path.join(fixturesRoot, 'policies/default-security-policy.json');
const malformedPolicy = path.join(fixturesRoot, 'policies/malformed-policy.json');
const redactionProbe = 'LOCAL_ONLY_FAKE_CREDENTIAL_VALUE';

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

function packetPaths(envelope) {
  return envelope?.payload?.data?.evidencePackets?.map((entry) => String(entry.path)) ?? [];
}

function assertEvidencePackets(envelope) {
  for (const packetPath of packetPaths(envelope)) {
    const validation = validateArtifactFile(packetPath, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, packetPath);
  }
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
  const out = path.join(evidenceRoot, 'inputs', `${caseName}-request-with-policy.json`);
  await fsp.mkdir(path.dirname(out), { recursive: true });
  await fsp.writeFile(out, `${JSON.stringify(request, null, 2)}\n`, 'utf8');
  return out;
}

async function dispatchVerify(caseName, { plan = approvedPlan, catalog, runId = caseName.replaceAll('_', '-') }) {
  const caseRoot = path.join(evidenceRoot, caseName);
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
    id: `i18b-verify-${caseName}`,
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
  assert.deepEqual(readJson(resultFile), result.envelope);
  await writeJson(path.join(caseRoot, 'summary.json'), { status: result.envelope.status, exitCode: result.envelope.exitCode, payload: result.envelope.payload, errors: result.envelope.errors, diagnostics: result.envelope.diagnostics, artifacts: result.envelope.artifacts });
  return { caseRoot, packetsRoot, resultFile, envelope: result.envelope };
}

function scanForProbe(root, probe) {
  const hits = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
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
  const summary = {};

  const safeRequestWithPolicy = await requestWithPolicy('approved-safe', safeRequest, safePolicy);
  let outputPath = path.join(evidenceRoot, 'approved-safe', 'packets/security-hook-result.json');
  const approvedSafe = await dispatchVerify('approved-safe', { catalog: [securityCommandSpec({ requestPath: safeRequestWithPolicy, outputPath })], runId: 'i18b-approved-safe' });
  assert.equal(approvedSafe.envelope.status, 'success');
  assert.equal(approvedSafe.envelope.exitCode, 0);
  assertEvidencePackets(approvedSafe.envelope);
  assert.equal(readJson(outputPath).status, 'passed');
  summary.approvedSafe = { status: approvedSafe.envelope.status, packetCount: packetPaths(approvedSafe.envelope).length, outputPath };

  outputPath = path.join(evidenceRoot, 'blocked-security', 'packets/security-hook-result.json');
  const blocked = await dispatchVerify('blocked-security', { catalog: [securityCommandSpec({ requestPath: blockedRequest, outputPath })], runId: 'i18b-blocked-security' });
  assert.equal(blocked.envelope.status, 'failure');
  assert.equal(blocked.envelope.errors[0].classification, 'safety_policy_block');
  assert.ok(JSON.stringify(blocked.envelope.payload.data.failures).includes('safety_or_security_policy_failure'));
  assertEvidencePackets(blocked.envelope);
  summary.blockedSecurity = { status: blocked.envelope.status, cliClassification: blocked.envelope.errors[0].classification, runnerFailure: 'safety_or_security_policy_failure' };

  const missing = await dispatchVerify('missing-required-security-evidence', { catalog: [], runId: 'i18b-missing-security-evidence' });
  assert.equal(missing.envelope.status, 'blocked');
  assert.equal(missing.envelope.errors[0].classification, 'missing_prerequisite');
  assertEvidencePackets(missing.envelope);
  summary.missingRequiredEvidence = { status: missing.envelope.status, classification: missing.envelope.errors[0].classification };

  const malformedRequestWithPolicy = await requestWithPolicy('malformed-policy', safeRequest, malformedPolicy);
  outputPath = path.join(evidenceRoot, 'malformed-policy', 'packets/security-hook-result.json');
  const malformedPolicyRun = await dispatchVerify('malformed-policy', { catalog: [securityCommandSpec({ requestPath: malformedRequestWithPolicy, outputPath })], runId: 'i18b-malformed-policy' });
  assert.equal(malformedPolicyRun.envelope.status, 'failure');
  assert.equal(malformedPolicyRun.envelope.errors[0].classification, 'safety_policy_block');
  assertEvidencePackets(malformedPolicyRun.envelope);
  summary.malformedPolicy = { status: malformedPolicyRun.envelope.status, classification: malformedPolicyRun.envelope.errors[0].classification };

  const malformedEvidence = await dispatchVerify('malformed-evidence-candidate', { catalog: [malformedEvidenceValidatorSpec()], runId: 'i18b-malformed-evidence' });
  assert.equal(malformedEvidence.envelope.status, 'blocked');
  assert.equal(malformedEvidence.envelope.errors[0].classification, 'invalid_input');
  assertEvidencePackets(malformedEvidence.envelope);
  summary.malformedEvidence = { status: malformedEvidence.envelope.status, classification: malformedEvidence.envelope.errors[0].classification };

  const draft = await dispatchVerify('draft-plan-blocked', { plan: draftPlan, catalog: [malformedEvidenceValidatorSpec()], runId: 'i18b-draft-plan' });
  assert.equal(draft.envelope.status, 'blocked');
  assert.equal(draft.envelope.errors[0].classification, 'invalid_input');
  assert.equal(packetPaths(draft.envelope).length, 0);
  summary.draftPlanBlocked = { status: draft.envelope.status, classification: draft.envelope.errors[0].classification };

  const hits = scanForProbe(evidenceRoot, redactionProbe);
  assert.deepEqual(hits, []);
  summary.redaction = { probeHits: hits.length };

  await writeJson(path.join(evidenceRoot, 'witness-summary.json'), summary);
  console.log(JSON.stringify(redactSecurityValue({ ok: true, summaryPath: path.join(evidenceRoot, 'witness-summary.json'), cases: Object.keys(summary) })));
}

main().catch(async (error) => {
  await writeJson(path.join(evidenceRoot, 'witness-failure.json'), { name: error?.name, message: error?.message, stack: error?.stack });
  console.error(error);
  process.exitCode = 1;
});
