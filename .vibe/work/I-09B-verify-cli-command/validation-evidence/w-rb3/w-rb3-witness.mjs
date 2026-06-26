import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const caseDir = join(repoRoot, '.vibe/work/I-09B-verify-cli-command/validation-evidence/w-rb3');
const evidenceRoot = join(caseDir, 'packets');
const runnerOutputRoot = join(evidenceRoot, 'runner-output');
const resultFile = join(caseDir, 'result-files', 'w-rb3-result.json');
const runnerCatalogPath = join(caseDir, 'runner-catalog.json');
const approvedPlan = join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
const passRunner = join(repoRoot, 'packages/verification/fixtures/runners/pass-runner.mjs');
const loaderPath = join(repoRoot, 'packages/cli/src/command-loader/loader.js');
const verifyPath = join(repoRoot, 'packages/cli/src/commands/verify/index.ts');
const envelopePath = join(repoRoot, 'packages/cli/src/envelope/result-envelope.js');
const artifactsPath = join(repoRoot, 'packages/artifacts/src/index.js');

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function packetRunnerSpec({ id, layer, evidenceClass, blocking, out }) {
  return {
    id: `w-rb3-${id}`,
    requiredItemIds: [id],
    layer,
    evidenceClass,
    blocking,
    kind: 'command',
    command: process.execPath,
    args: [passRunner, out],
    cwd: '.',
    expectedArtifacts: [out],
    argPaths: [
      { index: 0, root: 'projectRoot' },
      { index: 1, root: 'evidenceRoot' }
    ],
    safety: {
      classification: 'local_deterministic_write',
      timeoutMs: 2000,
      maxStdoutBytes: 8192,
      maxStderrBytes: 8192,
      maxOutputBytes: 8192,
      allowedReadRoots: [repoRoot],
      allowedWriteRoots: [runnerOutputRoot],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true
    }
  };
}

function spawnNode(args, cwd) {
  return new Promise((resolveSpawn) => {
    const child = spawn(process.execPath, args, { cwd, env: {}, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code, signal) => resolveSpawn({ code, signal, stdout, stderr, cwd, argv: [process.execPath, ...args] }));
  });
}

function stableInvocation(args) {
  const now = new Date().toISOString();
  return {
    id: 'i-09b-validation-w-rb3',
    command: 'verify',
    argv: ['verify', ...args],
    projectRoot: repoRoot,
    configPath: null,
    startedAt: now,
    endedAt: now
  };
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

await rm(join(caseDir, 'packets'), { recursive: true, force: true });
await rm(join(caseDir, 'result-files'), { recursive: true, force: true });
await mkdir(runnerOutputRoot, { recursive: true });
await mkdir(dirname(resultFile), { recursive: true });

const runnerCatalog = [
  packetRunnerSpec({ id: 'schema-validation', layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, out: join(runnerOutputRoot, 'schema-validation-output.json') }),
  packetRunnerSpec({ id: 'advisory-review', layer: 'advisory_review', evidenceClass: 'advisory', blocking: false, out: join(runnerOutputRoot, 'advisory-review-output.json') })
];
await writeFile(runnerCatalogPath, `${JSON.stringify(runnerCatalog, null, 2)}\n`, 'utf8');

const packageContextCode = `
  import { runVerificationPlan, VERIFICATION_RUNNER_VERSION, VERIFICATION_STATUSES } from '@vibe-engineer/verification';
  import { validateArtifactFile } from '@vibe-engineer/artifacts';
  import fs from 'node:fs';
  const out = {
    cwd: process.cwd(),
    verificationResolve: import.meta.resolve('@vibe-engineer/verification'),
    artifactsResolve: import.meta.resolve('@vibe-engineer/artifacts'),
    runVerificationPlanType: typeof runVerificationPlan,
    validateArtifactFileType: typeof validateArtifactFile,
    version: VERIFICATION_RUNNER_VERSION,
    statuses: VERIFICATION_STATUSES
  };
  fs.writeFileSync(${JSON.stringify(join(caseDir, 'package-context-import.json'))}, JSON.stringify(out, null, 2) + '\\n');
`;
const packageContextImport = await spawnNode(['--input-type=module', '-e', packageContextCode], join(repoRoot, 'packages/cli'));
assert.equal(packageContextImport.code, 0, packageContextImport.stderr);

const [{ createCommandLoader }, { verifyCommand, default: defaultVerifyCommand }, { validateCliResultEnvelope }] = await Promise.all([
  import(pathToFileURL(loaderPath).href),
  import(pathToFileURL(verifyPath).href),
  import(pathToFileURL(envelopePath).href)
]);
assert.equal(defaultVerifyCommand, verifyCommand);
assert.equal(verifyCommand.id, 'verify');
assert.equal(verifyCommand.visibility, 'implementation');
assert.equal(typeof verifyCommand.description, 'string');
assert.equal(typeof verifyCommand.run, 'function');

const args = [
  '--implementation-plan', approvedPlan,
  '--evidence-root', evidenceRoot,
  '--project-root', repoRoot,
  '--run-id', 'i09b-validation-w-rb3',
  '--runner-catalog', runnerCatalogPath,
  '--rerun-of', 'i09a-w-rb2-5-prior',
  '--result-file', resultFile
];
const invocation = stableInvocation(args);
const loader = createCommandLoader([verifyCommand]);
assert.equal(loader.hasCommand('verify'), true);
const dispatchResult = await loader.dispatch('verify', args, { invocation, packageJsonPath: join(repoRoot, 'packages/cli/package.json'), validationWitness: 'w-rb3' });
const envelope = dispatchResult.envelope;
const envelopeValidation = validateCliResultEnvelope(envelope);
assert.equal(envelopeValidation.ok, true, JSON.stringify(envelopeValidation));
assert.equal(envelope.status, 'success');
assert.equal(envelope.exitCode, 0);
assert.equal(envelope.payload.kind, 'verification_result');
assert.equal(envelope.payload.data.ok, true);
assert.equal(envelope.payload.data.runnerStatus, 'advisory_warning');
assert.equal(envelope.payload.data.rerunOf, 'i09a-w-rb2-5-prior');
assert.equal(existsSync(resultFile), true);

const resultFileEnvelope = readJson(resultFile);
assert.deepEqual(resultFileEnvelope, envelope);

const payloadPackets = envelope.payload.data.evidencePackets;
assert.equal(Array.isArray(payloadPackets), true);
assert.ok(payloadPackets.length >= 1);
const payloadPacketPaths = payloadPackets.map((packet) => packet.path).sort();
const artifactPacketPaths = envelope.artifacts.filter((artifact) => artifact.kind === 'evidence_packet').map((artifact) => artifact.path).sort();
assert.deepEqual(artifactPacketPaths, payloadPacketPaths);
assert.ok(envelope.artifacts.some((artifact) => artifact.kind === 'cli_result' && artifact.path === resultFile));

const { validateArtifactFile } = await import(pathToFileURL(artifactsPath).href);
const packetAssertions = [];
for (const packet of payloadPackets) {
  const validation = validateArtifactFile(packet.path, { kind: 'evidence_packet' });
  assert.equal(validation.ok, true, `${packet.path} failed artifacts validation: ${JSON.stringify(validation)}`);
  const packetJson = readJson(packet.path);
  assert.equal(packet.sha256, sha256File(packet.path));
  assert.equal(packet.valid, true);
  packetAssertions.push({
    path: packet.path,
    sha256: packet.sha256,
    artifactId: packetJson.artifactId,
    status: packetJson.status,
    result: packetJson.result,
    rerunOf: packetJson.rerunOf ?? null,
    validationOk: validation.ok
  });
}

await writeFile(join(caseDir, 'cli-result.json'), `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
await writeFile(join(caseDir, 'packet-assertions.json'), `${JSON.stringify(packetAssertions, null, 2)}\n`, 'utf8');
await writeFile(join(caseDir, 'summary.json'), `${JSON.stringify({
  status: 'PASS',
  command: `${process.execPath} ${fileURLToPath(import.meta.url)}`,
  cwd: repoRoot,
  loaderPath,
  verifyPath,
  envelopePath,
  artifactsPath,
  packageContextImport,
  runnerCatalogPath,
  implementationPlanPath: approvedPlan,
  evidenceRoot,
  resultFile,
  envelopeStatus: envelope.status,
  exitCode: envelope.exitCode,
  runnerStatus: envelope.payload.data.runnerStatus,
  packetCount: packetAssertions.length,
  payloadPacketPaths,
  artifactPacketPaths,
  resultFileSha256: sha256File(resultFile)
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ ok: true, case: 'w-rb3', packetCount: packetAssertions.length, resultFile }, null, 2));
