import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createCommandLoader } from '../../command-loader/loader.js';
import { validateCliResultEnvelope } from '../../envelope/result-envelope.js';
import { sanitizeArgvForMetadata } from '../../errors/sanitization.js';
import { redactSecurityValue } from '@vibe-engineer/security';
import securityCommand from './index.ts';

const repoRoot = path.resolve('/Users/lizavasilyeva/work/vibe-engineer');
const workRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook');
const evidenceRoot = path.join(workRoot, 'evidence');
const fixturesRoot = path.join(repoRoot, 'examples/starter-reference/generated-fixtures/security');
const safeRequest = path.join(fixturesRoot, 'requests/safe-local-read-only-command.json');
const prodCredentialRequest = path.join(fixturesRoot, 'requests/blocked-prod-credential.json');
const destructiveRequest = path.join(fixturesRoot, 'requests/blocked-destructive-command.json');
const externalRequest = path.join(fixturesRoot, 'requests/blocked-external-live-credential-budget.json');
const policyFile = path.join(fixturesRoot, 'policies/default-security-policy.json');
const malformedPolicyFile = path.join(fixturesRoot, 'policies/malformed-policy.json');
const forbiddenProbe = 'I18B_SHOULD_BE_REDACTED';

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
  const caseRoot = path.join(evidenceRoot, caseName);
  await fsp.rm(caseRoot, { recursive: true, force: true });
  await fsp.mkdir(caseRoot, { recursive: true });
  const invocation = {
    id: `i18b-${caseName}`,
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

function scanForProbe(root, probe) {
  const hits = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else {
        if (file.endsWith('.command.txt')) continue;
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

  const positiveResultFile = path.join(evidenceRoot, 'positive', 'safe-cli-result.json');
  const positive = await dispatchSecurity('positive/safe-cli', ['--request-file', safeRequest, '--policy-file', policyFile, '--project-root', repoRoot, '--result-file', positiveResultFile]);
  assert.equal(positive.envelope.status, 'success');
  assert.equal(positive.envelope.exitCode, 0);
  assert.equal(readJson(positiveResultFile).status, 'success');
  summary.positive = { status: positive.envelope.status, resultFile: positiveResultFile, securityStatus: positive.envelope.payload.data.securityStatus };

  const unknown = await dispatchSecurity('negative/unknown-flag', ['--unknown-flag']);
  assert.equal(unknown.envelope.status, 'blocked');
  assert.equal(unknown.envelope.errors[0].classification, 'invalid_invocation');
  summary.unknownFlag = { status: unknown.envelope.status, classification: unknown.envelope.errors[0].classification };

  const positional = await dispatchSecurity('negative/unexpected-positional', ['unexpected']);
  assert.equal(positional.envelope.status, 'blocked');
  assert.equal(positional.envelope.errors[0].classification, 'invalid_invocation');
  summary.unexpectedPositional = { status: positional.envelope.status, classification: positional.envelope.errors[0].classification };

  const secret = await dispatchSecurity('negative/secret-like-input', ['--api-key', forbiddenProbe]);
  assert.equal(secret.envelope.status, 'blocked');
  assert.equal(secret.envelope.errors[0].classification, 'invalid_input');
  assert.equal(JSON.stringify(secret.envelope).includes(forbiddenProbe), false);
  summary.sensitiveInputCase = { status: secret.envelope.status, classification: secret.envelope.errors[0].classification };

  const malformedRequestPath = path.join(evidenceRoot, 'negative/malformed-request-source.json');
  await fsp.mkdir(path.dirname(malformedRequestPath), { recursive: true });
  await fsp.writeFile(malformedRequestPath, '{ "command": ', 'utf8');
  const malformedRequest = await dispatchSecurity('negative/malformed-request', ['--request-file', malformedRequestPath, '--project-root', repoRoot]);
  assert.equal(malformedRequest.envelope.status, 'blocked');
  assert.equal(malformedRequest.envelope.errors[0].classification, 'invalid_input');
  summary.malformedRequest = { status: malformedRequest.envelope.status, classification: malformedRequest.envelope.errors[0].classification };

  const malformedPolicy = await dispatchSecurity('negative/malformed-policy', ['--request-file', safeRequest, '--policy-file', malformedPolicyFile, '--project-root', repoRoot]);
  assert.equal(malformedPolicy.envelope.status, 'blocked');
  assert.equal(malformedPolicy.envelope.errors[0].classification, 'safety_policy_block');
  summary.malformedPolicy = { status: malformedPolicy.envelope.status, classification: malformedPolicy.envelope.errors[0].classification };

  for (const [caseName, file, expected] of [
    ['unsafe-destructive-command', destructiveRequest, 'destructive_command'],
    ['unsafe-env-config-defaults', prodCredentialRequest, 'secret_like_value'],
    ['unsafe-external-integration', externalRequest, 'unsafe_env_default']
  ]) {
    const result = await dispatchSecurity(`negative/${caseName}`, ['--request-file', file, '--project-root', repoRoot]);
    assert.equal(result.envelope.status, 'blocked');
    assert.equal(result.envelope.errors[0].classification, 'safety_policy_block');
    assert.ok(JSON.stringify(result.envelope.payload.data.findings).includes(expected));
    summary[caseName] = { status: result.envelope.status, classification: result.envelope.errors[0].classification };
  }

  const protectedWrite = await dispatchSecurity('negative/protected-result-file', ['--request-file', safeRequest, '--project-root', repoRoot, '--result-file', path.join(repoRoot, 'package.json')]);
  assert.equal(protectedWrite.envelope.status, 'blocked');
  assert.equal(protectedWrite.envelope.errors[0].classification, 'invalid_input');
  summary.protectedWrite = { status: protectedWrite.envelope.status, classification: protectedWrite.envelope.errors[0].classification };

  const pathEscape = await dispatchSecurity('negative/path-escape-request', ['--request-file', '../outside.json', '--project-root', repoRoot]);
  assert.equal(pathEscape.envelope.status, 'blocked');
  assert.equal(pathEscape.envelope.errors[0].classification, 'invalid_input');
  summary.pathEscape = { status: pathEscape.envelope.status, classification: pathEscape.envelope.errors[0].classification };

  const defaultEntry = await spawnNode(['packages/cli/src/entry/vibe-engineer.js', 'security', '--api-key', forbiddenProbe]);
  await writeJson(path.join(evidenceRoot, 'regression/default-entry-security-unsupported.json'), defaultEntry);
  assert.equal(defaultEntry.code, 2);
  const defaultEnvelope = JSON.parse(defaultEntry.stdout);
  assert.equal(defaultEnvelope.errors[0].classification, 'unsupported_operation');
  assert.equal(defaultEntry.stdout.includes(forbiddenProbe), false);
  summary.defaultEntryUnsupported = { exit: defaultEntry.code, classification: defaultEnvelope.errors[0].classification };

  const foundation = await spawnNode(['packages/cli/src/entry/vibe-engineer.js', '--json', '--non-interactive', 'foundation', '--status', 'success']);
  await writeJson(path.join(evidenceRoot, 'regression/foundation-envelope.json'), foundation);
  assert.equal(foundation.code, 0);
  assert.equal(JSON.parse(foundation.stdout).status, 'success');
  summary.foundationEnvelopeRegression = { exit: foundation.code, status: JSON.parse(foundation.stdout).status };

  const buildConsumer = await spawnNode(['examples/starter-reference/generated-fixtures/security/build-facing/build-security-api-consumer.mjs']);
  await writeJson(path.join(evidenceRoot, 'real-boundary/build-facing-api-fixture/consumer-spawn.json'), buildConsumer);
  assert.equal(buildConsumer.code, 0);
  assert.equal(JSON.parse(buildConsumer.stdout).futureJoin, 'I-21');
  summary.buildFacingApiFixture = { exit: buildConsumer.code, futureJoin: 'I-21' };

  const hits = scanForProbe(evidenceRoot, forbiddenProbe);
  assert.deepEqual(hits, []);
  summary.redaction = { forbiddenProbeHits: hits.length };

  await writeJson(path.join(evidenceRoot, 'real-boundary/cli-security-command/witness-summary.json'), summary);
  console.log(JSON.stringify(redactSecurityValue({ ok: true, summaryPath: path.join(evidenceRoot, 'real-boundary/cli-security-command/witness-summary.json'), cases: Object.keys(summary) })));
}

main().catch(async (error) => {
  await writeJson(path.join(evidenceRoot, 'real-boundary/cli-security-command/witness-failure.json'), { name: error?.name, message: error?.message, stack: error?.stack });
  console.error(error);
  process.exitCode = 1;
});
