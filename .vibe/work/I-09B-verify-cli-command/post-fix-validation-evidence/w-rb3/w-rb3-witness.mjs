import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const witnessRoot = join(repoRoot, '.vibe/work/I-09B-verify-cli-command/post-fix-validation-evidence/w-rb3');
const fixturesRoot = join(witnessRoot, 'fixtures');
const casesRoot = join(witnessRoot, 'cases');
const caseRoot = join(casesRoot, 'real-boundary-success');
const runnerDir = join(fixturesRoot, 'runners');
const runnerScript = join(runnerDir, 'w-rb3-pass-runner.mjs');
const approvedPlan = join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
const loaderPath = join(repoRoot, 'packages/cli/src/command-loader/loader.js');
const verifyPath = join(repoRoot, 'packages/cli/src/commands/verify/index.ts');
const envelopePath = join(repoRoot, 'packages/cli/src/envelope/result-envelope.js');

const packageContextProbeProcess = spawnSync(process.execPath, ['--input-type=module', '-e', `
const verification = await import('@vibe-engineer/verification');
const artifacts = await import('@vibe-engineer/artifacts');
console.log(JSON.stringify({
  cwd: process.cwd(),
  verificationResolved: import.meta.resolve('@vibe-engineer/verification'),
  artifactsResolved: import.meta.resolve('@vibe-engineer/artifacts'),
  runVerificationPlanType: typeof verification.runVerificationPlan,
  validateArtifactFileType: typeof artifacts.validateArtifactFile,
  verificationExportKeys: Object.keys(verification).sort(),
  artifactsExportKeys: Object.keys(artifacts).sort()
}));
`], { cwd: join(repoRoot, 'packages/cli'), encoding: 'utf8', env: {} });
if (packageContextProbeProcess.status !== 0) {
  throw new Error(`packages/cli package-context import probe failed: ${packageContextProbeProcess.stderr || packageContextProbeProcess.stdout}`);
}
const packageContextProbe = JSON.parse(packageContextProbeProcess.stdout);
const [{ createCommandLoader }, { verifyCommand }, { validateCliResultEnvelope }, verificationModule, artifactsModule] = await Promise.all([
  import(pathToFileURL(loaderPath).href),
  import(pathToFileURL(verifyPath).href),
  import(pathToFileURL(envelopePath).href),
  import(packageContextProbe.verificationResolved),
  import(packageContextProbe.artifactsResolved)
]);

function sha256Text(text) { return createHash('sha256').update(text).digest('hex'); }
function sha256File(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')); }
async function writeJson(file, value) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); return file; }
function nowInvocation(args) {
  const now = new Date().toISOString();
  return { id: 'i-09b-post-fix-w-rb3', command: 'verify', argv: ['verify', ...args], projectRoot: repoRoot, configPath: null, startedAt: now, endedAt: now };
}
function packetPayload(envelope) { return Array.isArray(envelope.payload?.data?.evidencePackets) ? envelope.payload.data.evidencePackets : []; }
function packetPaths(envelope) { return packetPayload(envelope).map((packet) => packet.path); }
function validateRouting(envelope) {
  const payloadPackets = packetPayload(envelope);
  const payloadPaths = payloadPackets.map((packet) => packet.path).sort();
  const artifactPaths = envelope.artifacts.filter((artifact) => artifact.kind === 'evidence_packet').map((artifact) => artifact.path).sort();
  assert.deepEqual(artifactPaths, payloadPaths, 'payload packet paths must match evidence_packet artifact descriptors');
  const summaries = [];
  for (const packet of payloadPackets) {
    assert.equal(existsSync(packet.path), true, `packet exists: ${packet.path}`);
    const validation = artifactsModule.validateArtifactFile(packet.path, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, `packet validates via @vibe-engineer/artifacts: ${packet.path}`);
    assert.equal(packet.sha256, sha256File(packet.path), `packet sha256 matches payload for ${packet.path}`);
    const data = readJson(packet.path);
    summaries.push({ path: packet.path, sha256: packet.sha256, artifactId: data.artifactId, producerName: data.producer?.name ?? null, status: data.status, result: data.result, failureCode: data.failureDetails?.code ?? null, failureClassification: data.failureDetails?.classification ?? null });
  }
  return summaries;
}
function commandSpec(outPath) {
  return {
    id: 'post-fix-w-rb3-schema-validation',
    requiredItemIds: ['schema-validation'],
    layer: 'schema_validation',
    evidenceClass: 'deterministic',
    blocking: true,
    kind: 'command',
    command: process.execPath,
    args: [runnerScript, outPath],
    cwd: '.',
    expectedArtifacts: [outPath],
    argPaths: [{ index: 0, root: 'projectRoot' }, { index: 1, root: 'evidenceRoot' }],
    safety: {
      classification: 'local_deterministic_write',
      timeoutMs: 2000,
      maxStdoutBytes: 8192,
      maxStderrBytes: 8192,
      maxOutputBytes: 8192,
      allowedReadRoots: [repoRoot],
      allowedWriteRoots: [dirname(outPath)],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true
    }
  };
}
async function makePlan() {
  const plan = readJson(approvedPlan);
  plan.artifactId = 'i09b-post-fix-w-rb3-plan';
  plan.title = 'I-09B post-fix W-RB3 independent approved plan';
  plan.verificationDelta.artifactId = 'i09b-post-fix-w-rb3-delta';
  plan.verificationDelta.implementationPlanRef.artifactId = plan.artifactId;
  plan.verificationDelta.implementationPlanRef.path = '.vibe/work/I-09B-verify-cli-command/post-fix-validation-evidence/w-rb3/fixtures/w-rb3.implementation-plan.json';
  plan.verificationDelta.links[0].artifactId = plan.artifactId;
  plan.verificationDelta.links[0].path = plan.verificationDelta.implementationPlanRef.path;
  for (const item of plan.verificationDelta.requiredItems) {
    item.action = item.id === 'schema-validation' ? 'add' : 'not_applicable';
    item.rationale = `I-09B post-fix W-RB3 independent fixture rationale for ${item.id}.`;
  }
  return writeJson(join(fixturesRoot, 'w-rb3.implementation-plan.json'), plan);
}
async function makeRunner() {
  await mkdir(runnerDir, { recursive: true });
  await writeFile(runnerScript, `import { mkdir, writeFile } from 'node:fs/promises';\nimport { dirname } from 'node:path';\nconst out = process.argv[2];\nif (!out) throw new Error('missing output path');\nawait mkdir(dirname(out), { recursive: true });\nawait writeFile(out, JSON.stringify({ ok: true, witness: 'w-rb3-real-runner', argvLength: process.argv.length }) + '\\n', 'utf8');\nconsole.log('w-rb3-pass-runner-ok');\n`, 'utf8');
}

await mkdir(witnessRoot, { recursive: true });
await rm(casesRoot, { recursive: true, force: true });
await mkdir(caseRoot, { recursive: true });
await makeRunner();
const planPath = await makePlan();
const outputPath = join(caseRoot, 'packets', 'runner-output', 'w-rb3-output.json');
const catalogPath = join(caseRoot, 'runner-catalog.json');
const resultFile = join(caseRoot, 'result', 'cli-result.json');
const catalog = [commandSpec(outputPath)];
await writeJson(catalogPath, catalog);
const args = ['--implementation-plan', planPath, '--evidence-root', join(caseRoot, 'packets'), '--project-root', repoRoot, '--run-id', 'i09b-post-fix-w-rb3', '--runner-catalog', catalogPath, '--result-file', resultFile];

assert.equal(typeof verificationModule.runVerificationPlan, 'function', 'package-context @vibe-engineer/verification exports runVerificationPlan');
assert.equal(typeof artifactsModule.validateArtifactFile, 'function', 'package-context @vibe-engineer/artifacts exports validateArtifactFile');
assert.equal(verifyCommand.id, 'verify');
assert.equal(verifyCommand.visibility, 'implementation');
assert.equal(typeof verifyCommand.description, 'string');
assert.equal(typeof verifyCommand.run, 'function');
const verifySource = readFileSync(verifyPath, 'utf8');
assert.match(verifySource, /from\s+["']@vibe-engineer\/verification["']/u, 'verify imports verification by package name');
assert.match(verifySource, /runVerificationPlan/u, 'verify source references runVerificationPlan');
assert.doesNotMatch(verifySource, /packages\/verification|\.\.\/\.\.\/\.\.\/verification/u, 'verify does not use private verification package-boundary path');

const loader = createCommandLoader([verifyCommand]);
const dispatchResult = await loader.dispatch('verify', args, { invocation: nowInvocation(args), packageJsonPath: join(repoRoot, 'packages/cli/package.json'), validationCase: 'post-fix-w-rb3' });
const envelope = dispatchResult.envelope;
const envelopeValidation = validateCliResultEnvelope(envelope);
assert.equal(envelopeValidation.ok, true, `valid CLI envelope: ${JSON.stringify(envelopeValidation)}`);
assert.equal(envelope.status, 'success');
assert.equal(envelope.exitCode, 0);
assert.equal(envelope.payload.data.runnerStatus, 'passed');
assert.equal(existsSync(resultFile), true, 'result file exists');
assert.deepEqual(readJson(resultFile), envelope, 'result file content matches returned envelope');
assert.equal(existsSync(outputPath), true, 'real runner wrote expected output artifact');
const packetSummaries = validateRouting(envelope);
assert.ok(packetSummaries.length > 0, 'one or more Evidence Packets returned');
assert.ok(packetSummaries.some((packet) => packet.producerName === '@vibe-engineer/verification'), 'packets prove @vibe-engineer/verification producer');
assert.ok(envelope.artifacts.some((artifact) => artifact.kind === 'cli_result' && artifact.path === resultFile), 'cli_result artifact descriptor present');

const packageContextImport = {
  cliPackageContext: join(repoRoot, 'packages/cli/package.json'),
  probe: packageContextProbe,
  directImportRunVerificationPlanType: typeof verificationModule.runVerificationPlan,
  directImportValidateArtifactFileType: typeof artifactsModule.validateArtifactFile,
  verificationStatusConstants: verificationModule.VERIFICATION_STATUSES,
  evidenceFailureClassifications: verificationModule.EVIDENCE_FAILURE_CLASSIFICATIONS
};
await writeJson(join(witnessRoot, 'package-context-import.json'), packageContextImport);
await writeJson(join(witnessRoot, 'cli-result.json'), envelope);
await writeJson(join(witnessRoot, 'packet-assertions.json'), packetSummaries);
const summary = {
  status: 'PASS',
  command: `${process.execPath} ${join(witnessRoot, 'w-rb3-witness.mjs')}`,
  cwd: repoRoot,
  loaderDispatch: 'createCommandLoader([verifyCommand]).dispatch("verify", args, context)',
  verificationResolved: packageContextProbe.verificationResolved,
  artifactsResolved: packageContextProbe.artifactsResolved,
  resultFile,
  resultFileSha256: sha256File(resultFile),
  outputPath,
  outputSha256: sha256File(outputPath),
  envelopeStatus: envelope.status,
  exitCode: envelope.exitCode,
  runnerStatus: envelope.payload.data.runnerStatus,
  payloadPacketCount: packetPaths(envelope).length,
  packetSha256s: packetSummaries.map((packet) => ({ path: packet.path, sha256: packet.sha256, status: packet.status, result: packet.result })),
  envelopeValidation,
  packageContextImport,
  verifySourceSha256: sha256Text(verifySource)
};
await writeJson(join(witnessRoot, 'summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));
